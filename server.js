
// Load environment variables from .env file
require('dotenv').config();
const config = require('./config');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const axios = require('axios');

// Import DOCX components for question paper generation
const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak
} = require('docx');

const app = express();
const PORT = process.env.PORT || 3000;

// File paths for user data and logs
const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');
const logsFilePath = path.join(dataDir, 'activity_logs.json');

// CORS setup to allow only the frontend domain
const corsOptions = {
    origin: config.FRONTEND_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};

// Middleware setup
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Environment variable check for OpenRouter API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY environment variable is not set.");
} else {
    console.log("OpenRouter API Key loaded.");
}

let users = {};

// Initialize files and directories asynchronously
async function initializeFiles() {
    try {
        if (!fs.existsSync(dataDir)) {
            await fsPromises.mkdir(dataDir);
            console.log(`Created data directory at ${dataDir}`);
        }

        if (!fs.existsSync(usersFilePath)) {
            await fsPromises.writeFile(usersFilePath, JSON.stringify({}, null, 2));
            console.log(`Created empty users file at ${usersFilePath}`);
        }

        if (!fs.existsSync(logsFilePath)) {
            await fsPromises.writeFile(logsFilePath, JSON.stringify([], null, 2));
            console.log(`Created empty logs file at ${logsFilePath}`);
        }

        // Load users from users.json
        const usersData = await fsPromises.readFile(usersFilePath, 'utf-8');
        users = JSON.parse(usersData);
        console.log("Users data loaded successfully.");
    } catch (err) {
        console.error("Initialization error:", err);
    }
}

initializeFiles();

// Save users back to file asynchronously
async function saveUsers() {
    try {
        await fsPromises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error saving users.json:", err);
    }
}

// Log user activity with timestamp
async function logActivity(email, action) {
    try {
        let logs = [];
        if (fs.existsSync(logsFilePath)) {
            const logData = await fsPromises.readFile(logsFilePath, 'utf-8');
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
        logs.push({ email: email || 'N/A', action, timestamp: new Date().toISOString() });
        await fsPromises.writeFile(logsFilePath, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error("Error logging activity:", err);
    }
}

// Helper to add a question to a DOCX document
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

// Helper to add an option (MCQ) to a DOCX document
function addOptionParagraph(docChildren, text) {
    docChildren.push(
        new Paragraph({
            children: [ new TextRun({ text, size: 24 }) ],
            indent: { left: 720 },
            spacing: { after: 40 }
        })
    );
}

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
        await logActivity(email, 'Login Success');
        res.status(200).json({ message: 'Login successful', email });
    } else {
        await logActivity(email, 'Login Failed');
		  
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Generate Questions Route

const openRouterHeaders = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    // Recommended headers by OpenRouter
    'HTTP-Referer': config.FRONTEND_URL, 
    'X-Title': 'AI-RIVU QPG', // Replace with your app name
};

app.post('/generate', async (req, res) => {
    const {
        curriculum,
        className,
        subject,
        topic,
				 
        difficultySplit,
        timeDuration, // This is the value (e.g., 60)
        additionalConditions,
        questionDetails, // Use this: [{ type: 'MCQ', num: 5, marks: 1 }, ...]
        answerKeyFormat
    } = req.body;
    const email = req.headers['useremail'] || 'anonymous'; // Get email from header


    // Basic Input Validation
    if (!curriculum || !className || !subject || !questionDetails || !Array.isArray(questionDetails) || questionDetails.length === 0) {
        await logActivity(email, 'Generate Failed - Missing Parameters');
        return res.status(400).json({ message: 'Missing required generation parameters.' });
		 
    }

    try {
        // --- Build Dynamic Prompt ---
        let prompt = `You are an expert school examination paper setter. Create a formal question paper with the following exact specifications:\n\n`;
        prompt += `**Core Details:**\n`;
        prompt += `- Curriculum Board: ${curriculum}\n`;
        prompt += `- Class/Grade: ${className}\n`;
        prompt += `- Subject: ${subject}\n`;
        if (topic && topic.trim() !== '') prompt += `- Specific Topics: ${topic}\n`;
        prompt += `- Total Time Allowed: ${timeDuration} minutes\n\n`; // Use the numeric value

        prompt += `**Paper Structure & Content:**\n`;
        let sectionCounter = 0;
        let requiresConsecutiveNumbering = false; // Flag to decide numbering style
        questionDetails.forEach(detail => {
            sectionCounter++;
            const sectionLetter = String.fromCharCode(64 + sectionCounter); // A, B, C...
            prompt += `- Section ${sectionLetter}: ${detail.type} Questions\n`;
            prompt += `  - Generate exactly ${detail.num} question(s) of the '${detail.type}' type.\n`;
            if (detail.marks > 0) {
                prompt += `  - Each question in this section should carry ${detail.marks} mark(s).\n`;
            } else {
                 prompt += `  - Assign appropriate marks per question for this section based on type and class level.\n`;
            }
            if (detail.num > 1) requiresConsecutiveNumbering = true; // If any section has >1 question, consecutive numbering is likely needed
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
        prompt += `- Clearly label each section (e.g., "Section A: Multiple Choice Questions (Marks: ...)") and indicate total marks for the section if possible.\n`;
        
	prompt += `- Number questions starting from 1 **within each section** \
	      (restart numbering for every new section).\n`;
	    
        prompt += `- Ensure questions are unambiguous and appropriate for the specified curriculum, class, subject, and topics.\n`;
        prompt += `- Adjust question complexity and expected answer length based on the ${timeDuration} minute time limit.\n`;
        prompt += `- Avoid conversational text or unnecessary explanations.\n`;
        if (additionalConditions && additionalConditions.trim() !== '') {
            prompt += `- Adhere to these additional conditions: ${additionalConditions}\n`;
        }
        prompt += `\n`;

        prompt += `**Answer Key Instructions:**\n`;
        prompt += `- After the last question, insert a clear separator (like '---' or just 2 blank lines).\n`;
        prompt += `- Provide a separate Answer Key section titled clearly (e.g., "**Answer Key**").\n`;
        prompt += `- The answer key should list answers corresponding **exactly** to each question number generated above.\n`;
        prompt += `- Format the answers according to the requested style: '${answerKeyFormat}'.\n`;
        prompt += `  - For 'Brief': Provide only the direct answer (e.g., 'C', 'Paris', 'True').\n`;
        prompt += `  - For 'Detailed': Provide the answer with a short explanation or steps where appropriate.\n`;
        prompt += `- Ensure answer key numbering **precisely matches** the question numbering used in the paper.\n\n`;

        prompt += `Generate the complete question paper followed by the answer key based strictly on these instructions. Ensure the question numbering style (consecutive or section-restarted) is consistent between the questions and the answer key.`;
																		
																							 

        // --- Call OpenRouter API ---
        console.log(`Sending prompt to OpenRouter for ${subject}, ${className}...`);
						  
        const requestData = {
            model: "openai/gpt-3.5-turbo-1106", // Specify a potentially better/newer model if available
            messages: [{
                role: "user",
                content: prompt
            }],
             max_tokens: 3000, // Increase max tokens if papers get cut off
             temperature: 0.6, // Adjust temperature for creativity vs predictability
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestData, { headers: openRouterHeaders });
																		

        if (!response.data || !response.data.choices || response.data.choices.length === 0 || !response.data.choices[0].message || !response.data.choices[0].message.content) {
             throw new Error("Invalid response structure received from OpenRouter.");
        }

        const generatedQuestions = response.data.choices[0].message.content;
        const usage = response.data.usage || { total_tokens: 0 }; // Get token usage

        console.log(`Received response from OpenRouter. Tokens used: ${usage.total_tokens}`);
	
        // Update User Token Usage
        if (email !== 'anonymous' && users[email]) {
            users[email].tokens_used = (users[email].tokens_used || 0) + usage.total_tokens;
            saveUsers();
        }
        await logActivity(email, `Generated Questions - Subject: ${subject}, Class: ${className}, Tokens: ${usage.total_tokens}`);

        res.json({ questions: generatedQuestions });

    } catch (error) {
        console.error("Error during question generation:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        await logActivity(email, `Generate Failed - Error: ${error.message}`);
        res.status(error.response?.status || 500).json({ message: `Error generating questions: ${error.response?.data?.error?.message || error.message}` });
    }
});


// Download DOCX Route
app.post('/download-docx', async (req, res) => {
    const { subject, metadata, sections, answerKey } = req.body;
    const email = req.headers['useremail'] || 'anonymous';

    // --- Input Validation ---
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        await logActivity(email, 'Download Failed - Missing Subject');
        return res.status(400).json({ message: "Invalid input: Subject is required." });
    }
    if (!metadata || typeof metadata !== 'object') {
        await logActivity(email, 'Download Failed - Missing Metadata');
        return res.status(400).json({ message: "Invalid input: Metadata is required." });
    }
     if (!sections || !Array.isArray(sections)) {
        await logActivity(email, 'Download Failed - Invalid Sections');
        return res.status(400).json({ message: "Invalid input: Sections must be an array." });
    }
    if (!answerKey || !Array.isArray(answerKey)) {
        await logActivity(email, 'Download Failed - Invalid Answer Key');
        return res.status(400).json({ message: "Invalid input: Answer Key must be an array." });
    }


    console.log(`Generating DOCX for Subject: ${subject}, Class: ${metadata.className}`);

    try {
        const docChildren = [];

        // --- Header Section ---
        docChildren.push(
            new Paragraph({ text: 'School Name: ___________________________', style: "headerStyle", alignment: AlignmentType.CENTER, spacing: { after: 100 } })
        );
        docChildren.push(new Paragraph({ border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }, spacing: { after: 300 } }));
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: `Class: ${metadata.className || 'N/A'}`, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER, spacing: { after: 50 }
        }));
        docChildren.push(new Paragraph({
             children: [new TextRun({ text: `Subject: ${subject}`, bold: true, size: 28 })],
             alignment: AlignmentType.CENTER, spacing: { after: 200 }
         }));
        const headerTable = new Table({
             width: { size: 100, type: WidthType.PERCENTAGE },
             borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
             rows: [
                 new TableRow({
                     children: [
                         new TableCell({
                             width: { size: 50, type: WidthType.PERCENTAGE },
                             children: [new Paragraph({ children: [new TextRun({ text: `Total Marks: ${metadata.totalMarks || '___'}`, size: 24 })] })],
                             borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                         }),
                         new TableCell({
                             width: { size: 50, type: WidthType.PERCENTAGE },
                             children: [
				    new Paragraph({
				        alignment: AlignmentType.RIGHT,
				        children: [new TextRun({ text: `Time: ${metadata.timeDuration || '___'}`, size: 24 })]
				    })
				],
                              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                         }),
                     ],
                 }),
             ],
         });
        docChildren.push(headerTable);
        docChildren.push(new Paragraph({ border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }, spacing: { after: 400 } }));

        // --- Question Sections ---

	sections.forEach(sec => {
	    // Section title
	    docChildren.push(
	        new Paragraph({
	            text: sec.title,
	            heading: HeadingLevel.HEADING_2,
	            spacing: { before: 200, after: 150 }
	        })
	    );
	
	    let localNum = 1;        // restart numbering per section
	    sec.questions.forEach(qBlock => {
	        const lines = qBlock.split('\n').filter(Boolean);
	
	        // first line → stem
	        addQuestionParagraph(docChildren, localNum++, lines[0]);
	
	        // remaining lines that start with A) / B) / etc. → options
	        lines.slice(1).forEach(opt => addOptionParagraph(docChildren, opt));
	    });
	
	    // blank line between sections
	    docChildren.push(new Paragraph({ text: '' }));
	});

	    
	// --- Answer Key ---
	docChildren.push(new Paragraph({ children: [ new PageBreak() ] }));
	docChildren.push(new Paragraph({
	    text: "Answer Key",
	    heading: HeadingLevel.HEADING_1,
	    alignment: AlignmentType.CENTER,
	    spacing: { before: 400, after: 200 }
	}));
	
	answerKey.forEach((ans, idx) => {
	    const clean = ans.replace(/^\d+\.?\s*/, '');    // drop any existing numbers
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


											 

        // --- Assemble Document ---
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
                        margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 1 inch margins
                    },
                },
                children: docChildren,
            }]
        });
														
			   

        // --- Generate Buffer & Send Response ---
        const buffer = await Packer.toBuffer(doc);

        const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeClassName = metadata.className ? metadata.className.replace(/\s+/g, '_') : 'unknown_class';
        const fileName = `Question_Paper_${safeSubject}_${safeClassName}_${Date.now()}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buffer.length);
        await logActivity(email, `Download Success - Subject: ${subject}, Class: ${metadata.className}`);
        res.send(buffer);

														 
																			 
																											 
					 
    } catch (error) {
        console.error(`Error generating .docx for ${subject}, ${metadata.className}:`, error);
        await logActivity(email, `Download Failed DOCX - Error: ${error.message}`);
        if (!res.headersSent) {
             res.status(500).json({ message: `Failed to generate Word file on server: ${error.message}` });
        }
    }
});

// --- Error Handling Middleware 
app.use( async (err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    await logActivity('SYSTEM', `Unhandled Error - ${err.message}`);
    if (!res.headersSent) {
        res.status(500).send('Something broke!');
    }
});


// --- Start Server ---
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing requests from: ${config.FRONTEND_URL}`);
    await logActivity('SYSTEM', 'Server Started');
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
	logActivity('SYSTEM', 'Server Shutdown Signal').then(() => {
    // Perform cleanup if needed (e.g., close database connections)
    // Give time for existing requests to finish?
    process.exit(0);
});
});
process.on('SIGTERM',  () => {
    console.log('SIGTERM signal received: closing HTTP server');
     logActivity('SYSTEM', 'Server Termination Signal').then(() => {
    process.exit(0);
});
});
