import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

/**
 * Cria a aplicação Express base do backend.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }));
  app.use(express.json({ limit: '1mb' }));

  return app;
}
