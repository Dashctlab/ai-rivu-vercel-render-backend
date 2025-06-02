// routes/qualityFeedback.js
const express = require('express');
const router = express.Router();
const logActivity = require('../utils/enhancedLogger');
const { detectDevice } = require('../utils/deviceDetection');

/**
 * POST /api/quality-feedback
 * Handles quality feedback submission from users
 */
router.post('/', async (req, res) => {
    const { queryId, qualityFeedback } = req.body;
    const email = req.headers['useremail'] || 'anonymous';
    
    // Detect device information
    const deviceInfo = detectDevice(req);
    
    if (!queryId || !qualityFeedback) {
        return res.status(400).json({ 
            message: 'Query ID and quality feedback are required' 
        });
    }
    
    try {
        // Log quality feedback
        await logActivity(email, 'Quality Feedback Submitted', {
            queryId,
            qualityFeedback,
            submissionTime: new Date().toISOString(),
            ...deviceInfo
        });
        
        console.log(`Quality feedback received for ${queryId}:`, qualityFeedback);
        
        res.json({ 
            success: true, 
            message: 'Quality feedback received',
            queryId 
        });
        
    } catch (error) {
        console.error('Error processing quality feedback:', error);
        res.status(500).json({ 
            message: 'Unable to process feedback. Please try again.' 
        });
    }
});

module.exports = router;
