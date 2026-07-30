import express from 'express';
import { getPublicTests, getPublicPyqs, getPublicTestDetails } from '../controllers/publicController.js';

const router = express.Router();

router.get('/tests', getPublicTests);
router.get('/pyq', getPublicPyqs);
router.get('/tests/:id', getPublicTestDetails);

export default router;
