import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getEnrollmentEmailHtml } from "../utils/emailTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function sendNewTemplateTest() {
    console.log("🔍 Sending New Template Design for Approval...");
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.hostinger.com",
        port: parseInt(process.env.EMAIL_PORT || "465"),
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 20000
    });

    const html = getEnrollmentEmailHtml("HARSH", "VP-100003", "IAT Mock Test Series");

    try {
        const info = await transporter.sendMail({
            from: `"Vigyan Prep Design" <${process.env.EMAIL_USER}>`,
            to: "harshbuddy01@gmail.com",
            subject: "DESIGN APPROVAL - Round 6 (Alignment & Blur Fix)",
            html: html,
            attachments: [
                {
                    filename: 'email-bg.png',
                    path: path.join(__dirname, '../assets/email-bg.png'),
                    cid: 'email-bg'
                }
            ]
        });
        console.log("✅ Template Sent Successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Send Failed:", error.message);
    }
}

sendNewTemplateTest();
