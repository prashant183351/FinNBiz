import express, { Router } from 'express'
import { authenticateToken, requireCompanyAccess, AuthRequest } from '../middleware/auth'
import { auditLogger } from '../middleware/audit'
import { AuditService } from '../services/audit.service'
import { PermissionsService } from '../services/permissions.service'
import { BackupService } from '../services/backup.service'
import { TwoFactorService } from '../services/twoFactor.service'

const router: Router = express.Router()

// Apply authentication and audit logging to all admin routes
router.use(authenticateToken)
router.use(auditLogger())

// ============================================================================
// AUDIT LOGS MANAGEMENT
// ============================================================================

// GET /api/admin/audit - Get audit logs with filtering
router.get('/audit', requireCompanyAccess(['admin.audit.view']), async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      success,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query

    const companyId = (req as AuthRequest).companyId!

    const options: any = {
      companyId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }

    if (userId) options.userId = userId as string
    if (action) options.action = action as string
    if (resource) options.resource = resource as string
    if (success !== undefined) options.success = success === 'true'
    if (startDate) options.startDate = new Date(startDate as string)
    if (endDate) options.endDate = new Date(endDate as string)

    const result = await AuditService.getAuditLogs(options)

    res.json(result)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

// GET /api/admin/audit/stats - Get audit statistics
router.get('/audit/stats', requireCompanyAccess(['admin.audit.view']), async (req, res) => {
  try {
    const { days = '30' } = req.query
    const companyId = (req as AuthRequest).companyId!

    const stats = await AuditService.getAuditStats(companyId, parseInt(days as string))

    res.json(stats)
  } catch (error) {
    console.error('Error fetching audit stats:', error)
    res.status(500).json({ error: 'Failed to fetch audit statistics' })
  }
})

// POST /api/admin/audit/export - Export audit logs
router.post('/audit/export', requireCompanyAccess(['admin.audit.view']), async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body
    const companyId = (req as AuthRequest).companyId!

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const data = await AuditService.exportAuditLogs({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      companyId,
      format: format as 'json' | 'csv'
    })

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"')
      res.send(data)
    } else {
      res.json(data)
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    res.status(500).json({ error: 'Failed to export audit logs' })
  }
})

// ============================================================================
// PERMISSIONS MANAGEMENT
// ============================================================================

// GET /api/admin/permissions - Get all available permissions
router.get('/permissions', requireCompanyAccess(['admin.roles.view']), async (req, res) => {
  try {
    const permissions = await PermissionsService.getAllPermissions()
    res.json(permissions)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    res.status(500).json({ error: 'Failed to fetch permissions' })
  }
})

// GET /api/admin/roles - Get all roles with permissions
router.get('/roles', requireCompanyAccess(['admin.roles.view']), async (req, res) => {
  try {
    const roles = await PermissionsService.getAllRoles()
    res.json(roles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

// POST /api/admin/roles - Create or update role
router.post('/roles', requireCompanyAccess(['admin.roles.manage']), async (req, res) => {
  try {
    const { name, description, permissions } = req.body

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Role name and permissions array are required' })
    }

    const role = await PermissionsService.createOrUpdateRole(
      { name, description },
      permissions
    )

    res.json(role)
  } catch (error) {
    console.error('Error creating/updating role:', error)
    res.status(500).json({ error: 'Failed to create or update role' })
  }
})

// PUT /api/admin/roles/:roleId/users/:userId - Assign role to user
router.put('/roles/:roleId/users/:userId', requireCompanyAccess(['admin.roles.manage']), async (req, res) => {
  try {
    const { roleId, userId } = req.params
    const companyId = (req as AuthRequest).companyId!

    // Verify the role exists
    const role = await PermissionsService.getRoleWithPermissions(roleId)
    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }

    await PermissionsService.assignRoleToUser(userId, companyId, roleId)

    res.json({ message: 'Role assigned successfully' })
  } catch (error) {
    console.error('Error assigning role:', error)
    res.status(500).json({ error: 'Failed to assign role' })
  }
})

// ============================================================================
// BACKUP MANAGEMENT
// ============================================================================

// POST /api/admin/backup - Create a new backup
router.post('/backup', requireCompanyAccess(['admin.backup.create']), async (req, res) => {
  try {
    const { type = 'full', encrypt = true, uploadToCloud = true } = req.body

    const result = await BackupService.createBackup({
      type: type as 'full' | 'incremental',
      encrypt,
      uploadToCloud
    })

    res.json(result)
  } catch (error) {
    console.error('Error creating backup:', error)
    res.status(500).json({ error: 'Failed to create backup' })
  }
})

// GET /api/admin/backup - Get backup history
router.get('/backup', requireCompanyAccess(['admin.backup.view']), async (req, res) => {
  try {
    const { status, type, limit = '50', offset = '0' } = req.query

    const options: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }

    if (status) options.status = status as string
    if (type) options.type = type as string

    const backups = await BackupService.getBackupHistory(options)
    res.json(backups)
  } catch (error) {
    console.error('Error fetching backup history:', error)
    res.status(500).json({ error: 'Failed to fetch backup history' })
  }
})

// GET /api/admin/backup/stats - Get backup statistics
router.get('/backup/stats', requireCompanyAccess(['admin.backup.view']), async (req, res) => {
  try {
    const stats = await BackupService.getBackupStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching backup stats:', error)
    res.status(500).json({ error: 'Failed to fetch backup statistics' })
  }
})

// POST /api/admin/backup/:backupId/restore - Restore from backup
router.post('/backup/:backupId/restore', requireCompanyAccess(['admin.backup.create']), async (req, res) => {
  try {
    const { backupId } = req.params

    await BackupService.restoreBackup(backupId)

    res.json({ message: 'Backup restored successfully' })
  } catch (error) {
    console.error('Error restoring backup:', error)
    res.status(500).json({ error: 'Failed to restore backup' })
  }
})

// DELETE /api/admin/backup/:backupId - Delete backup
router.delete('/backup/:backupId', requireCompanyAccess(['admin.backup.create']), async (req, res) => {
  try {
    const { backupId } = req.params

    await BackupService.deleteBackup(backupId)

    res.json({ message: 'Backup deleted successfully' })
  } catch (error) {
    console.error('Error deleting backup:', error)
    res.status(500).json({ error: 'Failed to delete backup' })
  }
})

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// GET /api/admin/users - Get users in company with their roles
router.get('/users', requireCompanyAccess(['admin.roles.view']), async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const companyId = (req as AuthRequest).companyId!

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
    })

    const users = memberships.map((membership: any) => ({
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      createdAt: membership.user.createdAt,
      role: {
        id: membership.role.id,
        name: membership.role.name,
        description: membership.role.description,
        permissions: membership.role.permissions.map((rp: any) => rp.permission)
      },
      joinedAt: membership.createdAt
    }))

    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// ============================================================================
// TWO-FACTOR AUTH MANAGEMENT
// ============================================================================

// GET /api/admin/2fa/:userId - Get 2FA status for user
router.get('/2fa/:userId', requireCompanyAccess(['admin.roles.manage']), async (req, res) => {
  try {
    const { userId } = req.params

    const status = await TwoFactorService.get2FAStatus(userId)
    res.json(status)
  } catch (error) {
    console.error('Error fetching 2FA status:', error)
    res.status(500).json({ error: 'Failed to fetch 2FA status' })
  }
})

// POST /api/admin/2fa/:userId/disable - Disable 2FA for user
router.post('/2fa/:userId/disable', requireCompanyAccess(['admin.roles.manage']), async (req, res) => {
  try {
    const { userId } = req.params

    await TwoFactorService.disable2FA(userId)

    res.json({ message: '2FA disabled successfully' })
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
})

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

// GET /api/admin/health - Get system health information
router.get('/health', requireCompanyAccess(['admin.system']), async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Database connection check
    await prisma.user.count()

    // Get basic stats
    const [
      userCount,
      companyCount,
      auditLogCount,
      backupCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.auditLog.count(),
      prisma.backup.count()
    ])

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
    }

    res.json(health)
  } catch (error) {
    console.error('Health check error:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    })
  }
})

export default router
