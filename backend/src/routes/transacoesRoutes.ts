import { Router } from 'express';
import { listarTransacoes, atualizarTransacao } from '../controllers/transacoesController';

const router = Router();

router.get('/', listarTransacoes);
router.patch('/:id', atualizarTransacao);

export default router;
