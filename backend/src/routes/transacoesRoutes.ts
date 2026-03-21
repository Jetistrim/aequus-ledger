import { Router } from 'express';
import {
	listarTransacoes,
	atualizarTransacao,
	deletarTransacao,
	deletarTodasTransacoes,
} from '../controllers/transacoesController';

const router = Router();

router.get('/', listarTransacoes);
router.delete('/', deletarTodasTransacoes);
router.patch('/:id', atualizarTransacao);
router.delete('/:id', deletarTransacao);

export default router;
