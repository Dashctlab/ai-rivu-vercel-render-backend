// server.js - Updated with Security Implementation
require('dotenv').config();

if (!process.env.OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY environment variable is not set.");
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Security imports
const { enforceHTTPS, securityHeaders, additionalSecurity, securityLogger } = require('./middleware/security');
const { generalLimiter, loginLimiter, generateLimiter, downloadLimiter } = require('./middleware/rateLimiting');
const { sanitizeMiddleware } = require('./middleware/validation');

const config = require('./config');
const { initializeFiles } = require('./utils/fileUtils');
const { migratePasswords } = require('./utils/passwordUtils'); // NEW
const logActivity = require('./utils/enhancedLogger');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// SECURITY: Trust proxy (important for Render/Heroku deployment)
app.set('trust proxy', 1);

// SECURITY: HTTPS enforcement (production only)
app.use(enforceHTTPS);

// SECURITY: Security headers
app.use(securityHeaders);

// SECURITY: Additional security middleware
app.use(additionalSecurity);

// SECURITY: Request logging for monitoring
app.use(securityLogger);

// SECURITY: General rate limiting for all requests
app.use(generalLimiter);

// CORS config
const corsOptions = {
    origin: function (origin, callback) {
        console.log(`🔍 CORS Debug - Origin: ${origin}, NODE_ENV: ${process.env.NODE_ENV}`);       // delete later
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // In production, be more restrictive
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = [
                config.FRONTEND_URL,
                'https://ai-rivu.vercel.app', // Your frontend domain
                'https://ai-rivu-vercel-render-backend-staging.onrender.com' // Backend domain
            ];
            
            if (allowedOrigins.includes(origin)) {
                console.log(`✅ CORS Allowed (production): ${origin}`);    //delete later
                return callback(null, true);
            } else {
                console.log(`❌ CORS Blocked (production): ${origin}`);
                console.warn(`CORS blocked origin: ${origin}`);
                return callback(new Error('Not allowed by CORS'));
            }
        } else {
            // Development: Allow all origins
              console.log(`✅ CORS Allowed (staging/dev): ${origin}`);
            return callback(null, true);
        }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "useremail","X-Screen-Size","Cache-Control"],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Body parsing with size limits for security
app.use(bodyParser.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for potential signature verification
        req.rawBody = buf;
    }
}));
app.use(bodyParser.urlencoded({ 
    limit: '10mb', 
    extended: true,
    parameterLimit: 100 // Limit number of parameters
}));

// SECURITY: Input sanitization
app.use(sanitizeMiddleware);

// SECURITY: Specific route rate limiting
app.use('/login', loginLimiter);
app.use('/generate', generateLimiter);
app.use('/download-docx', downloadLimiter);

// Mount routes
app.use('/', routes);

// SECURITY: Enhanced error handling
app.use(async (err, req, res, next) => {
    // Log security-related errors
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    
    console.error(`[ERROR] ${timestamp} - ${err.message} - IP: ${ip} - Path: ${req.path}`);
    console.error("Error stack:", err.stack);
    
    await logActivity('SYSTEM', `Security Error - ${err.message}`, {
        ip: ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: timestamp
    });

    if (!res.headersSent) {
        // Don't leak error details in production
        if (process.env.NODE_ENV === 'production') {
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Something went wrong. Please try again.',
                timestamp: timestamp
            });
        } else {
            res.status(500).json({
                error: 'Internal Server Error',
                message: err.message,
                timestamp: timestamp
            });
        }
    }
});

// SECURITY: 404 handler (prevent information disclosure)
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Initialize and start server with security
async function startServer() {
    try {
        // Initialize file system
        await initializeFiles();
        
        // SECURITY: Migrate passwords to hashed versions
        await migratePasswords();
        
        app.listen(PORT, async () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔒 Security: HTTPS enforcement ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DISABLED'}`);
            console.log(`🛡️  Security: Rate limiting ENABLED`);
            console.log(`🔐 Security: Password hashing ENABLED`);
            console.log(`📋 Security: Input validation ENABLED`);
            console.log(`🌐 CORS: Allowing requests from: ${config.FRONTEND_URL}`);
            console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin/dashboard`);
            
            await logActivity('SYSTEM', 'Secure Server Started', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                httpsEnabled: process.env.NODE_ENV === 'production',
                securityFeatures: [
                    'Rate Limiting',
                    'Password Hashing',
                    'Input Validation',
                    'Security Headers',
                    'CORS Protection',
                    'XSS Prevention'
                ]
            });
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Graceful shutdown with security logging
process.on('SIGINT', async () => {
    console.log('SIGINT received: closing HTTP server securely');
    await logActivity('SYSTEM', 'Server Shutdown Signal - SIGINT');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received: closing HTTP server securely');
    await logActivity('SYSTEM', 'Server Termination Signal - SIGTERM');
    process.exit(0);
});

// Handle uncaught exceptions securely
process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await logActivity('SYSTEM', 'Uncaught Exception', {
        error: err.message,
        stack: err.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await logActivity('SYSTEM', 'Unhandled Promise Rejection', {
        reason: reason?.toString(),
        promise: promise?.toString()
    });
});

startServer();
