import express, { Router } from 'express'
import { authenticateToken, requireCompanyAccess } from '../middleware/auth'
import { auditLogger } from '../middleware/audit'
import { InventoryService } from '../services/inventory.service'

const router: Router = express.Router()

// Apply authentication and audit logging to all inventory routes
router.use(authenticateToken)
router.use(auditLogger())

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

// POST /api/inventory/products - Create or update product
router.post('/products', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const productData = req.body
    const createdBy = (req as any).userId

    const product = await InventoryService.createOrUpdateProduct(productData, createdBy)
    res.json(product)
  } catch (error) {
    console.error('Error creating/updating product:', error)
    res.status(500).json({ error: 'Failed to create or update product' })
  }
})

// GET /api/inventory/products - Get products
router.get('/products', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const {
      category,
      supplierId,
      lowStock,
      search,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as any).companyId!

    const products = await InventoryService.getProducts(
      companyId,
      {
        category: category as string,
        supplierId: supplierId as string,
        lowStock: lowStock === 'true',
        search: search as string
      },
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// GET /api/inventory/products/:productId/stock - Get current stock for product
router.get('/products/:productId/stock', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const { productId } = req.params
    const currentStock = await InventoryService.getCurrentStock(productId)
    res.json({ productId, currentStock })
  } catch (error) {
    console.error('Error fetching product stock:', error)
    res.status(500).json({ error: 'Failed to fetch product stock' })
  }
})

// ============================================================================
// STOCK MOVEMENT MANAGEMENT
// ============================================================================

// POST /api/inventory/stock/movement - Record stock movement
router.post('/stock/movement', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const movementData = req.body
    const movement = await InventoryService.recordStockMovement(movementData)
    res.json(movement)
  } catch (error) {
    console.error('Error recording stock movement:', error)
    res.status(500).json({ error: 'Failed to record stock movement' })
  }
})

// GET /api/inventory/stock/movements - Get stock movements
router.get('/stock/movements', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const {
      productId,
      type,
      limit = '100',
      offset = '0'
    } = req.query

    const companyId = (req as any).companyId!

    const movements = await InventoryService.getStockMovements(
      productId as string,
      companyId,
      type as string,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(movements)
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    res.status(500).json({ error: 'Failed to fetch stock movements' })
  }
})

// ============================================================================
// VENDOR MANAGEMENT
// ============================================================================

// POST /api/inventory/vendors - Create or update vendor
router.post('/vendors', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const vendorData = req.body
    const createdBy = (req as any).userId

    const vendor = await InventoryService.createOrUpdateVendor(vendorData, createdBy)
    res.json(vendor)
  } catch (error) {
    console.error('Error creating/updating vendor:', error)
    res.status(500).json({ error: 'Failed to create or update vendor' })
  }
})

// GET /api/inventory/vendors - Get vendors
router.get('/vendors', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const {
      search,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as any).companyId!

    const vendors = await InventoryService.getVendors(
      companyId,
      search as string,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    res.status(500).json({ error: 'Failed to fetch vendors' })
  }
})

// ============================================================================
// PURCHASE ORDER MANAGEMENT
// ============================================================================

// POST /api/inventory/purchase-orders - Create purchase order
router.post('/purchase-orders', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const orderData = req.body
    const order = await InventoryService.createPurchaseOrder(orderData)
    res.json(order)
  } catch (error) {
    console.error('Error creating purchase order:', error)
    res.status(500).json({ error: 'Failed to create purchase order' })
  }
})

// GET /api/inventory/purchase-orders - Get purchase orders
router.get('/purchase-orders', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const {
      status,
      vendorId,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as any).companyId!

    const orders = await InventoryService.getPurchaseOrders(
      companyId,
      status as string,
      vendorId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(orders)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    res.status(500).json({ error: 'Failed to fetch purchase orders' })
  }
})

// PUT /api/inventory/purchase-orders/:orderId/status - Update purchase order status
router.put('/purchase-orders/:orderId/status', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, notes } = req.body
    const updatedBy = (req as any).userId

    const order = await InventoryService.updatePurchaseOrderStatus(
      orderId,
      status,
      updatedBy,
      notes
    )

    res.json(order)
  } catch (error) {
    console.error('Error updating purchase order status:', error)
    res.status(500).json({ error: 'Failed to update purchase order status' })
  }
})

// ============================================================================
// STOCK ALERTS MANAGEMENT
// ============================================================================

// GET /api/inventory/alerts - Get stock alerts
router.get('/alerts', requireCompanyAccess(['products.view']), async (req, res) => {
  try {
    const companyId = (req as any).companyId!
    const alerts = await InventoryService.getStockAlerts(companyId)
    res.json(alerts)
  } catch (error) {
    console.error('Error fetching stock alerts:', error)
    res.status(500).json({ error: 'Failed to fetch stock alerts' })
  }
})

// PUT /api/inventory/alerts/:alertId/resolve - Resolve stock alert
router.put('/alerts/:alertId/resolve', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const { alertId } = req.params
    const resolvedBy = (req as any).userId

    await InventoryService.resolveStockAlert(alertId, resolvedBy)
    res.json({ message: 'Alert resolved successfully' })
  } catch (error) {
    console.error('Error resolving stock alert:', error)
    res.status(500).json({ error: 'Failed to resolve stock alert' })
  }
})

// ============================================================================
// REPORTS AND ANALYTICS
// ============================================================================

// GET /api/inventory/reports/valuation - Get stock valuation report
router.get('/reports/valuation', requireCompanyAccess(['reports.view']), async (req, res) => {
  try {
    const companyId = (req as any).companyId!
    const report = await InventoryService.getStockValuation(companyId)
    res.json(report)
  } catch (error) {
    console.error('Error generating stock valuation report:', error)
    res.status(500).json({ error: 'Failed to generate stock valuation report' })
  }
})

// ============================================================================
// AUTOMATED OPERATIONS
// ============================================================================

// POST /api/inventory/auto-purchase-orders - Generate auto purchase orders for low stock
router.post('/auto-purchase-orders', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const companyId = (req as any).companyId!
    const generatedBy = (req as any).userId

    const orders = await InventoryService.generateAutoPurchaseOrders(companyId, generatedBy)
    res.json({
      message: `Generated ${orders.length} auto purchase orders`,
      orders
    })
  } catch (error) {
    console.error('Error generating auto purchase orders:', error)
    res.status(500).json({ error: 'Failed to generate auto purchase orders' })
  }
})

// ============================================================================
// BARCODE/QR SCANNING SUPPORT
// ============================================================================

// POST /api/inventory/scan - Process barcode/QR scan
router.post('/scan', requireCompanyAccess(['products.manage']), async (req, res) => {
  try {
    const { barcode, type, productId, quantity } = req.body
    const performedBy = (req as any).userId
    const companyId = (req as any).companyId!

    let product
    let movement

    if (type === 'product_lookup') {
      // Find product by barcode
      product = await InventoryService.getProducts(companyId, { search: barcode }, 1, 0)
      if (product.length > 0) {
        const currentStock = await InventoryService.getCurrentStock(product[0].id)
        res.json({
          product: product[0],
          currentStock,
          action: 'lookup'
        })
      } else {
        res.status(404).json({ error: 'Product not found' })
      }
    } else if (type === 'stock_in') {
      // Record stock in
      movement = await InventoryService.recordStockMovement({
        productId,
        type: 'in',
        quantity,
        reference: `Scanned: ${barcode}`,
        reason: 'purchase',
        performedBy
      })
      res.json({ movement, action: 'stock_in' })
    } else if (type === 'stock_out') {
      // Record stock out
      movement = await InventoryService.recordStockMovement({
        productId,
        type: 'out',
        quantity: -Math.abs(quantity), // Ensure negative for out
        reference: `Scanned: ${barcode}`,
        reason: 'sale',
        performedBy
      })
      res.json({ movement, action: 'stock_out' })
    } else {
      res.status(400).json({ error: 'Invalid scan type' })
    }
  } catch (error) {
    console.error('Error processing scan:', error)
    res.status(500).json({ error: 'Failed to process scan' })
  }
})

export default router
