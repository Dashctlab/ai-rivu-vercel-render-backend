// utils/errorMessages.js - Centralized Error Message System

/**
 * Teacher-friendly error messages with contact information
 * Structured for future multi-language support
 */

const CONTACT_INFO = "📞 +91-8828015315 or visit our Contact Page";

const ERROR_MESSAGES = {
  // === LOGIN ERRORS (User Fixable) ===
  INVALID_LOGIN: "Email or password is incorrect. Please check and try again.",
  MISSING_LOGIN_FIELDS: "Please enter both email and password.",
  INVALID_EMAIL_FORMAT: "Please enter a valid email address.",
  TOO_MANY_LOGIN_ATTEMPTS: "Too many login attempts. Please wait 15 minutes before trying again.",
  
  // === FORM VALIDATION ERRORS (User Fixable) ===
  MISSING_REQUIRED_FIELDS: "Please fill in all required fields.",
  INVALID_CURRICULUM: "Please select a valid curriculum board.",
  INVALID_CLASS: "Please select a valid class.",
  INVALID_SUBJECT: "Please select a valid subject.",
  INVALID_QUESTION_TYPE: "Please select valid question types.",
  TOO_MANY_QUESTIONS: "Please reduce the number of questions to 75 or less.",
  TOO_MANY_QUESTION_TYPES: "Maximum 10 question types allowed. Please remove some.",
  INVALID_MARKS: "Marks must be in 0.5 increments (e.g., 0.5, 1, 1.5, 2).",
  INVALID_DIFFICULTY: "Difficulty percentages must add up to 100%.",
  INVALID_TIME_DURATION: "Please select a valid exam duration.",
  
  // === RATE LIMITING ERRORS (User Fixable) ===
  GENERATING_TOO_FAST: "You're creating papers too quickly. Please wait 15 minutes before generating more papers.",
  DOWNLOADING_TOO_FAST: "Download limit reached. Please wait 5 minutes before downloading more files.",
  
  // === QUOTA ERRORS (Upgrade Needed) ===
  QUOTA_EXCEEDED: "You've generated 20 question papers (free account limit reached).", // Modal handles contact info
  
  // === AI/GENERATION ERRORS (System Issues) ===
  AI_SERVICE_BUSY: `Our AI system is temporarily busy. Please wait a few minutes and try again. Contact support if the issue persists: ${CONTACT_INFO}`,
  AI_SERVICE_ERROR: `Unable to connect to our AI service. Please try after some time. Contact support if the issue persists: ${CONTACT_INFO}`,
  AI_TIMEOUT: `The AI is taking longer than usual to generate your paper. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  AI_INVALID_RESPONSE: `The AI gave an unexpected response. Please try generating the paper again. Contact support if the issue persists: ${CONTACT_INFO}`,
  GENERATION_FAILED: `Unable to generate your question paper right now. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  
  // === NETWORK/CONNECTION ERRORS (Mixed) ===
  NETWORK_ERROR: `Connection problem detected. Please check your internet connection and try again. Contact support if the issue persists: ${CONTACT_INFO}`,
  REQUEST_TIMEOUT: `The request is taking longer than usual. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  
  // === SERVER ERRORS (System Issues) ===
  SERVER_ERROR: `There seems to be an internal server issue. Please try after some time. Contact support if the issue persists: ${CONTACT_INFO}`,
  DATABASE_ERROR: `Unable to save your data right now. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  SERVICE_UNAVAILABLE: `Our service is temporarily unavailable. Please try after some time. Contact support if the issue persists: ${CONTACT_INFO}`,
  
  // === AUTHENTICATION ERRORS (System Issues) ===
  AUTH_SYSTEM_ERROR: `Login system error detected. Please try refreshing the page and logging in again. Contact support if the issue persists: ${CONTACT_INFO}`,
  SESSION_EXPIRED: "Your session has expired. Please refresh the page and log in again.",
  UNAUTHORIZED_ACCESS: "Please log in first to access this feature.",
  
  // === DOWNLOAD ERRORS ===
  DOWNLOAD_FAILED: `Failed to create your Word file. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  DOWNLOAD_DATA_MISSING: "Please generate a question paper first before downloading.",
  DOWNLOAD_FORMAT_ERROR: `File format error detected. Please try generating the paper again. Contact support if the issue persists: ${CONTACT_INFO}`,
  
  // === GENERAL ERRORS ===
  DEFAULT_ERROR: `Something unexpected happened. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  PAGE_NOT_FOUND: "The page you're looking for doesn't exist. Please check the URL or go back to the home page.",
  FEATURE_NOT_AVAILABLE: "This feature is not available right now. Please try again later.",
  
  // === VALIDATION ERRORS (User Fixable) ===
  INVALID_FILE_FORMAT: "Please select a valid file format.",
  FILE_TOO_LARGE: "File is too large. Please select a smaller file.",
  INVALID_INPUT_CHARACTERS: "Please use only letters, numbers, and common punctuation.",
  INPUT_TOO_LONG: "Input is too long. Please shorten your text.",
  INPUT_TOO_SHORT: "Input is too short. Please provide more details."
};

/**
 * Get error message by code
 * @param {string} errorCode - The error code
 * @param {string} language - Language code (for future use)
 * @param {object} customData - Custom data for message formatting
 * @returns {string} User-friendly error message
 */
function getErrorMessage(errorCode, language = 'en', customData = {}) {
  // For now, only English is supported
  // Future: const messages = LOCALES[language] || LOCALES.en;
  
  let message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.DEFAULT_ERROR;
  
  // Handle custom data substitution if needed
  if (customData && Object.keys(customData).length > 0) {
    Object.keys(customData).forEach(key => {
      const placeholder = `{${key}}`;
      if (message.includes(placeholder)) {
        message = message.replace(new RegExp(placeholder, 'g'), customData[key]);
      }
    });
  }
  
  return message;
}

/**
 * Check if error requires contact support
 * @param {string} errorCode - The error code
 * @returns {boolean} True if error message includes contact info
 */
function requiresSupport(errorCode) {
  const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.DEFAULT_ERROR;
  return message.includes(CONTACT_INFO);
}

/**
 * Get error category for logging/analytics
 * @param {string} errorCode - The error code
 * @returns {string} Error category
 */
function getErrorCategory(errorCode) {
  if (errorCode.includes('LOGIN') || errorCode.includes('AUTH')) return 'authentication';
  if (errorCode.includes('VALIDATION') || errorCode.includes('INVALID')) return 'validation';
  if (errorCode.includes('AI') || errorCode.includes('GENERATION')) return 'ai_service';
  if (errorCode.includes('NETWORK') || errorCode.includes('TIMEOUT')) return 'network';
  if (errorCode.includes('SERVER') || errorCode.includes('DATABASE')) return 'server';
  if (errorCode.includes('DOWNLOAD')) return 'download';
  if (errorCode.includes('QUOTA') || errorCode.includes('LIMIT')) return 'quota';
  return 'general';
}

// === LEGACY ERROR CODE MAPPING ===
// Map old error types to new error codes for backward compatibility
const LEGACY_MAPPING = {
  'network': 'NETWORK_ERROR',
  'timeout': 'REQUEST_TIMEOUT', 
  'validation': 'MISSING_REQUIRED_FIELDS',
  'generation': 'GENERATION_FAILED',
  'auth': 'AUTH_SYSTEM_ERROR',
  'server': 'SERVER_ERROR',
  'default': 'DEFAULT_ERROR'
};

/**
 * Get error message from legacy error type (for backward compatibility)
 * @param {string} legacyType - Old error type
 * @param {string} language - Language code
 * @returns {string} User-friendly error message
 */
function getLegacyErrorMessage(legacyType, language = 'en') {
  const errorCode = LEGACY_MAPPING[legacyType] || 'DEFAULT_ERROR';
  return getErrorMessage(errorCode, language);
}

// Export functions for use across the application
module.exports = {
  getErrorMessage,
  getLegacyErrorMessage,
  requiresSupport,
  getErrorCategory,
  ERROR_MESSAGES,
  CONTACT_INFO
};

// For frontend usage (if loaded as a script)
if (typeof window !== 'undefined') {
  window.ErrorMessages = {
    getErrorMessage,
    getLegacyErrorMessage,
    requiresSupport,
    getErrorCategory,
    ERROR_MESSAGES,
    CONTACT_INFO
  };
}
