"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const client_1 = require("@prisma/client");
const audit_service_1 = require("./audit.service");
const prisma = new client_1.PrismaClient();
class InventoryService {
    /**
     * Create or update product
     */
    static async createOrUpdateProduct(productData, createdBy) {
        // Try to find existing product by name and company
        let existingProduct = await prisma.product.findFirst({
            where: {
                companyId: productData.companyId,
                name: productData.name
            }
        });
        let product;
        if (existingProduct) {
            // Update existing product
            product = await prisma.product.update({
                where: { id: existingProduct.id },
                data: productData,
                include: {
                    supplier: {
                        select: { name: true }
                    }
                }
            });
        }
        else {
            // Create new product
            product = await prisma.product.create({
                data: productData,
                include: {
                    supplier: {
                        select: { name: true }
                    }
                }
            });
        }
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: createdBy,
            action: 'create',
            resource: 'product',
            resourceId: product.id,
            details: {
                name: productData.name,
                sku: productData.sku,
                category: productData.category
            },
            success: true
        });
        return product;
    }
    /**
     * Get products with stock levels
     */
    static async getProducts(companyId, filters = {}, limit = 50, offset = 0) {
        const where = { companyId, active: true };
        if (filters.category)
            where.category = filters.category;
        if (filters.supplierId)
            where.supplierId = filters.supplierId;
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { barcode: { contains: filters.search, mode: 'insensitive' } }
            ];
        }
        const products = await prisma.product.findMany({
            where,
            include: {
                supplier: {
                    select: { name: true }
                },
                _count: {
                    select: { stockMovements: true }
                }
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset
        });
        // Calculate current stock for each product
        const productsWithStock = await Promise.all(products.map(async (product) => {
            const currentStock = await this.getCurrentStock(product.id);
            const lowStock = product.minStock && currentStock <= product.minStock;
            return {
                ...product,
                currentStock,
                lowStock,
                stockValue: currentStock * (product.costPrice || 0)
            };
        }));
        // Filter low stock if requested
        if (filters.lowStock) {
            return productsWithStock.filter(p => p.lowStock);
        }
        return productsWithStock;
    }
    /**
     * Record stock movement
     */
    static async recordStockMovement(movement) {
        const stockMovement = await prisma.stockMovement.create({
            data: {
                productId: movement.productId,
                type: movement.type,
                quantity: movement.quantity,
                unitPrice: movement.unitPrice,
                reference: movement.reference,
                reason: movement.reason,
                location: movement.location,
                performedBy: movement.performedBy,
                notes: movement.notes
            },
            include: {
                product: {
                    select: { name: true, sku: true }
                }
            }
        });
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: movement.performedBy,
            action: 'create',
            resource: 'stock_movement',
            resourceId: stockMovement.id,
            details: {
                productId: movement.productId,
                type: movement.type,
                quantity: movement.quantity,
                reason: movement.reason
            },
            success: true
        });
        return stockMovement;
    }
    /**
     * Get current stock level for product
     */
    static async getCurrentStock(productId) {
        const movements = await prisma.stockMovement.findMany({
            where: { productId },
            orderBy: { createdAt: 'asc' }
        });
        return movements.reduce((stock, movement) => {
            switch (movement.type) {
                case 'in':
                    return stock + movement.quantity;
                case 'out':
                    return stock - movement.quantity;
                case 'adjustment':
                    return movement.quantity; // Absolute adjustment
                case 'transfer':
                    return movement.quantity > 0 ? stock + movement.quantity : stock - Math.abs(movement.quantity);
                default:
                    return stock;
            }
        }, 0);
    }
    /**
     * Get stock movements for product
     */
    static async getStockMovements(productId, companyId, type, limit = 100, offset = 0) {
        const where = {};
        if (productId)
            where.productId = productId;
        if (companyId) {
            where.product = { companyId };
        }
        if (type)
            where.type = type;
        return prisma.stockMovement.findMany({
            where,
            include: {
                product: {
                    select: { name: true, sku: true, category: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }
    /**
     * Create or update vendor
     */
    static async createOrUpdateVendor(vendorData, createdBy) {
        // Check if vendor already exists (find by companyId + name)
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                companyId: vendorData.companyId,
                name: vendorData.name
            }
        });
        const vendor = existingVendor
            ? await prisma.vendor.update({
                where: { id: existingVendor.id },
                data: vendorData
            })
            : await prisma.vendor.create({ data: vendorData });
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: createdBy,
            action: 'create',
            resource: 'vendor',
            resourceId: vendor.id,
            details: {
                name: vendorData.name,
                email: vendorData.email
            },
            success: true
        });
        return vendor;
    }
    /**
     * Get vendors for company
     */
    static async getVendors(companyId, search, limit = 50, offset = 0) {
        const where = { companyId, active: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        return prisma.vendor.findMany({
            where,
            include: {
                _count: {
                    select: { products: true, purchaseOrders: true }
                }
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset
        });
    }
    /**
     * Create purchase order
     */
    static async createPurchaseOrder(orderData) {
        // Calculate total amount
        const totalAmount = orderData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const order = await prisma.purchaseOrder.create({
            data: {
                companyId: orderData.companyId,
                vendorId: orderData.vendorId,
                orderNumber: orderData.orderNumber,
                expectedDate: orderData.expectedDate,
                totalAmount,
                notes: orderData.notes,
                createdBy: orderData.createdBy,
                items: {
                    create: orderData.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalAmount: item.quantity * item.unitPrice
                    }))
                }
            },
            include: {
                vendor: {
                    select: { name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            select: { name: true, sku: true }
                        }
                    }
                }
            }
        });
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: orderData.createdBy,
            action: 'create',
            resource: 'purchase_order',
            resourceId: order.id,
            details: {
                orderNumber: orderData.orderNumber,
                vendorId: orderData.vendorId,
                totalAmount,
                itemCount: orderData.items.length
            },
            success: true
        });
        return order;
    }
    /**
     * Update purchase order status
     */
    static async updatePurchaseOrderStatus(orderId, status, updatedBy, notes) {
        const updateData = { status };
        if (status === 'approved') {
            updateData.approvedBy = updatedBy;
            updateData.approvedAt = new Date();
        }
        else if (status === 'sent') {
            updateData.sentAt = new Date();
        }
        const order = await prisma.purchaseOrder.update({
            where: { id: orderId },
            data: updateData,
            include: {
                vendor: {
                    select: { name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            select: { name: true, sku: true }
                        }
                    }
                }
            }
        });
        // If status changed to sent, record stock movements for received items
        if (status === 'received') {
            await this.processReceivedItems(orderId, updatedBy);
        }
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: updatedBy,
            action: 'update',
            resource: 'purchase_order',
            resourceId: orderId,
            details: { status, notes },
            success: true
        });
        return order;
    }
    /**
     * Process received items and update stock
     */
    static async processReceivedItems(orderId, receivedBy) {
        const items = await prisma.purchaseOrderItem.findMany({
            where: {
                orderId,
                status: 'pending'
            },
            include: {
                product: true,
                order: true
            }
        });
        for (const item of items) {
            // Update item status
            await prisma.purchaseOrderItem.update({
                where: { id: item.id },
                data: {
                    receivedQty: item.quantity,
                    status: 'received'
                }
            });
            // Record stock movement
            await this.recordStockMovement({
                productId: item.productId,
                type: 'in',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                reference: item.order.orderNumber,
                reason: 'purchase',
                performedBy: receivedBy
            });
        }
    }
    /**
     * Get purchase orders
     */
    static async getPurchaseOrders(companyId, status, vendorId, limit = 50, offset = 0) {
        const where = { companyId };
        if (status)
            where.status = status;
        if (vendorId)
            where.vendorId = vendorId;
        return prisma.purchaseOrder.findMany({
            where,
            include: {
                vendor: {
                    select: { name: true, email: true }
                },
                items: {
                    include: {
                        product: {
                            select: { name: true, sku: true }
                        }
                    }
                },
                _count: {
                    select: { items: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }
    /**
     * Get stock alerts (low stock, out of stock, over stock)
     */
    static async getStockAlerts(companyId) {
        const products = await prisma.product.findMany({
            where: { companyId, active: true }
        });
        const alerts = [];
        for (const product of products) {
            const currentStock = await this.getCurrentStock(product.id);
            // Check for low stock
            if (product.minStock && currentStock <= product.minStock) {
                const existingAlert = await prisma.stockAlert.findFirst({
                    where: {
                        productId: product.id,
                        type: 'low_stock',
                        status: 'active'
                    }
                });
                if (!existingAlert) {
                    const alert = await prisma.stockAlert.create({
                        data: {
                            productId: product.id,
                            type: 'low_stock',
                            threshold: product.minStock,
                            currentStock,
                            message: `Low stock alert: ${product.name} (${currentStock} remaining, min: ${product.minStock})`
                        },
                        include: {
                            product: {
                                select: { name: true, sku: true, category: true }
                            }
                        }
                    });
                    alerts.push(alert);
                }
            }
            // Check for out of stock
            if (currentStock <= 0) {
                const existingAlert = await prisma.stockAlert.findFirst({
                    where: {
                        productId: product.id,
                        type: 'out_of_stock',
                        status: 'active'
                    }
                });
                if (!existingAlert) {
                    const alert = await prisma.stockAlert.create({
                        data: {
                            productId: product.id,
                            type: 'out_of_stock',
                            threshold: 0,
                            currentStock,
                            message: `Out of stock: ${product.name}`
                        },
                        include: {
                            product: {
                                select: { name: true, sku: true, category: true }
                            }
                        }
                    });
                    alerts.push(alert);
                }
            }
            // Check for over stock
            if (product.maxStock && currentStock > product.maxStock) {
                const existingAlert = await prisma.stockAlert.findFirst({
                    where: {
                        productId: product.id,
                        type: 'over_stock',
                        status: 'active'
                    }
                });
                if (!existingAlert) {
                    const alert = await prisma.stockAlert.create({
                        data: {
                            productId: product.id,
                            type: 'over_stock',
                            threshold: product.maxStock,
                            currentStock,
                            message: `Over stock alert: ${product.name} (${currentStock} in stock, max: ${product.maxStock})`
                        },
                        include: {
                            product: {
                                select: { name: true, sku: true, category: true }
                            }
                        }
                    });
                    alerts.push(alert);
                }
            }
        }
        return alerts;
    }
    /**
     * Resolve stock alert
     */
    static async resolveStockAlert(alertId, resolvedBy) {
        await prisma.stockAlert.update({
            where: { id: alertId },
            data: {
                status: 'resolved',
                resolvedAt: new Date()
            }
        });
        // Log audit event
        await audit_service_1.AuditService.log({
            userId: resolvedBy,
            action: 'resolve',
            resource: 'stock_alert',
            resourceId: alertId,
            success: true
        });
    }
    /**
     * Generate stock valuation report
     */
    static async getStockValuation(companyId) {
        const products = await prisma.product.findMany({
            where: { companyId, active: true }
        });
        let totalValue = 0;
        let totalItems = 0;
        const valuation = [];
        for (const product of products) {
            const currentStock = await this.getCurrentStock(product.id);
            const value = currentStock * (product.costPrice || 0);
            valuation.push({
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    category: product.category
                },
                currentStock,
                costPrice: product.costPrice,
                totalValue: value
            });
            totalValue += value;
            totalItems += currentStock;
        }
        return {
            summary: {
                totalProducts: products.length,
                totalItems,
                totalValue
            },
            valuation: valuation.sort((a, b) => b.totalValue - a.totalValue)
        };
    }
    /**
     * Auto-generate purchase orders for low stock items
     */
    static async generateAutoPurchaseOrders(companyId, generatedBy) {
        const alerts = await this.getStockAlerts(companyId);
        const lowStockAlerts = alerts.filter(alert => alert.type === 'low_stock');
        const orders = [];
        for (const alert of lowStockAlerts) {
            const product = await prisma.product.findUnique({
                where: { id: alert.productId },
                include: { supplier: true }
            });
            if (product && product.supplier && product.reorderPoint) {
                const reorderQuantity = (product.reorderPoint * 2) - alert.currentStock; // Order enough to reach 2x reorder point
                if (reorderQuantity > 0) {
                    const orderNumber = `AUTO-${Date.now()}-${product.sku}`;
                    const order = await this.createPurchaseOrder({
                        companyId,
                        vendorId: product.supplier.id,
                        orderNumber,
                        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                        notes: `Auto-generated PO for low stock: ${product.name}`,
                        createdBy: generatedBy,
                        items: [{
                                productId: product.id,
                                quantity: reorderQuantity,
                                unitPrice: product.costPrice || 0
                            }]
                    });
                    orders.push(order);
                    // Resolve the alert
                    await this.resolveStockAlert(alert.id, generatedBy);
                }
            }
        }
        return orders;
    }
}
exports.InventoryService = InventoryService;
//# sourceMappingURL=inventory.service.js.map