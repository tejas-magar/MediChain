import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { UserRole } from '@prisma/client';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { associationRouter } from './modules/associations/associations.routes.js';
import { documentRouter } from './modules/documents/documents.routes.js';
import { documentController } from './modules/documents/documents.controller.js';
import { requireAuth, requireRole } from './middleware/auth.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS configuration supporting credentials (cookies)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server-side session configuration
const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    conString: env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: false, // Managed by Prisma migrations
  }),
  name: 'mediledger.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

app.use(sessionMiddleware);

// Health check endpoints
const getHealthStatus = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'mediledger-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

app.get('/health', getHealthStatus);
app.get('/api/health', getHealthStatus);

// Authentication & Identity Module
app.use('/api/auth', authRouter);

// Patient-to-Provider Associations Module
app.use('/api/associations', associationRouter);

// Medical Documents & Issuance Module
app.use('/api/documents', documentRouter);

// Public Zero-Knowledge Document Verification Endpoint
app.get('/api/verify/:token', (req: Request, res: Response) => {
  documentController.verifyByToken(req, res);
});

// Role Guard verification test routes (used by integration tests)
app.get('/api/test/doctor-only', requireAuth, requireRole(UserRole.DOCTOR), (_req: Request, res: Response) => {
  res.status(200).json({ access: 'granted', role: UserRole.DOCTOR });
});

app.get('/api/test/lab-only', requireAuth, requireRole(UserRole.TESTING_LAB), (_req: Request, res: Response) => {
  res.status(200).json({ access: 'granted', role: UserRole.TESTING_LAB });
});

app.get('/api/test/patient-only', requireAuth, requireRole(UserRole.PATIENT), (_req: Request, res: Response) => {
  res.status(200).json({ access: 'granted', role: UserRole.PATIENT });
});
