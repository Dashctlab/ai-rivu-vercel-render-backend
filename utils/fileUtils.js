// utils/fileUtils.js
// Enhanced file initialization with template support and user management

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// Define file paths
const dataDir = path.join(__dirname, '../data');
const templatesDir = path.join(__dirname, '../data-templates');
const usersFilePath = path.join(dataDir, 'users.json');
const logsFilePath = path.join(dataDir, 'activity_logs.json');
const userStatsFilePath = path.join(dataDir, 'user_stats.json');

let users = {}; // In-memory user data

/**
 * Copy template file to data directory if it doesn't exist
 */
async function copyTemplateIfNeeded(templateName, targetPath) {
    const templatePath = path.join(templatesDir, templateName);
    
    if (!fs.existsSync(targetPath)) {
        if (fs.existsSync(templatePath)) {
            await fsPromises.copyFile(templatePath, targetPath);
            console.log(`Created ${targetPath} from template`);
        } else {
            // Fallback: create default file
            let defaultContent = '{}';
            if (templateName === 'activity_logs.json' || templateName === 'user_stats.json') {
                defaultContent = templateName === 'activity_logs.json' ? '[]' : '{}';
            }
            await fsPromises.writeFile(targetPath, defaultContent);
            console.log(`Created default ${targetPath}`);
        }
    }
}

/**
 * Initializes data directory and files. Loads user data.
 * Enhanced to use templates and create user_stats.json
 */
async function initializeFiles() {
    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            await fsPromises.mkdir(dataDir, { recursive: true });
            console.log(`Created data directory at ${dataDir}`);
        }

        // Copy/create files from templates
        await copyTemplateIfNeeded('users.json', usersFilePath);
        await copyTemplateIfNeeded('activity_logs.json', logsFilePath);
        await copyTemplateIfNeeded('user_stats.json', userStatsFilePath);

        // Load users data into memory
        const usersData = await fsPromises.readFile(usersFilePath, 'utf-8');
        users = JSON.parse(usersData);
        console.log(`Loaded ${Object.keys(users).length} users from file`);
        
    } catch (err) {
        console.error("File initialization error:", err);
        // Don't crash the server, create minimal working state
        users = {};
    }
}

/**
 * Saves the current in-memory users object to file.
 * Maintains backward compatibility with existing structure
 */
async function saveUsers() {
    try {
        await fsPromises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        console.log('Users data saved successfully');
    } catch (err) {
        console.error("Error saving users.json:", err);
    }
}

/**
 * Returns the loaded in-memory users.
 * Maintains backward compatibility
 */
function getUsers() {
    return users;
}

/**
 * Add a new user (helper function for future use)
 */
async function addUser(email, password, tokenLimit = 10000) {
    users[email] = {
        password: password,
        tokens_used: 0,
        token_limit: tokenLimit
    };
    await saveUsers();
    console.log(`Added new user: ${email}`);
}

/**
 * Update user token usage
 */
async function updateUserTokens(email, tokensUsed) {
    if (users[email]) {
        users[email].tokens_used = (users[email].tokens_used || 0) + tokensUsed;
        await saveUsers();
    }
}

module.exports = {
    initializeFiles,
    saveUsers,
    getUsers,
    addUser,
    updateUserTokens,
    usersFilePath,
    logsFilePath,
    userStatsFilePath
};
