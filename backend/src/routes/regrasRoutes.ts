import { Router } from 'express';
import { listarRegras, criarRegra, atualizarRegra, deletarRegra } from '../controllers/regrasController';

const router = Router();

router.get('/', listarRegras);
router.post('/', criarRegra);
router.put('/:id', atualizarRegra);
router.delete('/:id', deletarRegra);

export default router;
