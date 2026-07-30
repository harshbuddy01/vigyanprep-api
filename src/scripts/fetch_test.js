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

async function testFetch() {
    // Note: Node 18+ has native fetch. No need for node-fetch.
    const variants = [
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    ];

    for (const baseUrl of variants) {
        console.log(`\n--- Testing URL: ${baseUrl} ---`);
        try {
            const resp = await fetch(`${baseUrl}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Respond with 'OK'" }] }]
                })
            });
            const data = await resp.json();
            if (resp.ok) {
                console.log("✅ Success!", JSON.stringify(data).substring(0, 100));
            } else {
                console.error(`❌ Failed (${resp.status}):`, JSON.stringify(data));
            }
        } catch (e) {
            console.error("❌ Network error:", e.message);
        }
    }
}

testFetch();
