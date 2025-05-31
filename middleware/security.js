// middleware/security.js - NEW FILE
const helmet = require('helmet');

// HTTPS enforcement middleware
function enforceHTTPS(req, res, next) {
    // Skip in development
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // Check if request is secure
    if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
        // Redirect to HTTPS
        const httpsUrl = `https://${req.get('Host')}${req.url}`;
        console.log(`Redirecting to HTTPS: ${httpsUrl}`);
        return res.redirect(301, httpsUrl);
    }

    next();
}

// Security headers configuration
const securityHeaders = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline scripts in your HTML
                "https://cdnjs.cloudflare.com", // For external libraries
                "https://cdn.jsdelivr.net" // Backup CDN
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline styles
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:", // For base64 images
                "https:" // Allow HTTPS images
            ],
            connectSrc: [
                "'self'",
                "https://api.anthropic.com", // For AI API calls
                "https://openrouter.ai" // For OpenRouter API
            ],
            frameSrc: ["'none'"], // Prevent framing
            objectSrc: ["'none'"], // Prevent object/embed
            upgradeInsecureRequests: [] // Upgrade HTTP to HTTPS
        }
    },
    
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    
    // Prevent MIME sniffing
    noSniff: true,
    
    // X-Frame-Options
    frameguard: {
        action: 'deny'
    },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    
    // Permissions Policy
    permittedCrossDomainPolicies: false
});

// Additional security middleware
function additionalSecurity(req, res, next) {
    // Prevent caching of sensitive pages
    if (req.path.includes('/admin') || req.path.includes('/login')) {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
    }

    // Set secure session cookie settings
    if (req.session) {
        req.session.cookie.secure = process.env.NODE_ENV === 'production';
        req.session.cookie.httpOnly = true;
        req.session.cookie.sameSite = 'strict';
    }

    next();
}

// Request logging for security monitoring
function securityLogger(req, res, next) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Log security-relevant requests
    if (req.path.includes('/login') || 
        req.path.includes('/admin') || 
        req.method !== 'GET') {
        console.log(`[SECURITY] ${timestamp} - ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent}`);
    }

    // Log suspicious patterns
    const suspiciousPatterns = [
        /\.\./,          // Directory traversal
        /<script/i,      // XSS attempts
        /union.*select/i, // SQL injection
        /javascript:/i,   // JavaScript injection
        /data:text\/html/i // Data URL XSS
    ];

    const fullUrl = req.originalUrl || req.url;
    const requestBody = JSON.stringify(req.body);
    
    if (suspiciousPatterns.some(pattern => 
        pattern.test(fullUrl) || pattern.test(requestBody))) {
        console.warn(`[SECURITY WARNING] Suspicious request from ${ip}: ${req.method} ${fullUrl}`);
        console.warn(`[SECURITY WARNING] Body: ${requestBody}`);
        console.warn(`[SECURITY WARNING] User-Agent: ${userAgent}`);
    }

    next();
}

module.exports = {
    enforceHTTPS,
    securityHeaders,
    additionalSecurity,
    securityLogger
};
