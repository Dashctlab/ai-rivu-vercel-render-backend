// routes/index.js
const express = require('express');
const router = express.Router();

// Basic health check route
router.get('/', (req, res) => {
    res.status(200).send('AI-RIVU Backend is running.');
});

// Simple health check endpoint. Using --> uptimerobot.com to do server ping every 5 mins to keep alive
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
    });
});

// Import individual routes
const loginRoute = require('./login');
const generateRoute = require('./generate');
const downloadDocxRoute = require('./downloadDocx');
const adminRoute = require('./admin');
const curriculumRoute = require('./curriculum');
const qualityFeedbackRoute = require('./qualityFeedback');

// Bind them to their respective paths
router.use('/login', loginRoute);
router.use('/generate', generateRoute);
router.use('/download-docx', downloadDocxRoute);
router.use('/admin', adminRoute);
router.use('/api/curriculum', curriculumRoute);
router.use('/api/quality-feedback', qualityFeedbackRoute); 
module.exports = router;
