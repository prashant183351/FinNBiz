import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { FinancialService } from '../services/financial.service'

const router: Router = Router()
const prisma = new PrismaClient()

// POST /api/upi/webhook - UPI Payment Gateway Webhook
router.post('/webhook', async (req, res) => {
  try {
    const {
      companyId,
      upiId,
      amount,
      description,
      transactionId,
      paymentMethod = 'upi',
      timestamp,
      status,
      metadata
    } = req.body

    // Only process successful transactions
    if (status !== 'success' && status !== 'SUCCESS') {
      return res.status(200).json({ message: 'Transaction not successful, ignored' })
    }

    if (!companyId || !amount || !transactionId) {
      return res.status(400).json({
        error: 'Company ID, amount, and transaction ID are required'
      })
    }

    // Check if transaction already exists to prevent duplicates
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        companyId,
        reference: transactionId,
        source: 'upi'
      }
    })

    if (existingTransaction) {
      return res.status(200).json({ message: 'Transaction already processed' })
    }

    // Determine transaction type based on amount (positive = income, negative = expense)
    const transactionAmount = Math.abs(parseFloat(amount))
    const transactionType = parseFloat(amount) > 0 ? 'income' : 'expense'

    const transactionData = {
      companyId,
      type: transactionType as any,
      amount: transactionAmount,
      description: description || `UPI Transaction ${transactionId}`,
      category: transactionType === 'expense' ? await FinancialService.categorizeExpense(description || '', transactionAmount) : 'Sales Revenue',
      paymentMethod,
      reference: transactionId,
      vendor: upiId,
      date: timestamp ? new Date(timestamp) : new Date(),
      source: 'upi',
      metadata: {
        ...metadata,
        upiId,
        gatewayTransactionId: transactionId,
      }
    }

    const { transaction, ledgerEntries } = await FinancialService.createTransactionWithLedger(transactionData)

    // Trigger background report recalculation
    const { Queue } = await import('bullmq')
    const { createClient } = await import('redis')
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
    const reportQueue = new Queue('report-calculations', { connection: redis as any })

    await reportQueue.add('upi-transaction-update', {
      companyId,
      reportType: 'dashboard_summary',
    })

    console.log(`✅ UPI Transaction processed: ${transactionId} - ₹${transactionAmount}`)

    res.status(200).json({
      message: 'UPI transaction processed successfully',
      transactionId: transaction.id,
      ledgerEntriesCount: ledgerEntries.length
    })
  } catch (error) {
    console.error('Error processing UPI webhook:', error)
    res.status(500).json({ error: 'Failed to process UPI transaction' })
  }
})

// POST /api/upi/bank-import - Import bank statement transactions
router.post('/bank-import', async (req, res) => {
  try {
    const { companyId, transactions } = req.body

    if (!companyId || !Array.isArray(transactions)) {
      return res.status(400).json({
        error: 'Company ID and transactions array are required'
      })
    }

    const processedTransactions = []
    const errors = []

    for (const bankTxn of transactions) {
      try {
        const {
          date,
          description,
          amount,
          reference,
          type = 'income' // or 'expense' based on amount sign
        } = bankTxn

        // Check for duplicates
        const existing = await prisma.transaction.findFirst({
          where: {
            companyId,
            reference,
            source: 'bank_import'
          }
        })

        if (existing) continue

        const transactionAmount = Math.abs(parseFloat(amount))
        const transactionType = parseFloat(amount) > 0 ? 'income' : 'expense'

        const transactionData = {
          companyId,
          type: transactionType as any,
          amount: transactionAmount,
          description: description || `Bank Transaction ${reference}`,
          category: transactionType === 'expense' ? await FinancialService.categorizeExpense(description || '', transactionAmount) : 'Sales Revenue',
          paymentMethod: 'bank',
          reference,
          date: new Date(date),
          source: 'bank_import',
          metadata: bankTxn
        }

        const { transaction, ledgerEntries } = await FinancialService.createTransactionWithLedger(transactionData)
        processedTransactions.push({ transaction, ledgerEntries })
      } catch (err: any) {
        errors.push({ transaction: bankTxn, error: err.message })
      }
    }

    // Trigger dashboard update
    const { Queue } = await import('bullmq')
    const { createClient } = await import('redis')
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
    const reportQueue = new Queue('report-calculations', { connection: redis as any })

    await reportQueue.add('bank-import-update', {
      companyId,
      reportType: 'dashboard_summary',
    })

    res.status(200).json({
      message: `Processed ${processedTransactions.length} transactions`,
      processed: processedTransactions.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10) // Limit error details
    })
  } catch (error) {
    console.error('Error importing bank transactions:', error)
    res.status(500).json({ error: 'Failed to import bank transactions' })
  }
})

// GET /api/upi/transactions - Get UPI transactions for a company
router.get('/transactions', async (req, res) => {
  try {
    const { companyId, limit = 50 } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        source: 'upi'
      },
      include: {
        ledgerEntries: true,
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit as string)
    })

    res.json(transactions)
  } catch (error) {
    console.error('Error fetching UPI transactions:', error)
    res.status(500).json({ error: 'Failed to fetch UPI transactions' })
  }
})

export default router
