// config.js
require('dotenv').config();           // loads from .env
module.exports = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  // this is the URL of your staging frontend on Vercel:
  FRONTEND_URL:        process.env.FRONTEND_URL,
};
