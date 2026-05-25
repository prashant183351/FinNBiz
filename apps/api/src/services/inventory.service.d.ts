export interface ProductData {
    companyId: string;
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    category?: string;
    unit?: string;
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    costPrice?: number;
    sellingPrice?: number;
    location?: string;
    supplierId?: string;
}
export interface StockMovementData {
    productId: string;
    type: 'in' | 'out' | 'adjustment' | 'transfer';
    quantity: number;
    unitPrice?: number;
    reference?: string;
    reason?: string;
    location?: string;
    performedBy: string;
    notes?: string;
}
export interface VendorData {
    companyId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    gstin?: string;
    paymentTerms?: string;
}
export interface PurchaseOrderData {
    companyId: string;
    vendorId: string;
    orderNumber: string;
    expectedDate?: Date;
    notes?: string;
    createdBy: string;
    items: PurchaseOrderItemData[];
}
export interface PurchaseOrderItemData {
    productId: string;
    quantity: number;
    unitPrice: number;
}
export declare class InventoryService {
    /**
     * Create or update product
     */
    static createOrUpdateProduct(productData: ProductData, createdBy: string): Promise<any>;
    /**
     * Get products with stock levels
     */
    static getProducts(companyId: string, filters?: {
        category?: string;
        supplierId?: string;
        lowStock?: boolean;
        search?: string;
    }, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Record stock movement
     */
    static recordStockMovement(movement: StockMovementData): Promise<any>;
    /**
     * Get current stock level for product
     */
    static getCurrentStock(productId: string): Promise<number>;
    /**
     * Get stock movements for product
     */
    static getStockMovements(productId?: string, companyId?: string, type?: string, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Create or update vendor
     */
    static createOrUpdateVendor(vendorData: VendorData, createdBy: string): Promise<any>;
    /**
     * Get vendors for company
     */
    static getVendors(companyId: string, search?: string, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Create purchase order
     */
    static createPurchaseOrder(orderData: PurchaseOrderData): Promise<any>;
    /**
     * Update purchase order status
     */
    static updatePurchaseOrderStatus(orderId: string, status: string, updatedBy: string, notes?: string): Promise<any>;
    /**
     * Process received items and update stock
     */
    private static processReceivedItems;
    /**
     * Get purchase orders
     */
    static getPurchaseOrders(companyId: string, status?: string, vendorId?: string, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Get stock alerts (low stock, out of stock, over stock)
     */
    static getStockAlerts(companyId: string): Promise<any[]>;
    /**
     * Resolve stock alert
     */
    static resolveStockAlert(alertId: string, resolvedBy: string): Promise<void>;
    /**
     * Generate stock valuation report
     */
    static getStockValuation(companyId: string): Promise<any>;
    /**
     * Auto-generate purchase orders for low stock items
     */
    static generateAutoPurchaseOrders(companyId: string, generatedBy: string): Promise<any[]>;
}
//# sourceMappingURL=inventory.service.d.ts.map