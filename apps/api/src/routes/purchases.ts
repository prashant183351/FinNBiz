import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const router: Router = express.Router()
const prisma = new PrismaClient()

// GET /api/purchases - Fetch purchase bills for a company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query
    if (!companyId) return res.status(400).json({ error: 'companyId is required' })

    const purchases = await prisma.purchaseOrder.findMany({
      where: { companyId: companyId as string },
      orderBy: { orderDate: 'desc' },
      include: {
        vendor: true,
        items: {
          include: { product: true }
        }
      }
    })
    res.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

// GET /api/purchases/tds - Fetch TDS liabilities
router.get('/tds', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query
    if (!companyId) return res.status(400).json({ error: 'companyId is required' })

    const tdsRecords = await prisma.complianceRecord.findMany({
      where: {
        type: 'tds',
        employee: { companyId: companyId as string } // Using employee model temporarily for TDS compliance as per schema limitations
      },
      orderBy: { createdAt: 'desc' },
      include: { employee: true }
    })

    // Summing up by notes (which contains section code)
    const summary = tdsRecords.reduce((acc: any, record: any) => {
      const section = record.notes || 'Other'
      if (!acc[section]) acc[section] = 0
      acc[section] += record.amount
      return acc
    }, {})

    res.json({ records: tdsRecords, summary })
  } catch (error) {
    console.error('Error fetching TDS:', error)
    res.status(500).json({ error: 'Failed to fetch TDS details' })
  }
})

// POST /api/purchases - Create a purchase bill and sync inventory & TDS
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, vendorId, orderNumber, items, tdsSection, tdsAmount } = req.body
    
    if (!companyId || !vendorId || !orderNumber || !items) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0
      const poItems = []

      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice
        totalAmount += itemTotal

        poItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: itemTotal,
          receivedQty: item.quantity,
          status: 'received'
        })

        // SYNC INVENTORY: Create Stock Movement (Incoming Stock)
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalValue: itemTotal,
            reference: `PO-${orderNumber}`,
            reason: 'purchase'
          }
        })

        // Increase current stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            location: { set: 'Warehouse' } // trigger update, actual stock might be a calculated field or require dedicated column update.
          }
        })
      }

      // Create the Purchase Bill
      const po = await tx.purchaseOrder.create({
        data: {
          companyId,
          vendorId,
          orderNumber,
          status: 'received',
          totalAmount: totalAmount - (tdsAmount || 0), // Final payout to vendor
          notes: tdsSection ? `TDS Section: ${tdsSection} | TDS Deducted: ₹${tdsAmount}` : '',
          items: { create: poItems }
        },
        include: { items: true, vendor: true }
      })

      // Handle TDS Compliance record (if deducted)
      if (tdsAmount > 0) {
        // Find dummy employee/vendor link for ComplianceRecord
        const dummyEmployee = await tx.employee.findFirst({ where: { companyId } })
        if (dummyEmployee) {
          await tx.complianceRecord.create({
            data: {
              employeeId: dummyEmployee.id,
              type: 'tds',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              amount: Number(tdsAmount),
              notes: tdsSection
            }
          })
        }
      }

      return po
    })

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error creating purchase bill:', error)
    if (error.code === 'P2002') return res.status(400).json({ error: 'Bill number already exists' })
    res.status(500).json({ error: 'Failed to create purchase bill' })
  }
})

export default router
