import { Request, Response } from 'express';
import { UserService } from '../services';
import { UserRole, UpdateUserRequest } from '../models';
import Joi from 'joi';

export class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const users = await this.userService.getAllUsersAsync();
      res.json(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { userId } = req.params;
      const user = await this.userService.getUserByIdAsync(userId);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { userId } = req.params;

      const schema = Joi.object({
        role: Joi.number().valid(1, 2, 3).required(),
        isActive: Joi.boolean().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      const request: UpdateUserRequest = value;
      
      const user = await this.userService.getUserByIdAsync(userId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const updated = await this.userService.updateUserAsync(userId, {
        role: request.role,
        isActive: request.isActive
      });

      if (updated) {
        res.json({ message: 'User updated successfully' });
      } else {
        res.status(500).json({ message: 'Failed to update user' });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { userId } = req.params;

      const user = await this.userService.getUserByIdAsync(userId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const deleted = await this.userService.deleteUserAsync(userId);

      if (deleted) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}