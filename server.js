const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://ai-rivu-vercel-frontend.vercel.app'
}));
app.use(cors(corsOptions));
app.use(bodyParser.json());

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
app.post('/generate', async (req, res) => {
  const { topic } = req.body;
  const email = req.headers['useremail'];

  if (!email || !users[email]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Simulate OpenRouter API call (replace with real one if needed)
  const generatedQuestions = `Sample questions for topic: ${topic}`;

  // Update token usage (simulate)
  users[email].tokens_used = (users[email].tokens_used || 0) + 500; // Assume 500 tokens per generation
  saveUsers();

  logActivity(email, 'Generated Questions');

  res.json({ questions: generatedQuestions });
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
