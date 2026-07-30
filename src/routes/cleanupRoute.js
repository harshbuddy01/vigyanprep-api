import express from 'express';
// DISABLED FOR MONGODB: import { pool } from '../config/mysql.js';

const router = express.Router();

/**
 * DEPRECATED ROUTE - Cleanup Helper (MySQL Only)
 * 
 * This route was used for administrative cleanup of corrupted questions in MySQL.
 * Since we've migrated to MongoDB, this endpoint is no longer needed.
 * 
 * MongoDB automatically handles data validation and schema enforcement.
 * 
 * If you need to cleanup questions in MongoDB:
 * 1. Use MongoDB validation rules
 * 2. Use MongoDB aggregation pipeline
 * 3. Contact DevOps for data cleanup
 */

router.get('/cleanup-questions', async (req, res) => {
  try {
    console.log('\u26a0\ufe0f [DEPRECATED] Cleanup route called but disabled for MongoDB');
    
    res.status(410).json({
      success: false,
      status: 'deprecated',
      message: 'This cleanup endpoint is deprecated. MongoDB migration is complete.',
      information: {
        reason: 'MySQL admin helper - no longer needed for MongoDB',
        migration_status: 'Complete - All data migrated to MongoDB',
        next_steps: [
          'MongoDB schema validation is automatically enforced',
          'Use MongoDB Atlas for data cleanup',
          'Use aggregation pipeline for bulk operations',
          'Contact DevOps if manual cleanup needed'
        ]
      }
    });

  } catch (error) {
    console.error('\u274c Cleanup route error:', error);
    res.status(500).json({
      success: false,
      error: 'This endpoint is deprecated and no longer functional',
      message: error.message
    });
  }
});

router.delete('/cleanup-questions/all', async (req, res) => {
  try {
    console.log('\u26a0\ufe0f [DEPRECATED] Bulk delete attempted but disabled');
    
    res.status(410).json({
      success: false,
      status: 'deprecated',
      message: 'This bulk delete endpoint is disabled',
      warning: 'This is a destructive operation and is not allowed through the API'
    });

  } catch (error) {
    console.error('\u274c Error:', error);
    res.status(500).json({
      success: false,
      error: 'This endpoint is deprecated and no longer functional'
    });
  }
});

export default router;