import { GoogleGenerativeAI } from "@google/generative-ai";
import Doubt from '../schemas/DoubtSchema.js';

// Helper to get case-resilient API key and initialize engine
const getAIModel = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
    if (!apiKey) return null;
    
    const genAI = new GoogleGenerativeAI(apiKey);
    // ✅ FINAL SUCCESS FIX: Force stable v1 API version. 
    // The beta endpoint (default) was returning 404 for these models.
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
};

export const askDoubt = async (req, res) => {
    try {
        const { questionText, handwritingStyle, email } = req.body;

        if (!questionText || !email) {
            return res.status(400).json({ success: false, error: 'Question and email are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'AI service configuration missing' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Configuration variants to try - Expanded based on Google AI Studio visibility
        const configs = [
            { model: "gemini-1.5-flash", apiVersion: "v1" },
            { model: "gemini-2.0-flash", apiVersion: "v1" },
            { model: "gemini-1.5-flash-latest", apiVersion: "v1" },
            { model: "gemini-2.0-flash-exp", apiVersion: "v1beta" },
            { model: "gemini-1.5-pro", apiVersion: "v1" },
            { model: "gemini-1.5-flash", apiVersion: "v1beta" },
            { model: "gemini-pro", apiVersion: "v1" },
            { model: "gemini-1.5-flash-8b", apiVersion: "v1" }
        ];

        let result;
        let lastError;
        let workedConfig;

        // --- SELF-HEALING LOOP ---
        for (const config of configs) {
            try {
                const model = genAI.getGenerativeModel({ model: config.model }, { apiVersion: config.apiVersion });
                
                const prompt = `
                    You are an expert tutor at Vigyan.prep, a premier research institute preparation platform for IISER (IAT), NISER (NEST), and ISI/CMI.
                    Your tone is friendly, encouraging, and academic.
                    
                    Instruction:
                    - Provide a detailed step-by-step solution.
                    - Use LaTeX for mathematical formulas (e.g., $x^2$).
                    - If the question is advanced or involves complex diagrams (like Organic Chemistry mechanisms or 3D Calculus), START your response with the tag [COMPLEX].
                    
                    Student Question: "${questionText}"
                `;

                const aiResult = await model.generateContent(prompt);
                const aiResponse = await aiResult.response;
                
                if (aiResponse && aiResponse.text) {
                    result = aiResponse;
                    workedConfig = config;
                    console.log(`✅ Success with config: ${JSON.stringify(config)}`);
                    break; 
                }
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Failed with config ${JSON.stringify(config)}: ${err.message}`);
            }
        }

        if (!result) {
            throw new Error(`AI Recovery failed after trying all variants. Last error: ${lastError.message}`);
        }

        let answer = result.text();

        // 2. Check for complexity
        const isComplex = answer.startsWith('[COMPLEX]');
        if (isComplex) {
            answer = answer.replace('[COMPLEX]', '').trim();
        }

        // 3. Save to Database
        const newDoubt = new Doubt({
            studentEmail: email,
            questionText,
            answer,
            handwritingStyle: handwritingStyle || 'neat',
            isComplex
        });

        await newDoubt.save();

        res.status(200).json({
            success: true,
            answer,
            isComplex,
            id: newDoubt._id,
            configUsed: workedConfig
        });

    } catch (error) {
        console.error('❌ Error in askDoubt Final recovery:', {
            message: error.message,
            stack: error.stack
        });
        const keyFragment = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'missing';
        res.status(500).json({ 
            success: false, 
            error: 'AI service failed after recovery attempts',
            details: error.message,
            serverVersion: "1.0.4-key-check",
            apiKeyFragment: keyFragment
        });
    }
};

export const getDoubtHistory = async (req, res) => {
    try {
        const { email } = req.params;
        const history = await Doubt.find({ studentEmail: email }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error('❌ Error in getDoubtHistory:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
};

export const deleteDoubt = async (req, res) => {
    try {
        const { id } = req.params;
        await Doubt.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Doubt deleted' });
    } catch (error) {
        console.error('❌ Error in deleteDoubt:', error);
        res.status(500).json({ success: false, error: 'Failed to delete doubt' });
    }
};
