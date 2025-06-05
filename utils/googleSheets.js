// utils/googleSheets.js
// Google Sheets integration for persistent analytics data

const { google } = require('googleapis');

class GoogleSheetsDB {
    constructor() {
        this.sheets = null;
        this.isInitialized = false;
        this.isInitializing = false; //initialization flag
        this.initializationPromise = null; // Cache the promise
    }

    async initializeAuth() {
        // Return existing promise if already initializing
        if (this.isInitializing && this.initializationPromise) {
            return this.initializationPromise;
        }

        //Return immediately if already initialized
        if (this.isInitialized) {
            return Promise.resolve();
        }

        // Set flag and cache promise to prevent race conditions
        this.isInitializing = true;
        this.initializationPromise = this._performInitialization();

        try {
            await this.initializationPromise;
            this.isInitialized = true;
        } catch (error) {
            console.error('Google Sheets initialization failed:', error);
            throw error;
        } finally {
            this.isInitializing = false;
            this.initializationPromise = null;
        }
    }

    async _performInitialization() {
        try {
            //  environment detection
            const isProduction = process.env.NODE_ENV === 'production' || 
                               (process.env.RENDER_SERVICE_NAME && process.env.RENDER_SERVICE_NAME.includes('prod')) ||
                               process.env.VERCEL_ENV === 'production';
            
            this.sheetId = isProduction ? 
              process.env.PROD_SHEET_ID : 
              process.env.STAGING_SHEET_ID;

            console.log(`Initializing Google Sheets for ${isProduction ? 'PRODUCTION' : 'STAGING'} environment`);
            
            if (!this.sheetId) {
              const requiredVar = isProduction ? 'PROD_SHEET_ID' : 'STAGING_SHEET_ID';
              throw new Error(`Sheet ID not found. Check ${requiredVar} environment variable`);
            }

            //  authentication with error handling
            let auth;
            if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
              try {
                const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
                
                // Validate required fields
                if (!serviceAccount.client_email || !serviceAccount.private_key) {
                  throw new Error('Invalid service account JSON: missing required fields');
                }
                
                auth = new google.auth.JWT(
                  serviceAccount.client_email,
                  null,
                  serviceAccount.private_key,
                  ['https://www.googleapis.com/auth/spreadsheets']
                );
                console.log('Using direct JSON service account authentication');
              } catch (parseError) {
                throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
              }
            } else if (process.env.GOOGLE_SHEETS_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
              auth = new google.auth.JWT(
                process.env.GOOGLE_SHEETS_EMAIL,
                null,
                process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
                ['https://www.googleapis.com/auth/spreadsheets']
              );
              console.log('Using individual field authentication');
            } else {
              throw new Error('No Google Sheets credentials found. Set either GOOGLE_SERVICE_ACCOUNT_JSON or individual credential fields');
            }

            // Test authentication
            this.sheets = google.sheets({ version: 'v4', auth });
            
            // Verify connection with a test call
            await this.sheets.spreadsheets.get({
              spreadsheetId: this.sheetId,
              fields: 'properties.title'
            });
            
            console.log('Google Sheets authentication successful');
            
        } catch (error) {
            console.error('Google Sheets initialization error:', error.message);
            throw error;
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

            const timestamp = new Date().toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const values = [[
                timestamp,                                      // A: Timestamp
                details.queryId || 'N/A',                      // B: Identifier
                email,                                          // C: User_Email
                action,                                         // D: Action
                details.subject || '',                          // E: Subject
                details.class || details.className || '',      // F: Class
                details.questionDetails ? 
                    details.questionDetails.map(q => `${q.type}(${q.num})`).join(', ') : '', // G: Question_Types
                details.assessment || details.focusLevel || '', // H: Assessment
                details.testObjective || '',                    // I: What_are_you_testing
                details.difficultySplit || '',                  // J: Difficulty
                details.additionalConditions || '',            // K: Additional_Instructions
                details.answerKeyFormat || 'Brief',            // L: Answer_key
                details.tokens || 0,                           // M: Tokens_Used
                details.deviceType || 'Unknown',               // N: Device_Type
                details.screenSize || 'Unknown',               // O: Screen_Size
                details.browser || 'Unknown',                  // P: Browser
                details.operatingSystem || 'Unknown',          // Q: Operating_System
                details.qualityFeedback?.outputQuality || '',  // R: Quality_Score_Output
                details.qualityFeedback?.questionQuality || '', // S: Quality_Score_Questions
                details.qualityFeedback?.curriculumAlignment || '', // T: Quality_Score_Curriculum
                JSON.stringify(details)                         // U: Details_JSON
            ]];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.sheetId,
                range: 'activity_logs!A:U',
                valueInputOption: 'RAW',
                resource: { values }
            });

            console.log(`Activity logged to Google Sheets: ${email} - ${action}`);
        } catch (error) {
            console.error('Error logging to Google Sheets:', error.message);
            console.log(`Fallback log: ${email} - ${action}`, details);
        }
    }

    /**
     * Update or insert user statistics
     */
    async updateUserStats(email, stats) {
        try {
            await this.ensureInitialized();

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: 'user_stats!A:W'  // Extended to column W for new fields
            });

            const rows = response.data.values || [];
            let userRowIndex = -1;

            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === email) {
                    userRowIndex = i + 1;
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
                JSON.stringify(stats.assessmentTypes || {}),    // H: Assessment
                JSON.stringify(stats.testObjectives || {}),     // I: What_are_you_testing
                JSON.stringify(stats.timeDurations || {}),      // J: Duration
                JSON.stringify(stats.difficulties || {}),       // K: Difficulty
                'Brief', // Default answer key format            // L: Answer_key
                stats.deviceType || 'Unknown',                  // M: Device_Type
                stats.operatingSystem || 'Unknown',             // N: Operating_System
                this.formatQualityScore(stats.qualityScoreOutput), // O: Quality_Score_Output
                this.formatQualityScore(stats.qualityScoreQuestions), // P: Quality_Score_Questions
                this.formatQualityScore(stats.qualityScoreCurriculum), // Q: Quality_Score_Curriculum
                stats.tokensUsed || 0,                          // R: Tokens_Used
                stats.deviceTypeUsagePercentage || 'Unknown: 100%', // S: Device_Type_Usage
                stats.firstActivity || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), // T: First_Activity
                stats.lastActivity || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })   // U: Last_Activity
            ]];

            if (userRowIndex > 0) {
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.sheetId,
                    range: `user_stats!A${userRowIndex}:U${userRowIndex}`,
                    valueInputOption: 'RAW',
                    resource: { values }
                });
            } else {
                await this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.sheetId,
                    range: 'user_stats!A:U',
                    valueInputOption: 'RAW',
                    resource: { values }
                });
            }

            console.log(`User stats updated in Google Sheets: ${email}`);
        } catch (error) {
            console.error('Error updating user stats in Google Sheets:', error.message);
        }
    }

    //helper function
    formatQualityScore(scoreObj) {
        if (!scoreObj || typeof scoreObj !== 'object') return 'Green: 0, Yellow: 0, Red: 0';
        return `Green: ${scoreObj.Green || 0}, Yellow: ${scoreObj.Yellow || 0}, Red: ${scoreObj.Red || 0}`;
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
                        firstActivity: row[8] || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), // I: First_Activity
                        lastActivity: row[9] || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })   // J: Last_Activity
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
