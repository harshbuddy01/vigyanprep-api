import express from 'express';

const router = express.Router();

router.post('/ask', (req, res) => res.json({ success: true, message: 'Doubt received' }));
router.get('/history/:email', (req, res) => res.json({ success: true, doubts: [] }));
router.delete('/:id', (req, res) => res.json({ success: true }));

export default router;
