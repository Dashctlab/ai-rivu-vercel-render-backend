
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

//  Fix CORS
const corsOptions = {
  origin: 'https://ai-rivu-vercel-frontend.vercel.app'
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// OpenRouter API Key loaded from environment
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Load users data
let users = require('./users.json');

// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (user && user.password === password) {
    res.status(200).json({ message: 'Login successful', email });
    logActivity(email, 'Login');
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Generate Questions Route

const headers = {
  'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json'
};

app.post('/generate', async (req, res) => {
   const {
    curriculum,
    className,
    subject,
    topic,
    numQuestions,
    difficultySplit,
    timeDuration,
    additionalConditions,
    questionTypes,
    answerKeyFormat
  } = req.body;
  const email = req.headers['useremail'];

  if (!email || !users[email]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Build dynamic prompt
    let prompt = `You are an expert school examination setter. Create a question paper with the following instructions:\n`;
    prompt += `- Curriculum Board: ${curriculum}\n`;
    prompt += `- Class/Grade: ${className}\n`;
    prompt += `- Subject: ${subject}\n`;
    if (topic) prompt += `- Topics to cover: ${topic}\n`;
    if (timeDuration) prompt += `- Time Duration: ${timeDuration} minutes\n`;
    prompt += `- Total Number of Questions: ${numQuestions}\n`;
    if (questionTypes && questionTypes.length > 0) {
      prompt += `- Question Types: ${questionTypes.join(', ')}\n`;
    }
    if (difficultySplit) prompt += `- Difficulty Level Split: ${difficultySplit}\n`;
    if (additionalConditions) prompt += `- Additional Conditions: ${additionalConditions}\n`;
    if (answerKeyFormat) prompt += `- Answer Key Format: ${answerKeyFormat}\n`;

    // Fixed final Instructions block
    prompt += `\nInstructions:\n`;
    prompt += `- Prepare the question paper strictly based on the latest available curriculum and syllabus of the specified board (${curriculum}) for the specified class (${className}).\n`;
    prompt += `- Ensure the paper is appropriate for the subject (${subject}) selected.\n`;
    prompt += `- Arrange questions starting with Easy level, followed by Medium, and then Hard in each section.\n`;
    prompt += `- Organize question types clearly: MCQs and objective questions first, followed by other formats if selected, then Short Answers, then Long Answers.\n`;
    prompt += `- Maintain a formal examination style and tone.\n`;
    prompt += `- Structure sections with clear titles (e.g., "Section A: MCQs").\n`;
    prompt += `- Do not add extra explanations or filler text unless specifically asked.\n`;
    prompt += `- Ensure mark distribution matches the details provided (if available).\n`;
    prompt += `- Format the Answer Key separately as Brief or Detailed, based on input.\n`;
    prompt += `- The paper should look clean, professional, and ready to be given in an official school exam.\n`;

    // Make API call to OpenRouter
    const data = {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: prompt
      }]
    };

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', data, { headers });

    const generatedQuestions = response.data.choices[0].message.content;

    users[email].tokens_used = (users[email].tokens_used || 0) + 500; // simulated token usage
    saveUsers();
    logActivity(email, 'Generated Questions');

    res.json({ questions: generatedQuestions });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating questions' });
  }
});


// Helper functions
function saveUsers() {
  fs.writeFileSync('./users.json', JSON.stringify(users, null, 2));
}

function logActivity(email, action) {
  const logs = JSON.parse(fs.readFileSync('./activity_logs.json', 'utf-8'));
  logs.push({ email, action, timestamp: new Date().toISOString() });
  fs.writeFileSync('./activity_logs.json', JSON.stringify(logs, null, 2));
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
