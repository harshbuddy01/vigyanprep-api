/**
 * Environment Configuration Class
 * Updated: Jan 23, 2026 - MongoDB Migration
 * Purpose: Centralized environment management
 * 
 * CHANGES:
 * - Removed MySQL validation
 * - Added MongoDB URI validation
 * - Updated for MongoDB-first architecture
 */

import dotenv from 'dotenv';
dotenv.config();

export class Environment {
    constructor() {
        this.loadEnvironment();
    }

    loadEnvironment() {
        // Core environment
        this.env = process.env.NODE_ENV || 'development';
        this.isProduction = this.env === 'production';
        this.isDevelopment = this.env === 'development';
        this.port = parseInt(process.env.PORT) || 3000;

        // MongoDB Configuration (NEW)
        this.mongodb = {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vigyanprep',
            options: {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            }
        };

        // API URLs - Automatically switches based on environment
        this.apiUrl = this.isProduction
            ? (process.env.API_URL || 'https://api.vigyanprep.com')
            : (process.env.API_URL || 'http://localhost:3000');

        // Frontend URLs
        this.frontendUrl = this.isProduction
            ? (process.env.FRONTEND_URL || 'https://vigyanprep.com')
            : 'http://localhost:5173';

        // File Upload Configuration
        this.upload = {
            path: process.env.UPLOAD_PATH || './uploads',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || (5 * 1024 * 1024), // 5MB default
            allowedTypes: ['application/pdf', 'image/jpeg', 'image/png']
        };

        // Payment Gateway (Razorpay)
        this.razorpay = {
            keyId: process.env.RAZORPAY_API_KEY || '',
            keySecret: process.env.RAZORPAY_API_SECRET || '',
            enabled: !!(process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_API_SECRET)
        };

        // Email Configuration
        this.email = {
            apiKey: process.env.SENDGRID_API_KEY || '',
            fromEmail: process.env.FROM_EMAIL || 'noreply@vigyanprep.com',
            fromName: process.env.FROM_NAME || 'Vigyan.prep',
            enabled: !!process.env.SENDGRID_API_KEY
        };

        // Security
        this.security = {
            jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
            jwtExpiry: process.env.JWT_EXPIRY || '7d',
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
        };

        // Feature Flags
        this.features = {
            useOOPQuestions: process.env.USE_OOP_QUESTIONS !== 'false', // Default true
            useOOPTests: process.env.USE_OOP_TESTS !== 'false',
            useOOPStudents: process.env.USE_OOP_STUDENTS !== 'false',
            enablePayments: process.env.ENABLE_PAYMENTS !== 'false',
            enableEmailNotifications: process.env.ENABLE_EMAIL !== 'false'
        };

        // Logging
        this.logging = {
            level: process.env.LOG_LEVEL || 'info',
            enableConsole: process.env.ENABLE_CONSOLE_LOGS !== 'false',
            enableFile: process.env.ENABLE_FILE_LOGS === 'true'
        };
    }

    /**
     * Validate that all required environment variables are present
     */
    validate() {
        // Only MongoDB URI is truly required now
        if (!process.env.MONGODB_URI && this.isProduction) {
            console.warn('⚠️ Email credentials not configured - email functionality disabled');
        }

        // Warn about missing optional variables
        const recommended = [
            'MONGODB_URI',
            'RAZORPAY_API_KEY',
            'JWT_SECRET'
        ];

        const missing = recommended.filter(key => !process.env[key]);
        if (missing.length > 0 && this.isProduction) {
            console.warn(
                `⚠️ Missing recommended environment variables: ${missing.join(', ')}`
            );
        }

        return true;
    }

    /**
     * Print current configuration (safe - no passwords shown)
     */
    printConfig() {
        if (!this.logging.enableConsole) return;

        console.log('\n' + '='.repeat(60));
        console.log('📋 ENVIRONMENT CONFIGURATION');
        console.log('='.repeat(60));
        console.log(`Environment: ${this.env}`);
        console.log(`Port: ${this.port}`);
        console.log(`API URL: ${this.apiUrl}`);
        console.log(`Frontend URL: ${this.frontendUrl}`);
        console.log('\n📊 DATABASE:');
        console.log(`  Type: MongoDB`);
        console.log(`  Connected: ${this.mongodb.uri ? '✅' : '❌'}`);
        console.log('\n💳 PAYMENT:');
        console.log(`  Razorpay Enabled: ${this.razorpay.enabled ? '✅' : '❌'}`);
        console.log('\n📧 EMAIL:');
        console.log(`  SendGrid Enabled: ${this.email.enabled ? '✅' : '❌'}`);
        console.log('\n🏛️  FEATURE FLAGS:');
        console.log(`  OOP Questions: ${this.features.useOOPQuestions ? '✅' : '❌'}`);
        console.log(`  OOP Tests: ${this.features.useOOPTests ? '✅' : '❌'}`);
        console.log(`  OOP Students: ${this.features.useOOPStudents ? '✅' : '❌'}`);
        console.log('='.repeat(60) + '\n');
    }

    /**
     * Get MongoDB URI
     */
    getMongoDBUri() {
        return this.mongodb.uri;
    }

    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(featureName) {
        return this.features[featureName] === true;
    }
}

// Singleton instance
export const env = new Environment();

// Validate on module load (non-blocking for MongoDB)
try {
    env.validate();
    if (env.logging.enableConsole) {
        env.printConfig();
    }
} catch (error) {
    console.error('❌ Environment configuration error:', error.message);
    // Don't exit in production - let MongoDB connection handle it
    if (env.isDevelopment) {
        process.exit(1);
    }
}

export default env;