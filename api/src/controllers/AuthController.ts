import { Request, Response } from 'express';
import { UserService } from '../services';
import { LoginRequest, RegisterRequest, UserRole } from '../models';
import Joi from 'joi';

export class AuthController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      const loginRequest: LoginRequest = value;
      const authResponse = await this.userService.loginAsync(loginRequest);

      if (!authResponse) {
        console.error('Login failed for username:', loginRequest.username);
        res.status(401).json({ message: 'Invalid username or password' });
        return;
      }

      res.json(authResponse);
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only admins can register new users
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role: Joi.number().valid(1, 2, 3).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      const registerRequest: RegisterRequest = value;
      const authResponse = await this.userService.registerAsync(registerRequest);

      if (!authResponse) {
        res.status(400).json({ message: 'Username or email already exists' });
        return;
      }

      res.json(authResponse);
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const user = await this.userService.getUserByIdAsync(req.userContext.userId);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}