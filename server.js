const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } = require('docx');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: 'https://ai-rivu-vercel-frontend.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'useremail'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Determine base directory for data files
const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const logsFilePath = path.join(dataDir, 'activity_logs.json');

// Ensure data directory and files exist
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir);
        console.log(`Created data directory at ${dataDir}`);
    } catch (err) {
        console.error(`Error creating data directory: ${err}`);
    }
}

if (!fs.existsSync(usersFilePath)) {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify({}, null, 2));
        console.log(`Created empty users file at ${usersFilePath}`);
    } catch (err) {
        console.error(`Error creating users file: ${err}`);
    }
}

if (!fs.existsSync(logsFilePath)) {
    try {
        fs.writeFileSync(logsFilePath, JSON.stringify([], null, 2));
        console.log(`Created empty logs file at ${logsFilePath}`);
    } catch (err) {
        console.error(`Error creating logs file: ${err}`);
    }
}

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// --- Environment Variable Check ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY environment variable is not set.");
} else {
    console.log("OpenRouter API Key loaded.");
}

// --- Load Users Data ---
let users = {};
try {
    const usersData = fs.readFileSync(usersFilePath, 'utf-8');
    users = JSON.parse(usersData);
    console.log("Users data loaded successfully.");
} catch (err) {
    console.error("Error loading or parsing users.json:", err);
    users = {};
}

// --- Helper Functions ---
function saveUsers() {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error saving users.json:", err);
    }
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function logActivity(email, action) {
    try {
        let logs = [];
        if (fs.existsSync(logsFilePath)) {
            const logData = fs.readFileSync(logsFilePath, 'utf-8');
            try {
                logs = JSON.parse(logData);
                if (!Array.isArray(logs)) {
                    console.warn("Logs file was not an array, resetting.");
                    logs = [];
                }
            } catch (parseErr) {
                console.error("Error parsing logs file, resetting logs:", parseErr);
                logs = [];
            }
        }
        logs.push({
            email: email || 'N/A',
            action,
            timestamp: getCurrentTimestamp(),
            userAgent: 'System'
        });
        fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error("Error logging activity:", err);
    }
}

function addQuestionParagraph(docChildren, number, text) {
    docChildren.push(
        new Paragraph({
            children: [
                new TextRun({ text: `${number}. `, bold: true, size: 24 }),
                new TextRun({ text, size: 24 })
            ],
            spacing: { after: 80 }
        })
    );
}

function addOptionParagraph(docChildren, text) {
    docChildren.push(
        new Paragraph({
            children: [new TextRun({ text, size: 24 })],
            indent: { left: 720 },
            spacing: { after: 40 }
        })
    );
}

// Middleware to verify authentication
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    const email = req.headers.useremail;

    if (!token || !email || !users[email]) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// --- Routes ---

// Basic Health Check Route
app.get('/', (req, res) => {
    res.status(200).send('AI-RIVU Backend is running.');
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users[email];

    if (user && user.password === password) {
        const token = Math.random().toString(36).substring(7);
        
        // Log successful login with timestamp
        logActivity(email, `Login Success - ${getCurrentTimestamp()}`);
        
        // Set proper CORS headers
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Origin', corsOptions.origin);
        
        res.status(200).json({
            message: 'Login successful',
            email,
            token
        });
    } else {
        logActivity(email, `Login Failed - ${getCurrentTimestamp()}`);
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Generate Questions Route
const openRouterHeaders = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://ai-rivu-vercel-frontend.vercel.app',
    'X-Title': 'AI-RIVU QPG',
};

app.post('/generate', verifyToken, async (req, res) => {
    const {
        curriculum,
        className,
        subject,
        topic,
        difficultySplit,
        timeDuration,
        additionalConditions,
        questionDetails,
        answerKeyFormat
    } = req.body;
    
    const email = req.headers['useremail'] || 'anonymous';

    if (!curriculum || !className || !subject || !questionDetails || !Array.isArray(questionDetails) || questionDetails.length === 0) {
        logActivity(email, 'Generate Failed - Missing Parameters');
        return res.status(400).json({ message: 'Missing required generation parameters.' });
    }

    try {
        let prompt = `You are an expert school examination paper setter. Create a formal question paper with the following exact specifications:\n\n`;
        prompt += `**Core Details:**\n`;
        prompt += `- Curriculum Board: ${curriculum}\n`;
        prompt += `- Class/Grade: ${className}\n`;
        prompt += `- Subject: ${subject}\n`;
        if (topic && topic.trim() !== '') prompt += `- Specific Topics: ${topic}\n`;
        prompt += `- Total Time Allowed: ${timeDuration} minutes\n\n`;

        prompt += `**Paper Structure & Content:**\n`;
        let sectionCounter = 0;
        let requiresConsecutiveNumbering = false;
        questionDetails.forEach(detail => {
            sectionCounter++;
            const sectionLetter = String.fromCharCode(64 + sectionCounter);
            prompt += `- Section ${sectionLetter}: ${detail.type} Questions\n`;
            prompt += `  - Generate exactly ${detail.num} question(s) of the '${detail.type}' type.\n`;
            if (detail.marks > 0) {
                prompt += `  - Each question in this section should carry ${detail.marks} mark(s).\n`;
            } else {
                prompt += `  - Assign appropriate marks per question for this section based on type and class level.\n`;
            }
            if (detail.num > 1) requiresConsecutiveNumbering = true;
        });
        prompt += `\n`;

        prompt += `**Difficulty Distribution (Apply across the entire paper):**\n`;
        if (difficultySplit && difficultySplit.includes('%')) {
            const [easy, medium, hard] = difficultySplit.split('-');
            prompt += `- Easy: ${easy || '0%'}\n`;
            prompt += `- Medium: ${medium || '100%'}\n`;
            prompt += `- Hard: ${hard || '0%'}\n`;
        } else {
            prompt += `- Default difficulty distribution (primarily Medium).\n`;
        }
        prompt += `\n`;

        prompt += `**Formatting and Style Instructions:**\n`;
        prompt += `- Maintain a formal, clear, and professional examination tone suitable for ${className}.\n`;
        prompt += `- Start with general instructions if applicable (e.g., "All questions are compulsory").\n`;
        prompt += `- Clearly label each section (e.g., "Section A: Multiple Choice Questions (Marks: ...)").\n`;
        prompt += `- Number questions starting from 1 within each section.\n`;
        prompt += `- Ensure questions are unambiguous and appropriate for the specified curriculum.\n`;
        prompt += `- Adjust question complexity based on the ${timeDuration} minute time limit.\n`;
        if (additionalConditions && additionalConditions.trim() !== '') {
            prompt += `- Additional conditions: ${additionalConditions}\n`;
        }
        prompt += `\n`;

        prompt += `**Answer Key Instructions:**\n`;
        prompt += `- After the last question, insert a clear separator (---)\n`;
        prompt += `- Provide an Answer Key section.\n`;
        prompt += `- List answers corresponding to each question number.\n`;
        prompt += `- Format: '${answerKeyFormat}' (Brief=direct answer, Detailed=with explanation)\n`;
        prompt += `- Ensure answer key numbering matches question numbering.\n\n`;

        const requestData = {
            model: "openai/gpt-3.5-turbo-1106",
            messages: [{
                role: "user",
                content: prompt
            }],
            max_tokens: 3000,
            temperature: 0.6,
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestData, { headers: openRouterHeaders });

        if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error("Invalid response structure from OpenRouter.");
        }

        const generatedQuestions = response.data.choices[0].message.content;
        const usage = response.data.usage || { total_tokens: 0 };

        if (email !== 'anonymous' && users[email]) {
            users[email].tokens_used = (users[email].tokens_used || 0) + usage.total_tokens;
            saveUsers();
        }
        
        logActivity(email, `Generated Questions - Subject: ${subject}, Class: ${className}, Tokens: ${usage.total_tokens}`);
        res.json({ questions: generatedQuestions });

    } catch (error) {
        console.error("Error during question generation:", error.response ? error.response.data : error.message);
        logActivity(email, `Generate Failed - Error: ${error.message}`);
        res.status(error.response?.status || 500).json({
            message: `Error generating questions: ${error.response?.data?.error?.message || error.message}`
        });
    }
});

// Download DOCX Route
app.post('/download-docx', verifyToken, async (req, res) => {
    const { subject, metadata, sections, answerKey } = req.body;
    const email = req.headers['useremail'] || 'anonymous';

    if (!subject || !metadata || !sections || !Array.isArray(sections) || !answerKey || !Array.isArray(answerKey)) {
        logActivity(email, 'Download Failed - Invalid Input');
        return res.status(400).json({ message: "Invalid input parameters." });
    }

    try {
        const docChildren = [];

        // Header Section
        docChildren.push(
            new Paragraph({
                text: 'School Name: ___________________________',
                style: "headerStyle",
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            })
        );

        docChildren.push(
            new Paragraph({
                border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } },
                spacing: { after: 300 }
            })
        );

        // Class and Subject
        docChildren.push(
            new Paragraph({
                children: [new TextRun({ text: `Class: ${metadata.className || 'N/A'}`, bold: true, size: 28 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 50 }
            })
        );

        docChildren.push(
            new Paragraph({
                children: [new TextRun({ text: `Subject: ${subject}`, bold: true, size: 28 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            })
        );

        // Marks and Time Table
        const headerTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: `Total Marks: ${metadata.totalMarks || '___'}`, size: 24 })]
                                })
                            ],
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE }
                            }
                        }),
                        new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [new TextRun({ text: `Time: ${metadata.timeDuration || '___'}`, size: 24 })]
                                })
                            ],
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE }
                            }
                        }),
                    ],
                }),
            ],
        });

        docChildren.push(headerTable);
        docChildren.push(
            new Paragraph({
                border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } },
                spacing: { after: 400 }
            })
        );

        // Question Sections
        sections.forEach(sec => {
            docChildren.push(
                new Paragraph({
                    text: sec.title,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 150 }
                })
            );

            let localNum = 1;
            sec.questions.forEach(qBlock => {
                const lines = qBlock.split('\n').filter(Boolean);
                addQuestionParagraph(docChildren, localNum++, lines[0]);
                lines.slice(1).forEach(opt => addOptionParagraph(docChildren, opt));
            });

            docChildren.push(new Paragraph({ text: '' }));
        });

        // Answer Key
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        docChildren.push(
            new Paragraph({
                text: "Answer Key",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 200 }
            })
        );

        answerKey.forEach((ans, idx) => {
            const clean = ans.replace(/^\d+\.?\s*/, '');
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${idx + 1}. `, bold: true, size: 22 }),
                        new TextRun({ text: clean.trim(), size: 22 })
                    ],
                    spacing: { after: 60 }
                })
            );
        });

        // Create Document
        const doc = new Document({
            creator: "AI-RIVU QPG",
            title: `Question Paper - ${subject}`,
            description: `Generated question paper for ${subject}, ${metadata.className}`,
            styles: {
                paragraphStyles: [
                    { id: "headerStyle", name: "Header Style", basedOn: "Normal", run: { size: 26 } },
                ]
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 720, right: 720, bottom: 720, left: 720 },
                    },
                },
                children: docChildren,
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeClassName = metadata.className ? metadata.className.replace(/\s+/g, '_') : 'unknown_class';
        const fileName = `Question_Paper_${safeSubject}_${safeClassName}_${Date.now()}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buffer.length);
        
        logActivity(email, `Download Success - Subject: ${subject}, Class: ${metadata.className}`);
        res.send(buffer);

    } catch (error) {
        console.error(`Error generating .docx for ${subject}:`, error);
        logActivity(email, `Download Failed DOCX - Error: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to generate Word file: ${error.message}` });
        }
    }
});

// Error Handling
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    logActivity('SYSTEM', `Unhandled Error - ${err.message}`);
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', corsOptions.origin);
    
    if (!res.headersSent) {
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing CORS requests from: ${corsOptions.origin}`);
    logActivity('SYSTEM', `Server Started - ${getCurrentTimestamp()}`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    logActivity('SYSTEM', 'Server Shutdown Signal');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    logActivity('SYSTEM', 'Server Termination Signal');
    process.exit(0);
});
