"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PermissionsService {
    /**
     * Initialize default permissions and roles
     */
    static async initializeDefaultPermissions() {
        const defaultPermissions = [
            // User management
            { name: 'users.view', module: 'users', action: 'read', description: 'View user profiles' },
            { name: 'users.create', module: 'users', action: 'create', description: 'Create new users' },
            { name: 'users.update', module: 'users', action: 'update', description: 'Update user profiles' },
            { name: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },
            { name: 'users.manage', module: 'users', action: 'manage', description: 'Full user management' },
            // Company management
            { name: 'companies.view', module: 'companies', action: 'read', description: 'View company details' },
            { name: 'companies.create', module: 'companies', action: 'create', description: 'Create new companies' },
            { name: 'companies.update', module: 'companies', action: 'update', description: 'Update company details' },
            { name: 'companies.delete', module: 'companies', action: 'delete', description: 'Delete companies' },
            { name: 'companies.manage', module: 'companies', action: 'manage', description: 'Full company management' },
            // Invoice management
            { name: 'invoices.view', module: 'invoices', action: 'read', description: 'View invoices' },
            { name: 'invoices.create', module: 'invoices', action: 'create', description: 'Create invoices' },
            { name: 'invoices.update', module: 'invoices', action: 'update', description: 'Update invoices' },
            { name: 'invoices.delete', module: 'invoices', action: 'delete', description: 'Delete invoices' },
            { name: 'invoices.manage', module: 'invoices', action: 'manage', description: 'Full invoice management' },
            // Expense management
            { name: 'expenses.view', module: 'expenses', action: 'read', description: 'View expenses' },
            { name: 'expenses.create', module: 'expenses', action: 'create', description: 'Create expenses' },
            { name: 'expenses.update', module: 'expenses', action: 'update', description: 'Update expenses' },
            { name: 'expenses.delete', module: 'expenses', action: 'delete', description: 'Delete expenses' },
            { name: 'expenses.manage', module: 'expenses', action: 'manage', description: 'Full expense management' },
            // Transaction management
            { name: 'transactions.view', module: 'transactions', action: 'read', description: 'View transactions' },
            { name: 'transactions.create', module: 'transactions', action: 'create', description: 'Create transactions' },
            { name: 'transactions.update', module: 'transactions', action: 'update', description: 'Update transactions' },
            { name: 'transactions.delete', module: 'transactions', action: 'delete', description: 'Delete transactions' },
            { name: 'transactions.manage', module: 'transactions', action: 'manage', description: 'Full transaction management' },
            // Employee management
            { name: 'employees.view', module: 'employees', action: 'read', description: 'View employees' },
            { name: 'employees.create', module: 'employees', action: 'create', description: 'Create employees' },
            { name: 'employees.update', module: 'employees', action: 'update', description: 'Update employees' },
            { name: 'employees.delete', module: 'employees', action: 'delete', description: 'Delete employees' },
            { name: 'employees.manage', module: 'employees', action: 'manage', description: 'Full employee management' },
            // Payroll management
            { name: 'payroll.view', module: 'payroll', action: 'read', description: 'View payroll' },
            { name: 'payroll.create', module: 'payroll', action: 'create', description: 'Create payroll entries' },
            { name: 'payroll.update', module: 'payroll', action: 'update', description: 'Update payroll' },
            { name: 'payroll.delete', module: 'payroll', action: 'delete', description: 'Delete payroll entries' },
            { name: 'payroll.manage', module: 'payroll', action: 'manage', description: 'Full payroll management' },
            // Reports
            { name: 'reports.view', module: 'reports', action: 'read', description: 'View reports' },
            { name: 'reports.create', module: 'reports', action: 'create', description: 'Generate reports' },
            { name: 'reports.manage', module: 'reports', action: 'manage', description: 'Full report management' },
            // HR & Payroll permissions
            { name: 'employees.view', module: 'employees', action: 'read', description: 'View employee profiles' },
            { name: 'employees.create', module: 'employees', action: 'create', description: 'Create employee profiles' },
            { name: 'employees.update', module: 'employees', action: 'update', description: 'Update employee profiles' },
            { name: 'employees.delete', module: 'employees', action: 'delete', description: 'Delete employees' },
            { name: 'employees.manage', module: 'employees', action: 'manage', description: 'Full employee management' },
            { name: 'payroll.view', module: 'payroll', action: 'read', description: 'View payroll information' },
            { name: 'payroll.create', module: 'payroll', action: 'create', description: 'Create payroll entries' },
            { name: 'payroll.update', module: 'payroll', action: 'update', description: 'Update payroll' },
            { name: 'payroll.delete', module: 'payroll', action: 'delete', description: 'Delete payroll entries' },
            { name: 'payroll.manage', module: 'payroll', action: 'manage', description: 'Full payroll management' },
            // Inventory permissions
            { name: 'products.view', module: 'products', action: 'read', description: 'View products and inventory' },
            { name: 'products.create', module: 'products', action: 'create', description: 'Create products' },
            { name: 'products.update', module: 'products', action: 'update', description: 'Update products' },
            { name: 'products.delete', module: 'products', action: 'delete', description: 'Delete products' },
            { name: 'products.manage', module: 'products', action: 'manage', description: 'Full product management' },
            // Admin permissions
            { name: 'admin.audit.view', module: 'admin', action: 'read', description: 'View audit logs' },
            { name: 'admin.backup.view', module: 'admin', action: 'read', description: 'View backup status' },
            { name: 'admin.backup.create', module: 'admin', action: 'create', description: 'Create backups' },
            { name: 'admin.roles.view', module: 'admin', action: 'read', description: 'View roles and permissions' },
            { name: 'admin.roles.manage', module: 'admin', action: 'manage', description: 'Manage roles and permissions' },
            { name: 'admin.system', module: 'admin', action: 'manage', description: 'System administration' }
        ];
        const defaultRoles = [
            {
                name: 'owner',
                description: 'Company owner with full access',
                permissions: defaultPermissions.map(p => p.name)
            },
            {
                name: 'admin',
                description: 'Administrator with most permissions',
                permissions: defaultPermissions
                    .filter(p => !p.name.includes('admin.system') && !p.name.includes('companies.delete'))
                    .map(p => p.name)
            },
            {
                name: 'manager',
                description: 'Manager with operational permissions',
                permissions: defaultPermissions
                    .filter(p => p.module !== 'admin' &&
                    !p.name.includes('.delete') &&
                    !p.name.includes('companies.manage') &&
                    !p.name.includes('users.manage'))
                    .map(p => p.name)
            },
            {
                name: 'accountant',
                description: 'Accounting and financial permissions',
                permissions: defaultPermissions
                    .filter(p => ['invoices', 'expenses', 'transactions', 'reports'].includes(p.module) ||
                    p.name === 'companies.view')
                    .map(p => p.name)
            },
            {
                name: 'employee',
                description: 'Basic employee permissions',
                permissions: [
                    'companies.view',
                    'invoices.view',
                    'expenses.view',
                    'transactions.view',
                    'reports.view',
                    'employees.view'
                ]
            }
        ];
        // Create permissions
        for (const perm of defaultPermissions) {
            await prisma.permission.upsert({
                where: { name: perm.name },
                update: perm,
                create: perm
            });
        }
        // Create roles with permissions
        for (const role of defaultRoles) {
            const roleRecord = await prisma.role.upsert({
                where: { name: role.name },
                update: { description: role.description },
                create: { name: role.name, description: role.description }
            });
            // Get permission IDs
            const permissions = await prisma.permission.findMany({
                where: { name: { in: role.permissions } }
            });
            // Clear existing role permissions
            await prisma.rolePermission.deleteMany({
                where: { roleId: roleRecord.id }
            });
            // Add new role permissions
            for (const permission of permissions) {
                try {
                    await prisma.rolePermission.create({
                        data: {
                            roleId: roleRecord.id,
                            permissionId: permission.id
                        }
                    });
                }
                catch (error) {
                    // Ignore if already exists (P2002 unique constraint)
                    if (error?.code !== 'P2002') {
                        throw error;
                    }
                }
            }
        }
    }
    /**
     * Check if user has specific permission
     */
    static async hasPermission(userId, companyId, permission) {
        const membership = await prisma.membership.findUnique({
            where: {
                userId_companyId: { userId, companyId }
            },
            include: {
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
        if (!membership)
            return false;
        return membership.role.permissions.some((rp) => rp.permission.name === permission);
    }
    /**
     * Check if user has any of the specified permissions
     */
    static async hasAnyPermission(userId, companyId, permissions) {
        for (const permission of permissions) {
            if (await this.hasPermission(userId, companyId, permission)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if user has all of the specified permissions
     */
    static async hasAllPermissions(userId, companyId, permissions) {
        for (const permission of permissions) {
            if (!(await this.hasPermission(userId, companyId, permission))) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get all permissions for a user in a company
     */
    static async getUserPermissions(userId, companyId) {
        const membership = await prisma.membership.findUnique({
            where: {
                userId_companyId: { userId, companyId }
            },
            include: {
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
        if (!membership)
            return [];
        return membership.role.permissions.map((rp) => rp.permission.name);
    }
    /**
     * Get role with permissions
     */
    static async getRoleWithPermissions(roleId) {
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        if (!role)
            return null;
        return {
            id: role.id,
            name: role.name,
            description: role.description || undefined,
            permissions: role.permissions.map((rp) => ({
                id: rp.permission.id,
                name: rp.permission.name,
                description: rp.permission.description ?? undefined,
                module: rp.permission.module,
                action: rp.permission.action
            }))
        };
    }
    /**
     * Create or update role with permissions
     */
    static async createOrUpdateRole(roleData, permissionNames) {
        // Get permission IDs
        const permissions = await prisma.permission.findMany({
            where: { name: { in: permissionNames } }
        });
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: { description: roleData.description },
            create: { name: roleData.name, description: roleData.description }
        });
        // Clear existing permissions
        await prisma.rolePermission.deleteMany({
            where: { roleId: role.id }
        });
        // Add new permissions
        for (const permission of permissions) {
            await prisma.rolePermission.create({
                data: {
                    roleId: role.id,
                    permissionId: permission.id
                }
            });
        }
        return this.getRoleWithPermissions(role.id);
    }
    /**
     * Get all available permissions
     */
    static async getAllPermissions() {
        const perms = await prisma.permission.findMany({
            orderBy: [
                { module: 'asc' },
                { action: 'asc' }
            ]
        });
        return perms.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? undefined,
            module: p.module,
            action: p.action
        }));
    }
    /**
     * Get all roles with their permissions
     */
    static async getAllRoles() {
        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        return roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description || undefined,
            permissions: role.permissions.map((rp) => ({
                id: rp.permission.id,
                name: rp.permission.name,
                description: rp.permission.description ?? undefined,
                module: rp.permission.module,
                action: rp.permission.action
            }))
        }));
    }
    /**
     * Assign role to user in company
     */
    static async assignRoleToUser(userId, companyId, roleId) {
        await prisma.membership.update({
            where: {
                userId_companyId: { userId, companyId }
            },
            data: { roleId }
        });
    }
    /**
     * Check if user is owner of company
     */
    static async isCompanyOwner(userId, companyId) {
        const membership = await prisma.membership.findUnique({
            where: {
                userId_companyId: { userId, companyId }
            },
            include: { role: true }
        });
        return membership?.role.name === 'owner';
    }
    /**
     * Check if user has admin privileges
     */
    static async isAdmin(userId, companyId) {
        const permissions = await this.getUserPermissions(userId, companyId);
        return permissions.some(p => p.startsWith('admin.'));
    }
}
exports.PermissionsService = PermissionsService;
//# sourceMappingURL=permissions.service.js.map