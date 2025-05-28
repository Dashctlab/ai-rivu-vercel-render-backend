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
                    boards: {},
                    questionTypes: {},
                    tokensUsed: 0,
                    difficulties: {},
                    timeDurations: {},
                    avgQuestionsPerPaper: 0
                };
            }

            userStats.lastActivity = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            // Track specific actions with enhanced details
            switch(true) {
                case action.includes('Login Success'):
                    userStats.totalLogins++;
                    break;

                case action.includes('Generated Questions'):
                    userStats.totalPapersGenerated++;
                    
                    // Track subject
                    if (details.subject) {
                        userStats.subjects[details.subject] = (userStats.subjects[details.subject] || 0) + 1;
                    }
                    
                    // Track class
                    if (details.class || details.className) {
                        const className = details.class || details.className;
                        userStats.classes[className] = (userStats.classes[className] || 0) + 1;
                    }

                    // Track curriculum/board
                    if (details.curriculum) {
                        userStats.boards[details.curriculum] = (userStats.boards[details.curriculum] || 0) + 1;
                    }

                    // Track question types with detailed breakdown
                    if (details.questionDetails && Array.isArray(details.questionDetails)) {
                        details.questionDetails.forEach(qDetail => {
                            if (qDetail.type) {
                                userStats.questionTypes[qDetail.type] = (userStats.questionTypes[qDetail.type] || 0) + (qDetail.num || 1);
                            }
                        });
                    }

                    // Track difficulty preferences
                    if (details.difficultySplit) {
                        userStats.difficulties[details.difficultySplit] = (userStats.difficulties[details.difficultySplit] || 0) + 1;
                    }

                    // Track time durations
                    if (details.timeDuration) {
                        const duration = `${details.timeDuration} min`;
                        userStats.timeDurations[duration] = (userStats.timeDurations[duration] || 0) + 1;
                    }

                    // Update average questions per paper
                    if (details.questionDetails) {
                        const totalQuestions = details.questionDetails.reduce((sum, q) => sum + (q.num || 0), 0);
                        const currentAvg = userStats.avgQuestionsPerPaper || 0;
                        const paperCount = userStats.totalPapersGenerated;
                        userStats.avgQuestionsPerPaper = Math.round(((currentAvg * (paperCount - 1)) + totalQuestions) / paperCount);
                    }

                    // Track tokens
                    if (details.tokens) {
                        userStats.tokensUsed += details.tokens;
                    }
                    break;

                case action.includes('Download Success'):
                    userStats.totalDownloads++;
                    break;
            }

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
