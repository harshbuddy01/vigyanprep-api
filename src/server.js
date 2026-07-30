// 🚀 Vigyan.prep Production API Server
import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Middlewares
import { apiLimiter, loginLimiter, paymentLimiter } from './middlewares/rateLimiter.js';
import { validateEnv } from './config/envValidator.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import adminTestRoutes from './routes/adminTestRoutes.js';
import adminTestPricingRoutes from './routes/adminTestPricingRoutes.js';
import adminPyqRoutes from './routes/adminPyqRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import livePreviewRoutes from './routes/livePreviewRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import publicRoutes from './routes/publicRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import examRoutes from './routes/examRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import pdfRoutes from './routes/pdf.js';
import doubtRoutes from './routes/doubtRoutes.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import migrationRoute from './routes/migrationRoute.js';
import { verifyUserFull } from './controllers/paymentController.js';

// Validate environment defaults
validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for GCP/cloud proxies
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vigyanprep.com',
  'https://admin.vigyanprep.com',
  'https://test.vigyanprep.com',
  'https://auth.vigyanprep.com',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in production to prevent user lockouts
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 600
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body Parser & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_API_KEY || '',
    NODE_ENV: process.env.NODE_ENV || 'production',
    API_URL: process.env.API_URL || 'https://api.vigyanprep.com',
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://vigyanprep.com'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Supabase PostgreSQL',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Public Endpoints (Website & Test Engine)
app.use('/api/public', publicRoutes);

// Admin Auth (Public, rate-limited)
app.use('/api/admin/auth', loginLimiter, adminAuthRoutes);

// Specific Admin Features
app.use('/api/admin/pyq', adminPyqRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/tests', adminTestPricingRoutes);
app.use('/api/admin/live-preview', livePreviewRoutes);
app.use('/api/admin/students', studentRoutes);
app.use('/api/admin/transactions', transactionRoutes);
app.use('/api/admin/results', resultRoutes);
app.use('/api/admin/members', memberRoutes);
app.use('/api/admin/questions', questionRoutes);
app.use('/api/admin', migrationRoute);
app.use('/api/admin', adminRoutes);

// Main Student & Payment Features
app.use('/api', apiLimiter, authRoutes);
app.post('/api/verify-user-full', paymentLimiter, verifyUserFull);
app.use('/api/payment', paymentRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/doubt', doubtRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Static assets & root fallback
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));

app.get('/', (req, res) => {
  res.json({
    name: 'Vigyan.prep API',
    status: 'online',
    version: '2.0.0'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Vigyan.prep Production API Server Online`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 API URL: https://api.vigyanprep.com`);
  console.log(`==================================================\n`);
});

export default app;