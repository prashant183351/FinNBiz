export interface AuditLogData {
    userId?: string;
    companyId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
}
export declare class AuditService {
    private static logger;
    static init(): void;
    /**
     * Log an audit event to both database and file
     */
    static log(data: AuditLogData): Promise<void>;
    /**
     * Get audit logs with filtering and pagination
     */
    static getAuditLogs(options?: {
        userId?: string;
        companyId?: string;
        action?: string;
        resource?: string;
        success?: boolean;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: ({
            company: {
                id: string;
                name: string;
            } | null;
            user: {
                id: string;
                name: string | null;
                email: string;
            } | null;
        } & {
            id: string;
            companyId: string | null;
            userId: string | null;
            action: string;
            resource: string;
            resourceId: string | null;
            details: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            success: boolean;
            timestamp: Date;
        })[];
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    }>;
    /**
     * Get audit statistics
     */
    static getAuditStats(companyId?: string, days?: number): Promise<{
        period: {
            days: number;
            startDate: Date;
        };
        summary: {
            totalLogs: number;
            successfulLogs: number;
            failedLogs: number;
            successRate: number;
        };
        security: {
            loginAttempts: number;
            failedLogins: number;
            failedLoginRate: number;
        };
        activity: {
            dataChanges: number;
        };
    }>;
    /**
     * Clean up old audit logs (for retention policy)
     */
    static cleanupOldLogs(daysToKeep?: number): Promise<number>;
    /**
     * Export audit logs for compliance/reporting
     */
    static exportAuditLogs(options: {
        startDate: Date;
        endDate: Date;
        companyId?: string;
        format?: 'json' | 'csv';
    }): Promise<string | ({
        company: {
            id: string;
            name: string;
        } | null;
        user: {
            id: string;
            name: string | null;
            email: string;
        } | null;
    } & {
        id: string;
        companyId: string | null;
        userId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        details: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        success: boolean;
        timestamp: Date;
    })[]>;
    private static convertToCSV;
}
//# sourceMappingURL=audit.service.d.ts.map