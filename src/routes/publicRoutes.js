import express from 'express';
import { getPublicTests, getPublicPyqs, getPublicPlans, getPublicTestDetails, getPublicSettings, updatePublicSettings } from '../controllers/publicController.js';

const router = express.Router();

router.get('/tests', getPublicTests);
router.get('/pyq', getPublicPyqs);
router.get('/plans', getPublicPlans);
router.get('/tests/:id', getPublicTestDetails);
router.get('/settings', getPublicSettings);
router.post('/settings', updatePublicSettings);

export default router;
