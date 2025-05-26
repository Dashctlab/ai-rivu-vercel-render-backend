// routes/downloadDocx.js
// Route handler for generating and sending downloadable DOCX question papers with enhanced tracking

const express = require('express');
const router = express.Router();

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } = require('docx');
const logActivity = require('../utils/enhancedLogger'); // CHANGED: Updated logger import
const { addQuestionParagraph, addOptionParagraph } = require('../utils/docxHelpers');

/**
 * POST /download-docx
 * Validates input, assembles the DOCX file and sends it as a download.
 * Enhanced with detailed download tracking
 */
router.post('/', async (req, res) => {
    const { subject, metadata, sections, answerKey } = req.body;
    const email = req.headers['useremail'] || 'anonymous';

    // Validate required fields
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        await logActivity(email, 'Download Failed - Missing Subject', {
            reason: 'Subject is required',
            providedSubject: subject,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Invalid input: Subject is required." });
    }
    if (!metadata || typeof metadata !== 'object') {
        await logActivity(email, 'Download Failed - Missing Metadata', {
            reason: 'Metadata is required',
            providedMetadata: metadata,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Invalid input: Metadata is required." });
    }
    if (!sections || !Array.isArray(sections)) {
        await logActivity(email, 'Download Failed - Invalid Sections', {
            reason: 'Sections must be an array',
            providedSections: sections,
            sectionsType: typeof sections,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Invalid input: Sections must be an array." });
    }
    if (!answerKey || !Array.isArray(answerKey)) {
        await logActivity(email, 'Download Failed - Invalid Answer Key', {
            reason: 'Answer Key must be an array',
            providedAnswerKey: answerKey,
            answerKeyType: typeof answerKey,
            requestTime: new Date().toISOString()
        });
        return res.status(400).json({ message: "Invalid input: Answer Key must be an array." });
    }

    try {
        // Log download attempt with detailed parameters
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

        // --- Header Section --- (keeping existing DOCX generation logic)
        docChildren.push(
            new Paragraph({
                text: 'School Name: ___________________________',
                style: "headerStyle",
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            })
        );
        docChildren.push(new Paragraph({
            border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } },
            spacing: { after: 300 }
        }));

        docChildren.push(new Paragraph({
            children: [new TextRun({ text: `Class: ${metadata.className || 'N/A'}`, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 50 }
        }));
        docChildren.push(new Paragraph({
            children: [new TextRun({ text: `Subject: ${subject}`, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }));

        // --- Time & Marks Table ---
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
                        })
                    ]
                })
            ]
        });

        docChildren.push(headerTable);
        docChildren.push(new Paragraph({
            border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } },
            spacing: { after: 400 }
        }));

        // --- Question Sections ---
        let totalQuestions = 0;
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
                totalQuestions++;
            });

            docChildren.push(new Paragraph({ text: '' }));
        });

        // --- Answer Key ---
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        docChildren.push(new Paragraph({
            text: "Answer Key",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 }
        }));

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

        // --- Final Document Assembly ---
        const doc = new Document({
            creator: "AI-RIVU QPG",
            title: `Question Paper - ${subject}`,
            description: `Generated question paper for ${subject}, ${metadata.className}`,
            styles: {
                paragraphStyles: [
                    { id: "headerStyle", name: "Header Style", basedOn: "Normal", run: { size: 26 } }
                ]
            },
            sections: [{
                properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
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

        // Enhanced success logging with detailed metrics
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
        
        // Enhanced error logging
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
