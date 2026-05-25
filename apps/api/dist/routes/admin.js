"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const audit_service_1 = require("../services/audit.service");
const permissions_service_1 = require("../services/permissions.service");
const backup_service_1 = require("../services/backup.service");
const twoFactor_service_1 = require("../services/twoFactor.service");
const router = express_1.default.Router();
// Apply authentication and audit logging to all admin routes
router.use(auth_1.authenticateToken);
router.use((0, audit_1.auditLogger)());
// ============================================================================
// AUDIT LOGS MANAGEMENT
// ============================================================================
// GET /api/admin/audit - Get audit logs with filtering
router.get('/audit', (0, auth_1.requireCompanyAccess)(['admin.audit.view']), async (req, res) => {
    try {
        const { userId, action, resource, success, startDate, endDate, limit = '50', offset = '0' } = req.query;
        const companyId = req.companyId;
        const options = {
            companyId,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        if (userId)
            options.userId = userId;
        if (action)
            options.action = action;
        if (resource)
            options.resource = resource;
        if (success !== undefined)
            options.success = success === 'true';
        if (startDate)
            options.startDate = new Date(startDate);
        if (endDate)
            options.endDate = new Date(endDate);
        const result = await audit_service_1.AuditService.getAuditLogs(options);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
// GET /api/admin/audit/stats - Get audit statistics
router.get('/audit/stats', (0, auth_1.requireCompanyAccess)(['admin.audit.view']), async (req, res) => {
    try {
        const { days = '30' } = req.query;
        const companyId = req.companyId;
        const stats = await audit_service_1.AuditService.getAuditStats(companyId, parseInt(days));
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
});
// POST /api/admin/audit/export - Export audit logs
router.post('/audit/export', (0, auth_1.requireCompanyAccess)(['admin.audit.view']), async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.body;
        const companyId = req.companyId;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }
        const data = await audit_service_1.AuditService.exportAuditLogs({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            companyId,
            format: format
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
            res.send(data);
        }
        else {
            res.json(data);
        }
    }
    catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});
// ============================================================================
// PERMISSIONS MANAGEMENT
// ============================================================================
// GET /api/admin/permissions - Get all available permissions
router.get('/permissions', (0, auth_1.requireCompanyAccess)(['admin.roles.view']), async (req, res) => {
    try {
        const permissions = await permissions_service_1.PermissionsService.getAllPermissions();
        res.json(permissions);
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});
// GET /api/admin/roles - Get all roles with permissions
router.get('/roles', (0, auth_1.requireCompanyAccess)(['admin.roles.view']), async (req, res) => {
    try {
        const roles = await permissions_service_1.PermissionsService.getAllRoles();
        res.json(roles);
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});
// POST /api/admin/roles - Create or update role
router.post('/roles', (0, auth_1.requireCompanyAccess)(['admin.roles.manage']), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name || !permissions || !Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Role name and permissions array are required' });
        }
        const role = await permissions_service_1.PermissionsService.createOrUpdateRole({ name, description }, permissions);
        res.json(role);
    }
    catch (error) {
        console.error('Error creating/updating role:', error);
        res.status(500).json({ error: 'Failed to create or update role' });
    }
});
// PUT /api/admin/roles/:roleId/users/:userId - Assign role to user
router.put('/roles/:roleId/users/:userId', (0, auth_1.requireCompanyAccess)(['admin.roles.manage']), async (req, res) => {
    try {
        const { roleId, userId } = req.params;
        const companyId = req.companyId;
        // Verify the role exists
        const role = await permissions_service_1.PermissionsService.getRoleWithPermissions(roleId);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        await permissions_service_1.PermissionsService.assignRoleToUser(userId, companyId, roleId);
        res.json({ message: 'Role assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ error: 'Failed to assign role' });
    }
});
// ============================================================================
// BACKUP MANAGEMENT
// ============================================================================
// POST /api/admin/backup - Create a new backup
router.post('/backup', (0, auth_1.requireCompanyAccess)(['admin.backup.create']), async (req, res) => {
    try {
        const { type = 'full', encrypt = true, uploadToCloud = true } = req.body;
        const result = await backup_service_1.BackupService.createBackup({
            type: type,
            encrypt,
            uploadToCloud
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});
// GET /api/admin/backup - Get backup history
router.get('/backup', (0, auth_1.requireCompanyAccess)(['admin.backup.view']), async (req, res) => {
    try {
        const { status, type, limit = '50', offset = '0' } = req.query;
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        if (status)
            options.status = status;
        if (type)
            options.type = type;
        const backups = await backup_service_1.BackupService.getBackupHistory(options);
        res.json(backups);
    }
    catch (error) {
        console.error('Error fetching backup history:', error);
        res.status(500).json({ error: 'Failed to fetch backup history' });
    }
});
// GET /api/admin/backup/stats - Get backup statistics
router.get('/backup/stats', (0, auth_1.requireCompanyAccess)(['admin.backup.view']), async (req, res) => {
    try {
        const stats = await backup_service_1.BackupService.getBackupStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching backup stats:', error);
        res.status(500).json({ error: 'Failed to fetch backup statistics' });
    }
});
// POST /api/admin/backup/:backupId/restore - Restore from backup
router.post('/backup/:backupId/restore', (0, auth_1.requireCompanyAccess)(['admin.backup.create']), async (req, res) => {
    try {
        const { backupId } = req.params;
        await backup_service_1.BackupService.restoreBackup(backupId);
        res.json({ message: 'Backup restored successfully' });
    }
    catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ error: 'Failed to restore backup' });
    }
});
// DELETE /api/admin/backup/:backupId - Delete backup
router.delete('/backup/:backupId', (0, auth_1.requireCompanyAccess)(['admin.backup.create']), async (req, res) => {
    try {
        const { backupId } = req.params;
        await backup_service_1.BackupService.deleteBackup(backupId);
        res.json({ message: 'Backup deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});
// ============================================================================
// USER MANAGEMENT
// ============================================================================
// GET /api/admin/users - Get users in company with their roles
router.get('/users', (0, auth_1.requireCompanyAccess)(['admin.roles.view']), async (req, res) => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        const companyId = req.companyId;
        const memberships = await prisma.membership.findMany({
            where: { companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        createdAt: true
                    }
                },
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });
        const users = memberships.map((membership) => ({
            id: membership.user.id,
            email: membership.user.email,
            name: membership.user.name,
            createdAt: membership.user.createdAt,
            role: {
                id: membership.role.id,
                name: membership.role.name,
                description: membership.role.description,
                permissions: membership.role.permissions.map((rp) => rp.permission)
            },
            joinedAt: membership.createdAt
        }));
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// ============================================================================
// TWO-FACTOR AUTH MANAGEMENT
// ============================================================================
// GET /api/admin/2fa/:userId - Get 2FA status for user
router.get('/2fa/:userId', (0, auth_1.requireCompanyAccess)(['admin.roles.manage']), async (req, res) => {
    try {
        const { userId } = req.params;
        const status = await twoFactor_service_1.TwoFactorService.get2FAStatus(userId);
        res.json(status);
    }
    catch (error) {
        console.error('Error fetching 2FA status:', error);
        res.status(500).json({ error: 'Failed to fetch 2FA status' });
    }
});
// POST /api/admin/2fa/:userId/disable - Disable 2FA for user
router.post('/2fa/:userId/disable', (0, auth_1.requireCompanyAccess)(['admin.roles.manage']), async (req, res) => {
    try {
        const { userId } = req.params;
        await twoFactor_service_1.TwoFactorService.disable2FA(userId);
        res.json({ message: '2FA disabled successfully' });
    }
    catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});
// ============================================================================
// SYSTEM HEALTH
// ============================================================================
// GET /api/admin/health - Get system health information
router.get('/health', (0, auth_1.requireCompanyAccess)(['admin.system']), async (req, res) => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        // Database connection check
        await prisma.$queryRaw `SELECT 1`;
        // Get basic stats
        const [userCount, companyCount, auditLogCount, backupCount] = await Promise.all([
            prisma.user.count(),
            prisma.company.count(),
            prisma.auditLog.count(),
            prisma.backup.count()
        ]);
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected',
                users: userCount,
                companies: companyCount
            },
            security: {
                auditLogs: auditLogCount,
                backups: backupCount
            },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
        res.json(health);
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map