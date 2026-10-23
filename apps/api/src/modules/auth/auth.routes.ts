import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/logout', requireAuth, (req, res) => authController.logout(req, res));
authRouter.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
