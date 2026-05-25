import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { createClient as createRedisClient } from 'redis'

const prisma = new PrismaClient()
const redis = createRedisClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })

export interface ReportCalculationJobData {
  companyId: string
  reportType: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'dashboard_summary'
  period?: {
    startDate: Date
    endDate: Date
  }
  asOfDate?: Date
}

export class ReportCalculator {
  private static worker: Worker

  static async start() {
    this.worker = new Worker(
      'report-calculations',
      this.processJob,
      {
        // @ts-ignore
        connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } as any,
        concurrency: 5, // Process up to 5 reports simultaneously
      }
    )

    this.worker.on('completed', (job) => {
      console.log(`Report calculation completed: ${job.id}`)
    })

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`Report calculation failed: ${job.id}`, err)
      } else {
        console.error(`Unknown report calculation failed`, err)
      }
    })

    console.log('📊 Report Calculator Worker started')
  }

  static async stop() {
    await this.worker?.close()
  }

  private static async processJob(job: Job<ReportCalculationJobData>) {
    const { companyId, reportType, period, asOfDate } = job.data

    try {
      let reportData: any
      let cacheKey: string
      let expiresAt: Date

      switch (reportType) {
        case 'profit_loss':
          if (!period) throw new Error('Period required for profit/loss report')
          reportData = await ReportCalculator.calculateProfitLoss(companyId, period.startDate, period.endDate)
          cacheKey = `reports:${companyId}:profit_loss:${period.startDate.toISOString()}:${period.endDate.toISOString()}`
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          break

        case 'balance_sheet':
          const date = asOfDate || new Date()
          reportData = await ReportCalculator.calculateBalanceSheet(companyId, date)
          cacheKey = `reports:${companyId}:balance_sheet:${date.toISOString()}`
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          break

        case 'cash_flow':
          if (!period) throw new Error('Period required for cash flow report')
          reportData = await ReportCalculator.calculateCashFlow(companyId, period.startDate, period.endDate)
          cacheKey = `reports:${companyId}:cash_flow:${period.startDate.toISOString()}:${period.endDate.toISOString()}`
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          break

        case 'dashboard_summary':
          reportData = await ReportCalculator.calculateDashboardSummary(companyId)
          cacheKey = `reports:${companyId}:dashboard_summary`
          expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour for dashboard
          break

        default:
          throw new Error(`Unknown report type: ${reportType}`)
      }

      // Cache the result in Redis
      await redis.setEx(cacheKey, Math.floor((expiresAt.getTime() - Date.now()) / 1000), JSON.stringify(reportData))

      // Also store in database for persistence
      await ReportCalculator.storeReportInDatabase(companyId, reportType, reportData, expiresAt)

      return reportData
    } catch (error) {
      console.error('Error calculating report:', error)
      throw error
    }
  }

  private static async calculateProfitLoss(companyId: string, startDate: Date, endDate: Date) {
    const income = await prisma.ledgerEntry.aggregate({
      _sum: { credit: true },
      where: {
        companyId,
        accountType: 'income',
        date: { gte: startDate, lte: endDate },
      },
    })

    const expenses = await prisma.ledgerEntry.aggregate({
      _sum: { debit: true },
      where: {
        companyId,
        accountType: 'expense',
        date: { gte: startDate, lte: endDate },
      },
    })

    return {
      totalIncome: income._sum.credit || 0,
      totalExpenses: expenses._sum.debit || 0,
      netProfit: (income._sum.credit || 0) - (expenses._sum.debit || 0),
      period: { startDate, endDate },
    }
  }

  private static async calculateBalanceSheet(companyId: string, asOfDate: Date) {
    const assets = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'asset',
        date: { lte: asOfDate },
      },
      _sum: { debit: true, credit: true },
    })

    const liabilities = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'liability',
        date: { lte: asOfDate },
      },
      _sum: { debit: true, credit: true },
    })

    const equity = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'equity',
        date: { lte: asOfDate },
      },
      _sum: { debit: true, credit: true },
    })

    const totalAssets = assets.reduce((sum: number, asset: any) => sum + (asset._sum.debit || 0) - (asset._sum.credit || 0), 0)
    const totalLiabilities = liabilities.reduce((sum: number, liability: any) => sum + (liability._sum.credit || 0) - (liability._sum.debit || 0), 0)
    const totalEquity = equity.reduce((sum: number, eq: any) => sum + (eq._sum.credit || 0) - (eq._sum.debit || 0), 0)

    return {
      assets: assets.map((asset: any) => ({
        account: asset.account,
        balance: (asset._sum.debit || 0) - (asset._sum.credit || 0),
      })),
      liabilities: liabilities.map((liability: any) => ({
        account: liability.account,
        balance: (liability._sum.credit || 0) - (liability._sum.debit || 0),
      })),
      equity: equity.map((eq: any) => ({
        account: eq.account,
        balance: (eq._sum.credit || 0) - (eq._sum.debit || 0),
      })),
      totalAssets,
      totalLiabilities,
      totalEquity,
      asOfDate,
    }
  }

  private static async calculateCashFlow(companyId: string, startDate: Date, endDate: Date) {
    const inflows = await prisma.ledgerEntry.aggregate({
      _sum: { debit: true },
      where: {
        companyId,
        account: { in: ['Cash', 'Bank Account'] },
        accountType: 'asset',
        date: { gte: startDate, lte: endDate },
      },
    })

    const outflows = await prisma.ledgerEntry.aggregate({
      _sum: { credit: true },
      where: {
        companyId,
        account: { in: ['Cash', 'Bank Account'] },
        accountType: 'asset',
        date: { gte: startDate, lte: endDate },
      },
    })

    return {
      cashInflows: inflows._sum.debit || 0,
      cashOutflows: outflows._sum.credit || 0,
      netCashFlow: (inflows._sum.debit || 0) - (outflows._sum.credit || 0),
      period: { startDate, endDate },
    }
  }

  private static async calculateDashboardSummary(companyId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [monthlyPL, ytdPL, balanceSheet, monthlyCashFlow] = await Promise.all([
      this.calculateProfitLoss(companyId, startOfMonth, now),
      this.calculateProfitLoss(companyId, startOfYear, now),
      this.calculateBalanceSheet(companyId, now),
      this.calculateCashFlow(companyId, startOfMonth, now),
    ])

    return {
      currentMonth: {
        income: monthlyPL.totalIncome,
        expenses: monthlyPL.totalExpenses,
        netProfit: monthlyPL.netProfit,
        cashFlow: monthlyCashFlow.netCashFlow,
      },
      yearToDate: {
        income: ytdPL.totalIncome,
        expenses: ytdPL.totalExpenses,
        netProfit: ytdPL.netProfit,
      },
      balanceSheet: {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity,
        netWorth: balanceSheet.totalAssets - balanceSheet.totalLiabilities,
      },
      generatedAt: now,
    }
  }

  private static async storeReportInDatabase(
    companyId: string,
    reportType: string,
    data: any,
    expiresAt: Date
  ) {
    // Store in FinancialReport table for persistence
    await prisma.financialReport.upsert({
      where: {
        companyId_type_period_year_month: {
          companyId,
          type: reportType,
          period: 'monthly', // Default to monthly, can be enhanced
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        },
      },
      update: {
        data,
        generatedAt: new Date(),
        expiresAt,
      },
      create: {
        companyId,
        type: reportType,
        period: 'monthly',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        data,
        generatedAt: new Date(),
        expiresAt,
      },
    })
  }
}
