import { PrismaClient } from '@prisma/client'
import { AuditService } from './audit.service'

const prisma = new PrismaClient()

export interface PlanData {
  name: string
  displayName: string
  description?: string
  price: number
  currency?: string
  billingCycle?: 'monthly' | 'yearly'
  features?: any
  limits?: any
  isActive?: boolean
  sortOrder?: number
}

export interface SubscriptionData {
  userId: string
  planId: string
  companyId?: string
  trialDays?: number
  metadata?: any
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

function parsePlanFields(plan: any): any {
  if (!plan) return plan
  const parsedPlan = { ...plan }
  if (typeof parsedPlan.features === 'string') {
    try {
      parsedPlan.features = JSON.parse(parsedPlan.features)
    } catch (e) {
      parsedPlan.features = {}
    }
  }
  if (typeof parsedPlan.limits === 'string') {
    try {
      parsedPlan.limits = JSON.parse(parsedPlan.limits)
    } catch (e) {
      parsedPlan.limits = {}
    }
  }
  return parsedPlan
}

export class SubscriptionService {
  /**
   * Create or update a plan
   */
  static async createOrUpdatePlan(planData: PlanData): Promise<any> {
    const data = {
      ...planData,
      features: typeof planData.features === 'object' ? JSON.stringify(planData.features) : planData.features,
      limits: typeof planData.limits === 'object' ? JSON.stringify(planData.limits) : planData.limits
    }
    const plan = await prisma.plan.upsert({
      where: { name: planData.name },
      update: data,
      create: data
    })

    await AuditService.log({
      action: 'create',
      resource: 'plan',
      resourceId: plan.id,
      details: { name: planData.name, price: planData.price },
      success: true
    })

    return parsePlanFields(plan)
  }

  /**
   * Get all active plans
   */
  static async getActivePlans(): Promise<any[]> {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
    return plans.map((plan: any) => parsePlanFields(plan))
  }

  /**
   * Get plan by ID or name
   */
  static async getPlan(planId: string): Promise<any | null> {
    const plan = await (prisma.plan.findUnique({
      where: { id: planId }
    }) || prisma.plan.findUnique({
      where: { name: planId }
    }))
    return parsePlanFields(plan)
  }

  /**
   * Create a subscription
   */
  static async createSubscription(subscriptionData: SubscriptionData): Promise<any> {
    const plan = await this.getPlan(subscriptionData.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const now = new Date()
    const currentPeriodStart = now
    const currentPeriodEnd = new Date(now)

    if (plan.billingCycle === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    const trialEnd = subscriptionData.trialDays
      ? new Date(now.getTime() + subscriptionData.trialDays * 24 * 60 * 60 * 1000)
      : null

    const subscription = await prisma.subscription.create({
      data: {
        userId: subscriptionData.userId,
        planId: plan.id,
        companyId: subscriptionData.companyId,
        currentPeriodStart,
        currentPeriodEnd,
        trialEnd,
        metadata: subscriptionData.metadata
      },
      include: {
        plan: true,
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    if (subscription && subscription.plan) {
      subscription.plan = parsePlanFields(subscription.plan)
    }

    await AuditService.log({
      userId: subscriptionData.userId,
      action: 'create',
      resource: 'subscription',
      resourceId: subscription.id,
      details: {
        planId: plan.name,
        trialDays: subscriptionData.trialDays
      },
      success: true
    })

    return subscription
  }

  /**
   * Get user's active subscription
   */
  static async getUserSubscription(userId: string, companyId?: string): Promise<any | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        companyId,
        status: 'active'
      },
      include: {
        plan: true,
        payments: {
          where: { status: 'completed' },
          orderBy: { paidAt: 'desc' },
          take: 1
        }
      }
    })
    if (subscription && subscription.plan) {
      subscription.plan = parsePlanFields(subscription.plan)
    }
    return subscription
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, userId: string, cancelAtPeriodEnd: boolean = true): Promise<any> {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd,
        cancelledAt: cancelAtPeriodEnd ? null : new Date(),
        status: cancelAtPeriodEnd ? 'active' : 'cancelled'
      },
      include: { plan: true }
    })

    await AuditService.log({
      userId,
      action: 'cancel',
      resource: 'subscription',
      resourceId: subscriptionId,
      details: { cancelAtPeriodEnd },
      success: true
    })

    return subscription
  }

  /**
   * Upgrade/downgrade subscription
   */
  static async changePlan(subscriptionId: string, newPlanId: string, userId: string): Promise<any> {
    const newPlan = await this.getPlan(newPlanId)
    if (!newPlan) {
      throw new Error('New plan not found')
    }

    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlan.id
      },
      include: { plan: true }
    })

    await AuditService.log({
      userId,
      action: 'update',
      resource: 'subscription',
      resourceId: subscriptionId,
      details: { newPlan: newPlan.name },
      success: true
    })

    return subscription
  }

  /**
   * Process subscription renewal
   */
  static async renewSubscription(subscriptionId: string): Promise<any> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const newPeriodStart = subscription.currentPeriodEnd
    const newPeriodEnd = new Date(newPeriodStart)

    if (subscription.plan.billingCycle === 'yearly') {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
    } else {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
    }

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd
      }
    })
  }

  /**
   * Check if user has access to a feature
   */
  static async checkFeatureAccess(userId: string, feature: string, companyId?: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId, companyId)

    if (!subscription) {
      // Check if free tier allows this feature
      const freePlan = await prisma.plan.findUnique({
        where: { name: 'free' }
      })
      const parsedFreePlan = parsePlanFields(freePlan)
      return parsedFreePlan?.features?.[feature] || false
    }

    // Check plan features
    return subscription.plan.features?.[feature] || false
  }

  /**
   * Check usage limits
   */
  static async checkUsageLimit(userId: string, resource: string, companyId?: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getUserSubscription(userId, companyId)

    if (!subscription) {
      const freePlan = await prisma.plan.findUnique({
        where: { name: 'free' }
      })
      const parsedFreePlan = parsePlanFields(freePlan)
      const limit = parsedFreePlan?.limits?.[resource] || 0
      const current = await this.getCurrentUsage(userId, resource, companyId)
      return { allowed: current < limit, current, limit }
    }

    const limit = subscription.plan.limits?.[resource] || 0
    const current = await this.getCurrentUsage(userId, resource, companyId)
    return { allowed: current < limit, current, limit }
  }

  /**
   * Get current usage for a resource
   */
  private static async getCurrentUsage(userId: string, resource: string, companyId?: string): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const usages = await prisma.usage.findMany({
      where: {
        userId,
        action: resource,
        createdAt: {
          gte: startOfMonth
        }
      }
    })

    return usages.reduce((sum: number, usage: any) => sum + usage.quantity, 0)
  }

  /**
   * Record usage
   */
  static async recordUsage(subscriptionId: string | null, userId: string, action: string, quantity: number = 1, cost: number = 0, metadata?: any): Promise<any> {
    return prisma.usage.create({
      data: {
        subscriptionId,
        userId,
        action,
        quantity,
        cost,
        metadata
      }
    })
  }

  /**
   * Initialize default plans
   */
  static async initializeDefaultPlans(): Promise<void> {
    const defaultPlans: PlanData[] = [
      {
        name: 'free',
        displayName: 'Free Tier',
        description: 'Perfect for freelancers and small businesses getting started',
        price: 0,
        billingCycle: 'monthly' as const,
        features: {
          companies: 1,
          invoices: true,
          expenses: true,
          reports: true,
          employees: 5,
          inventory: false,
          ai: false
        },
        limits: {
          companies: 1,
          invoices: 50,
          expenses: 100,
          employees: 5
        },
        sortOrder: 0
      },
      {
        name: 'starter',
        displayName: 'Starter',
        description: 'For growing businesses needing more features',
        price: 299,
        billingCycle: 'monthly' as const,
        features: {
          companies: 3,
          invoices: true,
          expenses: true,
          reports: true,
          employees: 25,
          inventory: true,
          ai: false
        },
        limits: {
          companies: 3,
          invoices: 500,
          expenses: 1000,
          employees: 25
        },
        sortOrder: 1
      },
      {
        name: 'pro',
        displayName: 'Pro',
        description: 'Complete business management solution',
        price: 999,
        billingCycle: 'monthly' as const,
        features: {
          companies: 10,
          invoices: true,
          expenses: true,
          reports: true,
          employees: 100,
          inventory: true,
          ai: true,
          payroll: true
        },
        limits: {
          companies: 10,
          invoices: 2000,
          expenses: 5000,
          employees: 100
        },
        sortOrder: 2
      },
      {
        name: 'premium_ai',
        displayName: 'Premium AI',
        description: 'AI-powered business intelligence and automation',
        price: 2499,
        billingCycle: 'monthly' as const,
        features: {
          companies: 25,
          invoices: true,
          expenses: true,
          reports: true,
          employees: 500,
          inventory: true,
          ai: true,
          payroll: true,
          analytics: true,
          integrations: true
        },
        limits: {
          companies: 25,
          invoices: 10000,
          expenses: 25000,
          employees: 500
        },
        sortOrder: 3
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise',
        description: 'Custom enterprise solution with white-label options',
        price: 0, // Custom pricing
        billingCycle: 'yearly' as const,
        features: {
          companies: -1, // Unlimited
          invoices: true,
          expenses: true,
          reports: true,
          employees: -1,
          inventory: true,
          ai: true,
          payroll: true,
          analytics: true,
          integrations: true,
          whiteLabel: true,
          api: true
        },
        limits: {}, // No limits
        sortOrder: 4
      }
    ]

    for (const plan of defaultPlans) {
      await this.createOrUpdatePlan(plan)
    }
  }
}
