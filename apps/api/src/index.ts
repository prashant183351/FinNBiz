import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import expenseRoutes from './routes/expenses'
import authRoutes from './routes/auth'
import companyRoutes from './routes/companies'
import employeeRoutes from './routes/employees'
import transactionRoutes from './routes/transactions'
import reportRoutes from './routes/reports'
import upiRoutes from './routes/upi'
import adminRoutes from './routes/admin'
import hrRoutes from './routes/hr'
import inventoryRoutes from './routes/inventory'
import subscriptionRoutes from './routes/subscription'
import paymentRoutes from './routes/payment'
import invoiceRoutes from './routes/invoices'
import vendorsRoutes from './routes/vendors'
import purchasesRoutes from './routes/purchases'
import importRoutes from './routes/import'
import backupRoutes from './routes/backups'
import { authenticateToken } from './middleware/auth'
import { auditLogger } from './middleware/audit'
import { PermissionsService } from './services/permissions.service'
import { SubscriptionService } from './services/subscription.service'
import { PaymentService } from './services/payment.service'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(compression())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'finnbiz-api'
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/upi', upiRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/hr', hrRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/vendors', vendorsRoutes)
app.use('/api/purchases', purchasesRoutes)
app.use('/api/import', importRoutes)
app.use('/api/backups', backupRoutes)

// Apply audit logging to all API routes (except auth)
app.use('/api', auditLogger({
  excludePaths: ['/api/auth/login', '/api/auth/refresh', '/api/health']
}))

// Basic 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(PORT, async () => {
  console.log(`🚀 FinNbiz API server running on port ${PORT}`)

  // Initialize default permissions, roles, and plans
  try {
    console.log('🔐 Initializing permissions and roles...')
    await PermissionsService.initializeDefaultPermissions()
    console.log('✅ Permissions and roles initialized')

    console.log('💳 Initializing subscription plans...')
    await SubscriptionService.initializeDefaultPlans()
    console.log('✅ Subscription plans initialized')

    console.log('💰 Initializing payment gateways...')
    await PaymentService.initializeGateways()
    console.log('✅ Payment gateways initialized')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
  }
})
