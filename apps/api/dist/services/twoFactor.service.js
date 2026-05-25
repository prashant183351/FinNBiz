"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma = new client_1.PrismaClient();
class TwoFactorService {
    /**
     * Generate TOTP secret and QR code for setup
     */
    static async generateTOTPSecret(userId, email) {
        const secret = speakeasy_1.default.generateSecret({
            name: `FinBiz (${email})`,
            issuer: 'FinBiz'
        });
        const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url);
        const backupCodes = this.generateBackupCodes();
        // Store the secret temporarily (not enabled yet)
        await prisma.twoFactor.upsert({
            where: { userId },
            update: {
                type: 'totp',
                secret: secret.base32,
                backupCodes: JSON.stringify(this.encryptBackupCodes(backupCodes)),
                verified: false,
                enabled: false
            },
            create: {
                userId,
                type: 'totp',
                secret: secret.base32,
                backupCodes: JSON.stringify(this.encryptBackupCodes(backupCodes)),
                verified: false,
                enabled: false
            }
        });
        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes
        };
    }
    /**
     * Verify TOTP token during setup
     */
    static async verifyTOTPSetup(userId, token) {
        const twoFactor = await prisma.twoFactor.findUnique({
            where: { userId }
        });
        if (!twoFactor || !twoFactor.secret) {
            return false;
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: twoFactor.secret,
            encoding: 'base32',
            token,
            window: 2 // Allow 2 time windows (30 seconds each)
        });
        if (verified) {
            // Enable 2FA after successful verification
            await prisma.twoFactor.update({
                where: { userId },
                data: {
                    verified: true,
                    enabled: true
                }
            });
        }
        return verified;
    }
    /**
     * Verify TOTP token during login
     */
    static async verifyTOTP(userId, token) {
        const twoFactor = await prisma.twoFactor.findUnique({
            where: { userId }
        });
        if (!twoFactor || !twoFactor.enabled || !twoFactor.secret) {
            return { verified: false };
        }
        // Check TOTP token
        const verified = speakeasy_1.default.totp.verify({
            secret: twoFactor.secret,
            encoding: 'base32',
            token,
            window: 2
        });
        if (verified) {
            return { verified: true };
        }
        // Check backup codes if TOTP failed
        const backupCodes = this.decryptBackupCodes(JSON.parse(twoFactor.backupCodes || '[]'));
        const backupCodeIndex = backupCodes.indexOf(token);
        if (backupCodeIndex !== -1) {
            // Remove used backup code
            backupCodes.splice(backupCodeIndex, 1);
            await prisma.twoFactor.update({
                where: { userId },
                data: {
                    backupCodes: JSON.stringify(this.encryptBackupCodes(backupCodes))
                }
            });
            return { verified: true, backupCodeUsed: true };
        }
        return { verified: false };
    }
    /**
     * Send OTP via SMS (placeholder - integrate with SMS service)
     */
    static async sendSMSOTP(userId, phoneNumber) {
        const otp = this.generateOTP();
        // Store OTP temporarily (in production, use Redis with TTL)
        await prisma.twoFactor.upsert({
            where: { userId },
            update: {
                type: 'sms',
                phoneNumber,
                secret: otp, // Temporary storage
                verified: false,
                enabled: false
            },
            create: {
                userId,
                type: 'sms',
                phoneNumber,
                secret: otp,
                verified: false,
                enabled: false
            }
        });
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        console.log(`SMS OTP for ${phoneNumber}: ${otp}`);
        return otp; // Remove in production
    }
    /**
     * Send OTP via Email
     */
    static async sendEmailOTP(userId, email) {
        const otp = this.generateOTP();
        // Store OTP temporarily
        await prisma.twoFactor.upsert({
            where: { userId },
            update: {
                type: 'email',
                secret: otp,
                verified: false,
                enabled: false
            },
            create: {
                userId,
                type: 'email',
                secret: otp,
                verified: false,
                enabled: false
            }
        });
        await this.transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@finbiz.com',
            to: email,
            subject: 'FinBiz - Your 2FA Code',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>FinBiz Two-Factor Authentication</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
        });
    }
    /**
     * Verify OTP (SMS/Email)
     */
    static async verifyOTP(userId, token) {
        const twoFactor = await prisma.twoFactor.findUnique({
            where: { userId }
        });
        if (!twoFactor || !twoFactor.secret) {
            return false;
        }
        const isValid = twoFactor.secret === token;
        if (isValid) {
            await prisma.twoFactor.update({
                where: { userId },
                data: {
                    verified: true,
                    enabled: true,
                    secret: null // Clear temporary OTP
                }
            });
        }
        return isValid;
    }
    /**
     * Disable 2FA for user
     */
    static async disable2FA(userId) {
        await prisma.twoFactor.update({
            where: { userId },
            data: {
                enabled: false,
                verified: false,
                secret: null,
                backupCodes: '[]'
            }
        });
    }
    /**
     * Check if user has 2FA enabled
     */
    static async is2FAEnabled(userId) {
        const twoFactor = await prisma.twoFactor.findUnique({
            where: { userId }
        });
        return twoFactor?.enabled || false;
    }
    /**
     * Get 2FA status for user
     */
    static async get2FAStatus(userId) {
        const twoFactor = await prisma.twoFactor.findUnique({
            where: { userId }
        });
        if (!twoFactor) {
            return { enabled: false, type: null, verified: false };
        }
        return {
            enabled: twoFactor.enabled,
            type: twoFactor.type,
            verified: twoFactor.verified
        };
    }
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto_1.default.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
    static encryptBackupCodes(codes) {
        const key = process.env.BACKUP_CODE_ENCRYPTION_KEY || 'default-key-change-in-production';
        return codes.map(code => {
            const cipher = crypto_1.default.createCipher('aes-256-cbc', key);
            let encrypted = cipher.update(code, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        });
    }
    static decryptBackupCodes(encryptedCodes) {
        const key = process.env.BACKUP_CODE_ENCRYPTION_KEY || 'default-key-change-in-production';
        return encryptedCodes.map(encrypted => {
            const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        });
    }
}
exports.TwoFactorService = TwoFactorService;
TwoFactorService.transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
//# sourceMappingURL=twoFactor.service.js.map