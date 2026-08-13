import express from 'express';
import multer from 'multer';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';
import {
  uploadAndParsePdf,
  approveAndPublishPyq,
  publishPyq,
  unpublishPyq,
  cropManualDiagram,
  getPyqList,
  getTestQuestions,
  updateQuestion,
  deleteQuestion,
  updateTest,
  deleteTest
} from '../controllers/adminPyqController.js';

const router = express.Router();
router.use(verifyAdminAuth); // 🔒 Protect all PYQ admin endpoints

const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

router.post('/upload-pdf', upload.single('file'), uploadAndParsePdf);
router.post('/approve-publish', approveAndPublishPyq);
router.get('/list', getPyqList);
router.get('/test/:testId/questions', getTestQuestions);
router.put('/question/:id', updateQuestion);
router.delete('/question/:id', deleteQuestion);
router.put('/test/:id', updateTest);
router.delete('/test/:id', deleteTest);
router.post('/publish/:id', publishPyq);
router.post('/unpublish/:id', unpublishPyq);
router.post('/crop-manual', cropManualDiagram);

export default router;
