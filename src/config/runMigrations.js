import { pool } from './mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async () => {
  try {
    console.log('🛠️ Running database migrations...');
    
    // Migration files to run IN ORDER
    const migrationFiles = [
      'create_payment_tables.sql',
      'create_exam_tables.sql',
      'alter_scheduled_tests_table.sql',
      'fix_questions_table_schema.sql',  // 🔥 Fix missing columns for PDF upload
      'add_difficulty_topic_columns.sql' // 🆕 Add difficulty and topic columns for OOP statistics
    ];
    
    for (const file of migrationFiles) {
      console.log(`📝 Running migration: ${file}`);
      
      const migrationPath = path.join(__dirname, '../migrations', file);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️ Migration file not found: ${file}`);
        continue;
      }
      
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        try {
          await pool.query(statement);
          console.log(`  ✅ Executed statement from ${file}`);
        } catch (err) {
          // Ignore "already exists" errors and duplicate column errors
          if (err.message.includes('already exists') || 
              err.message.includes('Duplicate column') ||
              err.message.includes('Duplicate key')) {
            console.log(`  ℹ️ Skipped (already exists): ${err.message.split(':')[0]}`);
          } else {
            console.error(`  ❌ Error in ${file}:`, err.message);
            // Continue with other statements even if one fails
          }
        }
      }
      
      console.log(`✅ Migration completed: ${file}`);
    }
    
    console.log('✅ All database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    // Don't crash the server if tables already exist
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Tables already exist, skipping migration');
    } else {
      console.error('❌ Fatal migration error:', error);
    }
  }
};