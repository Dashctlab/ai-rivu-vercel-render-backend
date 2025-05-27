// utils/enhancedLogger.js - Version 2 with detailed question tracking
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

            // Update user statistics if it's a real user
            if (email && email !== 'N/A' && email !== 'SYSTEM' && email !== 'anonymous') {
                await this.updateUserStats(email, action, details);
            }

        } catch (err) {
            console.error("Error logging activity:", err);
        }
    }

    /**
     * Enhanced user statistics tracking
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
                    tokensUsed: 0,
                    // Enhanced tracking
                    difficulties: {},
                    timeDurations: {},
                    avgQuestionsPerPaper: 0
                };
            }

            const userStats = stats[email];
            userStats.lastActivity = new Date().toISOString();

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

            await fsPromises.writeFile(userStatsPath, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    /**
     * Get detailed activity logs for admin dashboard
     */
    async getDetailedActivityLogs(limit = 100) {
        try {
            if (!fs.existsSync(logsFilePath)) return [];
            
            const data = await fsPromises.readFile(logsFilePath, 'utf-8');
            const logs = JSON.parse(data);
            return logs.slice(-limit);
        } catch (error) {
            console.error('Error getting detailed logs:', error);
            return [];
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
     * Get all user statistics
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
     * Enhanced usage analytics
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
                popularBoards: {},
                popularQuestionTypes: {},
                popularDifficulties: {},
                popularTimeDurations: {},
                downloadRate: 0,
                avgQuestionsPerUser: 0
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

                // Aggregate data
                ['subjects', 'classes', 'boards', 'questionTypes', 'difficulties', 'timeDurations'].forEach(category => {
                    const analyticsKey = category === 'classes' ? 'popularClasses' : 
                                       category === 'subjects' ? 'popularSubjects' :
                                       category === 'boards' ? 'popularBoards' :
                                       category === 'questionTypes' ? 'popularQuestionTypes' :
                                       category === 'difficulties' ? 'popularDifficulties' :
                                       'popularTimeDurations';
                    
                    Object.entries(userStat[category] || {}).forEach(([key, count]) => {
                        analytics[analyticsKey][key] = (analytics[analyticsKey][key] || 0) + count;
                    });
                });
            });

            // Calculate rates and averages
            analytics.downloadRate = analytics.totalPapersGenerated > 0 
                ? ((analytics.totalDownloads / analytics.totalPapersGenerated) * 100).toFixed(1)
                : 0;

            analytics.avgQuestionsPerUser = analytics.totalUsers > 0 
                ? Math.round(analytics.totalPapersGenerated / analytics.totalUsers)
                : 0;

            return analytics;
        } catch (error) {
            console.error('Error getting usage analytics:', error);
            return null;
        }
    }
}

// Create and export instance
const enhancedLogger = new EnhancedLogger();

// Export the logActivity function directly for backward compatibility
module.exports = enhancedLogger.logActivity.bind(enhancedLogger);

// Also export the class instance for advanced features
module.exports.logger = enhancedLogger;
