// middleware/validation.js - FIXED VERSION with Decimal Marks Support
const Joi = require('joi');

// Validation schemas
const schemas = {
  // Login validation (unchanged)
  login: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .required()
      .max(100)
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.max': 'Email must be less than 100 characters'
      }),
    password: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 3 characters long',
        'string.max': 'Password must be less than 100 characters',
        'any.required': 'Password is required'
      })
  }),

  // Enhanced question generation validation for Indian education context
  generate: Joi.object({
    curriculum: Joi.string()
      .valid('CBSE', 'Karnataka State Board', 'Tamil Nadu State Board')
      .required()
      .messages({
        'any.only': 'Invalid curriculum board selected',
        'any.required': 'Curriculum board is required'
      }),
    className: Joi.string()
      .pattern(/^Class \d{1,2}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid class format. Use "Class X" format',
        'any.required': 'Class is required'
      }),
    // Enhanced subject validation for Indian education context  
    subject: Joi.string()
      .min(2)
      .max(100)
      .required()
      .pattern(/^[\w\s\-&'.,():\/+]+$/u) // FIXED: Added :, /, + for "Math/Science", "Physics: Motion"
      .messages({
        'string.min': 'Subject must be at least 2 characters',
        'string.max': 'Subject must be less than 100 characters',
        'string.pattern.base': 'Please use only letters, numbers, and common punctuation in subject names',
        'any.required': 'Subject is required'
      }),
    // Enhanced topic validation for educational context
    topic: Joi.string()
      .max(300)
      .allow('')
      .optional()
      .pattern(/^[\w\s\-&'.,():\/+]+$/u) // FIXED: Same enhanced pattern as subject
      .messages({
        'string.max': 'Topic must be less than 300 characters',
        'string.pattern.base': 'Please use only letters, numbers, and common punctuation in topic names'
      }),
    testObjective: Joi.string()
      .valid('mixed', 'understanding', 'application', 'analysis')
      .default('mixed')
      .messages({
        'any.only': 'Invalid test objective selected'
      }),
    focusLevel: Joi.string()
      .valid('comprehensive', 'targeted', 'skill')
      .default('comprehensive')
      .messages({
        'any.only': 'Invalid focus level selected'
      }),
    questionDetails: Joi.array()
      .min(1)
      .max(12)
      .items(Joi.object({
        type: Joi.string()
          .valid('MCQ', 'Short Answer', 'Long Answer', 'True/False', 'Fill in the Blanks', 
                 'Match the Following', 'Case Based', 'Diagram Based', 'Descriptive', 'Give Reasons')
          .required()
          .messages({
            'any.only': 'Invalid question type selected',
            'any.required': 'Question type is required'
          }),
        // Enhanced topic validation for question-level topics
        topic: Joi.string()
          .max(200)
          .allow('')
          .optional()
          .pattern(/^[\w\s\-&'.,():\/+]+$/u) // FIXED: Enhanced pattern
          .messages({
            'string.max': 'Question topic must be less than 200 characters',
            'string.pattern.base': 'Please use only letters, numbers, and common punctuation in topic names'
          }),
        num: Joi.number()
          .integer()
          .min(1)
          .max(25)
          .required()
          .messages({
            'number.min': 'Number of questions must be at least 1',
            'number.max': 'Number of questions cannot exceed 25',
            'any.required': 'Number of questions is required'
          }),
        // FIXED: Allow decimal marks with quarter increments
        marks: Joi.number()
          .min(0.25)
          .max(50)
          .multiple(0.25)  // Allows 0.25, 0.5, 0.75, 1, 1.25, 1.5, etc.
          .required()
          .messages({
            'number.min': 'Each question must have at least 0.25 marks',
            'number.max': 'Maximum 50 marks allowed per question',
            'number.multiple': 'Marks must be in increments of 0.25 (e.g., 0.5, 1, 1.25, 1.5, 2)',
            'any.required': 'Marks per question is required'
          })
      }))
      .required()
      .messages({
        'array.min': 'At least one question type is required',
        'array.max': 'Maximum 12 question types allowed',
        'any.required': 'Question details are required'
      }),
    difficultySplit: Joi.string()
      .pattern(/^\d{1,3}%-\d{1,3}%-\d{1,3}%$/)
      .custom((value, helpers) => {
        const parts = value.split('-').map(part => parseInt(part.replace('%', '')));
        const sum = parts.reduce((a, b) => a + b, 0);
        if (sum !== 100) {
          return helpers.error('any.invalid');
        }
        return value;
      })
      .required()
      .messages({
        'string.pattern.base': 'Invalid difficulty split format. Use "X%-Y%-Z%" format',
        'any.invalid': 'Difficulty percentages must sum to 100%',
        'any.required': 'Difficulty split is required'
      }),
    timeDuration: Joi.number()
      .integer()
      .min(15)
      .max(300)
      .required()
      .messages({
        'number.min': 'Time duration must be at least 15 minutes',
        'number.max': 'Time duration cannot exceed 300 minutes',
        'any.required': 'Time duration is required'
      }),
    // Enhanced additional conditions validation
    additionalConditions: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .pattern(/^[\w\s\-&'.,():;!?\/+]+$/u) // FIXED: Enhanced pattern
      .messages({
        'string.max': 'Additional conditions must be less than 1000 characters',
        'string.pattern.base': 'Please use only letters, numbers, and common punctuation'
      }),
    answerKeyFormat: Joi.string()
      .valid('Brief', 'Detailed')
      .required()
      .messages({
        'any.only': 'Invalid answer key format. Choose Brief or Detailed',
        'any.required': 'Answer key format is required'
      })
  }),

  // Download validation
  download: Joi.object({
    subject: Joi.string()
      .min(2)
      .max(100)
      .required()
      .pattern(/^[\w\s\-&'.,():\/+]+$/u) // FIXED: Consistent enhanced pattern
      .messages({
        'string.min': 'Subject must be at least 2 characters',
        'string.max': 'Subject must be less than 100 characters',
        'any.required': 'Subject is required'
      }),
    metadata: Joi.object({
      curriculum: Joi.string().required(),
      className: Joi.string().required(),
      totalMarks: Joi.alternatives([Joi.string(), Joi.number()]).required(),
      timeDuration: Joi.string().required()
    }).required(),
    sections: Joi.array().min(1).required(),
    answerKey: Joi.array().required()
  })
};

// Validation middleware factory function
function validateInput(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all validation errors
            stripUnknown: true, // Remove unknown fields
            convert: true // Convert strings to numbers where appropriate
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            console.log(`Validation error for ${req.path}:`, errorDetails);

            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input and try again',
                details: errorDetails
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
}

// Enhanced sanitization for Indian education context
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    // Remove potentially dangerous HTML/JS patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove HTML tags but keep content
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    // But preserve educational characters that are commonly used
    .replace(/[<>]/g, '') // Only remove angle brackets
    // Keep educational symbols: &, ', -, ., ,, (), :, ;, !, ?, /, +
    // Keep Unicode characters for regional languages
    .substring(0, 1000); // Prevent extremely long inputs
}

// Enhanced sanitization middleware with better education support
function sanitizeMiddleware(req, res, next) {
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      }
    }
  }

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

module.exports = {
    schemas,
    validateInput,
    sanitizeMiddleware,
    sanitizeInput
};
