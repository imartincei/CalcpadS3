import { Request, Response } from 'express';
import { TagsService } from '../services';
import { UserRole, CreateTagRequest } from '../models';
import Joi from 'joi';

export class TagsController {
  private tagsService: TagsService;

  constructor(tagsService: TagsService) {
    this.tagsService = tagsService;
  }

  getAllTags = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const tags = await this.tagsService.getAllTagsAsync();
      res.json(tags);
    } catch (error) {
      console.error('Error getting all tags:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  createTag = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const schema = Joi.object({
        name: Joi.string().min(1).max(50).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      const request: CreateTagRequest = value;
      const tag = await this.tagsService.createTagAsync(request);
      
      res.status(201).json(tag);
    } catch (error) {
      console.error('Error creating tag:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  deleteTag = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { id } = req.params;
      const tagId = parseInt(id, 10);

      if (isNaN(tagId)) {
        res.status(400).json({ message: 'Invalid tag ID' });
        return;
      }

      const tag = await this.tagsService.getTagByIdAsync(tagId);
      if (!tag) {
        res.status(404).json({ message: 'Tag not found' });
        return;
      }

      const deleted = await this.tagsService.deleteTagAsync(tagId);

      if (deleted) {
        res.json({ message: 'Tag deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete tag' });
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}