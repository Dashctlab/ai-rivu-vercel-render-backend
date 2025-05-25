// routes/generate.js
// Handles question paper generation using OpenRouter API

const express = require('express');
const router = express.Router();
const axios = require('axios');

const { getUsers, saveUsers } = require('../utils/fileUtils');
const logActivity = require('../utils/logger');
const config = require('../config');

// Headers required by OpenRouter
const openRouterHeaders = {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': config.FRONTEND_URL,
    'X-Title': 'AI-RIVU QPG'
};

/**
 * POST /generate
 * Accepts exam configuration and returns generated questions.
 */
router.post('/', async (req, res) => {
    const {
        curriculum, className, subject, topic,
        difficultySplit, timeDuration, additionalConditions,
        questionDetails, answerKeyFormat
    } = req.body;

    const email = req.headers['useremail'] || 'anonymous';

    if (!curriculum || !className || !subject || !Array.isArray(questionDetails) || questionDetails.length === 0) {
        await logActivity(email, 'Generate Failed - Missing Parameters');
        return res.status(400).json({ message: 'Missing required generation parameters.' });
    }

    try {
        // Construct prompt from request payload
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

        const requestData = {
            model: "openai/gpt-3.5-turbo-1106",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
            temperature: 0.6
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestData, { headers: openRouterHeaders });

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Invalid OpenRouter response.");

        const users = getUsers();
        const usage = response.data.usage || { total_tokens: 0 };

        if (email !== 'anonymous' && users[email]) {
            users[email].tokens_used = (users[email].tokens_used || 0) + usage.total_tokens;
            await saveUsers();
        }

        await logActivity(email, `Generated Questions - Subject: ${subject}, Class: ${className}, Tokens: ${usage.total_tokens}`);
        res.json({ questions: content });
        } catch (error) {
            console.error("OpenRouter Error:", {
            status: error.response?.status,
            message: error.response?.data?.error?.message || error.message,
        });
    
        await logActivity(email, `Generate Failed - Error: ${error.message}`);
    
        // Better error messages for users
        if (error.response?.status === 401) {
            res.status(500).json({ 
                message: "Authentication error with AI service. Please contact support." 
        });
       } else if (error.response?.status === 429) {
            res.status(500).json({ 
            message: "AI service is busy. Please try again in a few moments." 
        });
        } else {
            res.status(500).json({ 
            message: "Error generating questions. Please try again." 
        });
    }
}
        await logActivity(email, `Generate Failed - Error: ${error.message}`);
        res.status(500).json({ message: `Error generating questions: ${error.message}` });
    }
});

module.exports = router;
