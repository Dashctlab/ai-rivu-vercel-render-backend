// config.js - Fix model IDs
require('dotenv').config();

module.exports = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL,
  
  AI_MODEL_CONFIG: {
    primary: process.env.AI_PRIMARY_MODEL || "claude-3.5-sonnet",
    fallback: process.env.AI_FALLBACK_MODEL || "gpt-4o-mini", 
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.6,
    
    // OpenRouter model IDs
    presets: {
      // Claude models
      "claude-4-opus": "anthropic/claude-opus-4-20250514",
      "claude-4-sonnet": "anthropic/claude-sonnet-4-20250514",
      
      "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet-20241022",
      "claude-3.5-haiku": "anthropic/claude-3.5-haiku-20241022",
      
      // OpenAI models  
      "gpt-4o": "openai/gpt-4o",
      "gpt-4o-mini": "openai/gpt-4o-mini",
      
      // Google models
      "gemini-flash": "google/gemini-flash-1.5",
      "gemini-pro": "google/gemini-pro-1.5",
      
      // Cost-effective options
      "claude-haiku": "anthropic/claude-3.5-haiku-20241022",
      "gpt-mini": "openai/gpt-4o-mini"
    },
    
    // Updated pricing for valid models
    pricing: {
      "anthropic/claude-opus-4-20250514": { input: 15, output: 75 },
      "anthropic/claude-sonnet-4-20250514": { input: 3, output: 15 }, 
      "anthropic/claude-3.5-sonnet-20241022": { input: 3, output: 15 },
      "anthropic/claude-3.5-haiku-20241022": { input: 0.8, output: 4 },
      "openai/gpt-4o": { input: 2.5, output: 10 },
      "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
      "google/gemini-flash-1.5": { input: 0.075, output: 0.3 },
      "google/gemini-pro-1.5": { input: 1.25, output: 5 }
    }
  }
};
