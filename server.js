
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path'); // Recommended for handling file paths
const axios = require('axios');
// Ensure all necessary docx components are imported
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } = require('docx');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine base directory for data files
const dataDir = path.join(__dirname, 'data'); // Assuming data files are in a 'data' subdirectory
const usersFilePath = path.join(dataDir, 'users.json');
const logsFilePath = path.join(dataDir, 'activity_logs.json');

// Ensure data directory and files exist
if (!fs.existsSync(dataDir)) {
    try {
        fs.mkdirSync(dataDir);
        console.log(`Created data directory at ${dataDir}`);
    } catch (err) {
        console.error(`Error creating data directory: ${err}`);
        // Decide if this is fatal
    }
}
if (!fs.existsSync(usersFilePath)) {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify({}, null, 2)); // Start with empty users object
        console.log(`Created empty users file at ${usersFilePath}`);
    } catch (err) {
        console.error(`Error creating users file: ${err}`);
    }
}
if (!fs.existsSync(logsFilePath)) {
     try {
        fs.writeFileSync(logsFilePath, JSON.stringify([], null, 2)); // Start with empty logs array
        console.log(`Created empty logs file at ${logsFilePath}`);
    } catch (err) {
         console.error(`Error creating logs file: ${err}`);
    }
}


// CORS Configuration
const corsOptions = {
    // Allow requests from your specific Vercel frontend URL
    // Ensure this matches EXACTLY including https://
    origin: 'https://ai-rivu-vercel-frontend.vercel.app',
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow cookies if needed later
    optionsSuccessStatus: 204 // For preflight requests
};
app.use(cors(corsOptions));
						   

// Handle Preflight Requests explicitly for all routes
app.options('*', cors(corsOptions));

app.use(bodyParser.json({ limit: '10mb' })); // Increase payload size limit if needed
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));


// --- Environment Variable Check ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.error("FATAL ERROR: OPENROUTER_API_KEY environment variable is not set.");
    // process.exit(1); // Optionally exit if API key is crucial
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
    // Handle error appropriately, maybe exit or use default empty object
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

function logActivity(email, action) {
    try {
        let logs = [];
        // Read existing logs carefully
        if (fs.existsSync(logsFilePath)) {
            const logData = fs.readFileSync(logsFilePath, 'utf-8');
             try {
                logs = JSON.parse(logData);
                 if (!Array.isArray(logs)) { // Ensure it's an array
                    console.warn("Logs file was not an array, resetting.");
                    logs = [];
                 }
             } catch (parseErr) {
                console.error("Error parsing logs file, resetting logs:", parseErr);
                logs = []; // Reset if parsing fails
             }
        }
        logs.push({ email: email || 'N/A', action, timestamp: new Date().toISOString() });
        fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error("Error logging activity:", err);
    }
}

// --- Routes ---

// Basic Health Check Route
app.get('/', (req, res) => {
    res.status(200).send('AI-RIVU Backend is running.');
});


// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
							

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users[email];

    if (user && user.password === password) {
        logActivity(email, 'Login Success');
        res.status(200).json({ message: 'Login successful', email });
    } else {
        logActivity(email, 'Login Failed');
		  
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Generate Questions Route

const openRouterHeaders = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    // Recommended headers by OpenRouter
    'HTTP-Referer': 'https://ai-rivu-vercel-frontend.vercel.app', // Replace with your site URL
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
        logActivity(email, 'Generate Failed - Missing Parameters');
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
        // Instruct AI on numbering based on requiresConsecutiveNumbering flag
        if (requiresConsecutiveNumbering) {
             prompt += `- Number questions **consecutively** throughout the entire paper (e.g., Section A: 1, 2; Section B: 3, 4, 5...). DO NOT restart numbering for each section.\n`;
        } else {
             prompt += `- Number questions starting from 1 within each section (e.g., Section A: 1; Section B: 1...). Restart numbering for each section.\n`;
        }
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
        logActivity(email, `Generated Questions - Subject: ${subject}, Class: ${className}, Tokens: ${usage.total_tokens}`);

        res.json({ questions: generatedQuestions });

    } catch (error) {
        console.error("Error during question generation:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        logActivity(email, `Generate Failed - Error: ${error.message}`);
        res.status(error.response?.status || 500).json({ message: `Error generating questions: ${error.response?.data?.error?.message || error.message}` });
    }
});


// Download DOCX Route
app.post('/download-docx', async (req, res) => {
    const { subject, metadata, sections, answerKey } = req.body;
    const email = req.headers['useremail'] || 'anonymous';

    // --- Input Validation ---
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        logActivity(email, 'Download Failed - Missing Subject');
        return res.status(400).json({ message: "Invalid input: Subject is required." });
    }
    if (!metadata || typeof metadata !== 'object') {
        logActivity(email, 'Download Failed - Missing Metadata');
        return res.status(400).json({ message: "Invalid input: Metadata is required." });
    }
     if (!sections || !Array.isArray(sections)) {
        logActivity(email, 'Download Failed - Invalid Sections');
        return res.status(400).json({ message: "Invalid input: Sections must be an array." });
    }
    if (!answerKey || !Array.isArray(answerKey)) {
        logActivity(email, 'Download Failed - Invalid Answer Key');
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
                             children: [new Paragraph({ text: `Time: ${metadata.timeDuration || '___'}`, size: 24, alignment: AlignmentType.RIGHT })],
                              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                         }),
                     ],
                 }),
             ],
         });
        docChildren.push(headerTable);
        docChildren.push(new Paragraph({ border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }, spacing: { after: 400 } }));

        // --- Question Sections ---
        let questionCounter = 0; // For potential consecutive numbering if parsing fails
        sections.forEach(section => {
            if (section.title) {
                docChildren.push(new Paragraph({
                    text: section.title,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 150 },
                }));
            }
             if (Array.isArray(section.questions)) {
                 section.questions.forEach((q) => { // No idx needed here
                     questionCounter++;
                     // Split question text by newlines potentially added during parsing
                     const questionLines = q.split('\n');
                     questionLines.forEach((line, lineIdx) => {
                         // Basic check if line already starts with numbering (e.g., "1.", "a)")
                         const hasNumbering = /^\s*(\d+\.|\(?[a-z]\)|\(?[ivx]+\))\s+/i.test(line);
                         let textToAdd = line;
                         // Optional: If line DOESN'T start with numbering AND it's the first line,
                         // you might prepend numbering based on questionCounter as a fallback.
                         // However, relying on AI/frontend parsing is preferred.
                         // if (lineIdx === 0 && !hasNumbering) {
                         //     textToAdd = `${questionCounter}. ${line}`;
                         // }

											 
                         docChildren.push(new Paragraph({
                             children: [new TextRun({ text: textToAdd, font: "Calibri", size: 24 })],
                             spacing: { after: 80 },
                             indent: { left: lineIdx === 0 ? 0 : 720 }, // Indent subsequent lines slightly
                         }));
                     });
                 });
             }
            docChildren.push(new Paragraph(" ")); // Spacing between sections
        });


         // --- Answer Key Section (on new page) ---
         if (answerKey && answerKey.length > 0) {
            docChildren.push(new Paragraph({ children: [new PageBreak()] })); // Page break before answer key
																																																																	
					 
							  
							 
								   
																	  
             docChildren.push(new Paragraph({
                 text: "Answer Key",
                 heading: HeadingLevel.HEADING_1, // Main heading for Answer Key
								   
																	  
												
																				  
                 alignment: AlignmentType.CENTER,
                 spacing: { before: 400, after: 200 }
             }));
             // **** THIS IS THE CORRECTED PART ****
             // Loop through the answer key array received from the frontend
             answerKey.forEach((ans) => { // Use forEach, index (idx) not used for numbering
                 const answerLines = ans.split('\n'); // Handle multi-line answers correctly
                  answerLines.forEach((line) => { // Process each line of the answer
                      docChildren.push(new Paragraph({
                          children: [new TextRun({
                              text: line, // <-- USE THE TEXT DIRECTLY FROM THE ARRAY ELEMENT
                                          // It already contains the numbering from the AI/frontend parsing
                              font: "Calibri", // Set your desired font
                              size: 22 // Set your desired font size (11pt)
                          })],
                          spacing: { after: 60 }, // Adjust spacing as needed
                      }));
                  });
             });
             // **** END OF CORRECTION ****
         }
			   

											 

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
        logActivity(email, `Download Success - Subject: ${subject}, Class: ${metadata.className}`);
        res.send(buffer);

														 
																			 
																											 
					 
    } catch (error) {
        console.error(`Error generating .docx for ${subject}, ${metadata.className}:`, error);
        logActivity(email, `Download Failed DOCX - Error: ${error.message}`);
        if (!res.headersSent) {
             res.status(500).json({ message: `Failed to generate Word file on server: ${error.message}` });
        }
    }
});

// --- Error Handling Middleware (Basic Example) ---
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    logActivity('SYSTEM', `Unhandled Error - ${err.message}`);
    if (!res.headersSent) {
        res.status(500).send('Something broke!');
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing requests from: ${corsOptions.origin}`);
    logActivity('SYSTEM', 'Server Started');
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    logActivity('SYSTEM', 'Server Shutdown Signal');
    // Perform cleanup if needed (e.g., close database connections)
    // Give time for existing requests to finish?
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    logActivity('SYSTEM', 'Server Termination Signal');
    process.exit(0);
});
