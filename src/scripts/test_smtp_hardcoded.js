import nodemailer from "nodemailer";

async function testHardcoded() {
    console.log("🔍 Testing Hardcoded SMTP (Port 465)...");
    const transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
            user: "noreply@vigyanprep.com",
            pass: "Buddy700@@@@"
        },
        connectionTimeout: 10000
    });

    try {
        await transporter.verify();
        console.log("✅ Hardcoded SMTP Success!");
    } catch (error) {
        console.error("❌ Hardcoded SMTP Failed:", error.message);
    }
}

testHardcoded();
