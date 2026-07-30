import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
// DISABLED FOR MONGODB: import { pool } from '../config/mysql.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * DEPRECATED ROUTES - PDF Upload Handler (MySQL Only)
 * 
 * These routes were used to:
 * 1. Upload PDF files
 * 2. Extract questions using Python OCR
 * 3. Save to MySQL database
 * 
 * Since we've migrated to MongoDB:
 * - PDF uploads are disabled until MongoDB PDF handling is implemented
 * - All endpoints return HTTP 410 Gone (Deprecated)
 * - Contact DevOps to re-enable with MongoDB support
 */

// Configure multer for file uploads (but disable functionality)
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/pdfs');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Main upload route - DISABLED
router.post('/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        // Clean up uploaded file if it was saved
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        
        console.log('⚠️ [DEPRECATED] PDF upload attempted but disabled for MongoDB');
        
        res.status(410).json({
            success: false,
            status: 'deprecated',
            message: 'PDF upload is temporarily disabled during MongoDB migration',
            information: {
                reason: 'MySQL PDF upload handler - requires MongoDB implementation',
                migration_status: 'In Progress - Contact DevOps',
                next_steps: [
                    'MongoDB PDF storage schema pending',
                    'Python OCR integration needed',
                    'Question extraction service being updated',
                    'Expected re-enable: Within 1 week'
                ]
            }
        });
        
    } catch (error) {
        console.error('❌ PDF upload error:', error);
        
        // Cleanup
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'PDF upload is currently unavailable',
            message: error.message
        });
    }
});

// Get upload history - DISABLED
router.get('/history', async (req, res) => {
    try {
        console.log('⚠️ [DEPRECATED] History fetch attempted but disabled');
        
        res.status(410).json({
            success: false,
            status: 'deprecated',
            message: 'PDF upload history is not available during MongoDB migration',
            uploads: []
        });
        
    } catch (error) {
        console.error('❌ Error fetching upload history:', error);
        res.status(500).json({
            success: false,
            error: 'PDF history is currently unavailable'
        });
    }
});

// Delete upload record - DISABLED
router.delete('/delete/:uploadId', async (req, res) => {
    try {
        const { uploadId } = req.params;
        
        console.log('⚠️ [DEPRECATED] Delete attempted but disabled');
        
        res.status(410).json({
            success: false,
            status: 'deprecated',
            message: 'PDF deletion is not available during MongoDB migration',
            uploadId
        });
        
    } catch (error) {
        console.error('❌ Error deleting upload:', error);
        res.status(500).json({
            success: false,
            error: 'PDF deletion is currently unavailable'
        });
    }
});

export default router;