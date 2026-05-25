import { Queue, Worker } from 'bullmq'
// @ts-ignore
import { InventoryService } from '../../../api/src/services/inventory.service'
// @ts-ignore
import { AuditService } from '../../../api/src/services/audit.service'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export class InventoryMonitor {
  private static queue: Queue
  private static worker: Worker

  static init() {
    // Create inventory monitor queue
    // @ts-ignore
    this.queue = new Queue('inventory-queue', {
      connection: { url: REDIS_URL } as any
    })

    // Create worker to process inventory monitoring jobs
    this.worker = new Worker('inventory-queue', async (job) => {
      const { type, companyId, userId } = job.data

      console.log(`Starting inventory ${type} job ${job.id}`)

      try {
        switch (type) {
          case 'check_alerts':
            await this.performCheckStockAlerts(companyId)
            break
          case 'generate_auto_po':
            await this.performGenerateAutoPurchaseOrders(companyId, userId)
            break
          default:
            throw new Error(`Unknown job type: ${type}`)
        }

        console.log(`Inventory job ${job.id} completed successfully`)
        return { success: true }
      } catch (error) {
        console.error(`Inventory job ${job.id} failed:`, error)
        throw error
      }
    // @ts-ignore
    }, {
      connection: { url: REDIS_URL } as any
    })

    // Handle worker events
    this.worker.on('completed', (job) => {
      console.log(`Inventory job ${job.id} completed`)
    })

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`Inventory job ${job.id} failed:`, err)
      } else {
        console.error(`Unknown inventory job failed:`, err)
      }
    })
  }

  static async start() {
    console.log('🚀 Starting Inventory Monitor...')

    // Schedule daily inventory checks
    await this.scheduleDailyChecks()

    console.log('✅ Inventory monitor started')
  }

  static async stop() {
    console.log('Stopping Inventory Monitor...')

    if (this.worker) {
      await this.worker.close()
    }

    if (this.queue) {
      await this.queue.close()
    }

    console.log('✅ Inventory monitor stopped')
  }

  /**
   * Schedule daily inventory monitoring
   */
  private static async scheduleDailyChecks() {
    // Check stock alerts every 6 hours
    await this.queue.add(
      'daily-stock-alerts',
      {
        type: 'check_alerts',
        companyId: null // Check all companies
      },
      {
        repeat: {
          pattern: '0 */6 * * *' // Every 6 hours
        },
        jobId: 'daily-stock-alerts'
      }
    )

    // Generate auto POs daily at 9 AM
    await this.queue.add(
      'daily-auto-po',
      {
        type: 'generate_auto_po',
        companyId: null, // For all companies
        userId: 'system' // System-generated
      },
      {
        repeat: {
          pattern: '0 9 * * *' // Every day at 9 AM
        },
        jobId: 'daily-auto-po'
      }
    )

    console.log('📅 Inventory monitoring scheduled')
  }

  /**
   * Manually trigger stock alert check
   */
  static async checkStockAlerts(companyId?: string) {
    const job = await this.queue.add('manual-stock-check', {
      type: 'check_alerts',
      companyId
    })

    console.log(`Stock alert check job queued: ${job.id}`)
    return job
  }

  /**
   * Manually trigger auto PO generation
   */
  static async generateAutoPurchaseOrders(companyId: string, userId: string) {
    const job = await this.queue.add('manual-auto-po', {
      type: 'generate_auto_po',
      companyId,
      userId
    })

    console.log(`Auto PO generation job queued: ${job.id}`)
    return job
  }

  /**
   * Check stock alerts for companies
   */
  private static async performCheckStockAlerts(companyId?: string) {
    // If companyId is provided, check only that company
    // Otherwise, we'd need to get all companies from database
    // For now, this is a placeholder that would be implemented
    // when we have access to the database from the worker

    console.log(`Checking stock alerts${companyId ? ` for company ${companyId}` : ' for all companies'}`)

    // This would call InventoryService.getStockAlerts(companyId)
    // and send notifications if needed
  }

  /**
   * Generate auto purchase orders
   */
  private static async performGenerateAutoPurchaseOrders(companyId: string, userId: string) {
    console.log(`Generating auto purchase orders for company ${companyId}`)

    try {
      const orders = await InventoryService.generateAutoPurchaseOrders(companyId, userId)

      if (orders.length > 0) {
        console.log(`Generated ${orders.length} auto purchase orders for company ${companyId}`)

        // Log audit event
        await AuditService.log({
          userId,
          action: 'create',
          resource: 'auto_purchase_orders',
          details: {
            companyId,
            orderCount: orders.length,
            orders: orders.map(o => o.id)
          },
          success: true
        })
      } else {
        console.log(`No auto purchase orders needed for company ${companyId}`)
      }
    } catch (error) {
      console.error(`Failed to generate auto purchase orders for company ${companyId}:`, error)
      throw error
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      return null
    }

    const state = await job.getState()
    const progress = job.progress

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    }
  }

  /**
   * Get all inventory jobs
   */
  static async getInventoryJobs(limit: number = 50) {
    const jobs = await this.queue.getJobs(['active', 'waiting', 'completed', 'failed'], 0, limit - 1)

    return Promise.all(jobs.map(async (job) => {
      const state = await job.getState()
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        state,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason
      }
    }))
  }
}
