import express from 'express';
import { execFile } from 'child_process';  // ✅ SECURITY FIX: Use execFile instead of exec
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Extract text from PDF
// ✅ SECURITY FIX (Issue #46): Using execFile to prevent command injection
router.post('/extract', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const pythonScript = path.join(__dirname, '../python/pdf_processor.py');

    console.log('📄 Extracting text from PDF:', req.file.originalname);

    // ✅ SECURITY: execFile with argument array - no shell injection possible
    execFile('python3', [pythonScript, pdfPath], (error, stdout, stderr) => {
      try { fs.unlinkSync(pdfPath); } catch (e) { }

      if (error) {
        console.error('❌ Python extraction error:', stderr);
        return res.status(500).json({ error: 'Failed to extract PDF text', details: stderr });
      }

      try {
        const result = JSON.parse(stdout);
        console.log('✅ PDF text extracted successfully');
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse extraction result', output: stdout });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert text to questions using AI
// ✅ SECURITY FIX (Issue #46): Using execFile to prevent command injection
router.post('/convert-questions', async (req, res) => {
  try {
    const { text, apiKey } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const pythonScript = path.join(__dirname, '../python/ai_converter.py');
    const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(400).json({ error: 'No AI API key configured' });
    }

    console.log('🤖 Converting text to questions using AI...');

    // ✅ SECURITY: No manual escaping needed - execFile handles it safely
    const textChunk = text.substring(0, 4000);

    // ✅ SECURITY: Arguments as array - completely safe from command injection
    execFile('python3', [pythonScript, textChunk, geminiApiKey],
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: 'Failed to convert text to questions', details: stderr });
        }

        try {
          const result = JSON.parse(stdout);
          console.log(`✅ Generated ${result.count || 0} questions`);
          res.json(result);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse AI response', output: stdout });
        }
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full process: PDF → Text → Questions
// ✅ SECURITY FIX (Issue #46): Using execFile to prevent command injection
router.post('/full-process', upload.single('pdf'), async (req, res) => {
  const pdfPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pythonExtractor = path.join(__dirname, '../python/pdf_processor.py');
    const pythonConverter = path.join(__dirname, '../python/ai_converter.py');
    const geminiApiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

    console.log('📄 Starting full PDF processing pipeline...');

    // ✅ SECURITY: execFile prevents command injection
    execFile('python3', [pythonExtractor, pdfPath], (extractError, extractStdout, extractStderr) => {
      try { fs.unlinkSync(pdfPath); } catch (e) { }

      if (extractError) {
        return res.status(500).json({ error: 'Failed to extract PDF text', details: extractStderr });
      }

      try {
        const extractResult = JSON.parse(extractStdout);
        const text = extractResult.text;

        if (!text) {
          return res.status(400).json({ error: 'No text extracted from PDF' });
        }

        console.log('✅ Text extracted, converting to questions...');

        // ✅ SECURITY: No manual escaping needed with execFile
        const textChunk = text.substring(0, 4000);

        // ✅ SECURITY: Arguments as array - safe from command injection
        execFile('python3', [pythonConverter, textChunk, geminiApiKey],
          { maxBuffer: 1024 * 1024 * 10 },
          (convertError, convertStdout, convertStderr) => {
            if (convertError) {
              return res.status(500).json({ error: 'Failed to convert text to questions', details: convertStderr, extractedText: text });
            }

            try {
              const convertResult = JSON.parse(convertStdout);
              console.log(`✅ Pipeline complete! Generated ${convertResult.count || 0} questions`);

              res.json({
                success: true,
                extractedText: text,
                questions: convertResult.questions,
                questionCount: convertResult.count
              });
            } catch (e) {
              res.status(500).json({ error: 'Failed to parse AI response', extractedText: text, output: convertStdout });
            }
          }
        );
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse extraction result', output: extractStdout });
      }
    });
  } catch (err) {
    if (pdfPath) { try { fs.unlinkSync(pdfPath); } catch (e) { } }
    res.status(500).json({ error: err.message });
  }
});

export default router;