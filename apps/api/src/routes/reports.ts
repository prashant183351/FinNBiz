import express, { Router } from 'express'
import { Queue } from 'bullmq'
import { createClient as createRedisClient } from 'redis'
import { FinancialService } from '../services/financial.service'
import { PrismaClient } from '@prisma/client'

const router: Router = Router()
const prisma = new PrismaClient()
const redis = createRedisClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
const reportQueue = new Queue('report-calculations', { connection: redis as any })

// GET /api/reports/profit-loss - Get Profit & Loss statement
router.get('/profit-loss', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const report = await FinancialService.getProfitLoss(
      companyId,
      new Date(startDate as string),
      new Date(endDate as string)
    )

    res.json(report)
  } catch (error) {
    console.error('Error generating P&L report:', error)
    res.status(500).json({ error: 'Failed to generate Profit & Loss report' })
  }
})

// GET /api/reports/balance-sheet - Get Balance Sheet
router.get('/balance-sheet', async (req, res) => {
  try {
    const { companyId, asOfDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const date = asOfDate ? new Date(asOfDate as string) : new Date()
    const report = await FinancialService.getBalanceSheet(companyId, date)

    res.json(report)
  } catch (error) {
    console.error('Error generating balance sheet:', error)
    res.status(500).json({ error: 'Failed to generate Balance Sheet' })
  }
})

// GET /api/reports/cash-flow - Get Cash Flow statement
router.get('/cash-flow', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const report = await FinancialService.getCashFlow(
      companyId,
      new Date(startDate as string),
      new Date(endDate as string)
    )

    res.json(report)
  } catch (error) {
    console.error('Error generating cash flow report:', error)
    res.status(500).json({ error: 'Failed to generate Cash Flow report' })
  }
})

// GET /api/reports/dashboard-summary - Get dashboard summary with key metrics
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { companyId } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Get current month P&L
    const monthlyPL = await FinancialService.getProfitLoss(companyId, startOfMonth, now)

    // Get YTD P&L
    const ytdPL = await FinancialService.getProfitLoss(companyId, startOfYear, now)

    // Get current balance sheet
    const balanceSheet = await FinancialService.getBalanceSheet(companyId, now)

    // Get monthly cash flow
    const monthlyCashFlow = await FinancialService.getCashFlow(companyId, startOfMonth, now)

    const summary = {
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

    res.json(summary)
  } catch (error) {
    console.error('Error generating dashboard summary:', error)
    res.status(500).json({ error: 'Failed to generate dashboard summary' })
  }
})

// GET /api/reports/top-expenses - Get top expense categories
router.get('/top-expenses', async (req, res) => {
  try {
    const { companyId, limit = 5 } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const topExpenses = await prisma.ledgerEntry.groupBy({
      by: ['account'],
      where: {
        companyId,
        accountType: 'expense',
        date: {
          gte: startOfMonth,
          lte: now,
        },
      },
      _sum: {
        debit: true,
      },
      orderBy: {
        _sum: {
          debit: 'desc',
        },
      },
      take: parseInt(limit as string),
    })

    const result = topExpenses.map((expense: any) => ({
      category: expense.account,
      amount: expense._sum.debit || 0,
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching top expenses:', error)
    res.status(500).json({ error: 'Failed to fetch top expenses' })
  }
})

// GET /api/reports/gst-tds-summary - Get GST and TDS tax summaries
router.get('/gst-tds-summary', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const start = new Date(startDate as string)
    const end = new Date(endDate as string)

    // 1. Calculate GST Output: Sum of totalGST from finalized/paid invoices
    const gstOutputSum = await prisma.invoice.aggregate({
      _sum: { totalGST: true },
      where: {
        companyId,
        status: { in: ['finalized', 'paid'] },
        createdAt: { gte: start, lte: end }
      }
    })

    // 2. Calculate GST Input: Sum of gstAmount from expenses
    const gstInputSum = await prisma.expense.aggregate({
      _sum: { gstAmount: true },
      where: {
        companyId,
        date: { gte: start, lte: end }
      }
    })

    // 3. Calculate TDS Liability: Sum of payroll tds deductions for company employees
    const employees = await prisma.employee.findMany({
      where: { companyId },
      select: { id: true }
    })
    const employeeIds = employees.map((emp: any) => emp.id)

    let totalTds = 0
    if (employeeIds.length > 0) {
      const tdsSum = await prisma.payroll.aggregate({
        _sum: { tds: true },
        where: {
          employeeId: { in: employeeIds },
          createdAt: { gte: start, lte: end }
        }
      })
      totalTds = tdsSum._sum.tds || 0
    }

    const gstOutput = gstOutputSum._sum.totalGST || 0
    const gstInput = gstInputSum._sum.gstAmount || 0
    const netGstPayable = Math.max(0, gstOutput - gstInput)

    res.json({
      gstOutput,
      gstInput,
      netGstPayable,
      totalTds,
      period: { startDate: start, endDate: end }
    })
  } catch (error: any) {
    console.error('Error generating GST/TDS tax summary:', error)
    res.status(500).json({ error: 'Failed to generate GST/TDS tax summary' })
  }
})

// GET /api/reports/gstr1 - Get GSTR-1 Filing Data
router.get('/gstr1', async (req, res) => {
  try {
    const { companyId, month, year } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const m = parseInt(month as string)
    const y = parseInt(year as string)
    
    // First day of month
    const startDate = new Date(y, m - 1, 1)
    // First day of next month
    const endDate = new Date(y, m, 1)

    // Fetch all finalized/paid invoices for the month
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['finalized', 'paid'] },
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        items: true
      }
    })

    const b2b: any[] = []
    const b2cs: any[] = []
    const hsnMap = new Map<string, any>()
    let totalTaxableValue = 0
    let totalIGST = 0
    let totalCGST = 0
    let totalSGST = 0

    for (const inv of invoices) {
      const isB2B = Boolean(inv.customerGSTIN && inv.customerGSTIN.trim().length > 0)
      let invTaxable = 0
      let invIgst = 0
      let invCgst = 0
      let invSgst = 0

      for (const item of inv.items) {
        invTaxable += item.amount
        invIgst += item.igst
        invCgst += item.cgst
        invSgst += item.sgst

        // HSN Summary logic
        const hsn = item.hsnCode || 'OTHER'
        if (!hsnMap.has(hsn)) {
          hsnMap.set(hsn, { hsn, desc: item.description, qty: 0, val: 0, txval: 0, igst: 0, cgst: 0, sgst: 0 })
        }
        const hEntry = hsnMap.get(hsn)
        hEntry.qty += item.quantity
        hEntry.txval += item.amount
        hEntry.val += (item.amount + item.igst + item.cgst + item.sgst)
        hEntry.igst += item.igst
        hEntry.cgst += item.cgst
        hEntry.sgst += item.sgst
      }

      totalTaxableValue += invTaxable
      totalIGST += invIgst
      totalCGST += invCgst
      totalSGST += invSgst

      const formattedInv = {
        invNo: inv.invoiceNumber,
        invDate: inv.createdAt.toISOString().split('T')[0],
        val: inv.totalAmount,
        txval: invTaxable,
        igst: invIgst,
        cgst: invCgst,
        sgst: invSgst,
        gstin: inv.customerGSTIN,
        customerName: inv.customerName
      }

      if (isB2B) {
        b2b.push(formattedInv)
      } else {
        b2cs.push(formattedInv)
      }
    }

    res.json({
      period: { month: m, year: y },
      summary: {
        totalTaxableValue,
        totalIGST,
        totalCGST,
        totalSGST,
        totalInvoices: invoices.length
      },
      b2b,
      b2cs,
      hsn: Array.from(hsnMap.values())
    })

  } catch (error: any) {
    console.error('Error generating GSTR-1 data:', error)
    res.status(500).json({ error: 'Failed to generate GSTR-1 data' })
  }
})

// GET /api/reports/gstr3b - Get GSTR-3B Filing Summary
router.get('/gstr3b', async (req, res) => {
  try {
    const { companyId, month, year } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const m = parseInt(month as string)
    const y = parseInt(year as string)
    
    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 1)

    // 1. Table 3.1: Outward Supplies (Output Tax from Invoices)
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['finalized', 'paid'] },
        createdAt: { gte: startDate, lt: endDate }
      },
      include: { items: true }
    })

    let outTaxable = 0
    let outIgst = 0
    let outCgst = 0
    let outSgst = 0

    for (const inv of invoices) {
      for (const item of inv.items) {
        outTaxable += item.amount
        outIgst += item.igst
        outCgst += item.cgst
        outSgst += item.sgst
      }
    }

    // 2. Table 4: Eligible ITC (Input Tax from Expenses)
    // We assume expenses have gstAmount which is split evenly between CGST/SGST if local, or IGST if interstate.
    // For simplicity in this demo, we'll assume it's CGST/SGST if IGST = 0 (which we don't track on Expense natively yet, so we'll just put it into CGST/SGST half and half).
    // Let's check Expense model: amount, gstAmount, totalAmount.
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lt: endDate }
      }
    })

    let itcEligible = 0
    for (const exp of expenses) {
      itcEligible += exp.gstAmount
    }

    // Allocate ITC (Assume 50% CGST, 50% SGST for demo purposes, as real system needs vendor GSTIN state match)
    const inCgst = itcEligible / 2
    const inSgst = itcEligible / 2
    const inIgst = 0

    // 3. Payment of Tax
    const netIgst = Math.max(0, outIgst - inIgst)
    const netCgst = Math.max(0, outCgst - inCgst)
    const netSgst = Math.max(0, outSgst - inSgst)

    res.json({
      period: { month: m, year: y },
      table3: {
        outwardTaxable: outTaxable,
        outwardIgst: outIgst,
        outwardCgst: outCgst,
        outwardSgst: outSgst
      },
      table4: {
        itcEligible,
        itcIgst: inIgst,
        itcCgst: inCgst,
        itcSgst: inSgst,
        itcReversed: 0,
        netItcAvailable: itcEligible
      },
      payment: {
        payableIgst: netIgst,
        payableCgst: netCgst,
        payableSgst: netSgst,
        totalPayable: netIgst + netCgst + netSgst
      }
    })

  } catch (error: any) {
    console.error('Error generating GSTR-3B data:', error)
    res.status(500).json({ error: 'Failed to generate GSTR-3B data' })
  }
})

// POST /api/reports/gstr2b - Reconcile uploaded GSTR-2B file with purchase book
router.post('/gstr2b', async (req, res) => {
  try {
    const { companyId } = req.query
    const { portalInvoices = [] } = req.body

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Fetch our recorded Purchase Orders (received/confirmed bills)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        status: { in: ['received', 'confirmed'] }
      },
      include: {
        vendor: { select: { name: true, gstin: true } }
      }
    })

    const matchedResults: any[] = []
    const poMatchedIds = new Set<string>()

    // Walk through portal invoices and match against books
    for (const pInv of portalInvoices) {
      const gstin = pInv.gstin?.trim().toUpperCase()
      const invNum = pInv.invoiceNumber?.trim().toUpperCase()
      const taxableValue = parseFloat(pInv.taxableValue || '0')

      // Look for a purchase order that matches the invoice number and supplier GSTIN
      const po = purchaseOrders.find((o: any) => 
        o.orderNumber.trim().toUpperCase() === invNum ||
        (o.vendor.gstin && o.vendor.gstin.trim().toUpperCase() === gstin)
      )

      if (po) {
        poMatchedIds.add(po.id)
        const poTaxable = po.totalAmount
        const diff = Math.abs(poTaxable - taxableValue)
        const isMatched = diff < (poTaxable * 0.1) // 10% tolerance

        if (isMatched) {
          matchedResults.push({
            id: po.id,
            customerName: po.vendor.name,
            gstin: po.vendor.gstin || gstin,
            invoiceNumber: invNum,
            portalTaxable: taxableValue,
            booksTaxable: poTaxable,
            status: 'MATCHED',
            message: 'Invoice fully matched. Input Tax Credit is eligible.'
          })
        } else {
          matchedResults.push({
            id: po.id,
            customerName: po.vendor.name,
            gstin: po.vendor.gstin || gstin,
            invoiceNumber: invNum,
            portalTaxable: taxableValue,
            booksTaxable: poTaxable,
            status: 'TAX_MISMATCH',
            message: `Tax/Value mismatch. Books show ₹${poTaxable}, Portal shows ₹${taxableValue}.`
          })
        }
      } else {
        // Missing in Books
        matchedResults.push({
          id: null,
          customerName: pInv.supplierName || 'Unknown Supplier',
          gstin,
          invoiceNumber: invNum,
          portalTaxable: taxableValue,
          booksTaxable: 0,
          status: 'MISSING_IN_BOOKS',
          message: 'Found on GST Portal, but missing in your FinNBiz purchase records.'
        })
      }
    }

    // Walk through books and identify missing in portal (Unclaimed ITC)
    for (const po of purchaseOrders) {
      if (!poMatchedIds.has(po.id)) {
        matchedResults.push({
          id: po.id,
          customerName: po.vendor.name,
          gstin: po.vendor.gstin || 'Unknown',
          invoiceNumber: po.orderNumber,
          portalTaxable: 0,
          booksTaxable: po.totalAmount,
          status: 'MISSING_IN_PORTAL',
          message: 'Recorded in books, but missing from GST portal! Ask supplier to file.'
        })
      }
    }

    // Summarize results
    const summary = {
      matchedCount: matchedResults.filter(r => r.status === 'MATCHED').length,
      taxMismatchCount: matchedResults.filter(r => r.status === 'TAX_MISMATCH').length,
      missingBooksCount: matchedResults.filter(r => r.status === 'MISSING_IN_BOOKS').length,
      missingPortalCount: matchedResults.filter(r => r.status === 'MISSING_IN_PORTAL').length,
      totalMatchedITC: matchedResults.filter(r => r.status === 'MATCHED').reduce((sum, r) => sum + r.portalTaxable, 0),
      totalUnclaimedITC: matchedResults.filter(r => r.status === 'MISSING_IN_PORTAL').reduce((sum, r) => sum + r.booksTaxable, 0)
    }

    res.json({ summary, results: matchedResults })
  } catch (error: any) {
    console.error('Error in GSTR-2B reconciliation:', error)
    res.status(500).json({ error: 'Failed to process GSTR-2B reconciliation' })
  }
})

export default router
