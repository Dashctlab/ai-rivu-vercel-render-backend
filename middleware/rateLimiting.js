// middleware/rateLimiting.js - COMPLETE REPLACEMENT with user-based rate limiting and daily quotas

const rateLimit = require('express-rate-limit');
const { getUsers } = require('../utils/fileUtils');
const { logger } = require('../utils/enhancedLogger');

// Store for user-based rate limiting (in-memory for now)
const userRateLimitStore = new Map();

/**
 * User-based rate limiter factory
 */
function createUserRateLimit(options) {
    return async (req, res, next) => {
        const email = req.headers['useremail'] || req.body?.email;
        
        if (!email) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please log in to continue'
            });
        }

        const now = Date.now();
        const windowStart = now - options.windowMs;
        const userKey = `${email}:${options.name}`;
        
        // Get user's request history
        let userRequests = userRateLimitStore.get(userKey) || [];
        
        // Remove old requests outside the window
        userRequests = userRequests.filter(timestamp => timestamp > windowStart);
        
        // Check if user has exceeded the limit
        if (userRequests.length >= options.max) {
            await logger.logActivity(email, `Rate Limit Exceeded - ${options.name}`, {
                limit: options.max,
                window: options.windowMs / 1000 / 60, // minutes
                currentRequests: userRequests.length,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: options.message,
                retryAfter: Math.ceil(options.windowMs / 1000), // seconds
                limit: options.max,
                window: `${options.windowMs / 1000 / 60} minutes`
            });
        }
        
        // Add current request
        userRequests.push(now);
        userRateLimitStore.set(userKey, userRequests);
        
        // Clean up old entries periodically (basic memory management)
        if (Math.random() < 0.01) { // 1% chance to clean up
            cleanupOldEntries(options.windowMs);
        }
        
        next();
    };
}

/**
 * Daily quota checker for freemium limits
 */
async function checkDailyQuota(req, res, next) {
    const email = req.headers['useremail'];
    
    if (!email) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please log in to continue'
        });
    }

    try {
        // Get user's total papers generated from stats
        const userStats = await logger.getUserStats(email);
        const totalPapersGenerated = userStats?.totalPapersGenerated || 0;
        
        // Check against daily quota (20 papers for freemium)
        const DAILY_QUOTA = 20;
        
        if (totalPapersGenerated >= DAILY_QUOTA) {
            await logger.logActivity(email, 'Daily Quota Exceeded', {
                totalPapersGenerated,
                dailyQuota: DAILY_QUOTA,
                quotaExceededBy: totalPapersGenerated - DAILY_QUOTA,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(429).json({
                error: 'Daily quota exceeded',
                message: `You've reached your limit of ${DAILY_QUOTA} question papers. Contact hello@ai-rivu.com for extended access or upgrade options.`,
                quota: {
                    used: totalPapersGenerated,
                    limit: DAILY_QUOTA,
                    contactEmail: 'hello@ai-rivu.com'
                },
                errorCode: 'QUOTA_EXCEEDED'
            });
        }
        
        // Log approaching quota (warn at 18/20)
        if (totalPapersGenerated >= DAILY_QUOTA - 2) {
            await logger.logActivity(email, 'Approaching Daily Quota', {
                totalPapersGenerated,
                dailyQuota: DAILY_QUOTA,
                remaining: DAILY_QUOTA - totalPapersGenerated
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Error checking daily quota:', error);
        // Don't block user if quota check fails - log and continue
        await logger.logActivity(email, 'Quota Check Failed', {
            error: error.message,
            fallbackAction: 'allowing_request'
        });
        next();
    }
}

/**
 * Clean up old rate limit entries to prevent memory leaks
 */
function cleanupOldEntries(maxAge) {
    const cutoff = Date.now() - maxAge;
    
    for (const [key, timestamps] of userRateLimitStore.entries()) {
        const validTimestamps = timestamps.filter(ts => ts > cutoff);
        if (validTimestamps.length === 0) {
            userRateLimitStore.delete(key);
        } else {
            userRateLimitStore.set(key, validTimestamps);
        }
    }
}

// Updated rate limiters with user-based approach
const userGenerateLimiter = createUserRateLimit({
    name: 'generate',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 papers per 15 minutes
    message: 'You\'re generating papers too quickly. Please wait 15 minutes and try again.'
});

const userLoginLimiter = createUserRateLimit({
    name: 'login',
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 8, // 8 attempts per 15 minutes
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
});

const userDownloadLimiter = createUserRateLimit({
    name: 'download',
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 downloads per 5 minutes
    message: 'Download limit reached. Please wait 5 minutes before downloading more files.'
});

// Keep general IP-based limiter for unauthenticated requests
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per IP per 15 minutes
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again in 15 minutes',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log(`General rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again in 15 minutes',
            retryAfter: 15 * 60
        });
    }
});

/**
 * Quota warning middleware for frontend
 */
async function addQuotaInfo(req, res, next) {
    const email = req.headers['useremail'];
    
    if (email) {
        try {
            const userStats = await logger.getUserStats(email);
            const totalPapersGenerated = userStats?.totalPapersGenerated || 0;
            const DAILY_QUOTA = 20;
            
            // Add quota info to response headers for frontend
            res.set({
                'X-Quota-Used': totalPapersGenerated.toString(),
                'X-Quota-Limit': DAILY_QUOTA.toString(),
                'X-Quota-Remaining': Math.max(0, DAILY_QUOTA - totalPapersGenerated).toString()
            });
        } catch (error) {
            // Silent fail - don't block request
            console.warn('Could not add quota info:', error.message);
        }
    }
    
    next();
}

module.exports = {
    generalLimiter,
    userLoginLimiter,
    userGenerateLimiter,
    userDownloadLimiter,
    checkDailyQuota,
    addQuotaInfo,
    
    // Legacy exports (keep for backward compatibility)
    loginLimiter: userLoginLimiter,
    generateLimiter: userGenerateLimiter,
    downloadLimiter: userDownloadLimiter
};
