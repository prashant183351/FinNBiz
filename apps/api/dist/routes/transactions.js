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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const financial_service_1 = require("../services/financial.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/transactions - Get all transactions for a company
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const transactions = await prisma.transaction.findMany({
            where: { companyId },
            include: {
                ledgerEntries: true,
            },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                ledgerEntries: true,
            }
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    }
    catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});
// POST /api/transactions - Create new transaction with auto ledger posting
router.post('/', async (req, res) => {
    try {
        const { companyId, type, amount, description, category, paymentMethod = 'cash', reference, vendor, date, source = 'manual', metadata } = req.body;
        if (!companyId || !type || !amount || !description) {
            return res.status(400).json({
                error: 'Company ID, type, amount, and description are required'
            });
        }
        // Auto-categorize if not provided and it's an expense
        let finalCategory = category;
        if (type === 'expense' && !category) {
            finalCategory = await financial_service_1.FinancialService.categorizeExpense(description, amount);
        }
        const transactionData = {
            companyId,
            type,
            amount: parseFloat(amount),
            description,
            category: finalCategory,
            paymentMethod,
            reference,
            vendor,
            date: date ? new Date(date) : new Date(),
            source,
            metadata,
        };
        const { transaction, ledgerEntries } = await financial_service_1.FinancialService.createTransactionWithLedger(transactionData);
        // Trigger background report recalculation
        const { Queue } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
        const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const reportQueue = new Queue('report-calculations', { connection: redis });
        // Queue dashboard summary update
        await reportQueue.add('update-dashboard', {
            companyId,
            reportType: 'dashboard_summary',
        });
        res.status(201).json({
            transaction,
            ledgerEntries,
            message: 'Transaction created with automatic ledger entries'
        });
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});
// PUT /api/transactions/:id - Update transaction (limited - mainly for corrections)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { description, category, paymentMethod, reference, vendor, metadata } = req.body;
        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                description,
                category,
                paymentMethod,
                reference,
                vendor,
                metadata,
            }
        });
        res.json(transaction);
    }
    catch (error) {
        console.error('Error updating transaction:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});
// DELETE /api/transactions/:id - Delete transaction and related ledger entries
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Delete ledger entries first (cascade will handle this, but being explicit)
        await prisma.ledgerEntry.deleteMany({
            where: { transactionId: id }
        });
        // Delete transaction
        await prisma.transaction.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});
// POST /api/transactions/journal - Create a manual multi-leg Journal Voucher entry
router.post('/journal', async (req, res) => {
    try {
        const { companyId, date, description, entries } = req.body;
        if (!companyId || !entries || !Array.isArray(entries) || entries.length < 2) {
            return res.status(400).json({ error: 'Company ID and at least 2 ledger entries are required' });
        }
        // Verify balance: Sum of debits must equal sum of credits
        let totalDebit = 0;
        let totalCredit = 0;
        for (const entry of entries) {
            totalDebit += parseFloat(entry.debit || 0);
            totalCredit += parseFloat(entry.credit || 0);
        }
        // Allow a very tiny delta tolerance for floating numbers
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                error: `Journal Voucher is unbalanced. Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit}).`
            });
        }
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        // Create single parent transaction and multi ledger entries inside a Prisma transaction block
        const result = await prisma.$transaction(async (tx) => {
            const parentTransaction = await tx.transaction.create({
                data: {
                    companyId,
                    type: 'transfer', // manual JV adjustments act as internal transfers/journaling
                    amount: totalDebit,
                    description: description || 'Manual Journal Voucher Adjustment',
                    paymentMethod: 'other',
                    reference: 'MANUAL_JV',
                    date: date ? new Date(date) : new Date(),
                    source: 'manual_jv'
                }
            });
            const createdLedgerEntries = [];
            for (const entry of entries) {
                const ledger = await tx.ledgerEntry.create({
                    data: {
                        companyId,
                        transactionId: parentTransaction.id,
                        date: date ? new Date(date) : new Date(),
                        account: entry.account,
                        accountType: entry.accountType,
                        debit: parseFloat(entry.debit || 0),
                        credit: parseFloat(entry.credit || 0),
                        description: description || 'Manual Journal Entry Adjustments',
                        refType: 'journal'
                    }
                });
                createdLedgerEntries.push(ledger);
            }
            return { transaction: parentTransaction, ledgerEntries: createdLedgerEntries };
        });
        // Trigger report recalculations
        const { Queue } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
        const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const reportQueue = new Queue('report-calculations', { connection: redis });
        await reportQueue.add('update-dashboard', {
            companyId,
            reportType: 'dashboard_summary',
        });
        res.status(201).json({
            success: true,
            transaction: result.transaction,
            ledgerEntries: result.ledgerEntries,
            message: 'Journal Voucher posted successfully with balanced ledger entries.'
        });
    }
    catch (error) {
        console.error('Error creating journal voucher:', error);
        res.status(500).json({ error: error.message || 'Failed to create Journal Voucher' });
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map