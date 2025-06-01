// routes/curriculum.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const curriculumPath = path.join(__dirname, '../data/curriculum.json');

/**
 * GET /api/curriculum
 * Query params:
 * - board: Filter by specific board (optional)
 * - class: Filter by specific class (requires board)
 * 
 * Examples:
 * /api/curriculum - Returns all boards
 * /api/curriculum?board=CBSE - Returns all classes for CBSE
 * /api/curriculum?board=CBSE&class=Class10 - Returns subjects for CBSE Class 10
 */
router.get('/', (req, res) => {
  try {
    const { board, class: className } = req.query;
    
    // Read curriculum data
    const curriculumData = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
    
    // Return all boards if no filters
    if (!board) {
      const boards = Object.keys(curriculumData);
      return res.json({ boards });
    }
    
    // Check if board exists
    if (!curriculumData[board]) {
      return res.status(404).json({ 
        message: `Board '${board}' not found. Available boards: ${Object.keys(curriculumData).join(', ')}` 
      });
    }
    
    // Return all classes for the board if no class specified
    if (!className) {
      const classes = Object.keys(curriculumData[board]);
      return res.json({ board, classes });
    }
    
    // Check if class exists for the board
    if (!curriculumData[board][className]) {
      return res.status(404).json({ 
        message: `Class '${className}' not found for ${board}. Available classes: ${Object.keys(curriculumData[board]).join(', ')}` 
      });
    }
    
    // Return subjects for the specific board and class
    const subjects = curriculumData[board][className];
    return res.json({ board, class: className, subjects });
    
  } catch (error) {
    console.error('Curriculum API error:', error);
    res.status(500).json({ 
      message: 'Unable to load curriculum data. Please try again.' 
    });
  }
});

module.exports = router;
