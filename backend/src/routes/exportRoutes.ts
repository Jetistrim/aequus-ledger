import { Router } from 'express';
import { exportarExtratos, downloadArquivo } from '../controllers/exportController';

const router = Router();

router.post('/', exportarExtratos);
router.get('/download', downloadArquivo);

export default router;
