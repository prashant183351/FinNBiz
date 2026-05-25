import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { FinancialService } from '../services/financial.service'
import { authenticateToken } from '../middleware/auth'

const router: Router = Router()
const prisma = new PrismaClient()

// GET /api/expenses - Get all expenses for a company
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query

    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const expenses = await prisma.expense.findMany({
      where: { companyId },
      orderBy: { date: 'desc' }
    })

    res.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// GET /api/expenses/:id - Get single expense
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const expense = await prisma.expense.findUnique({
      where: { id }
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    res.status(500).json({ error: 'Failed to fetch expense' })
  }
})

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  try {
    const {
      companyId,
      date,
      description,
      category,
      amount,
      gstAmount = 0,
      paymentMethod = 'cash',
      reference,
      notes
    } = req.body

    if (!companyId || !description || !category || !amount) {
      return res.status(400).json({
        error: 'Company ID, description, category, and amount are required'
      })
    }

    const totalAmount = amount + gstAmount

    const expense = await prisma.expense.create({
      data: {
        companyId,
        date: new Date(date),
        description,
        category,
        amount: parseFloat(amount),
        gstAmount: parseFloat(gstAmount),
        totalAmount: parseFloat(totalAmount),
        paymentMethod,
        reference,
        notes
      }
    })

    // Create corresponding transaction and ledger entries
    const transactionData = {
      companyId,
      type: 'expense' as const,
      amount: parseFloat(totalAmount),
      description,
      category,
      paymentMethod,
      reference,
      date: new Date(date),
      source: 'expense',
      metadata: { expenseId: expense.id }
    }

    const { transaction, ledgerEntries } = await FinancialService.createTransactionWithLedger(transactionData)

    res.status(201).json({
      expense,
      transaction,
      ledgerEntries,
      message: 'Expense created with automatic ledger entries'
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      date,
      description,
      category,
      amount,
      gstAmount = 0,
      paymentMethod,
      reference,
      notes
    } = req.body

    const totalAmount = parseFloat(amount) + parseFloat(gstAmount)

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description,
        category,
        amount: amount ? parseFloat(amount) : undefined,
        gstAmount: gstAmount ? parseFloat(gstAmount) : undefined,
        totalAmount,
        paymentMethod,
        reference,
        notes
      }
    })

    res.json(expense)
  } catch (error: any) {
    console.error('Error updating expense:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.expense.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})
// POST /api/expenses/upload-csv - Batch upload expenses via CSV text
router.post('/upload-csv', authenticateToken, async (req: any, res) => {
  try {
    const { companyId, csvText } = req.body

    if (!companyId || !csvText) {
      return res.status(400).json({ error: 'Company ID and CSV Text are required' })
    }

    // Split rows
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0)
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain a header and at least one transaction row' })
    }

    // Parse header columns
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    
    let dateIdx = -1
    let descIdx = -1
    let amountIdx = -1
    let refIdx = -1

    headers.forEach((h: string, idx: number) => {
      if (h.includes('date') || h.includes('दिनांक') || h.includes('time')) dateIdx = idx
      else if (h.includes('desc') || h.includes('particular') || h.includes('detail') || h.includes('विवरण') || h.includes('narrative')) descIdx = idx
      else if (h.includes('amount') || h.includes('debit') || h.includes('withdrawal') || h.includes('राशि') || h.includes('out') || h.includes('value')) amountIdx = idx
      else if (h.includes('ref') || h.includes('txn') || h.includes('reference') || h.includes('id') || h.includes('संदर्भ')) refIdx = idx
    })

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      return res.status(400).json({ 
        error: 'Failed to auto-detect columns. Please ensure your CSV headers contain "Date", "Description" / "Particulars", and "Amount" columns.' 
      })
    }

    const createdExpenses: any[] = []

    // Start transaction for batch processing
    await prisma.$transaction(async (tx: any) => {
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((cell: string) => cell.trim())
        if (row.length < 3 || !row[dateIdx] || !row[amountIdx]) continue

        const rawDate = row[dateIdx]
        const rawDesc = row[descIdx] || 'Imported Transaction'
        const rawAmount = parseFloat(row[amountIdx].replace(/[^0-9.]/g, '')) || 0
        const rawRef = refIdx !== -1 ? row[refIdx] : null

        if (rawAmount <= 0) continue // Skip deposit rows or invalid amounts

        // Determine AI category
        const category = await FinancialService.categorizeExpense(rawDesc, rawAmount)

        // Parse date gracefully (standard YYYY-MM-DD or DD-MM-YYYY)
        let parsedDate = new Date(rawDate)
        if (isNaN(parsedDate.getTime())) {
          // Attempt DD-MM-YYYY parsing
          const parts = rawDate.split(/[-/]/)
          if (parts.length === 3) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1
            const year = parseInt(parts[2])
            parsedDate = new Date(year, month, day)
          }
        }

        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date() // Fallback to current date
        }

        const gstAmount = 0 // Default to 0 for batch imports unless specified
        const totalAmount = rawAmount

        // Create expense record
        const expense = await tx.expense.create({
          data: {
            companyId,
            date: parsedDate,
            description: rawDesc,
            category,
            amount: rawAmount,
            gstAmount,
            totalAmount,
            paymentMethod: 'bank',
            reference: rawRef,
            notes: 'Batch CSV Import'
          }
        })

        // Log double entry ledger entries
        const transaction = await tx.transaction.create({
          data: {
            companyId,
            type: 'expense',
            amount: totalAmount,
            description: rawDesc,
            category,
            paymentMethod: 'bank',
            reference: rawRef,
            date: parsedDate,
            source: 'expense',
            metadata: { expenseId: expense.id }
          }
        })

        // General Ledger: Debit Expense, Credit Bank
        // Debit: Category Expense (Asset/Expense)
        const lastCategoryEntry = await tx.ledgerEntry.findFirst({
          where: { companyId, account: category },
          orderBy: { createdAt: 'desc' }
        })
        const prevCatBalance = lastCategoryEntry?.balance || 0
        await tx.ledgerEntry.create({
          data: {
            companyId,
            transactionId: transaction.id,
            account: category,
            accountType: 'expense',
            debit: totalAmount,
            credit: 0,
            description: rawDesc,
            refType: 'expense',
            refId: expense.id,
            balance: prevCatBalance + totalAmount
          }
        })

        // Credit: Bank Account (Asset)
        const lastBankEntry = await tx.ledgerEntry.findFirst({
          where: { companyId, account: 'Bank Account' },
          orderBy: { createdAt: 'desc' }
        })
        const prevBankBalance = lastBankEntry?.balance || 0
        await tx.ledgerEntry.create({
          data: {
            companyId,
            transactionId: transaction.id,
            account: 'Bank Account',
            accountType: 'asset',
            debit: 0,
            credit: totalAmount,
            description: rawDesc,
            refType: 'expense',
            refId: expense.id,
            balance: prevBankBalance - totalAmount
          }
        })

        createdExpenses.push(expense)
      }
    })

    res.status(201).json({
      success: true,
      count: createdExpenses.length,
      expenses: createdExpenses
    })
  } catch (error: any) {
    console.error('CSV batch upload error:', error)
    res.status(500).json({ error: 'Failed to process CSV file statements.' })
  }
})

export default router
