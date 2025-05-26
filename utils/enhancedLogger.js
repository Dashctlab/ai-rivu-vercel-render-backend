// utils/enhancedLogger.js
// Enhanced activity logger with user-specific tracking and analytics

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const logsFilePath = path.join(dataDir, 'activity_logs.json');
const userStatsPath = path.join(dataDir, 'user_stats.json');

class EnhancedLogger {
    constructor() {
        this.ensureStatsFile();
    }

    async ensureStatsFile() {
        try {
            if (!fs.existsSync(userStatsPath)) {
                await fsPromises.writeFile(userStatsPath, JSON.stringify({}, null, 2));
                console.log(`Created user_stats.json at ${userStatsPath}`);
            }
        } catch (error) {
            console.error('Error ensuring stats file:', error);
        }
    }

    /**
     * Main logging function - maintains backward compatibility
     * @param {string} email - User email or SYSTEM
     * @param {string} action - Description of the action
     * @param {object} details - Optional additional details
     */
    async logActivity(email, action, details = {}) {
        try {
            // Maintain existing log format for backward compatibility
            let logs = [];
            if (fs.existsSync(logsFilePath)) {
                const data = await fsPromises.readFile(logsFilePath, 'utf-8');
                try {
                    logs = JSON.parse(data);
                    if (!Array.isArray(logs)) logs = [];
                } catch (e) {
                    logs = [];
                }
            }

            const logEntry = { 
                email: email || 'N/A', 
                action, 
                timestamp: new Date().toISOString(),
                details: details
            };

            logs.push(logEntry);
            await fsPromises.writeFile(logsFilePath, JSON.stringify(logs, null, 2));

            // Update user statistics if it's a real user (not SYSTEM)
            if (email && email !== 'N/A' && email !== 'SYSTEM' && email !== 'anonymous') {
                await this.updateUserStats(email, action, details);
            }

        } catch (err) {
            console.error("Error logging activity:", err);
        }
    }

    /**
     * Update user-specific statistics
     */
    async updateUserStats(email, action, details) {
        try {
            let stats = {};
            if (fs.existsSync(userStatsPath)) {
                const data = await fsPromises.readFile(userStatsPath, 'utf-8');
                try {
                    stats = JSON.parse(data);
                } catch (e) {
                    stats = {};
                }
            }

            if (!stats[email]) {
                stats[email] = {
                    totalLogins: 0,
                    totalPapersGenerated: 0,
                    totalDownloads: 0,
                    firstActivity: new Date().toISOString(),
                    lastActivity: new Date().toISOString(),
                    subjects: {},
                    classes: {},
                    boards: {},
                    questionTypes: {},
                    tokensUsed: 0
                };
            }

            const userStats = stats[email];
            userStats.lastActivity = new Date().toISOString();

            // Track specific actions
            switch(true) {
                case action.includes('Login Success'):
                    userStats.totalLogins++;
                    break;

                case action.includes('Generated Questions'):
                    userStats.totalPapersGenerated++;
                    
                    // Extract details from action string or details object
                    if (details.subject || action.includes('Subject:')) {
                        const subject = details.subject || action.match(/Subject: ([^,]+)/)?.[1];
                        if (subject) {
                            userStats.subjects[subject] = (userStats.subjects[subject] || 0) + 1;
                        }
                    }
                    
                    if (details.class || action.includes('Class:')) {
                        const className = details.class || action.match(/Class: ([^,]+)/)?.[1];
                        if (className) {
                            userStats.classes[className] = (userStats.classes[className] || 0) + 1;
                        }
                    }

                    if (details.tokens || action.includes('Tokens:')) {
                        const tokens = details.tokens || parseInt(action.match(/Tokens: (\d+)/)?.[1] || '0');
                        userStats.tokensUsed += tokens;
                    }
                    break;

                case action.includes('Download Success'):
                    userStats.totalDownloads++;
                    
                    // Extract subject and class from action
                    if (action.includes('Subject:')) {
                        const subject = action.match(/Subject: ([^,]+)/)?.[1];
                        if (subject && !userStats.subjects[subject]) {
                            userStats.subjects[subject] = 1;
                        }
                    }
                    break;
            }

            await fsPromises.writeFile(userStatsPath, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(email) {
        try {
            if (!fs.existsSync(userStatsPath)) return null;
            
            const data = await fsPromises.readFile(userStatsPath, 'utf-8');
            const stats = JSON.parse(data);
            return stats[email] || null;
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }

    /**
     * Get all user statistics for admin dashboard
     */
    async getAllUserStats() {
        try {
            if (!fs.existsSync(userStatsPath)) return {};
            
            const data = await fsPromises.readFile(userStatsPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error getting all user stats:', error);
            return {};
        }
    }

    /**
     * Get usage analytics
     */
    async getUsageAnalytics() {
        try {
            const stats = await this.getAllUserStats();
            const analytics = {
                totalUsers: Object.keys(stats).length,
                totalPapersGenerated: 0,
                totalDownloads: 0,
                totalLogins: 0,
                totalTokensUsed: 0,
                activeUsers: 0,
                popularSubjects: {},
                popularClasses: {},
                downloadRate: 0
            };

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            Object.values(stats).forEach(userStat => {
                analytics.totalPapersGenerated += userStat.totalPapersGenerated || 0;
                analytics.totalDownloads += userStat.totalDownloads || 0;
                analytics.totalLogins += userStat.totalLogins || 0;
                analytics.totalTokensUsed += userStat.tokensUsed || 0;

                // Check if user was active in last 7 days
                if (new Date(userStat.lastActivity) > sevenDaysAgo) {
                    analytics.activeUsers++;
                }

                // Aggregate popular subjects
                Object.entries(userStat.subjects || {}).forEach(([subject, count]) => {
                    analytics.popularSubjects[subject] = (analytics.popularSubjects[subject] || 0) + count;
                });

                // Aggregate popular classes
                Object.entries(userStat.classes || {}).forEach(([className, count]) => {
                    analytics.popularClasses[className] = (analytics.popularClasses[className] || 0) + count;
                });
            });

            // Calculate download rate
            analytics.downloadRate = analytics.totalPapersGenerated > 0 
                ? ((analytics.totalDownloads / analytics.totalPapersGenerated) * 100).toFixed(1)
                : 0;

            return analytics;
        } catch (error) {
            console.error('Error getting usage analytics:', error);
            return null;
        }
    }
}

// Create and export instance for backward compatibility
const enhancedLogger = new EnhancedLogger();

// Export the logActivity function directly for backward compatibility
module.exports = enhancedLogger.logActivity.bind(enhancedLogger);

// Also export the class instance for advanced features
module.exports.logger = enhancedLogger;
