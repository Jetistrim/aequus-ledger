import { Router } from 'express';
import { listarRegras, criarRegra, atualizarRegra, deletarRegra, testarRegras } from '../controllers/regrasController';

const router = Router();

router.get('/', listarRegras);
router.post('/teste', testarRegras);
router.post('/', criarRegra);
router.put('/:id', atualizarRegra);
router.delete('/:id', deletarRegra);

export default router;
