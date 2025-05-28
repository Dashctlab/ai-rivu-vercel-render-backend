// routes/generate.js - Updated with dynamic model support
const express = require('express');
const router = express.Router();
const axios = require('axios');

const { getUsers, saveUsers } = require('../utils/fileUtils');
const logActivity = require('../utils/enhancedLogger');
const config = require('../config');

// Headers required by OpenRouter
const openRouterHeaders = {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': config.FRONTEND_URL,
    'X-Title': 'AI-RIVU QPG'
};

/**
 * NEW: Dynamic model selection function
 */
function getActiveModel() {
    const configuredModel = config.AI_MODEL_CONFIG.primary;
    
    // Check if it's a preset key
    if (config.AI_MODEL_CONFIG.presets[configuredModel]) {
        return {
            name: config.AI_MODEL_CONFIG.presets[configuredModel],
            preset: configuredModel
        };
    }
    
    // Otherwise use as direct model string
    return {
        name: configuredModel,
        preset: null
    };
}

/**
 * NEW: Model testing endpoint for quick API tests
 */
router.post('/test-model', async (req, res) => {
    const { model, testPrompt } = req.body;
    const email = req.headers['useremail'] || 'admin';
    
    if (!model) {
        return res.status(400).json({ message: 'Model parameter required' });
    }
    
    try {
        // Resolve model name
        let modelName = model;
        if (config.AI_MODEL_CONFIG.presets[model]) {
            modelName = config.AI_MODEL_CONFIG.presets[model];
        }
        
        // Test the model with a simple prompt
        const testRequestData = {
            model: modelName,
            messages: [{ 
                role: "user", 
                content: testPrompt || "Generate 2 simple math questions for Class 5 students with answers." 
            }],
            max_tokens: 500,
            temperature: 0.6
        };
        
        const startTime = Date.now();
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions', 
            testRequestData, 
            { headers: openRouterHeaders, timeout: 30000 }
        );
        const endTime = Date.now();
        
        const content = response.data?.choices?.[0]?.message?.content;
        const usage = response.data.usage || {};
        
        // Estimate cost
        const pricing = config.AI_MODEL_CONFIG.pricing[modelName] || { input: 1, output: 4 };
        const cost = ((usage.prompt_tokens * pricing.input) + (usage.completion_tokens * pricing.output)) / 1000000;
        
        await logActivity(email, `Model Test Success - ${modelName}`, {
            model: modelName,
            preset: model !== modelName ? model : null,
            tokens: usage.total_tokens || 0,
            responseTime: endTime - startTime,
            cost: cost,
            testSuccessful: true,
            contentLength: content?.length || 0
        });
        
        res.json({
            success: true,
            model: modelName,
            preset: model !== modelName ? model : null,
            response: content,
            usage: usage,
            responseTime: endTime - startTime,
            estimatedCost: cost,
            message: `Model ${modelName} is working correctly`
        });
        
    } catch (error) {
        await logActivity(email, `Model Test Failed - ${model}`, {
            model: model,
            error: error.message,
            httpStatus: error.response?.status,
            testSuccessful: false
        });
        
        res.status(500).json({
            success: false,
            model: model,
            error: error.message,
            httpStatus: error.response?.status,
            message: `Failed to test model: ${error.message}`
        });
    }
});

/**
 * NEW: Get current model info endpoint
 */
router.get('/current-model', (req, res) => {
    const activeModel = getActiveModel();
    const pricing = config.AI_MODEL_CONFIG.pricing[activeModel.name] || { input: 1, output: 4 };
    
    res.json({
        current: {
            name: activeModel.name,
            preset: activeModel.preset,
            settings: {
                maxTokens: config.AI_MODEL_CONFIG.maxTokens,
                temperature: config.AI_MODEL_CONFIG.temperature
            },
            pricing: pricing
        },
        available: Object.keys(config.AI_MODEL_CONFIG.presets),
        presets: config.AI_MODEL_CONFIG.presets
    });
});

/**
 * UPDATED: Main generation route using dynamic model
 */
router.post('/', async (req, res) => {
    const {
        curriculum, className, subject, topic,
        difficultySplit, timeDuration, additionalConditions,
        questionDetails, answerKeyFormat
    } = req.body;

    const email = req.headers['useremail'] || 'anonymous';

    if (!curriculum || !className || !subject || !Array.isArray(questionDetails) || questionDetails.length === 0) {
        await logActivity(email, 'Generate Failed - Missing Parameters', {
            missingFields: {
                curriculum: !curriculum,
                className: !className,
                subject: !subject,
                questionDetails: !Array.isArray(questionDetails) || questionDetails.length === 0
            },
            providedData: { curriculum, className, subject, questionDetailsCount: questionDetails?.length || 0 }
        });
        return res.status(400).json({ message: 'Missing required generation parameters.' });
    }

    try {
        // Enhanced logging for generation start
        await logActivity(email, 'Generate Started', {
            curriculum, className, subject, topic, difficultySplit, timeDuration,
            questionDetailsCount: questionDetails.length,
            startTime: new Date().toISOString(),
            modelConfigured: config.AI_MODEL_CONFIG.primary
        });

        // Build the prompt (existing logic)
        let prompt = `You are an expert school examination paper setter. Create a formal question paper with the following exact specifications:\n\n`;
        prompt += `**Core Details:**\n`;
        prompt += `- Curriculum Board: ${curriculum}\n`;
        prompt += `- Class/Grade: ${className}\n`;
        prompt += `- Subject: ${subject}\n`;
        if (topic?.trim()) prompt += `- Specific Topics: ${topic}\n`;
        prompt += `- Total Time Allowed: ${timeDuration} minutes\n\n`;

        prompt += `**Paper Structure & Content:**\n`;
        let sectionCounter = 0;
        questionDetails.forEach(detail => {
            sectionCounter++;
            const sectionLetter = String.fromCharCode(64 + sectionCounter);
            prompt += `- Section ${sectionLetter}: ${detail.type} Questions\n`;
            prompt += `  - Generate exactly ${detail.num} question(s) of the '${detail.type}' type.\n`;
            prompt += detail.marks > 0
                ? `  - Each question carries ${detail.marks} mark(s).\n`
                : `  - Assign appropriate marks per question.\n`;
        });

        prompt += `\n**Difficulty Distribution:**\n`;
        if (difficultySplit?.includes('%')) {
            const [easy, medium, hard] = difficultySplit.split('-');
            prompt += `- Easy: ${easy || '0%'}\n- Medium: ${medium || '100%'}\n- Hard: ${hard || '0%'}\n`;
        } else {
            prompt += `- Default difficulty distribution (primarily Medium).\n`;
        }

        prompt += `\n**Formatting Instructions:**\n`;
        prompt += `- Maintain a professional tone for ${className}.\n`;
        prompt += `- Label sections clearly.\n`;
        prompt += `- Restart question numbering for each section.\n`;
        prompt += `- Avoid unnecessary explanations.\n`;
        if (additionalConditions?.trim()) {
            prompt += `- Additional conditions: ${additionalConditions}\n`;
        }

        prompt += `\n**Answer Key Instructions:**\n`;
        prompt += `- Insert a clear separator after the last question.\n`;
        prompt += `- Provide an answer key with matching question numbers.\n`;
        prompt += `- Format answers as: '${answerKeyFormat}'.\n\n`;
        prompt += `Generate the question paper followed by the answer key.`;

        // NEW: Use dynamic model selection
        const activeModel = getActiveModel();
        
        const requestData = {
            model: activeModel.name,
            messages: [{ role: "user", content: prompt }],
            max_tokens: config.AI_MODEL_CONFIG.maxTokens,
            temperature: config.AI_MODEL_CONFIG.temperature
        };

        console.log(`🤖 Using AI Model: ${activeModel.name} ${activeModel.preset ? `(preset: ${activeModel.preset})` : ''}`);

        const startTime = Date.now();
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestData, {
            headers: openRouterHeaders,
            timeout: 120000 // 2 minute timeout for complex generations
        });
        const endTime = Date.now();

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Invalid OpenRouter response - no content returned.");

        const users = getUsers();
        const usage = response.data.usage || { total_tokens: 0 };

        // Calculate cost estimate
        const pricing = config.AI_MODEL_CONFIG.pricing[activeModel.name] || { input: 1, output: 4 };
        const costEstimate = ((usage.prompt_tokens * pricing.input) + (usage.completion_tokens * pricing.output)) / 1000000;

        // Update user tokens (existing logic)
        if (email !== 'anonymous' && users[email]) {
            users[email].tokens_used = (users[email].tokens_used || 0) + usage.total_tokens;
            await saveUsers();
        }

        // Enhanced success logging with model and cost info
        await logActivity(email, 'Generated Questions - Subject: ' + subject + ', Class: ' + className + ', Tokens: ' + usage.total_tokens, {
            subject, class: className, curriculum, topic, tokens: usage.total_tokens,
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            questionDetails, difficultySplit, timeDuration,
            generationTime: new Date().toISOString(),
            responseTime: endTime - startTime,
            contentLength: content.length,
            modelUsed: activeModel.name,
            modelPreset: activeModel.preset,
            costEstimate: costEstimate,
            successful: true
        });

        res.json({ 
            questions: content,
            metadata: {
                modelUsed: activeModel.name,
                modelPreset: activeModel.preset,
                tokensUsed: usage.total_tokens,
                costEstimate: costEstimate,
                responseTime: endTime - startTime
            }
        });

    } catch (error) {
        console.error("Generation Error:", {
            status: error.response?.status,
            message: error.response?.data?.error?.message || error.message,
            model: config.AI_MODEL_CONFIG.primary
        });

        const activeModel = getActiveModel();
        await logActivity(email, 'Generate Failed - Error: ' + error.message, {
            subject, class: className, curriculum,
            errorType: error.response?.status ? 'API_ERROR' : 'SYSTEM_ERROR',
            statusCode: error.response?.status,
            errorMessage: error.response?.data?.error?.message || error.message,
            errorTime: new Date().toISOString(),
            modelAttempted: activeModel.name,
            modelPreset: activeModel.preset,
            requestData: { curriculum, className, subject, questionDetailsCount: questionDetails.length }
        });

        // Enhanced error responses
        if (error.response?.status === 401) {
            res.status(500).json({ 
                message: "Authentication error with AI service. Please contact support.",
                errorCode: "AUTH_ERROR"
            });
        } else if (error.response?.status === 429) {
            res.status(500).json({ 
                message: "AI service is busy. Please try again in a few moments.",
                errorCode: "RATE_LIMIT"
            });
        } else if (error.response?.status === 400) {
            res.status(500).json({ 
                message: "Invalid request to AI service. Please try again.",
                errorCode: "BAD_REQUEST"
            });
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            res.status(500).json({
                message: "Request timed out. Please try again with a simpler request.",
                errorCode: "TIMEOUT"
            });
        } else {
            res.status(500).json({ 
                message: "Error generating questions. Please try again.",
                errorCode: "GENERATION_ERROR"
            });
        }
    }
});

module.exports = router;
