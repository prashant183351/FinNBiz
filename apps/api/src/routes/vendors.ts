import express, { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, requireCompanyAccess } from '../middleware/auth'

const router: Router = express.Router()
const prisma = new PrismaClient()

// GET /api/vendors - Fetch all vendors for the active company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.query
    if (!companyId) return res.status(400).json({ error: 'companyId is required' })

    const vendors = await prisma.vendor.findMany({
      where: { companyId: companyId as string },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      }
    })

    res.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    res.status(500).json({ error: 'Failed to fetch vendors' })
  }
})

// POST /api/vendors - Create a new vendor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { companyId, name, gstin, phone, email, address } = req.body

    if (!companyId || !name) {
      return res.status(400).json({ error: 'CompanyId and Vendor Name are required' })
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyId,
        name,
        gstin,
        phone,
        email,
        address
      }
    })

    res.status(201).json(vendor)
  } catch (error) {
    console.error('Error creating vendor:', error)
    res.status(500).json({ error: 'Failed to create vendor' })
  }
})

// DELETE /api/vendors/:id - Delete a vendor
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    await prisma.vendor.delete({
      where: { id }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting vendor:', error)
    res.status(500).json({ error: 'Failed to delete vendor' })
  }
})

export default router
