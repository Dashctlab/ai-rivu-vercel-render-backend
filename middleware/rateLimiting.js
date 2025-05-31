// middleware/rateLimiting.js - NEW FILE
const rateLimit = require('express-rate-limit');

// General API rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again in 15 minutes',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.log(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again in 15 minutes',
            retryAfter: 15 * 60
        });
    }
});

// Strict rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        error: 'Too many login attempts',
        message: 'Please try again in 15 minutes',
        retryAfter: 15 * 60
    },
    handler: (req, res) => {
        console.log(`Login rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Please try again in 15 minutes',
            retryAfter: 15 * 60
        });
    }
});

// Rate limiting for AI generation (expensive operations)
const generateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 generations per 10 minutes
    message: {
        error: 'Generation limit exceeded',
        message: 'Please wait 10 minutes before generating more papers',
        retryAfter: 10 * 60
    },
    handler: (req, res) => {
        console.log(`Generation rate limit exceeded for IP: ${req.ip}, User: ${req.headers.useremail}`);
        res.status(429).json({
            error: 'Generation limit exceeded',
            message: 'You have reached the maximum number of question papers per 10 minutes. Please wait before generating more.',
            retryAfter: 10 * 60
        });
    }
});

// Rate limiting for downloads
const downloadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 downloads per 5 minutes
    message: {
        error: 'Download limit exceeded',
        message: 'Please wait 5 minutes before downloading more files',
        retryAfter: 5 * 60
    }
});

module.exports = {
    generalLimiter,
    loginLimiter,
    generateLimiter,
    downloadLimiter
};