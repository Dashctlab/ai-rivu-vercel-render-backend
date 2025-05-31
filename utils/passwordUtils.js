// utils/passwordUtils.js - NEW FILE
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 */
async function hashPassword(plainPassword) {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify a plain text password against a hash
 */
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw new Error('Password verification failed');
    }
}

/**
 * Migrate existing plain text passwords to hashed versions
 */
async function migratePasswords() {
    const { getUsers, saveUsers } = require('./fileUtils');
    const users = getUsers();
    let migrationCount = 0;

    for (const [email, userData] of Object.entries(users)) {
        // Check if password is already hashed (bcrypt hashes start with $2b$)
        if (!userData.password.startsWith('$2b$')) {
            console.log(`Migrating password for: ${email}`);
            userData.password = await hashPassword(userData.password);
            migrationCount++;
        }
    }

    if (migrationCount > 0) {
        await saveUsers();
        console.log(`✅ Migrated ${migrationCount} passwords to secure hashes`);
    } else {
        console.log('✅ All passwords already hashed');
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    migratePasswords
};
