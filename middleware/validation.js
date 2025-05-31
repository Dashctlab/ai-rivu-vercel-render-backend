// middleware/validation.js - NEW FILE
const Joi = require('joi');

// Validation schemas
const schemas = {
    // Login validation
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

    // Question generation validation
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
        subject: Joi.string()
            .min(2)
            .max(50)
            .required()
            .pattern(/^[a-zA-Z\s]+$/)
            .messages({
                'string.min': 'Subject must be at least 2 characters',
                'string.max': 'Subject must be less than 50 characters',
                'string.pattern.base': 'Subject can only contain letters and spaces',
                'any.required': 'Subject is required'
            }),
        topic: Joi.string()
            .max(200)
            .allow('')
            .optional()
            .pattern(/^[a-zA-Z0-9\s,.-]*$/)
            .messages({
                'string.max': 'Topic must be less than 200 characters',
                'string.pattern.base': 'Topic contains invalid characters'
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
                topic: Joi.string()
                    .max(100)
                    .allow('')
                    .optional()
                    .pattern(/^[a-zA-Z0-9\s,.-]*$/)
                    .messages({
                        'string.max': 'Question topic must be less than 100 characters',
                        'string.pattern.base': 'Question topic contains invalid characters'
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
                marks: Joi.number()
                    .integer()
                    .min(1)
                    .max(50)
                    .required()
                    .messages({
                        'number.min': 'Marks per question must be at least 1',
                        'number.max': 'Marks per question cannot exceed 50',
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
        additionalConditions: Joi.string()
            .max(500)
            .allow('')
            .optional()
            .messages({
                'string.max': 'Additional conditions must be less than 500 characters'
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
            .max(50)
            .required()
            .messages({
                'string.min': 'Subject must be at least 2 characters',
                'string.max': 'Subject must be less than 50 characters',
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

// Validation middleware factory
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

// Sanitize string inputs to prevent XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/[<>]/g, '') // Remove basic HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

// Middleware to sanitize all string inputs in req.body
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