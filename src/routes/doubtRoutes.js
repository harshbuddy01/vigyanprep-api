import express from 'express';
import { askDoubt, getDoubtHistory, deleteDoubt } from '../controllers/doubtController.js';

const router = express.Router();

// Publicly reachable for now, but student logic handles access
router.post('/ask', askDoubt);
router.get('/history/:email', getDoubtHistory);
router.delete('/:id', deleteDoubt);

export default router;
