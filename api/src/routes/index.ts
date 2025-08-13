import { Router } from 'express';
import multer from 'multer';
import { 
  AuthController, 
  AuthInfoController, 
  BlobStorageController, 
  TagsController, 
  UserController 
} from '../controllers';
import { AuthMiddleware } from '../middleware';
import { UserRole } from '../models';

const upload = multer({ storage: multer.memoryStorage() });

export function createRoutes(
  authController: AuthController,
  authInfoController: AuthInfoController,
  blobStorageController: BlobStorageController,
  tagsController: TagsController,
  userController: UserController,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  // Auth routes
  router.post('/api/auth/login', authController.login);
  router.post('/api/auth/register', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin), 
    authController.register
  );
  router.get('/api/auth/profile', 
    authMiddleware.authenticate, 
    authController.getProfile
  );

  // Auth info routes
  router.get('/api/authinfo', authInfoController.getAuthInfo);

  // Blob storage routes
  router.post('/api/blobstorage/upload', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Contributor),
    upload.single('file'),
    blobStorageController.uploadFile
  );
  
  router.get('/api/blobstorage/download/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.downloadFile
  );
  
  router.delete('/api/blobstorage/delete/:fileName', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    blobStorageController.deleteFile
  );
  
  router.get('/api/blobstorage/list', 
    authMiddleware.authenticate, 
    blobStorageController.listFiles
  );
  
  router.get('/api/blobstorage/list-with-metadata', 
    authMiddleware.authenticate, 
    blobStorageController.listFilesWithMetadata
  );
  
  router.get('/api/blobstorage/exists/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.fileExists
  );
  
  router.get('/api/blobstorage/metadata/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.getFileMetadata
  );
  
  router.get('/api/blobstorage/tags/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.getFileTags
  );
  
  router.put('/api/blobstorage/tags/:fileName', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Contributor),
    blobStorageController.setFileTags
  );
  
  router.delete('/api/blobstorage/tags/:fileName', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Contributor),
    blobStorageController.deleteFileTags
  );
  
  router.get('/api/blobstorage/versions/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.getFileVersions
  );
  
  router.get('/api/blobstorage/download/:fileName/version/:versionId', 
    authMiddleware.authenticate, 
    blobStorageController.downloadFileVersion
  );
  
  router.get('/api/blobstorage/base64/:fileName', 
    authMiddleware.authenticate, 
    blobStorageController.getFileBase64
  );

  // Tags routes
  router.get('/api/tags', 
    authMiddleware.authenticate, 
    tagsController.getAllTags
  );
  
  router.post('/api/tags', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    tagsController.createTag
  );
  
  router.delete('/api/tags/:id', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    tagsController.deleteTag
  );

  // User routes
  router.get('/api/user', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    userController.getAllUsers
  );
  
  router.get('/api/user/:userId', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    userController.getUserById
  );
  
  router.put('/api/user/:userId', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    userController.updateUser
  );
  
  router.delete('/api/user/:userId', 
    authMiddleware.authenticate, 
    authMiddleware.requireRole(UserRole.Admin),
    userController.deleteUser
  );

  return router;
}