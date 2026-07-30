/**
 * STARTUP FIXES
 * Runs all database fixes and cleanups when server starts
 * Date: 2025-12-29
 */

import { fixTestIdColumn } from './migrations/auto-fix-test-id.js';
import { fixCorruptedQuestions } from './migrations/fix_corrupted_questions.js';

export async function runStartupFixes() {
    console.log('\n🔧 Running startup fixes...');
    
    try {
        // Fix 1: Migrate test_id and correct_answer columns
        await fixTestIdColumn();
        
        // Fix 2: Cleanup corrupted questions
        await fixCorruptedQuestions();
        
        console.log('✅ All startup fixes completed!\n');
    } catch (error) {
        console.error('❌ Startup fixes error:', error.message);
        console.error('💡 Server will continue, but some features may not work properly');
    }
}
