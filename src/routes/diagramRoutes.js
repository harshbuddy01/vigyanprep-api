import express from 'express';
import { renderTikz, uploadDiagram, getTemplates } from '../controllers/diagramController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// Protected Routes
router.post('/render-tikz', verifyAdminAuth, renderTikz);
router.post('/upload', verifyAdminAuth, uploadDiagram);
router.get('/templates', verifyAdminAuth, getTemplates);

export default router;
