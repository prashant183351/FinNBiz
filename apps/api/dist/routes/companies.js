"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/companies - Get all companies for authenticated user
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const companies = await prisma.membership.findMany({
            where: { userId },
            include: {
                company: true,
                role: true
            }
        });
        res.json(companies.map((membership) => ({
            ...membership.company,
            role: membership.role.name,
            permissions: [] // permissions loaded separately via RolePermission join
        })));
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});
// GET /api/companies/:id - Get single company details
router.get('/:id', auth_1.authenticateToken, (0, auth_1.requireCompanyAccess)(), async (req, res) => {
    try {
        const { id } = req.params;
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        },
                        role: true
                    }
                },
                _count: {
                    select: {
                        invoices: true,
                        expenses: true
                    }
                }
            }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json(company);
    }
    catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});
// POST /api/companies - Create new company
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { name, gstin, pan, address } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        // Start a transaction to create company and membership
        const result = await prisma.$transaction(async (prisma) => {
            // Create company
            const company = await prisma.company.create({
                data: {
                    name,
                    gstin,
                    pan,
                    address
                }
            });
            // Get or create owner role
            let ownerRole = await prisma.role.findUnique({
                where: { name: 'owner' }
            });
            if (!ownerRole) {
                ownerRole = await prisma.role.create({
                    data: {
                        name: 'owner'
                    }
                });
            }
            // Create membership for the creator as owner
            await prisma.membership.create({
                data: {
                    userId,
                    companyId: company.id,
                    roleId: ownerRole.id
                }
            });
            return company;
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error creating company:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'GSTIN or PAN already exists' });
        }
        res.status(500).json({ error: 'Failed to create company' });
    }
});
// PUT /api/companies/:id - Update company
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireCompanyAccess)(['company:update']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, gstin, pan, address } = req.body;
        const company = await prisma.company.update({
            where: { id },
            data: {
                name,
                gstin,
                pan,
                address
            }
        });
        res.json(company);
    }
    catch (error) {
        console.error('Error updating company:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'GSTIN or PAN already exists' });
        }
        res.status(500).json({ error: 'Failed to update company' });
    }
});
// DELETE /api/companies/:id - Delete company (only owners)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['owner']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.company.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting company:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.status(500).json({ error: 'Failed to delete company' });
    }
});
// POST /api/companies/:id/invite - Invite user to company
router.post('/:id/invite', auth_1.authenticateToken, (0, auth_1.requireCompanyAccess)(['user:invite']), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, roleName = 'member' } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found. They must register first.' });
        }
        // Check if user is already a member
        const existingMembership = await prisma.membership.findUnique({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId: id
                }
            }
        });
        if (existingMembership) {
            return res.status(400).json({ error: 'User is already a member of this company' });
        }
        // Get role
        let role = await prisma.role.findUnique({
            where: { name: roleName }
        });
        if (!role) {
            // Create default member role if it doesn't exist
            role = await prisma.role.create({
                data: {
                    name: roleName
                }
            });
        }
        // Create membership
        const membership = await prisma.membership.create({
            data: {
                userId: user.id,
                companyId: id,
                roleId: role.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                role: true
            }
        });
        res.status(201).json(membership);
    }
    catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({ error: 'Failed to invite user' });
    }
});
// DELETE /api/companies/:id/members/:userId - Remove user from company
router.delete('/:id/members/:userId', auth_1.authenticateToken, (0, auth_1.requireCompanyAccess)(['user:remove']), async (req, res) => {
    try {
        const { id, userId } = req.params;
        // Prevent removing yourself if you're the only owner
        const memberships = await prisma.membership.findMany({
            where: { companyId: id },
            include: { role: true }
        });
        const targetMembership = memberships.find((m) => m.userId === userId);
        const currentUserMembership = memberships.find((m) => m.userId === req.userId);
        if (!targetMembership) {
            return res.status(404).json({ error: 'User is not a member of this company' });
        }
        if (targetMembership.userId === req.userId) {
            return res.status(400).json({ error: 'Cannot remove yourself from the company' });
        }
        // If removing an owner, ensure there's at least one owner left
        if (targetMembership.role.name === 'owner') {
            const ownerCount = memberships.filter((m) => m.role.name === 'owner').length;
            if (ownerCount <= 1) {
                return res.status(400).json({ error: 'Cannot remove the last owner' });
            }
        }
        // Only owners can remove other owners
        if (targetMembership.role.name === 'owner' && currentUserMembership?.role.name !== 'owner') {
            return res.status(403).json({ error: 'Only owners can remove other owners' });
        }
        await prisma.membership.delete({
            where: {
                userId_companyId: {
                    userId,
                    companyId: id
                }
            }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({ error: 'Failed to remove user' });
    }
});
// PUT /api/companies/:id/members/:userId/role - Update user role in company
router.put('/:id/members/:userId/role', auth_1.authenticateToken, (0, auth_1.requireCompanyAccess)(['user:update']), async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { roleName } = req.body;
        if (!roleName) {
            return res.status(400).json({ error: 'Role name is required' });
        }
        // Get or create role
        let role = await prisma.role.findUnique({
            where: { name: roleName }
        });
        if (!role) {
            role = await prisma.role.create({
                data: { name: roleName }
            });
        }
        // Update membership
        const membership = await prisma.membership.update({
            where: {
                userId_companyId: {
                    userId,
                    companyId: id
                }
            },
            data: {
                roleId: role.id
            },
            include: {
                role: true
            }
        });
        res.json(membership);
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
exports.default = router;
//# sourceMappingURL=companies.js.map