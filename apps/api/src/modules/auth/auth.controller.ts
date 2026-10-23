import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.schemas.js';

export class AuthController {
  /**
   * POST /api/auth/register
   * Registers a new user and automatically establishes an authenticated session.
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
        return;
      }

      const { user, privateKeyPem } = await authService.registerUser(parseResult.data);

      // Establish session
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.userEmail = user.email;

      res.status(201).json({
        message: 'Account successfully registered.',
        user,
        ...(privateKeyPem ? { issuerPrivateKeyPem: privateKeyPem } : {}),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      console.error('[AuthController.register] Unexpected error:', err);
      res.status(500).json({ error: 'Internal server error during registration.' });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates credentials, regenerates session to prevent fixation, and stores session data.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        });
        return;
      }

      const user = await authService.loginUser(parseResult.data);

      // Regenerate session ID to mitigate session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('[AuthController.login] Session regeneration failed:', err);
          res.status(500).json({ error: 'Session initialization failed.' });
          return;
        }

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.userEmail = user.email;

        res.status(200).json({
          message: 'Login successful.',
          user,
        });
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      console.error('[AuthController.login] Unexpected error:', err);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  }

  /**
   * POST /api/auth/logout
   * Destroys current session and clears the HTTP-only session cookie.
   */
  async logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        console.error('[AuthController.logout] Session destruction error:', err);
        res.status(500).json({ error: 'Failed to destroy session.' });
        return;
      }

      res.clearCookie('mediledger.sid', { path: '/' });
      res.status(200).json({ message: 'Logged out successfully.' });
    });
  }

  /**
   * GET /api/auth/me
   * Returns profile data of the currently logged-in user.
   */
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.session || !req.session.userId) {
        res.status(401).json({ error: 'Not authenticated.', code: 'AUTH_REQUIRED' });
        return;
      }

      const user = await authService.getUserById(req.session.userId);
      if (!user) {
        // Stale session pointing to deleted user
        req.session.destroy(() => {});
        res.status(401).json({ error: 'User account no longer exists.', code: 'USER_NOT_FOUND' });
        return;
      }

      res.status(200).json({ user });
    } catch (err: any) {
      console.error('[AuthController.getMe] Unexpected error:', err);
      res.status(500).json({ error: 'Internal server error retrieving session profile.' });
    }
  }
}

export const authController = new AuthController();
