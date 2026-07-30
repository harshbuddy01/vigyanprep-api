import express from 'express';
import multer from 'multer';
import { uploadAndParsePdf, approveAndPublishPyq, getPyqList } from '../controllers/adminPyqController.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

router.post('/upload-pdf', upload.single('file'), uploadAndParsePdf);
router.post('/approve-publish', approveAndPublishPyq);
router.get('/list', getPyqList);

export default router;
