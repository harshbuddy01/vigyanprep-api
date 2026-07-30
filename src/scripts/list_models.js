import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
    if (!apiKey) {
      console.error("❌ No API key found in .env");
      return;
    }

    console.log("🔑 Using API Key starting with:", apiKey.substring(0, 6));
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test basic connectivity first
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("📡 Testing gemini-1.5-flash...");
    
    try {
        const result = await model.generateContent("test");
        console.log("✅ connectivity test successful!");
    } catch (e) {
        console.warn("⚠️ Standard model test failed, checking available models...");
        console.warn("Message:", e.message);
    }

    // Try to list models (this might fail if key doesn't have permissions, but worth a try)
    // Actually, the error message suggested calling ListModels
    console.log("📋 Attempting to list models...");
    // This part is a bit tricky with the JS SDK as it doesn't expose a direct listModels easily outside of low-level client
    // But we can try to fetch the list via raw fetch if needed.
  } catch (err) {
    console.error("❌ Diagnostic failed:", err);
  }
}

listModels();
