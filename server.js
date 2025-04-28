
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
  const { topic, curriculum, className, subject, numQuestions, difficultySplit, timeDuration, additionalConditions, questionTypes, answerKeyFormat } = req.body;
  const email = req.headers['useremail'];

  if (!email || !users[email]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const prompt = `Create a ${numQuestions} questions ${subject} question paper for ${curriculum} ${className}.
    Topics: ${topic}.
    Difficulty split: ${difficultySplit}.
    Time Duration: ${timeDuration}.
    Answer format: ${answerKeyFormat}.
    Additional Conditions: ${additionalConditions}.
    Include these types of questions: ${questionTypes.join(', ')}.`;

    const data = {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: prompt
      }]
    };

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', data, { headers });

    const generatedQuestions = response.data.choices[0].message.content;

    users[email].tokens_used = (users[email].tokens_used || 0) + 500; // Simulated, you can improve later
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
