import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function runTests() {
    console.log("🧪 Testing Model Variants...");
    
    for (const modelName of modelsToTest) {
        console.log(`\n--- Testing: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, respond with 'OK'");
            const text = result.response.text();
            console.log(`✅ Success for ${modelName}:`, text);
        } catch (error) {
            console.error(`❌ Failed for ${modelName}:`, error.message);
            // If it's a 404, we know it's not available in this version
        }
    }
}

runTests();
