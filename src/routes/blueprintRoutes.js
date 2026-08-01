import express from 'express';
import { getBlueprints, getBlueprintById, saveBlueprint } from '../controllers/blueprintController.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

router.get('/', getBlueprints);
router.get('/:id', getBlueprintById);
router.post('/save', saveBlueprint);

export default router;
