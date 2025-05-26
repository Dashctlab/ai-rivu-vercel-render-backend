// utils/fileUtils.js
// Handles file initialization, user management and exposes reusable file paths

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// Define file paths
const dataDir = path.join(__dirname, '../data');
const usersFilePath = path.join(dataDir, 'users.json');
const logsFilePath = path.join(dataDir, 'activity_logs.json');

let users = {}; // In-memory user data

/**
 * Initializes data directory and user/log files if not present. Loads user data.
 */
async function initializeFiles() {
    try {
        if (!fs.existsSync(dataDir)) {
            await fsPromises.mkdir(dataDir);
            console.log(`Created data directory at ${dataDir}`);
        }

        if (!fs.existsSync(usersFilePath)) {
            await fsPromises.writeFile(usersFilePath, JSON.stringify({}, null, 2));
            console.log(`Created empty users file at ${usersFilePath}`);
        }

        if (!fs.existsSync(logsFilePath)) {
            await fsPromises.writeFile(logsFilePath, JSON.stringify([], null, 2));
            console.log(`Created empty logs file at ${logsFilePath}`);
        }

        const usersData = await fsPromises.readFile(usersFilePath, 'utf-8');
        users = JSON.parse(usersData);
        console.log("Users data loaded successfully.");
    } catch (err) {
        console.error("Initialization error:", err);
    }
}

/**
 * Saves the current in-memory users object to file.
 */
async function saveUsers() {
    try {
        await fsPromises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error saving users.json:", err);
    }
}

/**
 * Returns the loaded in-memory users.
 */
function getUsers() {
    return users;
}

module.exports = {
    initializeFiles,
    saveUsers,
    getUsers,
    usersFilePath,
    logsFilePath
};
