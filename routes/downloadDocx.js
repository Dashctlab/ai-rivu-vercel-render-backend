// routes/downloadDocx.js - UPDATED with teacher-friendly error messages
const express = require('express');
const router = express.Router();

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, TabStopPosition, TabStopType } = require('docx');
const logActivity = require('../utils/enhancedLogger');
const { addQuestionParagraph, addOptionParagraph } = require('../utils/docxHelpers');
const { getErrorMessage } = require('../utils/errorMessages'); // Import centralized error messages

/**
 * Enhanced download validation to prevent server crashes
 */
router.post('/', async (req, res) => {
    const email = req.headers['useremail'] || 'anonymous';
    const downloadStartTime = new Date().toISOString();

    try {
        // Comprehensive validation of all required fields
        const validationResult = validateDownloadData(req.body);
        if (!validationResult.isValid) {
            await logActivity(email, 'Download Failed - Validation Error', {
                reason: validationResult.error,
                errorCode: validationResult.errorCode,
                providedData: {
                    hasSubject: !!req.body.subject,
                    hasMetadata: !!req.body.metadata,
                    hasSections: !!req.body.sections,
                    hasAnswerKey: !!req.body.answerKey,
                    sectionsType: Array.isArray(req.body.sections) ? 'array' : typeof req.body.sections,
                    answerKeyType: Array.isArray(req.body.answerKey) ? 'array' : typeof req.body.answerKey
                },
                requestTime: downloadStartTime,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(400).json({ 
                message: getErrorMessage(validationResult.errorCode),
                error: validationResult.errorCode,
                errorCode: validationResult.errorCode
            });
        }

        // Safely extract validated data
        const { subject, metadata, sections, answerKey } = req.body;

        await logActivity(email, 'Download Started', {
            subject,
            className: metadata.className,
            totalMarks: metadata.totalMarks,
            timeDuration: metadata.timeDuration,
            sectionsCount: sections.length,
            answerKeyLength: answerKey.length,
            startTime: downloadStartTime
        });

        const docChildren = [];

        // ========== ENHANCED HEADER SECTION ==========
        
        // School Name Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: 'School Name: ________________________________',
                        size: 24,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                border: {
                    bottom: {
                        color: '000000',
                        space: 1,
                        value: 'single',
                        size: 6
                    }
                }
            })
        );

        // Subject Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: `SUBJECT: ${subject.toUpperCase()}`,
                        bold: true,
                        size: 32,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 100 }
            })
        );

        // Class Header
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: `CLASS: ${metadata.className || 'N/A'}`,
                        bold: true,
                        size: 28,
                        font: 'Times New Roman'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
            })
        );

        // Proper header table with validated marks
        const headerInfoTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
                insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '000000' }
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 33, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: 'Maximum Marks',
                                            bold: true,
                                            size: 22,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: `${metadata.totalMarks || '___'}`,
                                            size: 28,
                                            bold: true,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 100 }
                                })
                            ],
                            margins: { top: 200, bottom: 200, left: 100, right: 100 }
                        }),
                        new TableCell({
                            width: { size: 34, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: 'Time Allowed',
                                            bold: true,
                                            size: 22,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: `${metadata.timeDuration || '___'}`,
                                            size: 28,
                                            bold: true,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 100 }
                                })
                            ],
                            margins: { top: 200, bottom: 200, left: 100, right: 100 }
                        }),
                        new TableCell({
                            width: { size: 33, type: WidthType.PERCENTAGE },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: 'Date',
                                            bold: true,
                                            size: 22,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: '___________',
                                            size: 24,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 100 }
                                })
                            ],
                            margins: { top: 200, bottom: 200, left: 100, right: 100 }
                        })
                    ]
                })
            ]
        });

        docChildren.push(headerInfoTable);

        // Instructions Section
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: 'GENERAL INSTRUCTIONS:',
                        bold: true,
                        size: 24,
                        font: 'Times New Roman'
                    })
                ],
                spacing: { before: 400, after: 200 }
            })
        );

        const instructions = [
            '• Read all questions carefully before answering.',
            '• All questions are compulsory unless otherwise mentioned.',
            '• Write your answers neatly and legibly.',
            '• Use diagrams wherever necessary.'
        ];

        instructions.forEach(instruction => {
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: instruction,
                            size: 22,
                            font: 'Times New Roman'
                        })
                    ],
                    spacing: { after: 100 },
                    indent: { left: 360 }
                })
            );
        });

        // Separator line
        docChildren.push(
            new Paragraph({
                border: {
                    bottom: {
                        color: '000000',
                        space: 1,
                        value: 'single',
                        size: 6
                    }
                },
                spacing: { before: 300, after: 400 }
            })
        );

        // ========== IMPROVED QUESTION SECTIONS WITH SAFE PROCESSING ==========
        let totalQuestions = 0;
        
        // Safe section processing with validation
        sections.forEach((sec, secIndex) => {
            try {
                // Skip exam information section in output
                if (!sec || !sec.title || sec.title === 'Exam Information') return;
                
                // Section Header
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ 
                                text: sec.title.toUpperCase(),
                                bold: true,
                                size: 26,
                                font: 'Times New Roman'
                            })
                        ],
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 250 },
                        alignment: AlignmentType.LEFT,
                        border: {
                            bottom: {
                                color: '000000',
                                space: 1,
                                value: 'single',
                                size: 3
                            }
                        }
                    })
                );

                let localNum = 1;
                
                // Safe question processing
                if (sec.questions && Array.isArray(sec.questions)) {
                    sec.questions.forEach(qBlock => {
                        try {
                            // Validate question block
                            if (!qBlock || typeof qBlock !== 'string') {
                                console.warn(`Invalid question block in section ${sec.title}:`, qBlock);
                                return;
                            }

                            const lines = qBlock.split('\n').filter(Boolean);
                            
                            if (lines.length === 0) return;

                            // Better question formatting with marks on same line
                            const firstLine = lines[0];
                            const remainingLines = lines.slice(1);
                            
                            // Try to extract marks from the question text
                            const marksMatch = firstLine.match(/\((\d+(?:\.\d+)?)\s*marks?\)/i);
                            let questionText = firstLine;
                            let marksText = '';
                            
                            if (marksMatch) {
                                questionText = firstLine.replace(/\((\d+(?:\.\d+)?)\s*marks?\)/i, '').trim();
                                marksText = `(${marksMatch[1]} marks)`;
                            }
                            
                            // Main question with marks on the same line, right-aligned
                            docChildren.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({ 
                                            text: `${localNum}. ${questionText}`,
                                            bold: false,
                                            size: 24,
                                            font: 'Times New Roman'
                                        }),
                                        new TextRun({ 
                                            text: `\t${marksText}`, // Tab to right-align marks
                                            bold: true,
                                            size: 20,
                                            font: 'Times New Roman'
                                        })
                                    ],
                                    spacing: { before: 200, after: 120 },
                                    indent: { left: 0 },
                                    tabStops: [
                                        {
                                            type: TabStopType.RIGHT,
                                            position: 9000 // Right-align marks
                                        }
                                    ]
                                })
                            );

                            // Options/continuation with proper indentation
                            remainingLines.forEach(opt => {
                                if (opt.trim()) {
                                    docChildren.push(
                                        new Paragraph({
                                            children: [
                                                new TextRun({ 
                                                    text: opt.trim(),
                                                    size: 22,
                                                    font: 'Times New Roman'
                                                })
                                            ],
                                            indent: { left: 720 },
                                            spacing: { after: 80 }
                                        })
                                    );
                                }
                            });

                            localNum++;
                            totalQuestions++;
                            
                        } catch (questionError) {
                            console.error(`Error processing question in section ${sec.title}:`, questionError);
                            // Continue processing other questions
                        }
                    });
                } else {
                    console.warn(`Section ${sec.title} has invalid questions array:`, sec.questions);
                }

                // Add space between sections
                if (secIndex < sections.length - 1) {
                    docChildren.push(
                        new Paragraph({
                            text: '',
                            spacing: { after: 300 }
                        })
                    );
                }
                
            } catch (sectionError) {
                console.error(`Error processing section ${secIndex}:`, sectionError);
                // Continue processing other sections
            }
        });

        // ========== ENHANCED ANSWER KEY SECTION WITH SAFE PROCESSING ==========
        docChildren.push(new Paragraph({ children: [new PageBreak()] })); // NEW PAGE
        
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: 'ANSWER KEY',
                        bold: true,
                        size: 32,
                        font: 'Times New Roman'
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
                border: {
                    bottom: {
                        color: '000000',
                        space: 1,
                        value: 'double',
                        size: 6
                    }
                }
            })
        );

        // Safe answer key processing
        answerKey.forEach((ans, idx) => {
            try {
                // Validate answer entry
                if (!ans || typeof ans !== 'string') {
                    console.warn(`Invalid answer at index ${idx}:`, ans);
                    return;
                }

                // Clean the answer text - remove any existing numbering
                const cleanAnswer = ans.replace(/^\d+[\.\)]\s*/, '').replace(/^answer\s*:?\s*/i, '').trim();
                
                if (cleanAnswer) {
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: `${idx + 1}. `,
                                    bold: true,
                                    size: 24,
                                    font: 'Times New Roman'
                                }),
                                new TextRun({ 
                                    text: cleanAnswer,
                                    size: 24,
                                    font: 'Times New Roman'
                                })
                            ],
                            spacing: { after: 120 },
                            indent: { left: 360 }
                        })
                    );
                }
            } catch (answerError) {
                console.error(`Error processing answer ${idx}:`, answerError);
                // Continue processing other answers
            }
        });

        // ========== DOCUMENT ASSEMBLY ==========
        const doc = new Document({
            creator: "AI-RIVU Question Paper Generator",
            title: `Question Paper - ${subject} - ${metadata.className}`,
            description: `Generated question paper for ${subject}, ${metadata.className}`,
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1080,
                            bottom: 1440,
                            left: 1080
                        },
                        size: {
                            width: 11906,
                            height: 16838
                        }
                    }
                },
                children: docChildren
            }]
        });
        
        const buffer = await Packer.toBuffer(doc);
        const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeClassName = metadata.className?.replace(/\s+/g, '_') || 'unknown_class';
        const fileName = `Question_Paper_${safeSubject}_${safeClassName}_${Date.now()}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buffer.length);

        // Enhanced success logging
        await logActivity(email, 'Download Success - Subject: ' + subject + ', Class: ' + metadata.className, {
            subject,
            class: metadata.className,
            totalMarks: metadata.totalMarks,
            timeDuration: metadata.timeDuration,
            fileName,
            fileSize: buffer.length,
            totalQuestions,
            sectionsCount: sections.length,
            answerKeyLength: answerKey.length,
            downloadTime: new Date().toISOString(),
            processingTimeMs: Date.now() - new Date(downloadStartTime).getTime(),
            successful: true
        });

        res.send(buffer);

    } catch (error) {
        console.error(`DOCX Generation Error:`, error);
        
        await logActivity(email, 'Download Failed DOCX - Error: ' + error.message, {
            subject: req.body?.subject,
            class: req.body?.metadata?.className,
            errorType: 'DOCX_GENERATION_ERROR',
            errorMessage: error.message,
            errorStack: error.stack,
            errorTime: new Date().toISOString(),
            requestBody: {
                hasSubject: !!req.body?.subject,
                hasMetadata: !!req.body?.metadata,
                hasSections: !!req.body?.sections,
                hasAnswerKey: !!req.body?.answerKey
            }
        });

        if (!res.headersSent) {
            res.status(500).json({ 
                message: getErrorMessage('DOWNLOAD_FAILED'),
                error: 'DOWNLOAD_FAILED',
                errorCode: 'DOWNLOAD_FAILED'
            });
        }
    }
});

/**
 * UPDATED: Comprehensive download data validation function with teacher-friendly error codes
 */
function validateDownloadData(body) {
    // Check if body exists
    if (!body || typeof body !== 'object') {
        return {
            isValid: false,
            error: 'Request body is missing or invalid',
            errorCode: 'NO_PAPER_TO_DOWNLOAD'
        };
    }

    const { subject, metadata, sections, answerKey } = body;

    // 1. Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        return {
            isValid: false,
            error: 'Subject is missing or invalid',
            errorCode: 'NO_PAPER_TO_DOWNLOAD'
        };
    }

    if (subject.length > 200) {
        return {
            isValid: false,
            error: 'Subject is too long',
            errorCode: 'PAPER_TOO_COMPLEX'
        };
    }

    // 2. Validate metadata
    if (!metadata || typeof metadata !== 'object') {
        return {
            isValid: false,
            error: 'Metadata is missing or invalid',
            errorCode: 'PAPER_DATA_INCOMPLETE'
        };
    }

    // Required metadata fields
    const requiredMetadataFields = ['curriculum', 'className', 'totalMarks', 'timeDuration'];
    for (const field of requiredMetadataFields) {
        if (!metadata[field]) {
            return {
                isValid: false,
                error: `Metadata field '${field}' is missing`,
                errorCode: 'PAPER_DATA_INCOMPLETE'
            };
        }
    }

    // Validate totalMarks format
    const totalMarks = metadata.totalMarks;
    if (typeof totalMarks === 'string') {
        if (!/^\d+(\.\d{1})?$/.test(totalMarks)) {
            return {
                isValid: false,
                error: 'Invalid totalMarks format',
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }
    } else if (typeof totalMarks === 'number') {
        if (totalMarks < 0 || totalMarks > 1000) {
            return {
                isValid: false,
                error: 'totalMarks out of range',
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }
    } else {
        return {
            isValid: false,
            error: 'totalMarks must be string or number',
            errorCode: 'PAPER_DATA_CORRUPTED'
        };
    }

    // 3. Validate sections
    if (!sections) {
        return {
            isValid: false,
            error: 'Sections array is missing',
            errorCode: 'NO_QUESTIONS_FOUND'
        };
    }

    if (!Array.isArray(sections)) {
        return {
            isValid: false,
            error: 'Sections must be an array',
            errorCode: 'PAPER_DATA_CORRUPTED'
        };
    }

    if (sections.length === 0) {
        return {
            isValid: false,
            error: 'Sections array is empty',
            errorCode: 'NO_QUESTIONS_FOUND'
        };
    }

    if (sections.length > 20) {
        return {
            isValid: false,
            error: 'Too many sections',
            errorCode: 'PAPER_TOO_COMPLEX'
        };
    }

    // Validate each section
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        if (!section || typeof section !== 'object') {
            return {
                isValid: false,
                error: `Section ${i} is invalid`,
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }

        if (!section.title || typeof section.title !== 'string') {
            return {
                isValid: false,
                error: `Section ${i} title is missing or invalid`,
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }

        if (section.title.length > 200) {
            return {
                isValid: false,
                error: `Section ${i} title is too long`,
                errorCode: 'PAPER_TOO_COMPLEX'
            };
        }

        if (!section.questions) {
            return {
                isValid: false,
                error: `Section ${i} questions are missing`,
                errorCode: 'NO_QUESTIONS_FOUND'
            };
        }

        if (!Array.isArray(section.questions)) {
            return {
                isValid: false,
                error: `Section ${i} questions must be an array`,
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }

        if (section.questions.length > 50) {
            return {
                isValid: false,
                error: `Section ${i} has too many questions`,
                errorCode: 'PAPER_TOO_COMPLEX'
            };
        }

        // Validate each question in the section
        for (let j = 0; j < section.questions.length; j++) {
            const question = section.questions[j];
            
            if (question !== null && question !== undefined && typeof question !== 'string') {
                return {
                    isValid: false,
                    error: `Section ${i}, question ${j} must be a string`,
                    errorCode: 'PAPER_DATA_CORRUPTED'
                };
            }

            if (typeof question === 'string' && question.length > 5000) {
                return {
                    isValid: false,
                    error: `Section ${i}, question ${j} is too long`,
                    errorCode: 'PAPER_TOO_COMPLEX'
                };
            }
        }
    }

    // 4. Validate answerKey
    if (!answerKey) {
        return {
            isValid: false,
            error: 'Answer key is missing',
            errorCode: 'NO_ANSWER_KEY_FOUND'
        };
    }

    if (!Array.isArray(answerKey)) {
        return {
            isValid: false,
            error: 'Answer key must be an array',
            errorCode: 'PAPER_DATA_CORRUPTED'
        };
    }

    if (answerKey.length > 100) {
        return {
            isValid: false,
            error: 'Answer key has too many entries',
            errorCode: 'PAPER_TOO_COMPLEX'
        };
    }

    // Validate each answer
    for (let i = 0; i < answerKey.length; i++) {
        const answer = answerKey[i];
        
        if (answer !== null && answer !== undefined && typeof answer !== 'string') {
            return {
                isValid: false,
                error: `Answer ${i} must be a string`,
                errorCode: 'PAPER_DATA_CORRUPTED'
            };
        }

        if (typeof answer === 'string' && answer.length > 1000) {
            return {
                isValid: false,
                error: `Answer ${i} is too long`,
                errorCode: 'PAPER_TOO_COMPLEX'
            };
        }
    }

    // All validations passed
    return {
        isValid: true,
        error: null,
        errorCode: null
    };
}

module.exports = router;
