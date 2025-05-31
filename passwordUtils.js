// utils/passwordUtils.js - NEW FILE
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 */
async function hashPassword(plainPassword) {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify a plain text password against a hash
 */
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw new Error('Password verification failed');
    }
}

/**
 * Migrate existing plain text passwords to hashed versions
 */
async function migratePasswords() {
    const { getUsers, saveUsers } = require('./fileUtils');
    const users = getUsers();
    let migrationCount = 0;

    for (const [email, userData] of Object.entries(users)) {
        // Check if password is already hashed (bcrypt hashes start with $2b$)
        if (!userData.password.startsWith('$2b$')) {
            console.log(`Migrating password for: ${email}`);
            userData.password = await hashPassword(userData.password);
            migrationCount++;
        }
    }

    if (migrationCount > 0) {
        await saveUsers();
        console.log(`✅ Migrated ${migrationCount} passwords to secure hashes`);
    } else {
        console.log('✅ All passwords already hashed');
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    migratePasswords
};

// routes/login.js - UPDATED with bcrypt
const express = require('express');
const router = express.Router();
const logActivity = require('../utils/enhancedLogger');
const { getUsers } = require('../utils/fileUtils');
const { verifyPassword } = require('../utils/passwordUtils'); // NEW

/**
 * POST /login - Secure login with bcrypt password verification
 */
router.post('/', async (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        await logActivity(email || 'unknown', 'Login Failed - Missing Credentials', {
            reason: 'Missing email or password',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await logActivity(email, 'Login Failed - Invalid Email Format', {
            reason: 'Invalid email format',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ message: 'Invalid email format' });
    }

    const users = getUsers();
    const user = users[email];

    if (!user) {
        await logActivity(email, 'Login Failed - User Not Found', {
            reason: 'User not found',
            attemptTime: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    try {
        // Use bcrypt to verify password
        const isPasswordValid = await verifyPassword(password, user.password);

        if (isPasswordValid) {
            // Enhanced success logging
            await logActivity(email, 'Login Success', {
                loginTime: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                tokenLimit: user.token_limit,
                tokensUsed: user.tokens_used || 0
            });
            
            res.status(200).json({ 
                message: 'Login successful', 
                email,
                userInfo: {
                    tokenLimit: user.token_limit,
                    tokensUsed: user.tokens_used || 0
                }
            });
        } else {
            // Enhanced failure logging
            await logActivity(email, 'Login Failed - Invalid Password', {
                reason: 'Wrong password',
                attemptTime: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        await logActivity(email, 'Login Failed - System Error', {
            reason: 'Password verification error',
            error: error.message,
            ip: req.ip
        });
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
