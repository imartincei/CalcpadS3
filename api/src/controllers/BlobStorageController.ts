import { Request, Response } from 'express';
import { BlobStorageService } from '../services';
import { UserRole, TagsUpdateRequest } from '../models';
import Joi from 'joi';
import { Readable } from 'stream';

export class BlobStorageController {
  private blobStorageService: BlobStorageService;

  constructor(blobStorageService: BlobStorageService) {
    this.blobStorageService = blobStorageService;
  }

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Contributor) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: 'No file provided' });
        return;
      }

      const tags = req.body.tags ? JSON.parse(req.body.tags) : undefined;
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : undefined;

      const fileStream = Readable.from(req.file.buffer);
      
      const fileName = await this.blobStorageService.uploadFileAsync(
        req.file.originalname,
        fileStream,
        req.userContext,
        req.file.mimetype,
        tags,
        metadata
      );

      res.json({ fileName, message: 'File uploaded successfully' });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  downloadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const fileStream = await this.blobStorageService.downloadFileAsync(fileName, req.userContext);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Admin) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const deleted = await this.blobStorageService.deleteFileAsync(fileName, req.userContext);

      if (deleted) {
        res.json({ message: `File '${fileName}' deleted successfully` });
      } else {
        res.status(500).json({ message: 'Failed to delete file' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  listFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const files = await this.blobStorageService.listFilesAsync(req.userContext);
      res.json(files);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  listFilesWithMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const files = await this.blobStorageService.listFilesWithMetadataAsync(req.userContext);
      res.json(files);
    } catch (error) {
      console.error('Error listing files with metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  fileExists = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;
      const exists = await this.blobStorageService.fileExistsAsync(fileName, req.userContext);
      
      res.json({ fileName, exists });
    } catch (error) {
      console.error('Error checking file existence:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getFileMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const metadata = await this.blobStorageService.getFileMetadataAsync(fileName, req.userContext);
      res.json(metadata);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getFileTags = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const tags = await this.blobStorageService.getFileTagsAsync(fileName, req.userContext);
      res.json({ fileName, tags });
    } catch (error) {
      console.error('Error getting file tags:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  setFileTags = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Contributor) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const schema = Joi.object({
        tags: Joi.array().items(Joi.string()).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      const request: TagsUpdateRequest = value;
      const success = await this.blobStorageService.setFileTagsAsync(
        fileName,
        request.tags,
        req.userContext
      );

      if (success) {
        res.json({ message: `Tags updated for file '${fileName}'` });
      } else {
        res.status(500).json({ message: 'Failed to update tags' });
      }
    } catch (error) {
      console.error('Error setting file tags:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  deleteFileTags = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext || req.userContext.role < UserRole.Contributor) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const success = await this.blobStorageService.deleteFileTagsAsync(fileName, req.userContext);

      if (success) {
        res.json({ message: `Tags removed for file '${fileName}'` });
      } else {
        res.status(500).json({ message: 'Failed to remove tags' });
      }
    } catch (error) {
      console.error('Error removing file tags:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getFileVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const versions = await this.blobStorageService.listFileVersionsAsync(fileName, req.userContext);
      res.json(versions);
    } catch (error) {
      console.error('Error getting file versions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  downloadFileVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName, versionId } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const fileStream = await this.blobStorageService.downloadFileVersionAsync(
        fileName,
        versionId,
        req.userContext
      );

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading file version:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getFileBase64 = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userContext) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { fileName } = req.params;

      if (!(await this.blobStorageService.fileExistsAsync(fileName, req.userContext))) {
        res.status(404).json({ message: `File '${fileName}' not found` });
        return;
      }

      const base64String = await this.blobStorageService.getFileBase64Async(fileName, req.userContext);
      res.json({ fileName, base64: base64String });
    } catch (error) {
      console.error('Error getting file base64:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}