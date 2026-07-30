// 🚀 Vigyan.prep Platform - Backend Server
// ✅ UPDATED: MongoDB Migration Complete!
// 🔥 HOTFIX: Removed broken OPTIONS handler - Jan 25, 2026 7:18 PM IST
// 🔥 PAYMENT FIX: Improved CORS for payment endpoint - Jan 26, 2026 1:55 AM IST
// 🔥 ADMIN AUTH: Added admin authentication routes - Jan 26, 2026 1:59 AM IST

// 🔥 REBOOT LOG: Feb 11, 2026 - 6:53 AM IST
console.log('\n\n🚀🚀🚀 SERVER REBOOTING - NEW VERSION LOADED 🚀🚀🚀');
console.log('Timestamp:', new Date().toISOString(), '\n\n');

import './config/env.js'; // 🔵 LOAD ENV VARS FIRST
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiLimiter, adminLimiter, loginLimiter, paymentLimiter } from './middlewares/rateLimiter.js';
import { validateEnv } from './config/envValidator.js';

// 🛡️ Validate environment before starting
validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛠️ STARTUP LOGGING
const LOG_FILE = path.join(__dirname, '../startup_log.txt');
function logStartup(message) {
    const timestamp = new Date().toISOString();
    console.log(message);
    try {
        fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
    } catch (err) {
        // Ignore logging errors
    }
}

logStartup('🚀 STARTING BACKEND SERVER.JS');
logStartup(`Running on Node ${process.version}`);
logStartup(`Env PORT: ${process.env.PORT}`);
// 🛡️ Debug Helpers
const IS_DEBUG = String(process.env.DEBUG || '').toLowerCase() === 'true';

// 🔍 DEBUG: Log ALL Environment Keys (Only in Debug mode)
if (IS_DEBUG) {
    const envKeys = Object.keys(process.env).sort();
    logStartup(`Available Env Keys: ${envKeys.join(', ')}`);
}

if (IS_DEBUG) {
    console.log('🔵 Loading environment variables...');
}

const app = express();

if (IS_DEBUG) {
    console.log('🔵 Creating Express app...');
}

// 🔧 Enable trust proxy (essential for Railway/Render)
app.set('trust proxy', 1);

// 🛡️ SECURITY HEADERS (Helmet)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Vite assets
    contentSecurityPolicy: false, // Disable for now to avoid breaking Vite/frontend
}));

const PORT = process.env.PORT || 3000;

// Environment validation is handled by config/envValidator.js at the start of this file

// 🔧 CRITICAL FIX #2: ENHANCED CORS Configuration - MUST BE FIRST middleware!
if (IS_DEBUG) {
    console.log('🔵 Setting up CORS...');
}
const allowedOrigins = [
    // Local development
    'http://localhost:5173',
    'http://localhost:3000',
    
    // Whitelisted domains
    'https://vigyanprep.com',
    'https://admin.vigyanprep.com',
    'https://test.vigyanprep.com',
    'https://auth.vigyanprep.com',

    // Environment variable
    process.env.FRONTEND_URL
].filter(Boolean);

// 🔧 ENHANCED: Strict CORS for Production
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman)
        if (!origin) return callback(null, true);

        const isAllowedOrigin = allowedOrigins.includes(origin);

        if (isAllowedOrigin) {
            return callback(null, true);
        }

        console.warn(`❌ CORS Denied: Unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    maxAge: 600,
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// 🔥 PAYMENT FIX: Explicit preflight handling for payment endpoint
app.options('/api/payment/checkout', cors(corsOptions));
app.options('/api/payment/paymentverification', cors(corsOptions));
app.options('/api/payment/getkey', cors(corsOptions));

if (IS_DEBUG) {
    console.log('✅ CORS configured for:', allowedOrigins.filter(Boolean).join(', '));
    console.log('✅ Payment endpoints have explicit preflight handling');
}

// 🛡️ CORS ERROR HANDLER - Maps CORS errors to 403 Forbidden
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS' || err.message === 'Origin "null" is not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation: Access from this origin is not allowed.',
            error: 'Forbidden'
        });
    }
    next(err);
});

// 🔧 INJECT ENVIRONMENT VARIABLES INTO HTML FILES - MUST BE FIRST MIDDLEWARE
// This middleware injects environment variables into the browser at runtime
if (IS_DEBUG) {
    console.log('🔵 Setting up environment injection middleware...');
}
app.use((req, res, next) => {
    // Only intercept HTML file requests
    if ((req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) && !req.path.startsWith('/api/')) {
        const filePath = req.path === '/'
            ? path.join(__dirname, '../index.html')
            : path.join(__dirname, `..${req.path}`);

        try {
            if (fs.existsSync(filePath)) {
                let html = fs.readFileSync(filePath, 'utf8');

                const envScript = `
    <script>
      window.__ENV__ = {
        API_URL: "${process.env.API_URL || 'https://api.vigyanprep.com'}",
        ENVIRONMENT: "${process.env.NODE_ENV || 'production'}",
        DEBUG: ${process.env.DEBUG_MODE === 'true' ? 'true' : 'false'}
      };
      console.log('🔧 Environment loaded:', window.__ENV__);
    </script>`;

                html = html.replace('</head>', envScript + '\n</head>');
                return res.send(html);
            }
        } catch (err) {
            console.warn('⚠️ Error injecting environment:', err.message);
        }
    }
    next();
});
if (IS_DEBUG) {
    console.log('✅ Environment injection middleware ready');
}

// Body parsing middleware - 🛡️ TIGHTENED LIMITS
if (IS_DEBUG) {
    console.log('🔵 Setting up body parsers (2mb limit)...');
}
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Razorpay is initialized in config/razorpay.js
// This prevents circular dependencies
console.log('✅ Server startup sequence continuing...');

// Import routes - Only import files that exist
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import examRoutes from './routes/examRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import migrationRoute from './routes/migrationRoute.js';
import newsRoutes from './routes/newsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import pdfRoutes from './routes/pdf.js';
import userRoutes from './routes/userRoutes.js'; // 🔒 NEW: For student session validation
import analyticsRoutes from './routes/analyticsRoutes.js'; // 📊 NEW: For payment & error logging

// ✅ NEW ADMIN ROUTES - Added Jan 25, 2026
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import adminTestPricingRoutes from './routes/adminTestPricingRoutes.js';
import doubtRoutes from './routes/doubtRoutes.js';
import livePreviewRoutes from './routes/livePreviewRoutes.js';

// 🔧 CONFIG ENDPOINT - CRITICAL FOR PAYMENT GATEWAY
app.get('/api/config', (req, res) => {
    res.json({
        RAZORPAY_KEY_ID: process.env.RAZORPAY_API_KEY || '',
        NODE_ENV: process.env.NODE_ENV || 'production',
        API_URL: process.env.API_URL || 'https://api.vigyanprep.com',
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://vigyanprep.com'
    });
});

// ✅ CRITICAL: Admin auth routes MUST be FIRST (before protected routes)
console.log('🔵 Setting up Admin Auth routes (FIRST - no auth required)...');
app.use('/api/admin/auth', loginLimiter, adminAuthRoutes);
console.log('✅ Admin auth routes mounted - /api/admin/auth/* (PUBLIC)');

app.use('/api/admin', migrationRoute);
console.log('✅ Migration endpoint mounted');

// ✅ NEW ADMIN ROUTES - Full Admin Panel Support (FIXED PATHS)
import adminTestRoutes from './routes/adminTestRoutes.js';

// IMPORTANT: Specific routes MUST come before the generic /api/admin route
app.use('/api/admin/live-preview', adminTestRoutes);
app.use('/api/admin/tests', adminTestPricingRoutes);
import publicRoutes from './routes/publicRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
app.use('/api/public', publicRoutes);
app.use('/api/admin/members', memberRoutes);
app.use('/api/admin/pyq', adminPyqRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/students', studentRoutes);
app.use('/api/admin/transactions', transactionRoutes);
app.use('/api/admin/results', resultRoutes);
app.use('/api/admin', questionRoutes); // ✅ ADDED: Unified question management
app.use('/api/admin/live-preview', livePreviewRoutes); // ✅ ADDED: Live test preview routes
console.log('✅ Live preview routes mounted - /api/admin/live-preview/*');

// Generic Admin API routes (OLD structure) - Mount LAST to avoid collisions
app.use('/api/admin', adminRoutes);
console.log('✅ Admin API routes mounted');

// Mount other API routes
console.log('🔵 Mounting API routes...');
import { verifyUserFull } from './controllers/paymentController.js';

app.use('/api', apiLimiter, authRoutes); // Apply general API rate limit
app.post('/api/verify-user-full', paymentLimiter, verifyUserFull);
console.log('✅ Auth routes mounted - /api/verify-user-full');
// NOTE: adminAuthRoutes already mounted above (before protected admin routes)
app.use('/api/payment', paymentRoutes); // Rate limiting handled inside paymentRoutes.js
console.log('✅ Payment routes mounted - /api/payment/*');
app.use('/api/exam', examRoutes);
console.log('✅ Exam routes mounted - /api/exam/*');
app.use('/api/news', newsRoutes);
console.log('✅ News routes mounted - /api/news/*');
app.use('/api/pdf', pdfRoutes);
app.use('/api/doubt', doubtRoutes);
app.use('/api/user', userRoutes); // 🔒 NEW: Student profile & verification
app.use('/api/analytics', analyticsRoutes); // 📊 NEW: Unified analytics & logging
console.log('✅ Analytics routes mounted - /api/analytics/*');
console.log('✅ PDF routes mounted - /api/pdf/*');

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: 'MongoDB',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve Static Frontend Files
console.log('🔵 Configuring static file serving...');

// 1. Serve 'frontend' folder (CSS, JS, Images)
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// 2. Serve production assets from 'dist/assets'
app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));

// 2. Serve specific HTML files from root
app.get('/:page.html', (req, res) => {
    const filePath = path.join(__dirname, `../${req.params.page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            req.next();
        }
    });
});

// 3. Root endpoint - Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 4. API Info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Vigyan.prep Platform API',
        version: '2.0.0',
        database: 'MongoDB',
        endpoints: {
            health: '/health',
            config: '/api/config',
            admin: '/api/admin',
            payment: '/api/payment',
            exam: '/api/exam',
            news: '/api/news',
            auth: '/api/verify-user-full',
            adminAuth: '/api/admin/auth'
        }
    });
});

// ✅ MONGODB CONNECTION
import { connectDB, isMongoDBConnected } from './config/mongodb.js';

// ✅ Wrap async operations in IIFE

(async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        const dbConnected = await connectDB();
        if (!dbConnected) {
            console.error('❌ CRITICAL: MongoDB not connected!');
            if (process.env.NODE_ENV === 'production') {
                console.error('💀 Exiting due to database connection failure in production.');
                process.exit(1);
            }
            console.warn('⚠️  MongoDB not connected - running in limited mode');
            console.warn('🔗 Some features will not work without MongoDB');
        } else {
            console.log('✅ MongoDB ready - No migrations needed!');
        }

        // 🔴 FIX #7: VALIDATE ROUTES ARE LOADED
        if (!app._router || app._router.stack.length < 10) {
            console.warn('⚠️  Warning: Some routes may not be properly mounted');
        }

        app.listen(PORT, '0.0.0.0', () => {
            const msg = `✅ Server running on port ${PORT}`;
            logStartup(msg);
            logStartup(`Database: ${isMongoDBConnected ? 'Connected' : 'Not Connected'}`);
            console.log(`\n${msg}`);
            console.log(`📊 Database: MongoDB ${isMongoDBConnected ? '(Connected)' : '(Not Connected)'}`);
            console.log(`📏 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 API URL: ${process.env.API_URL || 'http://localhost:' + PORT}`);
            console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
            console.log('\n🟢 Server is ready to accept requests\n');
        });
    } catch (error) {
        console.error('❌ Server startup issue:', error.message);
        console.error('📝 Full error:', error);
        console.warn('⚠️ Server will attempt to continue running...');

        // Try to start the server anyway on a basic port
        try {
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`\n⚠️ Server running on port ${PORT} in degraded mode`);
                console.log('🔗 Some features may not work correctly\n');
            });
        } catch (listenErr) {
            console.error('❌ Could not start server:', listenErr.message);
        }
    }
})();

export default app;