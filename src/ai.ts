// ai.ts
// This module centralizes all interactions with the Google GenAI API.

import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client.
// The API key is sourced from environment variables, managed by the Vite build process.
// We use a fallback to avoid "API Key must be set" errors in the browser when the key is missing.
const apiKey = process.env.API_KEY || "MOCK_KEY";
const ai = new GoogleGenAI({apiKey});

// Export the instance for use in other modules.
export { ai };
