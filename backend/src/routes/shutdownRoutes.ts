import { Router } from 'express';

import { desligarSistema } from '../controllers/shutdownController';

const router = Router();

router.post('/', desligarSistema);

export default router;
