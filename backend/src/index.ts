import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import uploadRoutes from './routes/uploadRoutes';
import transacoesRoutes from './routes/transacoesRoutes';
import regrasRoutes from './routes/regrasRoutes';
import exportRoutes from './routes/exportRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Garante que as pastas de uploads e exports existam
const EXPORTS_DIR = path.resolve(process.env.EXPORTS_DIR || './exports');
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

app.disable('x-powered-by');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/transacoes', transacoesRoutes);
app.use('/api/regras', regrasRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler (deve ser o último middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

export default app;
