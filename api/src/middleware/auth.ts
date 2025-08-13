import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt';
import { UserRole, UserContext } from '../models';

declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

export class AuthMiddleware {
  private jwtService: JwtService;

  constructor(jwtService: JwtService) {
    this.jwtService = jwtService;
  }

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization header missing or invalid' });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const payload = this.jwtService.verifyToken(token);

    if (!payload) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    req.userContext = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role as UserRole
    };

    next();
  };

  requireRole = (requiredRole: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Check if user has sufficient role (higher number = higher privilege)
      if (req.userContext.role < requiredRole) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      next();
    };
  };
}