import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import AWS from 'aws-sdk'
import { AuditService } from './audit.service'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

export interface BackupOptions {
  type?: 'full' | 'incremental'
  encrypt?: boolean
  uploadToCloud?: boolean
  retentionDays?: number
}

export interface BackupResult {
  id: string
  filename: string
  size: number
  checksum: string
  status: string
  location?: string
  error?: string
}

export class BackupService {
  private static s3?: AWS.S3

  static init() {
    // Initialize AWS S3 if configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      })
      this.s3 = new AWS.S3()
    }
  }

  /**
   * Create a database backup
   */
  static async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const {
      type = 'full',
      encrypt = true,
      uploadToCloud = true,
      retentionDays = 30
    } = options

    const backupId = crypto.randomUUID()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `finbiz-backup-${type}-${timestamp}.sql`
    const tempPath = path.join(process.cwd(), 'temp', filename)
    const encryptedPath = encrypt ? `${tempPath}.enc` : tempPath

    try {
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempPath), { recursive: true })

      // Create database dump
      await this.createDatabaseDump(tempPath)

      // Get file stats
      const stats = await fs.stat(tempPath)
      const fileSize = stats.size

      // Generate checksum
      const checksum = await this.generateChecksum(tempPath)

      // Encrypt if requested
      let finalPath = tempPath
      if (encrypt) {
        await this.encryptFile(tempPath, encryptedPath)
        finalPath = encryptedPath
        // Remove unencrypted file
        await fs.unlink(tempPath)
      }

      // Upload to cloud if configured
      let cloudLocation: string | undefined
      if (uploadToCloud && this.s3) {
        cloudLocation = await this.uploadToS3(finalPath, filename)
      }

      // Save backup record
      const backup = await prisma.backup.create({
        data: {
          id: backupId,
          filename,
          size: BigInt(fileSize),
          checksum,
          status: 'completed',
          type,
          location: cloudLocation || `local:${finalPath}`,
          encrypted: encrypt
        }
      })

      // Clean up local file if uploaded to cloud
      if (cloudLocation) {
        await fs.unlink(finalPath)
      }

      // Clean up old backups
      await this.cleanupOldBackups(retentionDays)

      // Log audit event
      await AuditService.log({
        action: 'create',
        resource: 'backup',
        resourceId: backupId,
        details: {
          type,
          size: fileSize,
          encrypted: encrypt,
          cloudLocation
        },
        success: true
      })

      return {
        id: backup.id,
        filename: backup.filename,
        size: Number(backup.size),
        checksum: backup.checksum,
        status: backup.status,
        location: backup.location || undefined
      }

    } catch (error) {
      // Save failed backup record
      await prisma.backup.create({
        data: {
          id: backupId,
          filename,
          size: BigInt(0),
          checksum: '',
          status: 'failed',
          type,
          location: `local:${tempPath}`,
          encrypted: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      // Clean up temp files
      try {
        await fs.unlink(tempPath)
        if (encrypt) await fs.unlink(encryptedPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Log audit event
      await AuditService.log({
        action: 'create',
        resource: 'backup',
        resourceId: backupId,
        details: { type, error: error instanceof Error ? error.message : 'Unknown error' },
        success: false
      })

      throw error
    }
  }

  /**
   * Restore database from backup
   */
  static async restoreBackup(backupId: string): Promise<void> {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId }
    })

    if (!backup) {
      throw new Error('Backup not found')
    }

    if (backup.status !== 'completed') {
      throw new Error('Backup is not available for restoration')
    }

    let tempPath: string | undefined

    try {
      // Download from cloud if needed
      if (backup.location?.startsWith('s3://')) {
        tempPath = await this.downloadFromS3(backup.location, backup.filename)
      } else if (backup.location?.startsWith('local:')) {
        tempPath = backup.location.replace('local:', '')
      } else {
        throw new Error('Invalid backup location')
      }

      // Decrypt if encrypted
      let restorePath = tempPath
      if (backup.encrypted) {
        const decryptedPath = `${tempPath}.dec`
        await this.decryptFile(tempPath, decryptedPath)
        restorePath = decryptedPath
        // Remove encrypted file
        await fs.unlink(tempPath)
        tempPath = decryptedPath
      }

      // Restore database
      await this.restoreDatabaseDump(restorePath)

      // Log audit event
      await AuditService.log({
        action: 'restore',
        resource: 'backup',
        resourceId: backupId,
        details: {
          filename: backup.filename,
          size: Number(backup.size)
        },
        success: true
      })

    } finally {
      // Clean up temp files
      if (tempPath) {
        try {
          await fs.unlink(tempPath)
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Get backup history
   */
  static async getBackupHistory(options: {
    limit?: number
    offset?: number
    status?: string
    type?: string
  } = {}): Promise<any[]> {
    const { limit = 50, offset = 0, status, type } = options

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    return prisma.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  }

  /**
   * Get backup statistics
   */
  static async getBackupStats(): Promise<any> {
    const [
      totalBackups,
      successfulBackups,
      failedBackups,
      totalSize,
      lastBackup
    ] = await Promise.all([
      prisma.backup.count(),
      prisma.backup.count({ where: { status: 'completed' } }),
      prisma.backup.count({ where: { status: 'failed' } }),
      prisma.backup.aggregate({
        where: { status: 'completed' },
        _sum: { size: true }
      }),
      prisma.backup.findFirst({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' }
      })
    ])

    return {
      total: totalBackups,
      successful: successfulBackups,
      failed: failedBackups,
      successRate: totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0,
      totalSize: Number(totalSize._sum.size || 0),
      lastBackup: lastBackup?.createdAt
    }
  }

  /**
   * Delete backup
   */
  static async deleteBackup(backupId: string): Promise<void> {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId }
    })

    if (!backup) {
      throw new Error('Backup not found')
    }

    // Delete from cloud storage if applicable
    if (backup.location?.startsWith('s3://') && this.s3) {
      await this.deleteFromS3(backup.location)
    } else if (backup.location?.startsWith('local:')) {
      // Delete local file
      const filePath = backup.location.replace('local:', '')
      try {
        await fs.unlink(filePath)
      } catch (error) {
        // File might not exist, continue
      }
    }

    // Delete from database
    await prisma.backup.delete({
      where: { id: backupId }
    })

    // Log audit event
    await AuditService.log({
      action: 'delete',
      resource: 'backup',
      resourceId: backupId,
      details: { filename: backup.filename },
      success: true
    })
  }

  private static async createDatabaseDump(outputPath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    // Parse database URL for pg_dump
    const url = new URL(databaseUrl)
    const host = url.hostname
    const port = url.port
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    const command = `pg_dump --host=${host} --port=${port} --username=${username} --dbname=${database} --no-password --format=c --compress=9 --file="${outputPath}"`

    // Set password in environment
    const env = { ...process.env, PGPASSWORD: password }

    await execAsync(command, { env })
  }

  private static async restoreDatabaseDump(dumpPath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    // Parse database URL for pg_restore
    const url = new URL(databaseUrl)
    const host = url.hostname
    const port = url.port
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    const command = `pg_restore --host=${host} --port=${port} --username=${username} --dbname=${database} --no-password --clean --if-exists "${dumpPath}"`

    // Set password in environment
    const env = { ...process.env, PGPASSWORD: password }

    await execAsync(command, { env })
  }

  private static async generateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath)
    return crypto.createHash('sha256').update(fileBuffer).digest('hex')
  }

  private static async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    const key = process.env.BACKUP_ENCRYPTION_KEY
    if (!key) {
      throw new Error('BACKUP_ENCRYPTION_KEY not configured')
    }

    const input = await fs.readFile(inputPath)
    const cipher = crypto.createCipher('aes-256-cbc', key)
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()])

    await fs.writeFile(outputPath, encrypted)
  }

  private static async decryptFile(inputPath: string, outputPath: string): Promise<void> {
    const key = process.env.BACKUP_ENCRYPTION_KEY
    if (!key) {
      throw new Error('BACKUP_ENCRYPTION_KEY not configured')
    }

    const input = await fs.readFile(inputPath)
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    const decrypted = Buffer.concat([decipher.update(input), decipher.final()])

    await fs.writeFile(outputPath, decrypted)
  }

  private static async uploadToS3(filePath: string, filename: string): Promise<string> {
    if (!this.s3) {
      throw new Error('AWS S3 not configured')
    }

    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET not configured')
    }

    const fileContent = await fs.readFile(filePath)

    const params = {
      Bucket: bucket,
      Key: `backups/${filename}`,
      Body: fileContent,
      ServerSideEncryption: 'AES256'
    }

    await this.s3.upload(params).promise()

    return `s3://${bucket}/backups/${filename}`
  }

  private static async downloadFromS3(s3Url: string, filename: string): Promise<string> {
    if (!this.s3) {
      throw new Error('AWS S3 not configured')
    }

    const urlParts = s3Url.replace('s3://', '').split('/')
    const bucket = urlParts[0]
    const key = urlParts.slice(1).join('/')

    const params = {
      Bucket: bucket,
      Key: key
    }

    const data = await this.s3.getObject(params).promise()

    const tempPath = path.join(process.cwd(), 'temp', `restore-${filename}`)
    await fs.mkdir(path.dirname(tempPath), { recursive: true })
    await fs.writeFile(tempPath, data.Body as Buffer)

    return tempPath
  }

  private static async deleteFromS3(s3Url: string): Promise<void> {
    if (!this.s3) {
      throw new Error('AWS S3 not configured')
    }

    const urlParts = s3Url.replace('s3://', '').split('/')
    const bucket = urlParts[0]
    const key = urlParts.slice(1).join('/')

    const params = {
      Bucket: bucket,
      Key: key
    }

    await this.s3.deleteObject(params).promise()
  }

  private static async cleanupOldBackups(retentionDays: number): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const oldBackups = await prisma.backup.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: 'completed'
      }
    })

    for (const backup of oldBackups) {
      try {
        await this.deleteBackup(backup.id)
      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.id}:`, error)
      }
    }
  }
}

// Initialize the backup service
BackupService.init()
