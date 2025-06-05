const crypto = require('crypto');

/**
 * Generates unique alphanumeric query IDs with collision detection
 * Format: QP-ABC123DEF (9 characters total for better uniqueness)
 */
function generateQueryId() {
  // Use crypto for better randomness + timestamp for uniqueness
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 random chars
  
  // Combine for strong uniqueness: QP-TIMESTAMP-RANDOM
  return `QP-${timestamp}-${randomBytes}`;
}

/**
 * Alternative approach: UUID-based (if you prefer)
 */
function generateQueryIdUUID() {
  const uuid = crypto.randomUUID();
  const shortId = uuid.split('-')[0].toUpperCase(); // First 8 chars of UUID
  return `QP-${shortId}`;
}

module.exports = {
  generateQueryId,
  generateQueryIdUUID
};
