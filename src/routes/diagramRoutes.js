import express from 'express';
import { renderTikz, uploadDiagram, getTemplates } from '../controllers/diagramController.js';
import { adminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

// Public / Protected Routes
router.post('/render-tikz', adminAuth, renderTikz);
router.post('/upload', adminAuth, uploadDiagram);
router.get('/templates', adminAuth, getTemplates);

export default router;
