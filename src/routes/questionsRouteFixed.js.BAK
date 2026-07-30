/**
 * FIXED QUESTIONS ROUTE
 * Properly handles JSON parsing errors and returns questions safely
 * Date: 2025-12-29
 */

import express from 'express';
import { pool } from '../config/mysql.js';
import { safeJsonParse, safeStringify } from '../utils/safeJsonParse.js';

const router = express.Router();

// GET all questions - FIXED VERSION
router.get('/questions-fixed', async (req, res) => {
    try {
        console.log('🔍 [QUESTIONS-FIXED] Fetching questions from database...');
        
        const subject = req.query.subject || '';
        const difficulty = req.query.difficulty || '';
        const search = req.query.search || '';
        
        let query = 'SELECT * FROM questions';
        let conditions = [];
        let params = [];
        
        if (subject) {
            conditions.push('section = ?');
            params.push(subject);
        }
        if (difficulty) {
            conditions.push('difficulty = ?');
            params.push(difficulty);
        }
        if (search) {
            conditions.push('(question_text LIKE ? OR test_id LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY id DESC LIMIT 100';
        
        const [rows] = await pool.query(query, params);
        console.log(`📊 [QUESTIONS-FIXED] Found ${rows.length} rows from database`);
        
        // Safely map questions with proper error handling
        const questions = [];
        
        for (let i = 0; i < rows.length; i++) {
            const q = rows[i];
            
            try {
                // Safe JSON parse for options
                const options = safeJsonParse(q.options, []);
                
                // Skip questions with no valid options
                if (!Array.isArray(options) || options.length === 0) {
                    console.warn(`⚠️ [QUESTIONS-FIXED] Question ${q.id} has no valid options, skipping`);
                    continue;
                }
                
                questions.push({
                    id: q.id,
                    subject: q.section || 'Physics',
                    topic: q.topic || 'General',
                    difficulty: q.difficulty || 'Medium',
                    marks: q.marks_positive || 4,
                    question: q.question_text || '',
                    type: 'MCQ',
                    options: options,
                    answer: q.correct_answer || '',
                    testId: q.test_id || 'UNKNOWN'
                });
            } catch (mappingError) {
                console.error(`❌ [QUESTIONS-FIXED] Error mapping question ${q.id}:`, mappingError.message);
                continue;
            }
        }
        
        console.log(`✅ [QUESTIONS-FIXED] Successfully processed ${questions.length} questions`);
        res.json({ questions });
        
    } catch (error) {
        console.error('❌ [QUESTIONS-FIXED] Fatal error:', error);
        res.status(500).json({
            questions: [],
            error: error.message,
            message: 'Failed to fetch questions. Please check server logs.'
        });
    }
});

export default router;
