import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
// ✅ MONGODB MIGRATION: Using Mongoose Models
import QuestionModel from '../schemas/QuestionSchema.js';
import PdfUpload from '../schemas/PdfUploadSchema.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/pdfs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// 🧪 DEBUG ENDPOINT: Test Python and PyPDF2
router.get('/test-python', async (req, res) => {
    try {
        console.log('🧪 Testing Python and PyPDF2...');

        // Test 1: Python version
        const pythonTest = spawn('python3', ['--version']);
        let pythonVersion = '';

        pythonTest.stdout.on('data', (data) => {
            pythonVersion += data.toString();
        });

        pythonTest.stderr.on('data', (data) => {
            pythonVersion += data.toString();
        });

        await new Promise((resolve) => pythonTest.on('close', resolve));

        // Test 2: PyPDF2 availability
        const pypdfTest = spawn('python3', ['-c', 'import PyPDF2; print("PyPDF2 version:", PyPDF2.__version__)']);
        let pypdfResult = '';
        let pypdfError = '';

        pypdfTest.stdout.on('data', (data) => {
            pypdfResult += data.toString();
        });

        pypdfTest.stderr.on('data', (data) => {
            pypdfError += data.toString();
        });

        await new Promise((resolve) => pypdfTest.on('close', resolve));

        // Test 3: Check if pdf_processor.py exists
        const pythonScriptPath = path.join(__dirname, '../pdf_processor.py');
        const scriptExists = fs.existsSync(pythonScriptPath);

        res.json({
            success: true,
            tests: {
                python: {
                    version: pythonVersion.trim(),
                    available: pythonVersion.length > 0
                },
                pypdf2: {
                    installed: pypdfResult.length > 0 && pypdfError.length === 0,
                    version: pypdfResult.trim(),
                    error: pypdfError.trim()
                },
                script: {
                    exists: scriptExists,
                    path: pythonScriptPath
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/pdf/upload - Upload and process PDF
router.post('/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { examType, subject, topic, year, autoExtract, notes } = req.body;
        const pdfPath = req.file.path;
        const fileName = req.file.originalname;

        console.log('📄 Processing PDF:', fileName);
        console.log('📋 Metadata:', { examType, subject, topic, year });
        console.log('🔧 Auto-extract enabled:', autoExtract);

        // If auto-extract is enabled, run Python script
        if (autoExtract === 'true') {
            console.log('🤖 Running AI extraction...');

            // Check if Python script exists
            const pythonScriptPath = path.join(__dirname, '../pdf_processor.py');
            if (!fs.existsSync(pythonScriptPath)) {
                console.error('❌ Python script not found:', pythonScriptPath);
                return res.status(500).json({
                    error: 'PDF processor script not found',
                    details: 'The pdf_processor.py script is missing from the backend folder'
                });
            }

            console.log('🐍 Spawning Python process...');
            console.log('Command: python3', [pythonScriptPath, pdfPath, examType || '', subject || '', topic || '', year || '']);

            const pythonProcess = spawn('python3', [
                pythonScriptPath,
                pdfPath,
                examType || '',
                subject || '',
                topic || '',
                year || ''
            ]);

            let pythonOutput = '';
            let pythonError = '';

            pythonProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                console.log('🐍 Python stdout chunk:', chunk.substring(0, 200));
                pythonOutput += chunk;
            });

            pythonProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                console.log('🐍 Python stderr chunk:', chunk);
                pythonError += chunk;
            });

            pythonProcess.on('error', (error) => {
                console.error('❌ Failed to start Python process:', error);
                return res.status(500).json({
                    error: 'Failed to start PDF processor',
                    details: error.message,
                    hint: 'Make sure Python 3 is installed and PyPDF2 is available (pip3 install PyPDF2)'
                });
            });

            pythonProcess.on('close', async (code) => {
                console.log('🐍 Python process exited with code:', code);
                console.log('📤 Python stdout length:', pythonOutput.length);
                console.log('📤 Python stderr length:', pythonError.length);
                console.log('📝 Full stdout:', pythonOutput);
                console.log('📝 Full stderr:', pythonError);

                // Check if there's any output at all
                if (!pythonOutput || pythonOutput.trim() === '') {
                    console.error('❌ No output from Python script');
                    console.error('Python stderr:', pythonError);
                    return res.status(500).json({
                        error: 'PDF processing failed - no output from extractor',
                        details: pythonError || 'Python script produced no output',
                        hint: 'Make sure PyPDF2 is installed: pip3 install PyPDF2',
                        exitCode: code,
                        debug: {
                            stdout: pythonOutput,
                            stderr: pythonError
                        }
                    });
                }

                // Check for non-zero exit code
                if (code !== 0) {
                    console.error('❌ Python error (exit code:', code, '):', pythonError);
                    return res.status(500).json({
                        error: 'PDF processing failed',
                        details: pythonError || pythonOutput || 'Unknown Python error',
                        exitCode: code,
                        hint: 'Check server logs for detailed Python error messages',
                        debug: {
                            stdout: pythonOutput,
                            stderr: pythonError
                        }
                    });
                }

                try {
                    // Validate JSON before parsing
                    const trimmedOutput = pythonOutput.trim();
                    console.log('📝 First 500 chars of output:', trimmedOutput.substring(0, 500));

                    if (!trimmedOutput.startsWith('{') && !trimmedOutput.startsWith('[')) {
                        throw new Error('Output is not valid JSON. First 100 chars: ' + trimmedOutput.substring(0, 100));
                    }

                    const result = JSON.parse(trimmedOutput);
                    console.log('✅ Successfully parsed JSON result');
                    console.log('📊 Result contains:', Object.keys(result));

                    if (result.error || result.success === false) {
                        console.error('❌ Python script returned error:', result.error);
                        return res.status(500).json({
                            error: result.error || 'PDF processing failed',
                            pythonError: true,
                            details: result.error_type || 'Unknown error type'
                        });
                    }

                    if (!result.questions || !Array.isArray(result.questions)) {
                        console.warn('⚠️ No questions array in result');
                        return res.status(400).json({
                            error: 'No questions extracted from PDF',
                            details: 'The PDF might not contain properly formatted questions',
                            hint: 'Ensure questions are numbered (1., 2., Q1, etc.) with options A, B, C, D'
                        });
                    }

                    console.log('✅ Extracted', result.questions.length, 'questions');

                    // Save questions to database (MongoDB)
                    // ✅ Now returns both savedIds and testId
                    const { savedIds, testId } = await saveQuestionsToDb(result.questions, fileName);
                    console.log('💾 Saved', savedIds.length, 'questions to database with testId:', testId);

                    // Save upload record
                    const uploadRecord = {
                        fileName: fileName,
                        filePath: pdfPath,
                        examType: examType,
                        subject: subject,
                        topic: topic,
                        year: year,
                        notes: notes,
                        questionsExtracted: result.total_questions || result.questions.length,
                        uploadDate: new Date()
                    };

                    await saveUploadRecord(uploadRecord);

                    // Create check for notifications (can implement proper MongoDB notification later)
                    console.log('✅ Notification Logic Skipped (Notifications table deprecated in Mongo migration)');

                    res.json({
                        success: true,
                        message: 'PDF processed successfully',
                        totalQuestions: result.total_questions || result.questions.length,
                        questionsExtracted: result.total_questions || result.questions.length,
                        questions: result.questions,
                        savedQuestionIds: savedIds,
                        testId: testId  // ✅ Return testId so frontend can fetch questions
                    });

                } catch (parseError) {
                    console.error('❌ JSON Parse error:', parseError);
                    console.error('Raw output:', pythonOutput.substring(0, 500));
                    res.status(500).json({
                        error: 'Failed to parse extraction results',
                        details: parseError.message,
                        rawOutput: pythonOutput.substring(0, 500),
                        rawStderr: pythonError.substring(0, 500),
                        hint: 'The Python script output was not valid JSON. Check if PyPDF2 is installed.'
                    });
                }
            });

        } else {
            // Just save upload record without extraction
            console.log('📁 Saving PDF without extraction');
            const uploadRecord = {
                fileName: fileName,
                filePath: pdfPath,
                examType: examType,
                subject: subject,
                topic: topic,
                year: year,
                notes: notes,
                questionsExtracted: 0,
                uploadDate: new Date()
            };

            await saveUploadRecord(uploadRecord);

            res.json({
                success: true,
                message: 'PDF uploaded successfully (extraction disabled)',
                fileName: fileName
            });
        }

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            details: error.message
        });
    }
});

// Helper function to save questions to database (MongoDB)
// ✅ IMPROVEMENT: Now generates a single testId for all questions and returns it
async function saveQuestionsToDb(questions, source = 'PDF_UPLOAD') {
    const savedIds = [];

    // ✅ Generate a single testId for this upload batch
    const timestamp = Date.now();
    const testId = `PDF_${source.replace(/\.[^/.]+$/, '')}_${timestamp}`;

    console.log(`📦 Saving ${questions.length} questions with testId: ${testId}`);

    for (const q of questions) {
        try {
            const options = Array.isArray(q.options)
                ? q.options
                : (typeof q.options === 'string' ? JSON.parse(q.options) : []);

            const newQuestion = new QuestionModel({
                questionText: q.question_text || q.questionText,
                options: options,
                correctAnswer: q.answer || q.correctAnswer || 'A',
                section: q.section || q.subject || 'Physics',
                topic: q.topic || 'General',
                difficulty: q.difficulty || 'Medium',
                marksPositive: q.marks || 4,
                marksNegative: q.negativeMarks || -1,
                testId: testId, // ✅ Use the same testId for all questions in this batch
                questionNumber: q.question_number || (savedIds.length + 1),
                type: 'MCQ'
            });

            const saved = await newQuestion.save();
            savedIds.push(saved._id);
            console.log('✅ Question', q.question_number || savedIds.length, 'saved with ID:', saved._id);
        } catch (err) {
            console.error('❌ Error saving question:', err.message);
        }
    }

    return { savedIds, testId };  // ✅ Return both IDs and testId
}

// Helper function to save upload record (MongoDB)
async function saveUploadRecord(record) {
    try {
        const newUpload = new PdfUpload(record);
        const saved = await newUpload.save();
        console.log('✅ Upload record saved with ID:', saved._id);
        return saved;
    } catch (err) {
        console.error('❌ Error saving upload record:', err.message);
        throw err;
    }
}

// GET /api/pdf/history - Get upload history
router.get('/history', async (req, res) => {
    try {
        // Fetch last 50 uploads
        const uploads = await PdfUpload.find()
            .sort({ uploadDate: -1 })
            .limit(50);

        // Map to frontend expected format if needed, but schema is close enough
        const results = uploads.map(u => ({
            id: u._id,
            file_name: u.fileName,
            exam_type: u.examType,
            subject: u.subject,
            topic: u.topic,
            year: u.year,
            questions_extracted: u.questionsExtracted,
            upload_date: u.uploadDate
        }));

        console.log(`✅ Fetched ${results.length} upload records`);
        res.json({ success: true, uploads: results });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// DELETE /api/pdf/:id - Delete upload record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find by ID
        const upload = await PdfUpload.findById(id);

        if (upload && upload.filePath) {
            // Delete physical file
            if (fs.existsSync(upload.filePath)) {
                try {
                    fs.unlinkSync(upload.filePath);
                    console.log('✅ PDF file deleted:', upload.filePath);
                } catch (e) {
                    console.warn('⚠️ Could not delete file:', e.message);
                }
            }
        }

        // Delete database record
        await PdfUpload.findByIdAndDelete(id);

        console.log('✅ Upload record deleted:', id);
        res.json({ success: true, message: 'Upload deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete upload' });
    }
});

export default router;

