import express from 'express';
import multer from 'multer';
import {
  uploadAndParsePdf,
  approveAndPublishPyq,
  getPyqList,
  getTestQuestions,
  updateQuestion,
  deleteQuestion,
  updateTest,
  deleteTest
} from '../controllers/adminPyqController.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

router.post('/upload-pdf', upload.single('file'), uploadAndParsePdf);
router.post('/approve-publish', approveAndPublishPyq);
router.get('/list', getPyqList);
router.get('/test/:testId/questions', getTestQuestions);
router.put('/question/:id', updateQuestion);
router.delete('/question/:id', deleteQuestion);
router.put('/test/:id', updateTest);
router.delete('/test/:id', deleteTest);

export default router;
