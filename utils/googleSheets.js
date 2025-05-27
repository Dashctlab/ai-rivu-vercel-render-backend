// utils/googleSheets.js
// Google Sheets integration for persistent analytics data

const { google } = require('googleapis');

class GoogleSheetsDB {
    constructor() {
        this.sheets = null;
        this.isInitialized = false;
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Environment detection
            const isProduction = process.env.NODE_ENV === 'production' || 
                               process.env.RENDER_SERVICE_NAME?.includes('prod');
            
            this.sheetId = isProduction ? 
                process.env.PROD_SHEET_ID : 
                process.env.STAGING_SHEET_ID;

            console.log(`Initializing Google Sheets for ${isProduction ? 'PRODUCTION' : 'STAGING'} environment`);
            console.log(`Using Sheet ID: ${this.sheetId}`);
            
            if (!this.sheetId) {
                throw new Error(`Sheet ID not found. Check ${isProduction ? 'PROD_SHEET_ID' : 'STAGING_SHEET_ID'} environment variable`);
            }

            // Simplified JSON key approach - no base64 encoding
            let auth;
            try {
                if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                    // Parse JSON directly (no base64 decoding)
                    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
                    auth = new google.auth.JWT(
                        serviceAccount.client_email,
                        null,
                        serviceAccount.private_key,
                        ['https://www.googleapis.com/auth/spreadsheets']
                    );
                    console.log('Using direct JSON service account authentication');
                } else if (process.env.GOOGLE_SHEETS_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
                    // Fallback to individual fields
                    auth = new google.auth.JWT(
                        process.env.GOOGLE_SHEETS_EMAIL,
                        null,
                        process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
                        ['https://www.googleapis.com/auth/spreadsheets']
                    );
                    console.log('Using individual field authentication');
                } else {
                    throw new Error('No Google Sheets credentials found');
                }
            } catch (error) {
                console.error('Authentication setup error:', error.message);
                throw error;
            }

            // Initialize sheets API
            this.sheets = google.sheets({ version: 'v4', auth });
            this.isInitialized = true;
            
            console.log('Google Sheets authentication successful');
        } catch (error) {
            console.error('Google Sheets initialization error:', error.message);
            this.isInitialized = false;
        }
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initializeAuth();
        }
        if (!this.isInitialized) {
            throw new Error('Google Sheets not properly initialized');
        }
    }

    /**
     * Log user activity to Activity_Logs sheet
     */
    async logActivity(email, action, details = {}) {
        try {
            await this.ensureInitialized();

            const timestamp = new Date().toISOString();
            const subject = details.subject || '';
            const className = details.class || details.className || '';
            const questionTypes = details.questionDetails ? 
                details.questionDetails.map(q => `${q.type}(${q.num})`).join(', ') : '';
            const additionalInstructions = details.additionalConditions || '';
            const tokensUsed = details.tokens || 0;
            const detailsJSON = JSON.stringify(details);

            const values = [[
                timestamp,
                email,
                action,
                subject,
                className,
                questionTypes,
                additionalInstructions,
                tokensUsed,
                detailsJSON
            ]];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.sheetId,
                range: 'activity_logs!A:I',
                valueInputOption: 'RAW',
                resource: { values }
            });

            console.log(`Activity logged to Google Sheets: ${email} - ${action}`);
        } catch (error) {
            console.error('Error logging to Google Sheets:', error.message);
            // Don't throw error - fallback to console logging
            console.log(`Fallback log: ${email} - ${action}`, details);
        }
    }

    /**
     * Update or insert user statistics
     */
    async updateUserStats(email, stats) {
        try {
            await this.ensureInitialized();

            // First, try to find existing user row
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: 'user_stats!A:J'  // Back to A:J for 10 columns
            });

            const rows = response.data.values || [];
            let userRowIndex = -1;

            // Find user row (skip header row)
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === email) {
                    userRowIndex = i + 1; // +1 because sheets are 1-indexed
                    break;
                }
            }

            const values = [[
                email,                                           // A: User_Email
                stats.totalLogins || 0,                         // B: Total_Logins  
                stats.totalPapersGenerated || 0,                // C: Papers_Generated
                stats.totalDownloads || 0,                      // D: Downloads
                JSON.stringify(stats.classes || {}),            // E: Classes_Used
                JSON.stringify(stats.subjects || {}),           // F: Subjects_Used
                JSON.stringify(stats.questionTypes || {}),      // G: Question_Types_Used
                stats.tokensUsed || 0,                          // H: Tokens_Used
                stats.firstActivity || new Date().toISOString(), // I: First_Activity
                stats.lastActivity || new Date().toISOString()   // J: Last_Activity
            ]];

            if (userRowIndex > 0) {
                // Update existing user
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.sheetId,
                    range: `user_stats!A${userRowIndex}:J${userRowIndex}`,  // Back to J for 10 columns
                    valueInputOption: 'RAW',
                    resource: { values }
                });
            } else {
                // Add new user
                await this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.sheetId,
                    range: 'user_stats!A:J',  // Back to A:J for 10 columns
                    valueInputOption: 'RAW',
                    resource: { values }
                });
            }

            console.log(`User stats updated in Google Sheets: ${email}`);
        } catch (error) {
            console.error('Error updating user stats in Google Sheets:', error.message);
        }
    }

    /**
     * Get all user statistics for admin dashboard
     */
    async getAllUserStats() {
        try {
            await this.ensureInitialized();

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: 'user_stats!A:J'  // Back to A:J for 10 columns
            });

            const rows = response.data.values || [];
            const stats = {};

            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row[0]) { // If email exists
                    stats[row[0]] = {
                        totalLogins: parseInt(row[1]) || 0,
                        totalPapersGenerated: parseInt(row[2]) || 0,
                        totalDownloads: parseInt(row[3]) || 0,
                        classes: this.parseJSON(row[4]) || {},           // E: Classes_Used
                        subjects: this.parseJSON(row[5]) || {},          // F: Subjects_Used
                        questionTypes: this.parseJSON(row[6]) || {},     // G: Question_Types_Used
                        tokensUsed: parseInt(row[7]) || 0,               // H: Tokens_Used
                        firstActivity: row[8] || new Date().toISOString(), // I: First_Activity
                        lastActivity: row[9] || new Date().toISOString()   // J: Last_Activity
                    };
                }
            }

            return stats;
        } catch (error) {
            console.error('Error getting user stats from Google Sheets:', error.message);
            return {};
        }
    }

    /**
     * Get recent activity logs for admin dashboard
     */
    async getDetailedActivityLogs(limit = 100) {
        try {
            await this.ensureInitialized();

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: 'activity_logs!A:I'
            });

            const rows = response.data.values || [];
            const logs = [];

            // Skip header row, get last N rows
            const startIndex = Math.max(1, rows.length - limit);
            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                if (row[0]) { // If timestamp exists
                    logs.push({
                        timestamp: row[0],
                        email: row[1],
                        action: row[2],
                        details: {
                            subject: row[3],
                            class: row[4],
                            questionDetails: this.parseQuestionTypes(row[5]),
                            additionalConditions: row[6],
                            tokens: parseInt(row[7]) || 0,
                            ...this.parseJSON(row[8]) // Parse full details JSON
                        }
                    });
                }
            }

            return logs.reverse(); // Most recent first
        } catch (error) {
            console.error('Error getting activity logs from Google Sheets:', error.message);
            return [];
        }
    }

    /**
     * Helper function to safely parse JSON
     */
    parseJSON(jsonString) {
        try {
            return JSON.parse(jsonString || '{}');
        } catch {
            return {};
        }
    }

    /**
     * Helper function to parse question types string
     */
    parseQuestionTypes(questionTypesString) {
        if (!questionTypesString) return [];
        
        // Parse "MCQ(5), Short Answer(3)" format
        const matches = questionTypesString.match(/(\w+(?:\s+\w+)*)\((\d+)\)/g);
        if (!matches) return [];

        return matches.map(match => {
            const [, type, num] = match.match(/(.+)\((\d+)\)/);
            return { type: type.trim(), num: parseInt(num) };
        });
    }

    /**
     * Get usage analytics (aggregated data)
     */
    async getUsageAnalytics() {
        try {
            const allUserStats = await this.getAllUserStats();
            const analytics = {
                totalUsers: Object.keys(allUserStats).length,
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

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            Object.values(allUserStats).forEach(userStat => {
                analytics.totalPapersGenerated += userStat.totalPapersGenerated || 0;
                analytics.totalDownloads += userStat.totalDownloads || 0;
                analytics.totalLogins += userStat.totalLogins || 0;
                analytics.totalTokensUsed += userStat.tokensUsed || 0;

                // Check if user was active in last 7 days
                if (new Date(userStat.lastActivity) > sevenDaysAgo) {
                    analytics.activeUsers++;
                }

                // Aggregate popular data
                Object.entries(userStat.subjects || {}).forEach(([subject, count]) => {
                    analytics.popularSubjects[subject] = (analytics.popularSubjects[subject] || 0) + count;
                });

                Object.entries(userStat.classes || {}).forEach(([className, count]) => {
                    analytics.popularClasses[className] = (analytics.popularClasses[className] || 0) + count;
                });

                Object.entries(userStat.questionTypes || {}).forEach(([type, count]) => {
                    analytics.popularQuestionTypes[type] = (analytics.popularQuestionTypes[type] || 0) + count;
                });
            });

            // Calculate download rate
            analytics.downloadRate = analytics.totalPapersGenerated > 0 
                ? ((analytics.totalDownloads / analytics.totalPapersGenerated) * 100).toFixed(1)
                : 0;

            return analytics;
        } catch (error) {
            console.error('Error getting usage analytics:', error.message);
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

// Export singleton instance
module.exports = new GoogleSheetsDB();
