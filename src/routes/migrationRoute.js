import express from 'express';
// DISABLED FOR MONGODB: import { pool } from '../config/mysql.js';

const router = express.Router();

/**
 * DEPRECATED ROUTE - Migration Helper (MySQL Only)
 * 
 * This route was used to add difficulty and topic columns to MySQL tables.
 * Since we've migrated to MongoDB, this endpoint is no longer needed.
 * 
 * MongoDB already supports these fields natively in the schema.
 * 
 * If you need to run migrations in MongoDB:
 * 1. Use MongoDB schema validation
 * 2. Use Mongoose schema updates
 * 3. Use database index management tools
 */

router.get('/run-difficulty-migration', async (req, res) => {
  try {
    console.log('⚠️ [DEPRECATED] Migration route called but disabled for MongoDB');

    res.status(410).json({
      success: false,
      status: 'deprecated',
      message: 'This migration endpoint is deprecated. MongoDB migration is complete.',
      information: {
        reason: 'MySQL migration helper - no longer needed for MongoDB',
        migration_status: 'Complete - All data migrated to MongoDB',
        next_steps: [
          'If you need to manage MongoDB schema, use MongoDB Atlas',
          'If you need to add indexes, use MongoDB index management',
          'If you need to migrate data, contact DevOps'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Migration route error:', error);
    res.status(500).json({
      success: false,
      error: 'This endpoint is deprecated and no longer functional',
      message: error.message
    });
  }
});


// ==================== SYNC STUDENTS (One-time Fix) ====================
import Student from '../models/Student.js';
import { StudentPayment } from '../models/StudentPayment.js';

const extractFirstName = (email) => {
  try {
    if (!email || typeof email !== 'string') return 'User';
    const emailParts = email.split('@');
    if (emailParts.length < 2) return 'User';
    const username = emailParts[0];
    const nameParts = username.split('.');
    const firstName = nameParts[0] || 'User';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  } catch (error) {
    return 'User';
  }
};

router.get('/sync-students', async (req, res) => {
  try {
    console.log('🔄 [MIGRATION] Starting Student Sync...');

    // 1. Fetch all student payments (source of truth for roll numbers)
    const payments = await StudentPayment.find({});
    console.log(`Found ${payments.length} student payment records`);

    let syncedCount = 0;
    let errors = 0;

    for (const p of payments) {
      try {
        const firstName = extractFirstName(p.email);

        // Upsert to Student collection
        await Student.findOneAndUpdate(
          { email: p.email },
          {
            $set: {
              email: p.email,
              rollNumber: p.roll_number,
              fullName: firstName,
              lastLoginAt: p.updated_at || new Date()
            },
            $setOnInsert: {
              createdAt: p.created_at || new Date()
            }
          },
          { upsert: true, new: true }
        );
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync ${p.email}:`, err.message);
        errors++;
      }
    }

    console.log(`✅ [MIGRATION] Sync Complete. Synced: ${syncedCount}, Errors: ${errors}`);

    res.json({
      success: true,
      message: 'Student sync completed',
      stats: {
        total: payments.length,
        synced: syncedCount,
        errors
      }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;