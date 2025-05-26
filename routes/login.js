// routes/login.js
// Handles login validation and response routing with enhanced tracking

const express = require('express');
const router = express.Router();
const logActivity = require('../utils/enhancedLogger'); // CHANGED: Updated logger import
const { getUsers } = require('../utils/fileUtils');

/**
 * POST /login
 * Validates user credentials and responds with success/failure.
 * Enhanced with detailed login tracking
 */
router.post('/', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        await logActivity(email || 'unknown', 'Login Failed - Missing Credentials', {
            reason: 'Missing email or password',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = getUsers();
    const user = users[email];

    if (user && user.password === password) {
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
            // Optional: return user stats for frontend
            userInfo: {
                tokenLimit: user.token_limit,
                tokensUsed: user.tokens_used || 0
            }
        });
    } else {
        // Enhanced failure logging
        await logActivity(email, 'Login Failed - Invalid Credentials', {
            reason: user ? 'Wrong password' : 'User not found',
            attemptTime: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

module.exports = router;
