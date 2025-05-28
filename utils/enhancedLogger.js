// utils/enhancedLogger.js - Version 3 with Google Sheets integration
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const googleSheetsDB = require('./googleSheets');

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
     * Main logging function - now writes to both JSON and Google Sheets
     */
    async logActivity(email, action, details = {}) {
        try {
            // Write to Google Sheets (primary storage)
            await googleSheetsDB.logActivity(email, action, details);

            // Also write to JSON file (backup/fallback)
            await this.logToJSONFile(email, action, details);

            // Update user statistics if it's a real user
            if (email && email !== 'N/A' && email !== 'SYSTEM' && email !== 'anonymous') {
                await this.updateUserStats(email, action, details);
            }

        } catch (err) {
            console.error("Error logging activity:", err);
            // Fallback to JSON only if Google Sheets fails
            await this.logToJSONFile(email, action, details);
        }
    }

    /**
     * Backup logging to JSON file
     */
    async logToJSONFile(email, action, details) {
        try {
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
            
            // Keep only last 1000 entries to prevent file from growing too large
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }

            await fsPromises.writeFile(logsFilePath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error("Error logging to JSON file:", error);
        }
    }

    /**
     * Enhanced user statistics tracking - now syncs with Google Sheets
     */
  // utils/enhancedLogger.js - Fix around line 140-150

async updateUserStats(email, action, details) {
    try {
        // Get current stats from Google Sheets first
        let allStats = await googleSheetsDB.getAllUserStats();
        let userStats = allStats[email];

        if (!userStats) {
            userStats = {
                totalLogins: 0,
                totalPapersGenerated: 0,
                totalDownloads: 0,
                firstActivity: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                lastActivity: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                subjects: {},
                classes: {},
                boards: {},           // ← This was missing!
                questionTypes: {},
                tokensUsed: 0,
                difficulties: {},
                timeDurations: {},
                avgQuestionsPerPaper: 0
            };
        }

        // FIX: Ensure all nested objects exist
        userStats.subjects = userStats.subjects || {};
        userStats.classes = userStats.classes || {};
        userStats.boards = userStats.boards || {};           // ← Add this line
        userStats.questionTypes = userStats.questionTypes || {};
        userStats.difficulties = userStats.difficulties || {};
        userStats.timeDurations = userStats.timeDurations || {};

        userStats.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Track specific actions with enhanced details
        console.log(`DEBUG: Tracking action: "${action}" for user: ${email}`);
        console.log(`DEBUG: Action details:`, details);
        
        switch(true) {
            case action.includes('Login Success'):
                userStats.totalLogins++;
                console.log(`DEBUG: Login tracked for ${email}, total: ${userStats.totalLogins}`);
                break;

            case action.includes('Generated Questions') || action.includes('Generate Success'):
                userStats.totalPapersGenerated++;
                console.log(`DEBUG: Paper generated for ${email}, total: ${userStats.totalPapersGenerated}`);
                
                // Track subject
                if (details.subject) {
                    userStats.subjects[details.subject] = (userStats.subjects[details.subject] || 0) + 1;
                    console.log(`DEBUG: Subject tracked: ${details.subject}`);
                }
                
                // Track class
                if (details.class || details.className) {
                    const className = details.class || details.className;
                    userStats.classes[className] = (userStats.classes[className] || 0) + 1;
                    console.log(`DEBUG: Class tracked: ${className}`);
                }

                // Track curriculum/board - NOW SAFE
                if (details.curriculum) {
                    userStats.boards[details.curriculum] = (userStats.boards[details.curriculum] || 0) + 1;
                    console.log(`DEBUG: Curriculum tracked: ${details.curriculum}`);
                }

                // Track question types with detailed breakdown
                if (details.questionDetails && Array.isArray(details.questionDetails)) {
                    console.log(`DEBUG: Question details found:`, details.questionDetails);
                    details.questionDetails.forEach(qDetail => {
                        if (qDetail.type && qDetail.num) {
                            userStats.questionTypes[qDetail.type] = (userStats.questionTypes[qDetail.type] || 0) + parseInt(qDetail.num);
                            console.log(`DEBUG: Question type tracked: ${qDetail.type}(${qDetail.num})`);
                        }
                    });
                } else {
                    console.log(`DEBUG: No question details found in:`, details);
                }

                // Track tokens
                if (details.tokens) {
                    userStats.tokensUsed += details.tokens;
                    console.log(`DEBUG: Tokens tracked: ${details.tokens}`);
                }
                break;

            case action.includes('Download Success'):
                userStats.totalDownloads++;
                console.log(`DEBUG: Download tracked for ${email}, total: ${userStats.totalDownloads}`);
                break;
                
            default:
                console.log(`DEBUG: No specific tracking for action: "${action}"`);
                break;
        }
        
        console.log(`DEBUG: Final user stats for ${email}:`, JSON.stringify(userStats, null, 2));

        // Update both Google Sheets and local JSON
        await googleSheetsDB.updateUserStats(email, userStats);
        await this.updateLocalUserStats(email, userStats);

    } catch (error) {
        console.error('Error updating user stats:', error);
    }
}

    /**
     * Update local JSON file (backup)
     */
    async updateLocalUserStats(email, userStats) {
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

            stats[email] = userStats;
            await fsPromises.writeFile(userStatsPath, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Error updating local user stats:', error);
        }
    }

    /**
     * Get detailed activity logs - now from Google Sheets
     */
    async getDetailedActivityLogs(limit = 100) {
        try {
            return await googleSheetsDB.getDetailedActivityLogs(limit);
        } catch (error) {
            console.error('Error getting detailed logs from Google Sheets, falling back to JSON:', error);
            // Fallback to JSON file
            try {
                if (!fs.existsSync(logsFilePath)) return [];
                
                const data = await fsPromises.readFile(logsFilePath, 'utf-8');
                const logs = JSON.parse(data);
                return logs.slice(-limit);
            } catch (fallbackError) {
                console.error('Fallback to JSON also failed:', fallbackError);
                return [];
            }
        }
    }

    /**
     * Get user statistics - now from Google Sheets
     */
    async getUserStats(email) {
        try {
            const allStats = await googleSheetsDB.getAllUserStats();
            return allStats[email] || null;
        } catch (error) {
            console.error('Error getting user stats from Google Sheets, falling back to JSON:', error);
            // Fallback to JSON file
            try {
                if (!fs.existsSync(userStatsPath)) return null;
                
                const data = await fsPromises.readFile(userStatsPath, 'utf-8');
                const stats = JSON.parse(data);
                return stats[email] || null;
            } catch (fallbackError) {
                console.error('Fallback to JSON also failed:', fallbackError);
                return null;
            }
        }
    }

    /**
     * Get all user statistics - now from Google Sheets
     */
    async getAllUserStats() {
        try {
            return await googleSheetsDB.getAllUserStats();
        } catch (error) {
            console.error('Error getting all user stats from Google Sheets, falling back to JSON:', error);
            // Fallback to JSON file
            try {
                if (!fs.existsSync(userStatsPath)) return {};
                
                const data = await fsPromises.readFile(userStatsPath, 'utf-8');
                return JSON.parse(data);
            } catch (fallbackError) {
                console.error('Fallback to JSON also failed:', fallbackError);
                return {};
            }
        }
    }

    /**
     * Enhanced usage analytics - now from Google Sheets
     */
    async getUsageAnalytics() {
        try {
            return await googleSheetsDB.getUsageAnalytics();
        } catch (error) {
            console.error('Error getting usage analytics from Google Sheets:', error);
            // Return basic fallback analytics
            return {
                totalUsers: 0,
                totalPapersGenerated: 0,
                totalDownloads: 0,
                totalLogins: 0,
                totalTokensUsed: 0,
                activeUsers: 0,
                popularSubjects: {},
                popularClasses: {},
                popularQuestionTypes: {},
                downloadRate: 0
            };
        }
    }
}

// Create and export instance
const enhancedLogger = new EnhancedLogger();

// Export the logActivity function directly for backward compatibility
module.exports = enhancedLogger.logActivity.bind(enhancedLogger);

// Also export the class instance for advanced features
module.exports.logger = enhancedLogger;
