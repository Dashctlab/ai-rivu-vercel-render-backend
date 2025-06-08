// middleware/rateLimiting.js - COMPLETE REPLACEMENT with persistent storage fix

const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { getUsers } = require('../utils/fileUtils');
const { logger } = require('../utils/enhancedLogger');

// FIXED: Persistent storage for rate limiting instead of in-memory Map
const rateLimitDataFile = path.join(__dirname, '../data/rate_limits.json');

/**
 * Load rate limiting data from file
 */
function loadRateLimitData() {
    try {
        if (fs.existsSync(rateLimitDataFile)) {
            const data = fs.readFileSync(rateLimitDataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Clean up expired entries while loading
            const now = Date.now();
            const cleaned = {};
            
            Object.entries(parsed).forEach(([key, timestamps]) => {
                // Keep only timestamps from last 24 hours
                const validTimestamps = timestamps.filter(ts => (now - ts) < (24 * 60 * 60 * 1000));
                if (validTimestamps.length > 0) {
                    cleaned[key] = validTimestamps;
                }
            });
            
            return new Map(Object.entries(cleaned));
        }
    } catch (error) {
        console.error('Error loading rate limit data:', error);
    }
    return new Map();
}

/**
 * Save rate limiting data to file
 */
function saveRateLimitData(rateLimitStore) {
    try {
        // Convert Map to Object for JSON storage
        const dataToSave = Object.fromEntries(rateLimitStore);
        
        // Ensure data directory exists
        const dataDir = path.dirname(rateLimitDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(rateLimitDataFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving rate limit data:', error);
    }
}

// FIXED: Initialize with persistent storage
let userRateLimitStore = loadRateLimitData();

/**
 * User-based rate limiter factory with persistent storage
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
        
        // FIXED: Save to file periodically (every 10th request)
        if (Math.random() < 0.1) { // 10% chance to save and clean up
            saveRateLimitData(userRateLimitStore);
            cleanupOldEntries(24 * 60 * 60 * 1000); // Clean entries older than 24 hours
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
    let cleanedCount = 0;
    
    for (const [key, timestamps] of userRateLimitStore.entries()) {
        const validTimestamps = timestamps.filter(ts => ts > cutoff);
        if (validTimestamps.length === 0) {
            userRateLimitStore.delete(key);
            cleanedCount++;
        } else if (validTimestamps.length !== timestamps.length) {
            userRateLimitStore.set(key, validTimestamps);
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
        saveRateLimitData(userRateLimitStore); // Save after cleanup
    }
}

// FIXED: Graceful shutdown - save rate limit data
process.on('SIGTERM', () => {
    console.log('Saving rate limit data before shutdown...');
    saveRateLimitData(userRateLimitStore);
});

process.on('SIGINT', () => {
    console.log('Saving rate limit data before shutdown...');
    saveRateLimitData(userRateLimitStore);
});

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
