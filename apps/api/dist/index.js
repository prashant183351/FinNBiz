"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const auth_1 = __importDefault(require("./routes/auth"));
const companies_1 = __importDefault(require("./routes/companies"));
const employees_1 = __importDefault(require("./routes/employees"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const reports_1 = __importDefault(require("./routes/reports"));
const upi_1 = __importDefault(require("./routes/upi"));
const admin_1 = __importDefault(require("./routes/admin"));
const hr_1 = __importDefault(require("./routes/hr"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const payment_1 = __importDefault(require("./routes/payment"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const vendors_1 = __importDefault(require("./routes/vendors"));
const purchases_1 = __importDefault(require("./routes/purchases"));
const import_1 = __importDefault(require("./routes/import"));
const backups_1 = __importDefault(require("./routes/backups"));
const audit_1 = require("./middleware/audit");
const permissions_service_1 = require("./services/permissions.service");
const subscription_service_1 = require("./services/subscription.service");
const payment_service_1 = require("./services/payment.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'finnbiz-api'
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/companies', companies_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/upi', upi_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/hr', hr_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/subscription', subscription_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/vendors', vendors_1.default);
app.use('/api/purchases', purchases_1.default);
app.use('/api/import', import_1.default);
app.use('/api/backups', backups_1.default);
// Apply audit logging to all API routes (except auth)
app.use('/api', (0, audit_1.auditLogger)({
    excludePaths: ['/api/auth/login', '/api/auth/refresh', '/api/health']
}));
// Basic 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.listen(PORT, async () => {
    console.log(`🚀 FinNbiz API server running on port ${PORT}`);
    // Initialize default permissions, roles, and plans
    try {
        console.log('🔐 Initializing permissions and roles...');
        await permissions_service_1.PermissionsService.initializeDefaultPermissions();
        console.log('✅ Permissions and roles initialized');
        console.log('💳 Initializing subscription plans...');
        await subscription_service_1.SubscriptionService.initializeDefaultPlans();
        console.log('✅ Subscription plans initialized');
        console.log('💰 Initializing payment gateways...');
        await payment_service_1.PaymentService.initializeGateways();
        console.log('✅ Payment gateways initialized');
    }
    catch (error) {
        console.error('❌ Failed to initialize services:', error);
    }
});
//# sourceMappingURL=index.js.map