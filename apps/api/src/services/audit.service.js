"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const prisma = new client_1.PrismaClient();
class AuditService {
    static init() {
        // Create logs directory if it doesn't exist
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        // Configure Winston logger with daily rotation
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            defaultMeta: { service: 'finbiz-audit' },
            transports: [
                // Write all logs with importance level of `error` or less to `error.log`
                new winston_daily_rotate_file_1.default({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: '20m',
                    maxFiles: '14d'
                }),
                // Write all logs with importance level of `info` or less to `combined.log`
                new winston_daily_rotate_file_1.default({
                    filename: 'logs/audit-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '20m',
                    maxFiles: '90d'
                })
            ]
        });
        // If we're not in production then log to the console with a simple format
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
            }));
        }
    }
    /**
     * Log an audit event to both database and file
     */
    static async log(data) {
        try {
            const { userId, companyId, action, resource, resourceId, details, ipAddress, userAgent, success = true } = data;
            // Log to database
            await prisma.auditLog.create({
                data: {
                    userId,
                    companyId,
                    action,
                    resource,
                    resourceId,
                    details: details ? JSON.stringify(details) : null,
                    ipAddress,
                    userAgent,
                    success
                }
            });
            // Log to file system
            this.logger.info('Audit Event', {
                userId,
                companyId,
                action,
                resource,
                resourceId,
                details,
                ipAddress,
                userAgent,
                success,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Failed to log audit event:', error);
            // Don't throw error to avoid breaking the main flow
        }
    }
    /**
     * Get audit logs with filtering and pagination
     */
    static async getAuditLogs(options = {}) {
        const { userId, companyId, action, resource, success, startDate, endDate, limit = 50, offset = 0 } = options;
        const where = {};
        if (userId)
            where.userId = userId;
        if (companyId)
            where.companyId = companyId;
        if (action)
            where.action = action;
        if (resource)
            where.resource = resource;
        if (success !== undefined)
            where.success = success;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = startDate;
            if (endDate)
                where.timestamp.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, email: true, name: true }
                    },
                    company: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.auditLog.count({ where })
        ]);
        return {
            logs,
            total,
            limit,
            offset,
            hasMore: offset + limit < total
        };
    }
    /**
     * Get audit statistics
     */
    static async getAuditStats(companyId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const where = {
            timestamp: { gte: startDate }
        };
        if (companyId) {
            where.companyId = companyId;
        }
        const [totalLogs, successfulLogs, failedLogs, loginAttempts, failedLogins, dataChanges] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.count({ where: { ...where, success: true } }),
            prisma.auditLog.count({ where: { ...where, success: false } }),
            prisma.auditLog.count({ where: { ...where, action: 'login' } }),
            prisma.auditLog.count({ where: { ...where, action: 'login', success: false } }),
            prisma.auditLog.count({
                where: {
                    ...where,
                    action: { in: ['create', 'update', 'delete'] },
                    success: true
                }
            })
        ]);
        return {
            period: { days, startDate },
            summary: {
                totalLogs,
                successfulLogs,
                failedLogs,
                successRate: totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0
            },
            security: {
                loginAttempts,
                failedLogins,
                failedLoginRate: loginAttempts > 0 ? (failedLogins / loginAttempts) * 100 : 0
            },
            activity: {
                dataChanges
            }
        };
    }
    /**
     * Clean up old audit logs (for retention policy)
     */
    static async cleanupOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await prisma.auditLog.deleteMany({
            where: {
                timestamp: { lt: cutoffDate }
            }
        });
        this.logger.info(`Cleaned up ${result.count} old audit logs older than ${daysToKeep} days`);
        return result.count;
    }
    /**
     * Export audit logs for compliance/reporting
     */
    static async exportAuditLogs(options) {
        const { startDate, endDate, companyId, format = 'json' } = options;
        const where = {
            timestamp: { gte: startDate, lte: endDate }
        };
        if (companyId)
            where.companyId = companyId;
        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: { id: true, email: true, name: true }
                },
                company: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { timestamp: 'asc' }
        });
        if (format === 'csv') {
            return this.convertToCSV(logs);
        }
        return logs;
    }
    static convertToCSV(logs) {
        const headers = [
            'Timestamp',
            'User ID',
            'User Email',
            'User Name',
            'Company ID',
            'Company Name',
            'Action',
            'Resource',
            'Resource ID',
            'Success',
            'IP Address',
            'User Agent',
            'Details'
        ];
        const rows = logs.map(log => [
            log.timestamp,
            log.userId || '',
            log.user?.email || '',
            log.user?.name || '',
            log.companyId || '',
            log.company?.name || '',
            log.action,
            log.resource,
            log.resourceId || '',
            log.success,
            log.ipAddress || '',
            log.userAgent || '',
            JSON.stringify(log.details) || ''
        ]);
        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }
}
exports.AuditService = AuditService;
// Initialize the audit service
AuditService.init();
//# sourceMappingURL=audit.service.js.map