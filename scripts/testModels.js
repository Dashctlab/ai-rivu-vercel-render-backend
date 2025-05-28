#!/usr/bin/env node
// scripts/testModels.js - Easy model testing script

require('dotenv').config();
const ModelTester = require('../utils/modelTester');

async function main() {
    console.log('🚀 AI-RIVU Model Testing Suite');
    console.log('================================');
    
    const args = process.argv.slice(2);
    const command = args[0] || 'compare';
    
    const tester = new ModelTester();
    
    try {
        switch (command) {
            case 'test':
                // Test single model: npm run test-models test claude-4-sonnet
                const modelToTest = args[1] || 'claude-4-sonnet';
                console.log(`Testing single model: ${modelToTest}`);
                const result = await tester.testModel(modelToTest);
                console.log(`\n✅ Test completed for ${modelToTest}`);
                break;
                
            case 'compare':
                // Compare models: npm run test-models compare
                const modelsToCompare = args.length > 1 ? args.slice(1) : [
                    'claude-4-sonnet',
                    'claude-3.5-sonnet', 
                    'gpt-4o-mini',
                    'gemini-flash'
                ];
                
                console.log(`Comparing models: ${modelsToCompare.join(', ')}`);
                const comparison = await tester.compareModels(modelsToCompare);
                await tester.saveResults();
                
                console.log('\n🎯 QUICK RECOMMENDATION:');
                if (comparison.recommendation.primary) {
                    console.log(`Switch to: ${comparison.recommendation.primary.model}`);
                    console.log(`Reason: ${comparison.recommendation.primary.reason}`);
                }
                break;
                
            case 'quick':
                // Quick test of current vs new: npm run test-models quick claude-4-opus
                const currentModel = process.env.AI_PRIMARY_MODEL || 'claude-3.5-sonnet';
                const newModel = args[1] || 'claude-4-sonnet';
                
                console.log(`Quick comparison: ${currentModel} vs ${newModel}`);
                await tester.compareModels([currentModel, newModel]);
                
                const results = tester.testResults;
                if (results.length === 2) {
                    const [current, newer] = results;
                    console.log('\n📊 QUICK COMPARISON:');
                    console.log(`Current (${current.modelIdentifier}):`);
                    console.log(`  Quality: ${current.summary.avgQualityScore}/10`);
                    console.log(`  Speed: ${current.summary.avgResponseTime}ms`);
                    console.log(`  Cost: $${current.summary.avgCostEstimate}/paper`);
                    
                    console.log(`\nNew (${newer.modelIdentifier}):`);
                    console.log(`  Quality: ${newer.summary.avgQualityScore}/10`);
                    console.log(`  Speed: ${newer.summary.avgResponseTime}ms`);
                    console.log(`  Cost: $${newer.summary.avgCostEstimate}/paper`);
                    
                    // Simple recommendation
                    const qualityDiff = newer.summary.avgQualityScore - current.summary.avgQualityScore;
                    const costDiff = newer.summary.avgCostEstimate - current.summary.avgCostEstimate;
                    const speedDiff = newer.summary.avgResponseTime - current.summary.avgResponseTime;
                    
                    console.log('\n💡 RECOMMENDATION:');
                    if (qualityDiff > 1 && costDiff < 0.05) {
                        console.log(`✅ UPGRADE to ${newModel} - significantly better quality at similar cost`);
                    } else if (qualityDiff > 0.5 && costDiff < 0.10) {
                        console.log(`✅ CONSIDER upgrading to ${newModel} - better quality, slightly higher cost`);
                    } else if (qualityDiff < -0.5) {
                        console.log(`❌ STICK with ${currentModel} - new model has lower quality`);
                    } else {
                        console.log(`🤔 MARGINAL difference - consider other factors`);
                    }
                }
                break;
                
            case 'list':
                // List available models: npm run test-models list
                const config = require('../config');
                console.log('\n📋 Available Model Presets:');
                Object.entries(config.AI_MODEL_CONFIG.presets).forEach(([preset, model]) => {
                    const pricing = config.AI_MODEL_CONFIG.pricing[model];
                    const cost = pricing ? `$${pricing.input}/$${pricing.output}` : 'Unknown pricing';
                    console.log(`  ${preset.padEnd(20)} → ${model} (${cost})`);
                });
                
                console.log(`\n🎯 Current Model: ${config.AI_MODEL_CONFIG.primary}`);
                break;
                
            default:
                console.log('\n❓ Available commands:');
                console.log('  npm run test-models test <model>     - Test single model');
                console.log('  npm run test-models compare [models] - Compare multiple models');
                console.log('  npm run test-models quick <model>    - Quick current vs new comparison');
                console.log('  npm run test-models list             - List available models');
                console.log('\nExamples:');
                console.log('  npm run test-models test claude-4-opus');
                console.log('  npm run test-models compare claude-4-sonnet gpt-4o gemini-flash');
                console.log('  npm run test-models quick claude-4-opus');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⏹️  Test interrupted by user');
    process.exit(0);
});

if (require.main === module) {
    main();
}

module.exports = { main };