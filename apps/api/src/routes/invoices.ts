import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, requireCompanyAccess } from '../middleware/auth'

const router: Router = Router()
const prisma = new PrismaClient()

// Helper function to extract state code from GSTIN
const getStateCode = (gstin?: string | null): string => {
  if (!gstin || gstin.trim().length < 2) return ''
  const code = gstin.trim().substring(0, 2)
  return /^[0-9]{2}$/.test(code) ? code : ''
}

// Helper to calculate running balance for general ledger entries
const createLedgerEntryHelper = async (tx: any, data: {
  companyId: string
  account: string
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  debit: number
  credit: number
  description: string
  refType: string
  refId: string
}) => {
  const lastEntry = await tx.ledgerEntry.findFirst({
    where: {
      companyId: data.companyId,
      account: data.account,
    },
    orderBy: { createdAt: 'desc' },
  })

  const previousBalance = lastEntry?.balance || 0
  const newBalance = previousBalance + data.debit - data.credit

  return await tx.ledgerEntry.create({
    data: {
      ...data,
      balance: newBalance,
    },
  })
}

// GET /api/invoices - Get all invoices for a company
router.get('/', authenticateToken, requireCompanyAccess(['invoices.view']), async (req, res) => {
  try {
    const companyId = req.query.companyId as string

    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(invoices)
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

// GET /api/invoices/:id - Get single invoice details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        company: true
      }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    res.json(invoice)
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
})

// POST /api/invoices - Create a new draft invoice
router.post('/', authenticateToken, requireCompanyAccess(['invoices.create']), async (req, res) => {
  try {
    const {
      companyId,
      customerName,
      customerGSTIN,
      items = [],
      currency = 'INR',
      exchangeRate = 1.0
    } = req.body

    if (!companyId || !customerName) {
      return res.status(400).json({ error: 'Company ID and Customer Name are required' })
    }

    // Lookup seller company to find its GSTIN for tax split calculation
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const sellerState = getStateCode(company.gstin)
    const buyerState = getStateCode(customerGSTIN)

    // If buyer has no valid GSTIN, default to intra-state (CGST/SGST)
    const isInterState = sellerState && buyerState && sellerState !== buyerState

    let subtotal = 0
    let totalGST = 0

    // Map items with dynamic tax splits
    const processedItems = items.map((item: any) => {
      const quantity = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.rate) || 0
      const gstRate = parseFloat(item.gstRate) || 0
      const amount = quantity * rate
      const taxAmount = (amount * gstRate) / 100

      let cgst = 0
      let sgst = 0
      let igst = 0

      if (isInterState) {
        igst = taxAmount
      } else {
        cgst = taxAmount / 2
        sgst = taxAmount / 2
      }

      subtotal += amount
      totalGST += taxAmount

      return {
        description: item.description || 'Line Item',
        hsnCode: item.hsnCode || null,
        quantity,
        rate,
        amount,
        gstRate,
        cgst,
        sgst,
        igst
      }
    })

    const totalAmount = subtotal + totalGST

    // Generate random temporary draft number
    const tempDraftNumber = `DRAFT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    const result = await prisma.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber: tempDraftNumber,
          customerName,
          customerGSTIN,
          subtotal,
          totalGST,
          totalAmount,
          status: 'draft',
          currency,
          exchangeRate: parseFloat(exchangeRate as string) || 1.0,
          items: {
            create: processedItems
          }
        },
        include: {
          items: true
        }
      })

      return invoice
    })

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

// PUT /api/invoices/:id - Update draft invoice properties and items
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const {
      customerName,
      customerGSTIN,
      items = [],
      currency = 'INR',
      exchangeRate = 1.0
    } = req.body

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (existingInvoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be updated' })
    }

    const company = await prisma.company.findUnique({
      where: { id: existingInvoice.companyId }
    })

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const sellerState = getStateCode(company.gstin)
    const buyerState = getStateCode(customerGSTIN)
    const isInterState = sellerState && buyerState && sellerState !== buyerState

    let subtotal = 0
    let totalGST = 0

    const processedItems = items.map((item: any) => {
      const quantity = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.rate) || 0
      const gstRate = parseFloat(item.gstRate) || 0
      const amount = quantity * rate
      const taxAmount = (amount * gstRate) / 100

      let cgst = 0
      let sgst = 0
      let igst = 0

      if (isInterState) {
        igst = taxAmount
      } else {
        cgst = taxAmount / 2
        sgst = taxAmount / 2
      }

      subtotal += amount
      totalGST += taxAmount

      return {
        description: item.description || 'Line Item',
        hsnCode: item.hsnCode || null,
        quantity,
        rate,
        amount,
        gstRate,
        cgst,
        sgst,
        igst
      }
    })

    const totalAmount = subtotal + totalGST

    const result = await prisma.$transaction(async (tx: any) => {
      // Delete old items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })

      // Update invoice and add new items
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          customerName,
          customerGSTIN,
          subtotal,
          totalGST,
          totalAmount,
          currency,
          exchangeRate: parseFloat(exchangeRate as string) || 1.0,
          items: {
            create: processedItems
          }
        },
        include: {
          items: true
        }
      })

      return updatedInvoice
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    res.status(500).json({ error: 'Failed to update invoice' })
  }
})

// DELETE /api/invoices/:id - Delete draft invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (existingInvoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be deleted' })
    }

    await prisma.invoice.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    res.status(500).json({ error: 'Failed to delete invoice' })
  }
})

// POST /api/invoices/:id/finalize - Transition invoice from draft to finalize
router.post('/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Invoice is already finalized' })
    }

    const currentYear = new Date().getFullYear()

    const result = await prisma.$transaction(async (tx: any) => {
      // Count finalized invoices to set serial invoice number
      const finalizedCount = await tx.invoice.count({
        where: {
          companyId: invoice.companyId,
          status: { in: ['finalized', 'paid'] }
        }
      })

      const finalInvoiceNumber = `INV-${currentYear}-${(finalizedCount + 1).toString().padStart(4, '0')}`

      // Update invoice record to finalized
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: finalInvoiceNumber,
          status: 'finalized'
        },
        include: {
          items: true
        }
      })

      // =======================================================================
      // DOUBLE-ENTRY BOOKKEEPING LEDGER POSTINGS
      // =======================================================================
      
      // 1. DEBIT: Accounts Receivable (Asset)
      await createLedgerEntryHelper(tx, {
        companyId: invoice.companyId,
        account: 'Accounts Receivable',
        accountType: 'asset',
        debit: invoice.totalAmount,
        credit: 0,
        description: `Revenue invoice finalized: ${finalInvoiceNumber}`,
        refType: 'invoice',
        refId: invoice.id
      })

      // 2. CREDIT: Sales Revenue (Income)
      await createLedgerEntryHelper(tx, {
        companyId: invoice.companyId,
        account: 'Sales Revenue',
        accountType: 'income',
        debit: 0,
        credit: invoice.subtotal,
        description: `Sales revenue recorded: ${finalInvoiceNumber}`,
        refType: 'invoice',
        refId: invoice.id
      })

      // 3. CREDIT: GST Payable (Liability)
      if (invoice.totalGST > 0) {
        await createLedgerEntryHelper(tx, {
          companyId: invoice.companyId,
          account: 'GST Payable',
          accountType: 'liability',
          debit: 0,
          credit: invoice.totalGST,
          description: `GST Output Liability: ${finalInvoiceNumber}`,
          refType: 'invoice',
          refId: invoice.id
        })
      }

      return updatedInvoice
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error finalizing invoice:', error)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Invoice serial number generation collision. Please try again.' })
    }
    res.status(500).json({ error: 'Failed to finalize invoice' })
  }
})

// POST /api/invoices/:id/pay - Mark a finalized invoice as paid
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (invoice.status !== 'finalized') {
      return res.status(400).json({ error: 'Invoice must be in finalized status to register payment' })
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: 'paid'
        }
      })

      // =======================================================================
      // PAYMENT BOOKKEEPING POSTINGS
      // =======================================================================

      // 1. DEBIT: Bank Account / Cash (Asset)
      await createLedgerEntryHelper(tx, {
        companyId: invoice.companyId,
        account: 'Bank Account',
        accountType: 'asset',
        debit: invoice.totalAmount,
        credit: 0,
        description: `Payment received for invoice: ${invoice.invoiceNumber}`,
        refType: 'invoice',
        refId: invoice.id
      })

      // 2. CREDIT: Accounts Receivable (Asset) - offset AR balance
      await createLedgerEntryHelper(tx, {
        companyId: invoice.companyId,
        account: 'Accounts Receivable',
        accountType: 'asset',
        debit: 0,
        credit: invoice.totalAmount,
        description: `Invoice settlement: ${invoice.invoiceNumber}`,
        refType: 'invoice',
        refId: invoice.id
      })

      return updatedInvoice
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error marking invoice as paid:', error)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

// POST /api/invoices/:id/e-invoice - Generate Simulated IRP E-Invoice (IRN and Signed QR)
router.post('/:id/e-invoice', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Generate a valid 64-character SHA-256 IRN simulation hash
    const crypto = await import('crypto')
    const irnHash = crypto.createHash('sha256')
      .update(`${invoice.invoiceNumber}-${invoice.totalAmount}-${Date.now()}`)
      .digest('hex')

    // Construct standard visual Government QR URL containing signed invoice parameters
    const encodedIrn = encodeURIComponent(irnHash)
    const qrPayload = `irn:${encodedIrn},amt:${invoice.totalAmount},num:${invoice.invoiceNumber},gst:${invoice.totalGST}`
    const mockGovQrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(qrPayload)}`

    // Save generated IRN to database
    await prisma.invoice.update({
      where: { id },
      data: { irn: irnHash }
    })

    res.status(200).json({
      success: true,
      irn: irnHash,
      qrUrl: mockGovQrUrl,
      message: 'Simulated Government E-Invoice generated successfully via IRP Portal Sandbox!'
    })
  } catch (error: any) {
    console.error('Error generating simulated e-invoice:', error)
    res.status(500).json({ error: 'Failed to generate simulated E-Invoice' })
  }
})

// POST /api/invoices/:id/e-waybill - Generate Simulated NIC GST E-Way Bill Number
router.post('/:id/e-waybill', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { transporterId, vehicleNumber, distance } = req.body

    if (!transporterId || !vehicleNumber) {
      return res.status(400).json({ error: 'Transporter ID and Vehicle Number are required' })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Generate legal-looking 12-digit E-Way Bill Number starting with state code (e.g. Maharashtra 27)
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000)
    const ewayBillNumber = `27${randomDigits}`

    // Save E-Way Bill to database
    await prisma.invoice.update({
      where: { id },
      data: {
        ewayBillNumber,
        ewayTransporterId: transporterId,
        ewayVehicleNumber: vehicleNumber,
        ewayDistance: distance ? parseFloat(distance) : null
      }
    })

    res.status(200).json({
      success: true,
      ewayBillNumber,
      transporterId,
      vehicleNumber,
      distance: distance || 100,
      generatedAt: new Date().toISOString(),
      message: 'Simulated NIC E-Way Bill generated successfully!'
    })
  } catch (error: any) {
    console.error('Error generating simulated e-way bill:', error)
    res.status(500).json({ error: 'Failed to generate simulated E-Way Bill' })
  }
})

// POST /api/invoices/:id/send-whatsapp - Simulate WhatsApp sharing
router.post('/:id/send-whatsapp', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone Number is required' })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Update database logs for WhatsApp dispatch
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        whatsappSentAt: new Date(),
        whatsappPhone: phoneNumber
      }
    })

    res.status(200).json({
      success: true,
      whatsappPhone: phoneNumber,
      whatsappSentAt: updated.whatsappSentAt,
      message: 'Simulated WhatsApp dispatch successful!'
    })
  } catch (error: any) {
    console.error('Error sharing invoice on WhatsApp:', error)
    res.status(500).json({ error: 'Failed to simulate WhatsApp dispatch' })
  }
})

// PUT /api/invoices/:id/e-waybill/vehicle - Update Vehicle detail (Part-B)
router.put('/:id/e-waybill/vehicle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { vehicleNumber, reason } = req.body

    if (!vehicleNumber) {
      return res.status(400).json({ error: 'New Vehicle Number is required' })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (!invoice.ewayBillNumber) {
      return res.status(400).json({ error: 'E-Way Bill has not been generated for this invoice yet.' })
    }

    // Update vehicle details in the E-Way bill system (Part-B)
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ewayVehicleNumber: vehicleNumber,
        ewayPartBReason: reason || 'Transshipment'
      }
    })

    res.status(200).json({
      success: true,
      ewayVehicleNumber: updated.ewayVehicleNumber,
      ewayPartBReason: updated.ewayPartBReason,
      message: 'Simulated NIC E-Way Bill Part-B vehicle updated successfully!'
    })
  } catch (error: any) {
    console.error('Error updating E-Way Bill vehicle:', error)
    res.status(500).json({ error: 'Failed to update E-Way Bill vehicle' })
  }
})

export default router
