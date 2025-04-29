
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
    // Build Question Type Instructions Dynamically
    let questionTypeInstructions = '';
    if (questionTypes && questionTypes.length > 0) {
      questionTypes.forEach(type => {
        questionTypeInstructions += `- ${type}: Generate exactly 5 questions, each carrying 5 marks.\n`; // Assuming default 5 questions × 5 marks per your screenshot
      });
    }

    // Split difficulty
    const [easy, medium, hard] = difficultySplit.split('-');

    // Start Prompt
    let prompt = `You are an expert school examination setter. Create a formal question paper with the following exact requirements:\n\n`;

    prompt += `Curriculum Board: ${curriculum}\n`;
    prompt += `Class/Grade: ${className}\n`;
    prompt += `Subject: ${subject}\n`;
    if (topic) prompt += `Topics to cover: ${topic}\n`;
    prompt += `Total Time Duration: ${timeDuration} minutes\n\n`;

    prompt += `Question Types and Section Instructions:\n${questionTypeInstructions}\n`;

    prompt += `Difficulty Split:\n`;
    prompt += `- Easy: ${easy}%\n`;
    prompt += `- Medium: ${medium}%\n`;
    prompt += `- Hard: ${hard}%\n\n`;

    prompt += `Time Duration Instructions:\n`;
    prompt += `- The total time duration for this paper is ${timeDuration} minutes.\n`;
    prompt += `- Structure the questions and expected answer lengths so that an average student can complete the paper comfortably within the given time.\n`;
    prompt += `- Adjust question complexity accordingly: simpler and more direct questions for shorter durations, deeper and more descriptive answers for longer durations.\n\n`;

    prompt += `Important:\n`;
    prompt += `- Strictly follow the number of questions per type exactly.\n`;
    prompt += `- Do NOT merge or reduce questions.\n`;
    prompt += `- Each section must have the exact number of questions and marks assigned.\n\n`;

    if (additionalConditions) {
      prompt += `Additional Conditions:\n- ${additionalConditions}\n\n`;
    }

    prompt += `Answer Key:\n- Format separately as ${answerKeyFormat} (Brief/Detailed).\n\n`;

    // Main Static Instructions
    prompt += `Instructions:\n`;
    prompt += `- Ensure the paper is appropriate for the subject (${subject}) selected.\n`;
    prompt += `- Arrange questions starting with Easy level, followed by Medium, and then Hard in each section.\n`;
    prompt += `- Organize question types clearly: MCQs and objective questions first, followed by other formats if selected, then Short Answers, then Long Answers.\n`;
    prompt += `- Maintain a formal examination style and tone.\n`;
    prompt += `- Structure sections with clear titles (e.g., "Section A: MCQs").\n`;
    prompt += `- Do not add extra explanations or filler text unless specifically asked.\n`;
    prompt += `- Ensure mark distribution matches the details provided.\n`;
    prompt += `- The paper should look clean, professional, and ready to be given in an official school exam.\n`;
    prompt += `- Insert at least 2 blank lines after the last question before starting the Answer Key.\n`;
    prompt += `- Start the Answer Key in a new section, clearly titled "**Answer Key**" in bold or underlined.\n`;
    prompt += `- Ensure Answer Key numbering starts separately (1, 2, 3... again fresh).\n`;
  

    // Call OpenRouter API
    const data = {
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: prompt
      }]
    };

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', data, { headers });
    const generatedQuestions = response.data.choices[0].message.content;

    users[email].tokens_used = (users[email].tokens_used || 0) + 500; // Simulated usage
    saveUsers();
    logActivity(email, 'Generated Questions');

    res.json({ questions: generatedQuestions });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating questions' });
  }
});

//To download as word file

const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

app.post('/download-docx', async (req, res) => {
  const { subject, questions } = req.body;

  if (!subject || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const doc = new Document({
      creator: "AI-RIVU QPG",
      title: `Question Paper - ${subject}`,
      description: "Generated by AI-RIVU Question Paper Generator",
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children: [
            new Paragraph({
              text: `Question Paper - ${subject}`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: '' }),

            ...questions.map((q, idx) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${idx + 1}. ${q}`,
                    font: "Times New Roman",
                    size: 24,
                  }),
                ],
              })
            )
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `Question_Paper_${Date.now()}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error) {
    console.error("Error generating .docx:", error);
    res.status(500).json({ message: "Failed to generate Word file." });
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
