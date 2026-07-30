import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function sendActualTest() {
    console.log("🔍 Sending Actual Test Email...");
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.hostinger.com",
        port: parseInt(process.env.EMAIL_PORT || "465"),
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 10000
    });

    try {
        const info = await transporter.sendMail({
            from: `"Vigyan Prep Test" <${process.env.EMAIL_USER}>`,
            to: "harshbuddy01@gmail.com",
            subject: "TERMINAL TEST - Vigyan Prep SMTP",
            text: "This is a test email sent from the terminal to verify SMTP delivery.",
            html: "<b>This is a test email sent from the terminal to verify SMTP delivery.</b>"
        });
        console.log("✅ Email Sent Successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Send Failed:", error.message);
    }
}

sendActualTest();
