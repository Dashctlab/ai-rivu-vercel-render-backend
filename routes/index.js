// routes/index.js
// Central router entry point to aggregate and mount individual route handlers

const express = require('express');
const router = express.Router();

// Basic health check route
router.get('/', (req, res) => {
    res.status(200).send('AI-RIVU Backend is running.');
});

// Import individual routes
const loginRoute = require('./login');
const generateRoute = require('./generate');
const downloadDocxRoute = require('./downloadDocx');
const adminRoute = require('./admin'); // NEW: Admin dashboard

// Bind them to their respective paths
router.use('/login', loginRoute);
router.use('/generate', generateRoute);
router.use('/download-docx', downloadDocxRoute);
router.use('/admin', adminRoute); // NEW: Mount admin routes

module.exports = router;
