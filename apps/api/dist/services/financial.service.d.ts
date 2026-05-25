export interface TransactionData {
    companyId: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string;
    category?: string;
    paymentMethod?: string;
    reference?: string;
    vendor?: string;
    date?: Date;
    source: string;
    metadata?: any;
}
export interface LedgerEntryData {
    companyId: string;
    transactionId?: string;
    account: string;
    accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
    debit: number;
    credit: number;
    description: string;
    refType?: string;
    refId?: string;
}
export declare class FinancialService {
    /**
     * Create a transaction and automatically post ledger entries
     */
    static createTransactionWithLedger(data: TransactionData): Promise<{
        transaction: {
            id: string;
            type: string;
            amount: number;
            description: string;
            category: string | null;
            paymentMethod: string;
            reference: string | null;
            vendor: string | null;
            date: Date;
            source: string;
            metadata: string | null;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
        };
        ledgerEntries: {
            id: string;
            description: string;
            date: Date;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            account: string;
            accountType: string;
            debit: number;
            credit: number;
            refType: string | null;
            refId: string | null;
            balance: number;
            transactionId: string | null;
        }[];
    }>;
    /**
     * Create ledger entries for a transaction based on its type
     */
    private static createLedgerEntriesForTransaction;
    /**
     * Create a single ledger entry with running balance calculation
     */
    private static createLedgerEntry;
    /**
     * Get Profit & Loss statement
     */
    static getProfitLoss(companyId: string, startDate: Date, endDate: Date): Promise<{
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        period: {
            startDate: Date;
            endDate: Date;
        };
    }>;
    /**
     * Get Balance Sheet
     */
    static getBalanceSheet(companyId: string, asOfDate: Date): Promise<{
        assets: {
            account: string;
            balance: number;
        }[];
        liabilities: {
            account: string;
            balance: number;
        }[];
        equity: {
            account: string;
            balance: number;
        }[];
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        asOfDate: Date;
    }>;
    /**
     * Get Cash Flow statement
     */
    static getCashFlow(companyId: string, startDate: Date, endDate: Date): Promise<{
        cashInflows: number;
        cashOutflows: number;
        netCashFlow: number;
        period: {
            startDate: Date;
            endDate: Date;
        };
    }>;
    /**
     * Auto-categorize expense using AI (placeholder for now)
     */
    static categorizeExpense(description: string, amount: number): Promise<string>;
}
//# sourceMappingURL=financial.service.d.ts.map