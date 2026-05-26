import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'
import { AuditService } from '../services/audit.service'

const router: express.Router = express.Router()
const prisma = new PrismaClient()

router.use(authenticateToken)

// Bulk Import Customers
router.post('/customers', async (req, res) => {
  try {
    const { companyId } = (req as any).user!
    const { data } = req.body // Array of parsed CSV objects

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const created = await prisma.$transaction(
      data.map((item: any) => 
        prisma.customer.create({
          data: {
            companyId,
            name: item.name || 'Unnamed Customer',
            contactPerson: item.contactPerson || null,
            email: item.email || null,
            phone: item.phone || null,
            address: item.address || null,
            gstin: item.gstin || null,
            balance: parseFloat(item.balance) || 0,
            active: item.active !== undefined ? item.active : true
          }
        })
      )
    )

    await AuditService.log({
      action: 'create',
      resource: 'customer_import',
      details: { count: created.length },
      companyId,
      userId: (req as any).user!.id,
      success: true
    })

    res.json({ message: `Successfully imported ${created.length} customers`, count: created.length })
  } catch (error) {
    console.error('Customer import error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to import customers' })
  }
})

// Bulk Import Vendors
router.post('/vendors', async (req, res) => {
  try {
    const { companyId } = (req as any).user!
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const created = await prisma.$transaction(
      data.map((item: any) => 
        prisma.vendor.create({
          data: {
            companyId,
            name: item.name || 'Unnamed Vendor',
            contactPerson: item.contactPerson || null,
            email: item.email || null,
            phone: item.phone || null,
            address: item.address || null,
            gstin: item.gstin || null,
            paymentTerms: item.paymentTerms || null,
            active: item.active !== undefined ? item.active : true
          }
        })
      )
    )

    await AuditService.log({
      action: 'create',
      resource: 'vendor_import',
      details: { count: created.length },
      companyId,
      userId: (req as any).user!.id,
      success: true
    })

    res.json({ message: `Successfully imported ${created.length} vendors`, count: created.length })
  } catch (error) {
    console.error('Vendor import error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to import vendors' })
  }
})

// Bulk Import Inventory / Items
router.post('/inventory', async (req, res) => {
  try {
    const { companyId } = (req as any).user!
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const created = await prisma.$transaction(
      data.map((item: any) => 
        prisma.product.create({
          data: {
            companyId,
            name: item.name || 'Unnamed Product',
            description: item.description || null,
            sku: item.sku || null,
            barcode: item.barcode || null,
            category: item.category || null,
            unit: item.unit || 'pcs',
            minStock: parseFloat(item.minStock) || 0,
            costPrice: parseFloat(item.costPrice) || 0,
            sellingPrice: parseFloat(item.sellingPrice) || 0,
            location: item.location || null,
            active: item.active !== undefined ? item.active : true
          }
        })
      )
    )

    // Add initial stock movements for these items
    const stockMovements = created.map(product => {
      const originalItem = data.find((d: any) => (d.name === product.name && d.sku === product.sku))
      const initialStock = originalItem ? (parseFloat(originalItem.stock) || 0) : 0
      
      if (initialStock > 0) {
        return prisma.stockMovement.create({
          data: {
            productId: product.id,
            type: 'in',
            quantity: initialStock,
            reason: 'opening_stock',
            notes: 'Imported from CSV'
          }
        })
      }
      return null
    }).filter(Boolean) as any[]

    if (stockMovements.length > 0) {
      await prisma.$transaction(stockMovements)
    }

    await AuditService.log({
      action: 'create',
      resource: 'inventory_import',
      details: { count: created.length },
      companyId,
      userId: (req as any).user!.id,
      success: true
    })

    res.json({ message: `Successfully imported ${created.length} items`, count: created.length })
  } catch (error) {
    console.error('Inventory import error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to import inventory' })
  }
})

export default router
