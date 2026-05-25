import { Queue, Worker } from 'bullmq'
// @ts-ignore - Ignore rootDir errors for API imports
import { BackupService } from '../../../api/src/services/backup.service'
// @ts-ignore
import { AuditService } from '../../../api/src/services/audit.service'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export class BackupScheduler {
  private static queue: Queue
  private static worker: Worker

  static init() {
    // Create backup queue
    // @ts-ignore - Connection accepts ioredis URL
    this.queue = new Queue('backup-queue', {
      connection: { url: REDIS_URL } as any
    })

    // Create worker to process backup jobs
    this.worker = new Worker('backup-queue', async (job) => {
      const { type, encrypt, uploadToCloud, retentionDays } = job.data

      console.log(`Starting ${type} backup job ${job.id}`)

      try {
        const result = await BackupService.createBackup({
          type: type || 'full',
          encrypt: encrypt !== false,
          uploadToCloud: uploadToCloud !== false,
          retentionDays: retentionDays || 30
        })

        console.log(`Backup job ${job.id} completed successfully:`, result.filename)

        return result
      } catch (error) {
        console.error(`Backup job ${job.id} failed:`, error)
        throw error
      }
    // @ts-ignore - Connection accepts ioredis URL
    }, {
      connection: { url: REDIS_URL } as any
    })

    // Handle worker events
    this.worker.on('completed', (job) => {
      console.log(`Backup job ${job.id} completed`)
    })

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`Backup job ${job.id} failed:`, err)
      } else {
        console.error(`Unknown backup job failed:`, err)
      }
    })
  }

  static async start() {
    console.log('🚀 Starting Backup Scheduler...')

    // Schedule daily backups
    await this.scheduleDailyBackup()

    console.log('✅ Backup scheduler started')
  }

  static async stop() {
    console.log('Stopping Backup Scheduler...')

    if (this.worker) {
      await this.worker.close()
    }

    if (this.queue) {
      await this.queue.close()
    }

    console.log('✅ Backup scheduler stopped')
  }

  /**
   * Schedule a daily full backup at 2 AM
   */
  private static async scheduleDailyBackup() {
    // Add recurring job for daily backup
    await this.queue.add(
      'daily-full-backup',
      {
        type: 'full',
        encrypt: true,
        uploadToCloud: true,
        retentionDays: 30
      },
      {
        repeat: {
          pattern: '0 2 * * *' // Every day at 2 AM
        },
        jobId: 'daily-full-backup'
      }
    )

    console.log('📅 Daily backup scheduled for 2 AM')
  }

  /**
   * Manually trigger a backup
   */
  static async triggerBackup(options: {
    type?: 'full' | 'incremental'
    encrypt?: boolean
    uploadToCloud?: boolean
    retentionDays?: number
  } = {}) {
    const job = await this.queue.add('manual-backup', {
      type: options.type || 'full',
      encrypt: options.encrypt !== false,
      uploadToCloud: options.uploadToCloud !== false,
      retentionDays: options.retentionDays || 30
    })

    console.log(`Manual backup job queued: ${job.id}`)

    return job
  }

  /**
   * Get backup job status
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
   * Get all backup jobs
   */
  static async getBackupJobs(limit: number = 50) {
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
