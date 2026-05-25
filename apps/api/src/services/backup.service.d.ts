export interface BackupOptions {
    type?: 'full' | 'incremental';
    encrypt?: boolean;
    uploadToCloud?: boolean;
    retentionDays?: number;
}
export interface BackupResult {
    id: string;
    filename: string;
    size: number;
    checksum: string;
    status: string;
    location?: string;
    error?: string;
}
export declare class BackupService {
    private static s3?;
    static init(): void;
    /**
     * Create a database backup
     */
    static createBackup(options?: BackupOptions): Promise<BackupResult>;
    /**
     * Restore database from backup
     */
    static restoreBackup(backupId: string): Promise<void>;
    /**
     * Get backup history
     */
    static getBackupHistory(options?: {
        limit?: number;
        offset?: number;
        status?: string;
        type?: string;
    }): Promise<any[]>;
    /**
     * Get backup statistics
     */
    static getBackupStats(): Promise<any>;
    /**
     * Delete backup
     */
    static deleteBackup(backupId: string): Promise<void>;
    private static createDatabaseDump;
    private static restoreDatabaseDump;
    private static generateChecksum;
    private static encryptFile;
    private static decryptFile;
    private static uploadToS3;
    private static downloadFromS3;
    private static deleteFromS3;
    private static cleanupOldBackups;
}
//# sourceMappingURL=backup.service.d.ts.map