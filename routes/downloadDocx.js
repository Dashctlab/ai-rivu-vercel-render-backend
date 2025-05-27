// routes/downloadDocx.js - Enhanced formatting version
const express = require('express');
const router = express.Router();

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, TabStopPosition, TabStopType } = require('docx');
const logActivity = require('../utils/enhancedLogger');
const { addQuestionParagraph, addOptionParagraph } = require('../utils/docxHelpers');

/**
 * Enhanced DOCX generation with better formatting
 */
router.post('/', async (req, res) => {
    const { subject, metadata, sections, answerKey } = req.body;
    const email = req.headers['useremail'] || 'anonymous';

  // User-friendly validation with better error messages
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        await logActivity(email, 'Download Failed - Missing Subject', {
            reason: 'Subject is required',
            providedSubject: subject,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Please generate a question paper first before downloading." });
    }
    
    if (!metadata || typeof metadata !== 'object') {
        await logActivity(email, 'Download Failed - Missing Metadata', {
            reason: 'Paper details are missing',
            providedMetadata: metadata,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Question paper details are missing. Please generate the paper again." });
    }
    
    if (!sections || !Array.isArray(sections)) {
        await logActivity(email, 'Download Failed - Invalid Sections', {
            reason: 'Questions are missing',
            providedSections: sections,
            sectionsType: typeof sections,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "No questions found to download. Please generate a question paper first." });
    }
    
    if (!answerKey || !Array.isArray(answerKey)) {
        await logActivity(email, 'Download Failed - Invalid Answer Key', {
            reason: 'Answer key is missing',
            providedAnswerKey: answerKey,
            answerKeyType: typeof answerKey,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Answer key is missing. Please generate a complete question paper first." });
    }

    try {
        const downloadStartTime = new Date().toISOString();
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
        
        // School Name Header with better spacing
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

        // Subject and Class Header - Better Layout
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

        // Enhanced Time & Marks Table with better formatting
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

        // ========== ENHANCED QUESTION SECTIONS ==========
        let totalQuestions = 0;
        sections.forEach((sec, secIndex) => {
            // Section Header with better formatting
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
            sec.questions.forEach(qBlock => {
                const lines = qBlock.split('\n').filter(Boolean);
                
                // Main question with enhanced formatting
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ 
                                text: `${localNum}. `,
                                bold: true,
                                size: 24,
                                font: 'Times New Roman'
                            }),
                            new TextRun({ 
                                text: lines[0],
                                size: 24,
                                font: 'Times New Roman'
                            })
                        ],
                        spacing: { before: 200, after: 120 },
                        indent: { left: 0 }
                    })
                );

                // Options with better indentation
                lines.slice(1).forEach(opt => {
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
                });

                localNum++;
                totalQuestions++;
            });

            // Add space between sections
            if (secIndex < sections.length - 1) {
                docChildren.push(
                    new Paragraph({
                        text: '',
                        spacing: { after: 300 }
                    })
                );
            }
        });

        // ========== ENHANCED ANSWER KEY SECTION ==========
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        
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

        // Answer key with better formatting
        answerKey.forEach((ans, idx) => {
            const clean = ans.replace(/^\d+\.?\s*/, '');
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
                            text: clean.trim(),
                            size: 24,
                            font: 'Times New Roman'
                        })
                    ],
                    spacing: { after: 120 },
                    indent: { left: 360 }
                })
            );
        });

        // ========== DOCUMENT ASSEMBLY WITH ENHANCED STYLES ==========
        const doc = new Document({
            creator: "AI-RIVU Question Paper Generator",
            title: `Question Paper - ${subject} - ${metadata.className}`,
            description: `Generated question paper for ${subject}, ${metadata.className}`,
            styles: {
                paragraphStyles: [
                    {
                        id: "headerStyle",
                        name: "Header Style",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            size: 28,
                            bold: true,
                            font: 'Times New Roman'
                        },
                        paragraph: {
                            spacing: { after: 200 }
                        }
                    },
                    {
                        id: "questionStyle",
                        name: "Question Style",
                        basedOn: "Normal",
                        run: {
                            size: 24,
                            font: 'Times New Roman'
                        },
                        paragraph: {
                            spacing: { after: 120 }
                        }
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440,    // 1 inch
                            right: 1080,  // 0.75 inch
                            bottom: 1440, // 1 inch
                            left: 1080    // 0.75 inch
                        },
                        size: {
                            width: 11906,  // A4 width
                            height: 16838  // A4 height
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
        console.error(`Enhanced DOCX Generation Error:`, error);
        
        await logActivity(email, 'Download Failed DOCX - Error: ' + error.message, {
            subject,
            class: metadata?.className,
            errorType: 'DOCX_GENERATION_ERROR',
            errorMessage: error.message,
            errorStack: error.stack,
            errorTime: new Date().toISOString(),
            requestData: {
                subject,
                metadata,
                sectionsCount: sections?.length || 0,
                answerKeyLength: answerKey?.length || 0
            }
        });

        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to generate Word file: ${error.message}` });
        }
    }
});

module.exports = router;
