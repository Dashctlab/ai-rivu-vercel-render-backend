// routes/index.js
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
const adminRoute = require('./admin');
const curriculumRoute = require('./curriculum');
const qualityFeedbackRoute = require('./qualityFeedback'); // NEW LINE

// Bind them to their respective paths
router.use('/login', loginRoute);
router.use('/generate', generateRoute);
router.use('/download-docx', downloadDocxRoute);
router.use('/admin', adminRoute);
router.use('/api/curriculum', curriculumRoute);
router.use('/api/quality-feedback', qualityFeedbackRoute); // NEW LINE

module.exports = router;
