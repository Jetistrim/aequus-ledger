import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/uploadMiddleware';
import { uploadArquivo } from '../controllers/uploadController';

const router = Router();

router.post('/', uploadMiddleware, uploadArquivo);

export default router;
