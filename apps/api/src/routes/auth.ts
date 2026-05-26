import express, { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";
import { TwoFactorService } from "../services/twoFactor.service";
import { AuditService } from "../services/audit.service";

const router: Router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "your-super-secret-refresh-token-key";

// POST /api/auth/register - Register new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      user,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /api/auth/login - Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
      },
    });

    if (!userWithPassword) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (!userWithPassword.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(
      password,
      userWithPassword.password,
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate tokens
    const token = jwt.sign({ userId: userWithPassword.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(
      { userId: userWithPassword.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );

    // Return user without password
    res.json({
      user: {
        id: userWithPassword.id,
        email: userWithPassword.email,
        name: userWithPassword.name,
        createdAt: userWithPassword.createdAt,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// PUT /api/auth/update - Update email and/or password
router.put('/update', async (req, res) => {
  try {
    const { email, newEmail, newPassword } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    const updateData: any = {}
    if (newEmail) updateData.email = newEmail
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { email },
      data: updateData,
    })

    res.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
      userId: string;
    };

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new access token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// GET /api/auth/me - Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // This will be protected by auth middleware
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          include: {
            company: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ============================================================================
// TWO-FACTOR AUTHENTICATION
// ============================================================================

// GET /api/auth/2fa/status - Get 2FA status for current user
router.get("/2fa/status", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const status = await TwoFactorService.get2FAStatus(userId);
    res.json(status);
  } catch (error) {
    console.error("Error fetching 2FA status:", error);
    res.status(500).json({ error: "Failed to fetch 2FA status" });
  }
});

// POST /api/auth/2fa/setup/totp - Setup TOTP 2FA
router.post("/2fa/setup/totp", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const setup = await TwoFactorService.generateTOTPSecret(
      userId,
      user.email!,
    );

    // Log audit event
    await AuditService.log({
      userId,
      action: "setup_2fa",
      resource: "auth",
      resourceId: userId,
      details: { type: "totp" },
      success: true,
    });

    res.json(setup);
  } catch (error) {
    console.error("Error setting up TOTP:", error);
    res.status(500).json({ error: "Failed to setup TOTP" });
  }
});

// POST /api/auth/2fa/verify/totp - Verify TOTP setup
router.post("/2fa/verify/totp", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const verified = await TwoFactorService.verifyTOTPSetup(userId, token);

    if (verified) {
      // Log audit event
      await AuditService.log({
        userId,
        action: "enable_2fa",
        resource: "auth",
        resourceId: userId,
        details: { type: "totp" },
        success: true,
      });

      res.json({ message: "2FA enabled successfully" });
    } else {
      res.status(400).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error verifying TOTP:", error);
    res.status(500).json({ error: "Failed to verify TOTP" });
  }
});

// POST /api/auth/2fa/setup/sms - Setup SMS 2FA
router.post("/2fa/setup/sms", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const otp = await TwoFactorService.sendSMSOTP(userId, phoneNumber);

    // Log audit event
    await AuditService.log({
      userId,
      action: "setup_2fa",
      resource: "auth",
      resourceId: userId,
      details: { type: "sms", phoneNumber },
      success: true,
    });

    // In production, don't return the OTP
    res.json({ message: "OTP sent to your phone", debug_otp: otp });
  } catch (error) {
    console.error("Error setting up SMS 2FA:", error);
    res.status(500).json({ error: "Failed to setup SMS 2FA" });
  }
});

// POST /api/auth/2fa/setup/email - Setup Email 2FA
router.post("/2fa/setup/email", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return res.status(404).json({ error: "User email not found" });
    }

    await TwoFactorService.sendEmailOTP(userId, user.email);

    // Log audit event
    await AuditService.log({
      userId,
      action: "setup_2fa",
      resource: "auth",
      resourceId: userId,
      details: { type: "email", email: user.email },
      success: true,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error setting up Email 2FA:", error);
    res.status(500).json({ error: "Failed to setup Email 2FA" });
  }
});

// POST /api/auth/2fa/verify - Verify 2FA setup (SMS/Email)
router.post("/2fa/verify", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const verified = await TwoFactorService.verifyOTP(userId, token);

    if (verified) {
      // Log audit event
      await AuditService.log({
        userId,
        action: "enable_2fa",
        resource: "auth",
        resourceId: userId,
        details: { type: "otp" },
        success: true,
      });

      res.json({ message: "2FA enabled successfully" });
    } else {
      res.status(400).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({ error: "Failed to verify 2FA" });
  }
});

// POST /api/auth/2fa/verify-login - Verify 2FA during login
router.post("/2fa/verify-login", async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "User ID and token are required" });
    }

    const verification = await TwoFactorService.verifyTOTP(userId, token);

    if (verification.verified) {
      // Generate tokens
      const authToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
      const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Log audit event
      await AuditService.log({
        userId,
        action: "login",
        resource: "auth",
        resourceId: userId,
        details: {
          method: "2fa",
          backupCodeUsed: verification.backupCodeUsed,
        },
        success: true,
      });

      res.json({
        user,
        token: authToken,
        refreshToken,
      });
    } else {
      // Log failed 2FA attempt
      await AuditService.log({
        userId,
        action: "login_2fa_failed",
        resource: "auth",
        resourceId: userId,
        success: false,
      });

      res.status(401).json({ error: "Invalid 2FA token" });
    }
  } catch (error) {
    console.error("Error verifying 2FA login:", error);
    res.status(500).json({ error: "Failed to verify 2FA login" });
  }
});

// DELETE /api/auth/2fa - Disable 2FA
router.delete("/2fa", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    await TwoFactorService.disable2FA(userId);

    // Log audit event
    await AuditService.log({
      userId,
      action: "disable_2fa",
      resource: "auth",
      resourceId: userId,
      success: true,
    });

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

export default router;
