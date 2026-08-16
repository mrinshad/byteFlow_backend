import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, username, password } = req.body;
      const result = await AuthService.register({ name, username, password });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login({ username, password });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getProfile(userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getRegistrationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await AuthService.getRegistrationStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}
