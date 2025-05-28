// config.js - Enhanced with model management
require('dotenv').config();

module.exports = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  
  // NEW: AI Model Configuration
  AI_MODEL_CONFIG: {
    primary: process.env.AI_PRIMARY_MODEL || "claude-4-sonnet",
    fallback: process.env.AI_FALLBACK_MODEL || "gpt-4o-mini", 
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.6,
    
    // Model presets for easy switching
    presets: {
      // Latest Claude 4 models
      "claude-4-sonnet": "anthropic/claude-4-sonnet-20250514",
      "claude-4-opus": "anthropic/claude-4-opus-20250514",
      
      // Previous generation
      "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet-20241022",
      "claude-3.5-haiku": "anthropic/claude-3.5-haiku-20241022",
      
      // OpenAI models  
      "gpt-4o": "openai/gpt-4o-2024-11-20",
      "gpt-4o-mini": "openai/gpt-4o-mini",
      "gpt-4.5": "openai/gpt-4.5", // If available
      
      // Google models
      "gemini-flash": "google/gemini-2.0-flash-exp",
      "gemini-pro": "google/gemini-pro-1.5",
      "gemini-2.5-pro": "google/gemini-2.5-pro",
      
      // Cost-effective options
      "claude-haiku": "anthropic/claude-3.5-haiku-20241022",
      "gpt-mini": "openai/gpt-4o-mini"
    },
    
    // Pricing info for cost estimation (per 1M tokens)
    pricing: {
      "anthropic/claude-4-sonnet-20250514": { input: 3, output: 15 },
      "anthropic/claude-4-opus-20250514": { input: 15, output: 75 },
      "anthropic/claude-3.5-sonnet-20241022": { input: 3, output: 15 },
      "anthropic/claude-3.5-haiku-20241022": { input: 0.8, output: 4 },
      "openai/gpt-4o-2024-11-20": { input: 2.5, output: 10 },
      "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
      "google/gemini-2.0-flash-exp": { input: 0.075, output: 0.3 },
      "google/gemini-pro-1.5": { input: 1.25, output: 5 },
      "google/gemini-2.5-pro": { input: 2.5, output: 10 }
    }
  }
};
