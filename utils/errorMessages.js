// utils/errorMessages.js - Centralized Error Message System
// UPDATED: Teacher-friendly messages that make sense in education context

/**
 * Teacher-friendly error messages with contact information
 * All messages explain what happened and what teachers should do next
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
  
  // === MODEL TESTING ERRORS (System Issues) ===
  MODEL_TEST_FAILED: `Model testing failed. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  
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
  
  // === DOWNLOAD ERRORS (UPDATED: Teacher-friendly messages) ===
  DOWNLOAD_FAILED: `Failed to create your Word file. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  
  // NEW: Teacher-friendly download error codes
  NO_PAPER_TO_DOWNLOAD: "Please generate a question paper first before downloading.",
  NO_QUESTIONS_FOUND: "No questions found in your paper. Please generate the paper again.",
  NO_ANSWER_KEY_FOUND: "Answer key is missing from your paper. Please generate the paper again.",
  PAPER_DATA_INCOMPLETE: "Your question paper information is incomplete. Please generate the paper again.",
  PAPER_DATA_CORRUPTED: `Your question paper data got corrupted. Please generate the paper again. Contact support if the issue persists: ${CONTACT_INFO}`,
  PAPER_TOO_COMPLEX: "Your question paper is too large or complex to download. Please create a simpler paper with fewer questions and try again.",
  
  // === GENERAL ERRORS ===
  DEFAULT_ERROR: `Something unexpected happened. Please try again in a few moments. Contact support if the issue persists: ${CONTACT_INFO}`,
  PAGE_NOT_FOUND: "The page you're looking for doesn't exist. Please check the URL or go back to the home page.",
  FEATURE_NOT_AVAILABLE: "This feature is not available right now. Please try again later.",
  
  // === VALIDATION ERRORS (User Fixable - UPDATED: Teacher-friendly) ===
  INVALID_FILE_FORMAT: "Please select a valid file format.",
  FILE_TOO_LARGE: "The file you selected is too large. Please select a smaller file.",
  INVALID_INPUT_CHARACTERS: "Please use only letters, numbers, and common punctuation.",
  INPUT_TOO_LONG: "Your text is too long. Please shorten it and try again.",
  INPUT_TOO_SHORT: "Please provide more details.",
  
  // === SPECIFIC PAPER GENERATION ERRORS (User Fixable) ===
  SUBJECT_NAME_TOO_LONG: "Subject name is too long. Please use a shorter subject name.",
  TOO_MANY_SECTIONS: "Your paper has too many sections. Please simplify and create fewer question types.",
  SECTION_TOO_LARGE: "One of your sections has too many questions. Please reduce questions per section and try again.",
  QUESTIONS_TOO_DETAILED: "Some questions are very long. Please make them shorter and try again.",
  ANSWER_KEY_TOO_LARGE: "Your answer key is too large. Please reduce the number of questions and try again."
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
  if (errorCode.includes('DOWNLOAD') || errorCode.includes('PAPER')) return 'download';
  if (errorCode.includes('QUOTA') || errorCode.includes('LIMIT')) return 'quota';
  return 'general';
}

// === LEGACY ERROR CODE MAPPING (UPDATED: Complete mapping) ===
// Map old error types to new error codes for backward compatibility
const LEGACY_MAPPING = {
  'network': 'NETWORK_ERROR',
  'timeout': 'REQUEST_TIMEOUT', 
  'validation': 'MISSING_REQUIRED_FIELDS',
  'generation': 'GENERATION_FAILED',
  'auth': 'AUTH_SYSTEM_ERROR',
  'server': 'SERVER_ERROR',
  'default': 'DEFAULT_ERROR',
  
  // Additional mappings for generate.js compatibility
  'CONNECTION_ERROR': 'AI_SERVICE_ERROR',
  'SERVICE_BUSY': 'AI_SERVICE_BUSY',
  'INVALID_REQUEST': 'AI_INVALID_RESPONSE',
  'TIMEOUT': 'AI_TIMEOUT',
  'NEEDS_MORE_INFO': 'AI_INVALID_RESPONSE',
  'GENERATION_ERROR': 'GENERATION_FAILED',
  
  // UPDATED: Download error mappings with new teacher-friendly codes
  'DOCX_GENERATION_ERROR': 'DOWNLOAD_FAILED',
  'VALIDATION_ERROR': 'NO_PAPER_TO_DOWNLOAD',
  'DOWNLOAD_DATA_MISSING': 'NO_PAPER_TO_DOWNLOAD',
  'DOWNLOAD_FORMAT_ERROR': 'PAPER_DATA_CORRUPTED',
  'INPUT_TOO_LONG': 'PAPER_TOO_COMPLEX',
  
  // Additional specific mappings
  'MISSING_SUBJECT': 'NO_PAPER_TO_DOWNLOAD',
  'MISSING_METADATA': 'PAPER_DATA_INCOMPLETE',
  'MISSING_SECTIONS': 'NO_QUESTIONS_FOUND',
  'MISSING_ANSWER_KEY': 'NO_ANSWER_KEY_FOUND',
  'CORRUPTED_DATA': 'PAPER_DATA_CORRUPTED',
  'PAPER_TOO_LARGE': 'PAPER_TOO_COMPLEX'
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
