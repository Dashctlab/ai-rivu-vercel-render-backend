// utils/queryIdGenerator.js
/**
 * Generates unique alphanumeric query IDs for tracking question paper generation
 * Format: QP-ABC123 (6-8 characters)
 */

function generateQueryId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QP-';
  
  // Generate 6 random characters
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

module.exports = {
  generateQueryId
};
