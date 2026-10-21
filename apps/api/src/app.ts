import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

const getHealthStatus = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'mediledger-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

// Primary health check endpoint
app.get('/health', getHealthStatus);
app.get('/api/health', getHealthStatus);
