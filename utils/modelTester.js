// utils/modelTester.js - Production-ready model testing utility
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class ModelTester {
    constructor(apiKey = process.env.OPENROUTER_API_KEY, frontendUrl = config.FRONTEND_URL) {
        this.apiKey = apiKey;
        this.frontendUrl = frontendUrl;
        this.testResults = [];
        this.testStartTime = Date.now();
    }

    // Your actual production prompts for realistic testing
    getTestPrompts() {
        return [
            {
                name: "CBSE_Class_10_Math_Realistic",
                curriculum: "CBSE",
                className: "Class 10", 
                subject: "Mathematics",
                topic: "Linear Equations",
                prompt: this.buildProductionPrompt("CBSE", "Class 10", "Mathematics", "Linear Equations", [
                    { type: 'MCQ', num: 5, marks: 1 },
                    { type: 'Short Answer', num: 3, marks: 3 }
                ], "30%-60%-10%", 60),
                expectedElements: ['Section A', 'Section B', 'MCQ', 'Short Answer', 'Answer Key', 'Linear Equations', 'CBSE']
            },
            {
                name: "Karnataka_Class_8_Science",
                curriculum: "Karnataka State Board",
                className: "Class 8",
                subject: "Science", 
                topic: "Light and Sound",
                prompt: this.buildProductionPrompt("Karnataka State Board", "Class 8", "Science", "Light and Sound", [
                    { type: 'Fill in the Blanks', num: 5, marks: 1 },
                    { type: 'True/False', num: 3, marks: 1 }
                ], "0%-100%-0%", 90),
                expectedElements: ['Fill in the Blanks', 'True/False', 'Light', 'Sound', 'Answer Key', 'Karnataka']
            },
            {
                name: "CBSE_Class_6_English",
                curriculum: "CBSE",
                className: "Class 6",
                subject: "English",
                topic: "Grammar and Comprehension",
                prompt: this.buildProductionPrompt("CBSE", "Class 6", "English", "Grammar and Comprehension", [
                    { type: 'MCQ', num: 4, marks: 1 },
                    { type: 'Short Answer', num: 2, marks: 2 },
                    { type: 'Long Answer', num: 1, marks: 5 }
                ], "40%-50%-10%", 60),
                expectedElements: ['MCQ', 'Short Answer', 'Long Answer', 'Grammar', 'Answer Key', 'CBSE']
            },
            {
                name: "Edge_Case_Complex_Subject",
                curriculum: "CBSE",
                className: "Class 12",
                subject: "Computer Science",
                topic: "Object Oriented Programming",
                prompt: this.buildProductionPrompt("CBSE", "Class 12", "Computer Science", "Object Oriented Programming", [
                    { type: 'Case Based', num: 2, marks: 4 },
                    { type: 'Diagram Based', num: 1, marks: 6 }
                ], "20%-60%-20%", 180),
                expectedElements: ['Case Based', 'Diagram', 'Programming', 'Answer Key', 'Object']
            }
        ];
    }

    // Build exact production prompt format
    buildProductionPrompt(curriculum, className, subject, topic, questionDetails, difficultySplit, timeDuration) {
        let prompt = `You are an expert school examination paper setter. Create a formal question paper with the following exact specifications:\n\n`;
        prompt += `**Core Details:**\n`;
        prompt += `- Curriculum Board: ${curriculum}\n`;
        prompt += `- Class/Grade: ${className}\n`;
        prompt += `- Subject: ${subject}\n`;
        if (topic?.trim()) prompt += `- Specific Topics: ${topic}\n`;
        prompt += `- Total Time Allowed: ${timeDuration} minutes\n\n`;

        prompt += `**Paper Structure & Content:**\n`;
        let sectionCounter = 0;
        questionDetails.forEach(detail => {
            sectionCounter++;
            const sectionLetter = String.fromCharCode(64 + sectionCounter);
            prompt += `- Section ${sectionLetter}: ${detail.type} Questions\n`;
            prompt += `  - Generate exactly ${detail.num} question(s) of the '${detail.type}' type.\n`;
            prompt += detail.marks > 0
                ? `  - Each question carries ${detail.marks} mark(s).\n`
                : `  - Assign appropriate marks per question.\n`;
        });

        prompt += `\n**Difficulty Distribution:**\n`;
        if (difficultySplit?.includes('%')) {
            const [easy, medium, hard] = difficultySplit.split('-');
            prompt += `- Easy: ${easy || '0%'}\n- Medium: ${medium || '100%'}\n- Hard: ${hard || '0%'}\n`;
        }

        prompt += `\n**Formatting Instructions:**\n`;
        prompt += `- Maintain a professional tone for ${className}.\n`;
        prompt += `- Label sections clearly.\n`;
        prompt += `- Restart question numbering for each section.\n`;
        prompt += `- Avoid unnecessary explanations.\n`;

        prompt += `\n**Answer Key Instructions:**\n`;
        prompt += `- Insert a clear separator after the last question.\n`;
        prompt += `- Provide an answer key with matching question numbers.\n`;
        prompt += `- Format answers as: 'Brief'.\n\n`;
        prompt += `Generate the question paper followed by the answer key.`;

        return prompt;
    }

    // Resolve model name from preset or direct string
    resolveModelName(modelIdentifier) {
        if (config.AI_MODEL_CONFIG.presets[modelIdentifier]) {
            return config.AI_MODEL_CONFIG.presets[modelIdentifier];
        }
        return modelIdentifier;
    }

    // Test a single model comprehensively
    async testModel(modelIdentifier, customSettings = {}) {
        const modelName = this.resolveModelName(modelIdentifier);
        console.log(`\n🧪 Testing Model: ${modelName}`);
        
        const settings = {
            max_tokens: config.AI_MODEL_CONFIG.maxTokens,
            temperature: config.AI_MODEL_CONFIG.temperature,
            ...customSettings
        };

        console.log(`⚙️  Settings:`, settings);

        const modelResults = {
            modelIdentifier,
            modelName,
            settings,
            tests: [],
            summary: {
                totalTests: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                avgTokens: 0,
                avgCostEstimate: 0,
                avgQualityScore: 0,
                reliability: 0
            },
            testTimestamp: new Date().toISOString()
        };

        const testPrompts = this.getTestPrompts();

        for (const testCase of testPrompts) {
            console.log(`  📝 Running: ${testCase.name}`);
            
            try {
                const startTime = Date.now();
                
                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: modelName,
                        messages: [{ role: "user", content: testCase.prompt }],
                        ...settings
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': this.frontendUrl,
                            'X-Title': 'AI-RIVU Model Tester'
                        },
                        timeout: 120000 // 2 minute timeout for complex prompts
                    }
                );

                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                const content = response.data?.choices?.[0]?.message?.content || '';
                const usage = response.data?.usage || {};
                
                // Comprehensive quality evaluation
                const qualityScore = this.evaluateResponse(content, testCase.expectedElements, testCase);
                const costEstimate = this.estimateCost(usage, modelName);
                
                const testResult = {
                    testName: testCase.name,
                    success: true,
                    responseTime,
                    contentPreview: this.getContentPreview(content),
                    fullContent: content,
                    usage,
                    qualityScore,
                    costEstimate,
                    expectedElements: testCase.expectedElements,
                    foundElements: this.findElements(content, testCase.expectedElements),
                    detailedAnalysis: this.analyzeContent(content, testCase)
                };
                
                modelResults.tests.push(testResult);
                modelResults.summary.successful++;
                
                console.log(`    ✅ Success - ${responseTime}ms - Quality: ${qualityScore}/10 - Cost: $${costEstimate.toFixed(4)}`);
                
            } catch (error) {
                const testResult = {
                    testName: testCase.name,
                    success: false,
                    error: error.message,
                    responseTime: 0,
                    qualityScore: 0,
                    costEstimate: 0,
                    httpStatus: error.response?.status,
                    apiError: error.response?.data?.error?.message
                };
                
                modelResults.tests.push(testResult);
                modelResults.summary.failed++;
                
                console.log(`    ❌ Failed - ${error.message}`);
            }

            // Rate limiting delay between tests
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Calculate comprehensive summary
        this.calculateSummary(modelResults);
        this.testResults.push(modelResults);
        
        return modelResults;
    }

    // Calculate detailed summary statistics
    calculateSummary(modelResults) {
        const summary = modelResults.summary;
        const successfulTests = modelResults.tests.filter(t => t.success);
        
        summary.totalTests = modelResults.tests.length;
        summary.reliability = summary.totalTests > 0 ? (summary.successful / summary.totalTests * 100).toFixed(1) : 0;
        
        if (successfulTests.length > 0) {
            summary.avgResponseTime = Math.round(
                successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length
            );
            summary.avgTokens = Math.round(
                successfulTests.reduce((sum, t) => sum + (t.usage?.total_tokens || 0), 0) / successfulTests.length
            );
            summary.avgCostEstimate = parseFloat(
                (successfulTests.reduce((sum, t) => sum + t.costEstimate, 0) / successfulTests.length).toFixed(4)
            );
            summary.avgQualityScore = parseFloat(
                (successfulTests.reduce((sum, t) => sum + t.qualityScore, 0) / successfulTests.length).toFixed(1)
            );
        }
    }

    // Enhanced response evaluation (0-10 scale)
    evaluateResponse(content, expectedElements, testCase) {
        let score = 0;
        const lowerContent = content.toLowerCase();
        
        // Structure and format checks (5 points)
        if (content.length > 300) score += 0.5; // Substantial content
        if (content.includes('Section')) score += 1; // Has sections
        if (lowerContent.includes('answer key') || lowerContent.includes('answers:')) score += 1.5; // Has answer key
        if (content.match(/\d+\./g)?.length >= 3) score += 1; // Has numbered questions
        if (content.includes('marks') || content.includes('Mark')) score += 1; // Mentions marks
        
        // Content relevance (4 points)
        const foundElements = this.findElements(content, expectedElements);
        score += Math.min(4, foundElements.length * 0.8);
        
        // Quality indicators (1 point)
        if (content.includes(testCase.curriculum)) score += 0.3;
        if (content.includes(testCase.subject)) score += 0.3;
        if (content.length > 800) score += 0.4; // Comprehensive response
        
        return Math.min(10, Math.round(score * 10) / 10);
    }

    // Find expected elements in content
    findElements(content, expectedElements) {
        const found = [];
        const lowerContent = content.toLowerCase();
        
        expectedElements.forEach(element => {
            if (lowerContent.includes(element.toLowerCase())) {
                found.push(element);
            }
        });
        
        return found;
    }

    // Detailed content analysis
    analyzeContent(content, testCase) {
        return {
            wordCount: content.split(/\s+/).length,
            hasProperSections: content.includes('Section A') && content.includes('Section B'),
            hasAnswerKey: content.toLowerCase().includes('answer key') || content.toLowerCase().includes('answers:'),
            questionCount: (content.match(/\d+\./g) || []).length,
            mentionsCurriculum: content.includes(testCase.curriculum),
            mentionsSubject: content.includes(testCase.subject),
            mentionsTopic: testCase.topic ? content.toLowerCase().includes(testCase.topic.toLowerCase()) : false,
            formatQuality: this.assessFormatQuality(content)
        };
    }

    // Assess formatting quality
    assessFormatQuality(content) {
        let score = 0;
        if (content.includes('\n')) score += 1; // Has line breaks
        if (content.match(/Section [A-Z]/g)) score += 1; // Proper section labels
        if (content.match(/\d+\.\s/g)) score += 1; // Proper question numbering
        if (content.includes('---') || content.includes('===')) score += 1; // Has separators
        return Math.min(4, score);
    }

    // Get preview of content for logging
    getContentPreview(content) {
        const lines = content.split('\n').slice(0, 8);
        const preview = lines.join('\n');
        return preview.length > 400 ? preview.substring(0, 400) + '...' : preview;
    }

    // Accurate cost estimation
    estimateCost(usage, modelName) {
        const inputTokens = usage?.prompt_tokens || 0;
        const outputTokens = usage?.completion_tokens || 0;
        
        const rates = config.AI_MODEL_CONFIG.pricing[modelName] || { input: 1, output: 4 };
        
        return ((inputTokens * rates.input) + (outputTokens * rates.output)) / 1000000;
    }

    // Compare multiple models side by side
    async compareModels(modelIdentifiers, settings = {}) {
        console.log(`\n🔬 Comparing ${modelIdentifiers.length} models for AI-RIVU...`);
        console.log(`Models: ${modelIdentifiers.join(', ')}`);
        
        for (const modelId of modelIdentifiers) {
            await this.testModel(modelId, settings);
            
            // Rate limiting between models
            if (modelIdentifiers.indexOf(modelId) < modelIdentifiers.length - 1) {
                console.log('   ⏳ Waiting 3 seconds before next model...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        return this.generateComparisonReport();
    }

    // Generate comprehensive comparison report
    generateComparisonReport() {
        const report = {
            testSession: {
                timestamp: new Date().toISOString(),
                duration: `${((Date.now() - this.testStartTime) / 1000 / 60).toFixed(1)} minutes`,
                modelsCount: this.testResults.length
            },
            models: this.testResults,
            rankings: {
                byQuality: [...this.testResults]
                    .filter(m => m.summary.successful > 0)
                    .sort((a, b) => b.summary.avgQualityScore - a.summary.avgQualityScore),
                bySpeed: [...this.testResults]
                    .filter(m => m.summary.successful > 0)
                    .sort((a, b) => a.summary.avgResponseTime - b.summary.avgResponseTime),
                byCost: [...this.testResults]
                    .filter(m => m.summary.successful > 0)
                    .sort((a, b) => a.summary.avgCostEstimate - b.summary.avgCostEstimate),
                byReliability: [...this.testResults]
                    .sort((a, b) => b.summary.reliability - a.summary.reliability)
            },
            recommendation: this.generateRecommendation()
        };
        
        this.printReport(report);
        return report;
    }

    // Generate AI-RIVU specific recommendation
    generateRecommendation() {
        const successful = this.testResults.filter(m => m.summary.successful > 0);
        if (successful.length === 0) return { message: "No models passed testing" };
        
        // Find best overall balance for EdTech
        const scored = successful.map(model => {
            const qualityWeight = 0.4;
            const costWeight = 0.3;
            const speedWeight = 0.2;
            const reliabilityWeight = 0.1;
            
            // Normalize scores (0-1)
            const maxQuality = Math.max(...successful.map(m => m.summary.avgQualityScore));
            const minCost = Math.min(...successful.map(m => m.summary.avgCostEstimate));
            const minSpeed = Math.min(...successful.map(m => m.summary.avgResponseTime));
            const maxReliability = Math.max(...successful.map(m => parseFloat(m.summary.reliability)));
            
            const qualityScore = model.summary.avgQualityScore / maxQuality;
            const costScore = minCost / model.summary.avgCostEstimate; // Lower cost = higher score
            const speedScore = minSpeed / model.summary.avgResponseTime; // Lower time = higher score  
            const reliabilityScore = parseFloat(model.summary.reliability) / maxReliability;
            
            const overallScore = (qualityScore * qualityWeight) + 
                               (costScore * costWeight) + 
                               (speedScore * speedWeight) + 
                               (reliabilityScore * reliabilityWeight);
            
            return { ...model, overallScore };
        });
        
        const recommended = scored.sort((a, b) => b.overallScore - a.overallScore)[0];
        
        return {
            primary: {
                model: recommended.modelIdentifier,
                modelName: recommended.modelName,
                reason: `Best overall balance - Quality: ${recommended.summary.avgQualityScore}/10, Cost: $${recommended.summary.avgCostEstimate}/paper, Speed: ${recommended.summary.avgResponseTime}ms`,
                overallScore: recommended.overallScore.toFixed(3)
            },
            alternatives: {
                cheapest: successful.sort((a, b) => a.summary.avgCostEstimate - b.summary.avgCostEstimate)[0].modelIdentifier,
                fastest: successful.sort((a, b) => a.summary.avgResponseTime - b.summary.avgResponseTime)[0].modelIdentifier,
                highestQuality: successful.sort((a, b) => b.summary.avgQualityScore - a.summary.avgQualityScore)[0].modelIdentifier
            }
        };
    }

    // Print formatted report to console
    printReport(report) {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 AI-RIVU MODEL COMPARISON REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n📊 Test Session: ${report.testSession.duration}, ${report.testSession.modelsCount} models`);
        
        console.log('\n🏆 RANKINGS:');
        
        console.log('\n  Quality Ranking:');
        report.rankings.byQuality.slice(0, 5).forEach((model, i) => {
            console.log(`   ${i + 1}. ${model.modelIdentifier.padEnd(25)} - ${model.summary.avgQualityScore}/10 (${model.summary.reliability}% reliable)`);
        });
        
        console.log('\n  ⚡ Speed Ranking:');
        report.rankings.bySpeed.slice(0, 5).forEach((model, i) => {
            console.log(`   ${i + 1}. ${model.modelIdentifier.padEnd(25)} - ${model.summary.avgResponseTime}ms avg`);
        });
        
        console.log('\n  💰 Cost Ranking (cheapest first):');
        report.rankings.byCost.slice(0, 5).forEach((model, i) => {
            console.log(`   ${i + 1}. ${model.modelIdentifier.padEnd(25)} - $${model.summary.avgCostEstimate}/paper`);
        });
        
        if (report.recommendation.primary) {
            console.log('\n✨ RECOMMENDATION FOR AI-RIVU:');
            console.log(`   🎯 Primary: ${report.recommendation.primary.model}`);
            console.log(`   📝 Reason: ${report.recommendation.primary.reason}`);
            console.log(`   💡 Alternatives:`);
            console.log(`      Cheapest: ${report.recommendation.alternatives.cheapest}`);
            console.log(`      Fastest: ${report.recommendation.alternatives.fastest}`);
            console.log(`      Highest Quality: ${report.recommendation.alternatives.highestQuality}`);
        }
        
        console.log('\n' + '='.repeat(80));
    }

    // Save results to file with timestamp
    async saveResults(customFilename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = customFilename || `model_comparison_${timestamp}.json`;
        const filepath = path.join(__dirname, '..', 'test-results', filename);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        
        const report = this.generateComparisonReport();
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        
        console.log(`\n💾 Detailed results saved to: ${filepath}`);
        return { report, filepath };
    }
}

module.exports = ModelTester;
