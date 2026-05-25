"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const audit_service_1 = require("./audit.service");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const prisma = new client_1.PrismaClient();
class BackupService {
    static init() {
        // Initialize AWS S3 if configured
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            aws_sdk_1.default.config.update({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            });
            this.s3 = new aws_sdk_1.default.S3();
        }
    }
    /**
     * Create a database backup
     */
    static async createBackup(options = {}) {
        const { type = 'full', encrypt = true, uploadToCloud = true, retentionDays = 30 } = options;
        const backupId = crypto_1.default.randomUUID();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `finbiz-backup-${type}-${timestamp}.sql`;
        const tempPath = path_1.default.join(process.cwd(), 'temp', filename);
        const encryptedPath = encrypt ? `${tempPath}.enc` : tempPath;
        try {
            // Ensure temp directory exists
            await promises_1.default.mkdir(path_1.default.dirname(tempPath), { recursive: true });
            // Create database dump
            await this.createDatabaseDump(tempPath);
            // Get file stats
            const stats = await promises_1.default.stat(tempPath);
            const fileSize = stats.size;
            // Generate checksum
            const checksum = await this.generateChecksum(tempPath);
            // Encrypt if requested
            let finalPath = tempPath;
            if (encrypt) {
                await this.encryptFile(tempPath, encryptedPath);
                finalPath = encryptedPath;
                // Remove unencrypted file
                await promises_1.default.unlink(tempPath);
            }
            // Upload to cloud if configured
            let cloudLocation;
            if (uploadToCloud && this.s3) {
                cloudLocation = await this.uploadToS3(finalPath, filename);
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
            });
            // Clean up local file if uploaded to cloud
            if (cloudLocation) {
                await promises_1.default.unlink(finalPath);
            }
            // Clean up old backups
            await this.cleanupOldBackups(retentionDays);
            // Log audit event
            await audit_service_1.AuditService.log({
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
            });
            return {
                id: backup.id,
                filename: backup.filename,
                size: Number(backup.size),
                checksum: backup.checksum,
                status: backup.status,
                location: backup.location || undefined
            };
        }
        catch (error) {
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
            });
            // Clean up temp files
            try {
                await promises_1.default.unlink(tempPath);
                if (encrypt)
                    await promises_1.default.unlink(encryptedPath);
            }
            catch (cleanupError) {
                // Ignore cleanup errors
            }
            // Log audit event
            await audit_service_1.AuditService.log({
                action: 'create',
                resource: 'backup',
                resourceId: backupId,
                details: { type, error: error instanceof Error ? error.message : 'Unknown error' },
                success: false
            });
            throw error;
        }
    }
    /**
     * Restore database from backup
     */
    static async restoreBackup(backupId) {
        const backup = await prisma.backup.findUnique({
            where: { id: backupId }
        });
        if (!backup) {
            throw new Error('Backup not found');
        }
        if (backup.status !== 'completed') {
            throw new Error('Backup is not available for restoration');
        }
        let tempPath;
        try {
            // Download from cloud if needed
            if (backup.location?.startsWith('s3://')) {
                tempPath = await this.downloadFromS3(backup.location, backup.filename);
            }
            else if (backup.location?.startsWith('local:')) {
                tempPath = backup.location.replace('local:', '');
            }
            else {
                throw new Error('Invalid backup location');
            }
            // Decrypt if encrypted
            let restorePath = tempPath;
            if (backup.encrypted) {
                const decryptedPath = `${tempPath}.dec`;
                await this.decryptFile(tempPath, decryptedPath);
                restorePath = decryptedPath;
                // Remove encrypted file
                await promises_1.default.unlink(tempPath);
                tempPath = decryptedPath;
            }
            // Restore database
            await this.restoreDatabaseDump(restorePath);
            // Log audit event
            await audit_service_1.AuditService.log({
                action: 'restore',
                resource: 'backup',
                resourceId: backupId,
                details: {
                    filename: backup.filename,
                    size: Number(backup.size)
                },
                success: true
            });
        }
        finally {
            // Clean up temp files
            if (tempPath) {
                try {
                    await promises_1.default.unlink(tempPath);
                }
                catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        }
    }
    /**
     * Get backup history
     */
    static async getBackupHistory(options = {}) {
        const { limit = 50, offset = 0, status, type } = options;
        const where = {};
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        return prisma.backup.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }
    /**
     * Get backup statistics
     */
    static async getBackupStats() {
        const [totalBackups, successfulBackups, failedBackups, totalSize, lastBackup] = await Promise.all([
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
        ]);
        return {
            total: totalBackups,
            successful: successfulBackups,
            failed: failedBackups,
            successRate: totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0,
            totalSize: Number(totalSize._sum.size || 0),
            lastBackup: lastBackup?.createdAt
        };
    }
    /**
     * Delete backup
     */
    static async deleteBackup(backupId) {
        const backup = await prisma.backup.findUnique({
            where: { id: backupId }
        });
        if (!backup) {
            throw new Error('Backup not found');
        }
        // Delete from cloud storage if applicable
        if (backup.location?.startsWith('s3://') && this.s3) {
            await this.deleteFromS3(backup.location);
        }
        else if (backup.location?.startsWith('local:')) {
            // Delete local file
            const filePath = backup.location.replace('local:', '');
            try {
                await promises_1.default.unlink(filePath);
            }
            catch (error) {
                // File might not exist, continue
            }
        }
        // Delete from database
        await prisma.backup.delete({
            where: { id: backupId }
        });
        // Log audit event
        await audit_service_1.AuditService.log({
            action: 'delete',
            resource: 'backup',
            resourceId: backupId,
            details: { filename: backup.filename },
            success: true
        });
    }
    static async createDatabaseDump(outputPath) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL not configured');
        }
        // Parse database URL for pg_dump
        const url = new URL(databaseUrl);
        const host = url.hostname;
        const port = url.port;
        const database = url.pathname.slice(1);
        const username = url.username;
        const password = url.password;
        const command = `pg_dump --host=${host} --port=${port} --username=${username} --dbname=${database} --no-password --format=c --compress=9 --file="${outputPath}"`;
        // Set password in environment
        const env = { ...process.env, PGPASSWORD: password };
        await execAsync(command, { env });
    }
    static async restoreDatabaseDump(dumpPath) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL not configured');
        }
        // Parse database URL for pg_restore
        const url = new URL(databaseUrl);
        const host = url.hostname;
        const port = url.port;
        const database = url.pathname.slice(1);
        const username = url.username;
        const password = url.password;
        const command = `pg_restore --host=${host} --port=${port} --username=${username} --dbname=${database} --no-password --clean --if-exists "${dumpPath}"`;
        // Set password in environment
        const env = { ...process.env, PGPASSWORD: password };
        await execAsync(command, { env });
    }
    static async generateChecksum(filePath) {
        const fileBuffer = await promises_1.default.readFile(filePath);
        return crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
    }
    static async encryptFile(inputPath, outputPath) {
        const key = process.env.BACKUP_ENCRYPTION_KEY;
        if (!key) {
            throw new Error('BACKUP_ENCRYPTION_KEY not configured');
        }
        const input = await promises_1.default.readFile(inputPath);
        const cipher = crypto_1.default.createCipher('aes-256-cbc', key);
        const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
        await promises_1.default.writeFile(outputPath, encrypted);
    }
    static async decryptFile(inputPath, outputPath) {
        const key = process.env.BACKUP_ENCRYPTION_KEY;
        if (!key) {
            throw new Error('BACKUP_ENCRYPTION_KEY not configured');
        }
        const input = await promises_1.default.readFile(inputPath);
        const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
        const decrypted = Buffer.concat([decipher.update(input), decipher.final()]);
        await promises_1.default.writeFile(outputPath, decrypted);
    }
    static async uploadToS3(filePath, filename) {
        if (!this.s3) {
            throw new Error('AWS S3 not configured');
        }
        const bucket = process.env.AWS_S3_BUCKET;
        if (!bucket) {
            throw new Error('AWS_S3_BUCKET not configured');
        }
        const fileContent = await promises_1.default.readFile(filePath);
        const params = {
            Bucket: bucket,
            Key: `backups/${filename}`,
            Body: fileContent,
            ServerSideEncryption: 'AES256'
        };
        await this.s3.upload(params).promise();
        return `s3://${bucket}/backups/${filename}`;
    }
    static async downloadFromS3(s3Url, filename) {
        if (!this.s3) {
            throw new Error('AWS S3 not configured');
        }
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucket = urlParts[0];
        const key = urlParts.slice(1).join('/');
        const params = {
            Bucket: bucket,
            Key: key
        };
        const data = await this.s3.getObject(params).promise();
        const tempPath = path_1.default.join(process.cwd(), 'temp', `restore-${filename}`);
        await promises_1.default.mkdir(path_1.default.dirname(tempPath), { recursive: true });
        await promises_1.default.writeFile(tempPath, data.Body);
        return tempPath;
    }
    static async deleteFromS3(s3Url) {
        if (!this.s3) {
            throw new Error('AWS S3 not configured');
        }
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucket = urlParts[0];
        const key = urlParts.slice(1).join('/');
        const params = {
            Bucket: bucket,
            Key: key
        };
        await this.s3.deleteObject(params).promise();
    }
    static async cleanupOldBackups(retentionDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const oldBackups = await prisma.backup.findMany({
            where: {
                createdAt: { lt: cutoffDate },
                status: 'completed'
            }
        });
        for (const backup of oldBackups) {
            try {
                await this.deleteBackup(backup.id);
            }
            catch (error) {
                console.error(`Failed to cleanup backup ${backup.id}:`, error);
            }
        }
    }
}
exports.BackupService = BackupService;
// Initialize the backup service
BackupService.init();
//# sourceMappingURL=backup.service.js.map