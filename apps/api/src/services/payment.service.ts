import { PrismaClient } from '@prisma/client'
import { AuditService } from './audit.service'
import { SubscriptionService } from './subscription.service'
import axios from 'axios'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface PaymentGatewayConfig {
  gateway: string
  apiKey: string
  apiSecret: string
  webhookSecret?: string
  testMode: boolean
}

export interface PaymentData {
  subscriptionId?: string
  userId: string
  amount: number
  currency?: string
  paymentMethod: string
  description?: string
  dueDate?: Date
  metadata?: any
}

export interface CommissionData {
  paymentId: string
  type: 'upi_fee' | 'payout_commission' | 'subscription_referral' | 'reseller_margin'
  amount: number
  percentage?: number
  description?: string
  metadata?: any
}

export class PaymentService {
  private static gatewayConfigs: Map<string, PaymentGatewayConfig> = new Map()

  /**
   * Initialize payment gateway configurations
   */
  static async initializeGateways(): Promise<void> {
    const configs = await prisma.gatewayConfig.findMany({
      where: { isActive: true }
    })

    for (const config of configs) {
      this.gatewayConfigs.set(config.gateway, {
        gateway: config.gateway,
        ...config.config as any,
        testMode: config.testMode
      })
    }
  }

  /**
   * Get gateway configuration
   */
  private static getGatewayConfig(gateway: string): PaymentGatewayConfig | null {
    return this.gatewayConfigs.get(gateway) || null
  }

  /**
   * Create a payment record
   */
  static async createPayment(paymentData: PaymentData): Promise<any> {
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: paymentData.subscriptionId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        paymentMethod: paymentData.paymentMethod,
        description: paymentData.description,
        dueDate: paymentData.dueDate,
        metadata: paymentData.metadata
      }
    })

    await AuditService.log({
      userId: paymentData.userId,
      action: 'create',
      resource: 'payment',
      resourceId: payment.id,
      details: {
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod
      },
      success: true
    })

    return payment
  }

  /**
   * Process payment through gateway
   */
  static async processPayment(paymentId: string, gatewayData?: any): Promise<any> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, subscription: true }
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    const gateway = this.getGatewayConfig(payment.paymentMethod)
    if (!gateway) {
      throw new Error(`Payment gateway ${payment.paymentMethod} not configured`)
    }

    try {
      let gatewayResponse: any = null
      let gatewayId: string | null = null

      // Process based on gateway
      switch (payment.paymentMethod) {
        case 'razorpay':
          const razorpayResponse = await this.processRazorpayPayment(payment, gateway)
          gatewayResponse = razorpayResponse
          gatewayId = razorpayResponse.id
          break

        case 'phonepe':
          const phonepeResponse = await this.processPhonePePayment(payment, gateway)
          gatewayResponse = phonepeResponse
          gatewayId = phonepeResponse.transactionId
          break

        default:
          throw new Error(`Unsupported payment method: ${payment.paymentMethod}`)
      }

      // Update payment with gateway response
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          gatewayId,
          gatewayResponse,
          status: 'completed',
          paidAt: new Date()
        }
      })

      // If this is a subscription payment, update subscription
      if (payment.subscriptionId) {
        await SubscriptionService.renewSubscription(payment.subscriptionId)
      }

      // Calculate and create commissions
      await this.calculateCommissions(paymentId, payment)

      await AuditService.log({
        userId: payment.userId,
        action: 'process',
        resource: 'payment',
        resourceId: paymentId,
        details: {
          gateway: payment.paymentMethod,
          amount: payment.amount,
          status: 'completed'
        },
        success: true
      })

      return updatedPayment

    } catch (error: any) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'failed',
          gatewayResponse: { error: error.message } as any
        }
      })

      await AuditService.log({
        userId: payment.userId,
        action: 'process',
        resource: 'payment',
        resourceId: paymentId,
        details: { error: error.message },
        success: false
      })

      throw error
    }
  }

  /**
   * Process Razorpay payment
   */
  private static async processRazorpayPayment(payment: any, gateway: PaymentGatewayConfig): Promise<any> {
    const orderData = {
      amount: Math.round(payment.amount * 100), // Razorpay expects amount in paisa
      currency: payment.currency,
      receipt: `rcpt_${payment.id}`,
      notes: {
        userId: payment.userId,
        subscriptionId: payment.subscriptionId
      }
    }

    const auth = Buffer.from(`${gateway.apiKey}:${gateway.apiSecret}`).toString('base64')

    const response = await axios.post(
      gateway.testMode
        ? 'https://api.razorpay.com/v1/orders'
        : 'https://api.razorpay.com/v1/orders',
      orderData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  }

  /**
   * Process PhonePe payment
   */
  private static async processPhonePePayment(payment: any, gateway: PaymentGatewayConfig): Promise<any> {
    const transactionId = `TXN_${Date.now()}_${payment.id}`
    const payload = {
      merchantId: gateway.apiKey,
      merchantTransactionId: transactionId,
      merchantUserId: payment.userId,
      amount: Math.round(payment.amount * 100), // PhonePe expects amount in paisa
      redirectUrl: `${process.env.FRONTEND_URL}/payment/callback`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.API_URL}/api/payment/webhook/phonepe`,
      mobileNumber: payment.user?.phone || '',
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    }

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    const checksum = crypto.createHash('sha256')
      .update(base64Payload + '/pg/v1/pay' + gateway.apiSecret)
      .digest('hex') + '###1'

    const response = await axios.post(
      gateway.testMode
        ? 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/pay'
        : 'https://api.phonepe.com/apis/hermes/pg/v1/pay',
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum
        }
      }
    )

    return {
      ...response.data,
      transactionId
    }
  }

  /**
   * Calculate and create commissions
   */
  private static async calculateCommissions(paymentId: string, payment: any): Promise<void> {
    const commissions: CommissionData[] = []

    // UPI fee commission (0.5-1% based on amount)
    const upiFeeRate = payment.amount > 1000 ? 0.005 : 0.01 // 0.5% for > ₹1000, 1% for smaller
    const upiFee = payment.amount * upiFeeRate
    commissions.push({
      paymentId,
      type: 'upi_fee',
      amount: upiFee,
      percentage: upiFeeRate * 100,
      description: 'UPI transaction fee'
    })

    // Payout commission (if applicable)
    if (payment.metadata?.isPayout) {
      const payoutCommission = payment.amount * 0.002 // 0.2% payout commission
      commissions.push({
        paymentId,
        type: 'payout_commission',
        amount: payoutCommission,
        percentage: 0.2,
        description: 'Payout processing commission'
      })
    }

    // Subscription referral commission (if applicable)
    if (payment.subscriptionId && payment.metadata?.referrerId) {
      const referralCommission = payment.amount * 0.05 // 5% referral commission
      commissions.push({
        paymentId,
        type: 'subscription_referral',
        amount: referralCommission,
        percentage: 5,
        description: 'Subscription referral commission',
        metadata: { referrerId: payment.metadata.referrerId }
      })
    }

    // Reseller margin (if applicable)
    if (payment.metadata?.resellerId) {
      const resellerMargin = payment.amount * 0.20 // 20% reseller margin
      commissions.push({
        paymentId,
        type: 'reseller_margin',
        amount: resellerMargin,
        percentage: 20,
        description: 'Reseller margin',
        metadata: { resellerId: payment.metadata.resellerId }
      })
    }

    // Create commission records
    for (const commission of commissions) {
      await prisma.commission.create({
        data: commission
      })
    }
  }

  /**
   * Handle payment webhook
   */
  static async handleWebhook(gateway: string, webhookData: any, signature?: string): Promise<void> {
    const config = this.getGatewayConfig(gateway)
    if (!config) {
      throw new Error(`Gateway ${gateway} not configured`)
    }

    // Verify webhook signature
    if (signature && !this.verifyWebhookSignature(gateway, webhookData, signature, config)) {
      throw new Error('Invalid webhook signature')
    }

    let paymentId: string | null = null
    let status: string = 'unknown'

    switch (gateway) {
      case 'razorpay':
        paymentId = webhookData.payload?.payment?.entity?.notes?.paymentId
        status = webhookData.event === 'payment.captured' ? 'completed' : 'failed'
        break

      case 'phonepe':
        // PhonePe webhook handling
        paymentId = webhookData.data?.merchantTransactionId?.split('_')[2]
        status = webhookData.code === 'PAYMENT_SUCCESS' ? 'completed' : 'failed'
        break
    }

    if (paymentId && status) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          paidAt: status === 'completed' ? new Date() : undefined,
          gatewayResponse: webhookData
        }
      })

      if (status === 'completed') {
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { subscription: true }
        })

        if (payment?.subscriptionId) {
          await SubscriptionService.renewSubscription(payment.subscriptionId)
        }

        await this.calculateCommissions(paymentId, payment)
      }
    }
  }

  /**
   * Verify webhook signature
   */
  private static verifyWebhookSignature(gateway: string, data: any, signature: string, config: PaymentGatewayConfig): boolean {
    switch (gateway) {
      case 'razorpay':
        const expectedSignature = crypto
          .createHmac('sha256', config.webhookSecret!)
          .update(JSON.stringify(data))
          .digest('hex')
        return signature === expectedSignature

      case 'phonepe':
        // PhonePe signature verification
        const payload = JSON.stringify(data)
        const expectedChecksum = crypto
          .createHash('sha256')
          .update(payload + config.apiSecret)
          .digest('hex')
        return signature === expectedChecksum

      default:
        return false
    }
  }

  /**
   * Get payment history for user
   */
  static async getUserPayments(userId: string, limit: number = 50): Promise<any[]> {
    return prisma.payment.findMany({
      where: { userId },
      include: {
        subscription: {
          include: { plan: true }
        },
        commissions: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Get commission summary
   */
  static async getCommissionSummary(userId?: string): Promise<any> {
    const where = userId ? { payment: { userId } } : {}

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        payment: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
      }
    })

    const summary = {
      total: commissions.reduce((sum: number, c: any) => sum + c.amount, 0),
      byType: {} as Record<string, number>,
      pending: 0,
      paid: 0
    }

    for (const commission of commissions) {
      summary.byType[commission.type] = (summary.byType[commission.type] || 0) + commission.amount

      if (commission.status === 'pending') {
        summary.pending += commission.amount
      } else if (commission.status === 'paid') {
        summary.paid += commission.amount
      }
    }

    return summary
  }

  /**
   * Process refunds
   */
  static async processRefund(paymentId: string, amount?: number, reason?: string): Promise<any> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments')
    }

    const refundAmount = amount || payment.amount

    // Update payment with refund info
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundedAt: new Date(),
        refundAmount
      }
    })

    await AuditService.log({
      userId: payment.userId,
      action: 'refund',
      resource: 'payment',
      resourceId: paymentId,
      details: { amount: refundAmount, reason },
      success: true
    })

    return updatedPayment
  }
}
