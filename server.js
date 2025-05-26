// server.js
// Main Express entry point. Loads config, mounts routes, starts server.

require('dotenv').config();

if (!process.env.OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY environment variable is not set.");
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const config = require('./config');
const { initializeFiles } = require('./utils/fileUtils');
const logActivity = require('./utils/enhancedLogger'); // CHANGED: Updated logger import
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS config
const corsOptions = {
    origin: config.FRONTEND_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use(async (err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    await logActivity('SYSTEM', `Unhandled Error - ${err.message}`);
    if (!res.headersSent) {
        res.status(500).send('Something broke!');
    }
});

// Initialize and start server
initializeFiles().then(() => {
    app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Allowing requests from: ${config.FRONTEND_URL}`);
        console.log(`Admin dashboard available at: http://localhost:${PORT}/admin/dashboard`); // NEW
        await logActivity('SYSTEM', 'Server Started');
    });
}).catch(err => {
    console.error('Failed to initialize files:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT received: closing HTTP server');
    logActivity('SYSTEM', 'Server Shutdown Signal').then(() => process.exit(0));
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received: closing HTTP server');
    logActivity('SYSTEM', 'Server Termination Signal').then(() => process.exit(0));
});
