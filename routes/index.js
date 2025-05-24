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

// Bind them to their respective paths
router.use('/login', loginRoute);
router.use('/generate', generateRoute);
router.use('/download-docx', downloadDocxRoute);

module.exports = router;
