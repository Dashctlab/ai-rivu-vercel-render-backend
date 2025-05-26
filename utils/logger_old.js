// utils/logger.js
// Centralized activity logger that appends entries to a JSON file.

const fs = require('fs');
const fsPromises = fs.promises;
const { logsFilePath } = require('./fileUtils');

/**
 * Logs an activity entry with a timestamp.
 * @param {string} email - User email or SYSTEM
 * @param {string} action - Description of the action
 */
async function logActivity(email, action) {
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

        logs.push({ email: email || 'N/A', action, timestamp: new Date().toISOString() });
        await fsPromises.writeFile(logsFilePath, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error("Error logging activity:", err);
    }
}

module.exports = logActivity;
