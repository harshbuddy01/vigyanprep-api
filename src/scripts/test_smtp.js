import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testSMTP() {
    console.log("🔍 Testing SMTP Configuration...");
    const config = {
        host: process.env.EMAIL_HOST,
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000 // 10s
    };

    console.log("📡 Attempting connection to:", {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user
    });

    const transporter = nodemailer.createTransport(config);

    try {
        await transporter.verify();
        console.log("✅ SMTP Connection Successful!");
    } catch (error) {
        console.error("❌ SMTP Connection Failed:", error.message);
        if (error.code === 'ETIMEDOUT') {
            console.error("💡 Hint: Connection timed out. This usually means the port is blocked or the host is unreachable.");
        }
    }
}

testSMTP();
