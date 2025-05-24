// utils/docxHelpers.js
// Helper functions for question and option formatting in docx documents

const { Paragraph, TextRun } = require('docx');

/**
 * Adds a question with bold number prefix to the docx content.
 * @param {Array} docChildren - Document children array
 * @param {number} number - Question number
 * @param {string} text - Question text
 */
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

/**
 * Adds an option (indented) for MCQs to the docx content.
 * @param {Array} docChildren - Document children array
 * @param {string} text - Option line text
 */
function addOptionParagraph(docChildren, text) {
    docChildren.push(
        new Paragraph({
            children: [ new TextRun({ text, size: 24 }) ],
            indent: { left: 720 },
            spacing: { after: 40 }
        })
    );
}

module.exports = {
    addQuestionParagraph,
    addOptionParagraph
};
