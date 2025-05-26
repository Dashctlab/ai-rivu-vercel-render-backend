// routes/login.js
// Handles login validation and response routing

const express = require('express');
const router = express.Router();
const logActivity = require('../utils/logger');
const { getUsers } = require('../utils/fileUtils');

/**
 * POST /login
 * Validates user credentials and responds with success/failure.
 */
router.post('/', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = getUsers();
    const user = users[email];

    if (user && user.password === password) {
        await logActivity(email, 'Login Success');
        res.status(200).json({ message: 'Login successful', email });
    } else {
        await logActivity(email, 'Login Failed');
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

module.exports = router;
