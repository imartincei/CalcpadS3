import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import { Database } from './database';
import { 
  BlobStorageService, 
  UserService, 
  TagsService 
} from './services';
import {
  AuthController,
  AuthInfoController,
  BlobStorageController,
  TagsController,
  UserController
} from './controllers';
import { AuthMiddleware } from './middleware';
import { JwtService, PasswordService } from './utils';
import { createRoutes } from './routes';
import { loadConfig } from './config';

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'calcpad-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

async function initializeSystem(
  database: Database, 
  blobStorageService: BlobStorageService, 
  userService: UserService, 
  passwordService: PasswordService,
  logger: winston.Logger
): Promise<void> {
  logger.info('Checking system initialization...');
  
  try {
    // 1. Check if MinIO buckets exist and create them if needed
    await initializeMinIOBuckets(blobStorageService, logger);
    
    // 2. Check if default admin user exists and create if needed
    await initializeDefaultUser(userService, passwordService, logger);
    
    // 3. Initialize default tags if needed
    await initializeDefaultTags(database, logger);
    
    logger.info('System initialization completed successfully');
  } catch (error) {
    logger.error('System initialization failed:', error);
    throw error;
  }
}

async function initializeMinIOBuckets(blobStorageService: BlobStorageService, logger: winston.Logger): Promise<void> {
  try {
    logger.info('Checking MinIO buckets...');
    
    const buckets = ['calcpad-storage-working', 'calcpad-storage-stable'];
    
    for (const bucketName of buckets) {
      const exists = await blobStorageService.bucketExists(bucketName);
      
      if (!exists) {
        logger.info(`Creating bucket: ${bucketName}`);
        await blobStorageService.createBucket(bucketName);
        await blobStorageService.enableVersioning(bucketName);
        logger.info(`Bucket ${bucketName} created with versioning enabled`);
      } else {
        logger.info(`Bucket ${bucketName} already exists`);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize MinIO buckets:', error);
    throw error;
  }
}

async function initializeDefaultUser(userService: UserService, passwordService: PasswordService, logger: winston.Logger): Promise<void> {
  try {
    logger.info('Checking default admin user...');
    
    const existingAdmin = await userService.getUserByUsernameForInit('admin');
    
    if (!existingAdmin) {
      logger.info('Creating default admin user...');
      
      const defaultPassword = 'admin123';
      const hashedPassword = await passwordService.hashPassword(defaultPassword);
      
      const adminUser = {
        username: 'admin',
        email: 'admin@calcpad.local',
        passwordHash: hashedPassword,
        role: 3, // Admin role
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      await userService.createUserForInit(adminUser);
      logger.info('Default admin user created (username: admin, password: admin123)');
      logger.warn('SECURITY WARNING: Please change the default admin password immediately!');
    } else {
      logger.info('Default admin user already exists');
    }
  } catch (error) {
    logger.error('Failed to initialize default user:', error);
    throw error;
  }
}

async function initializeDefaultTags(database: Database, logger: winston.Logger): Promise<void> {
  try {
    logger.info('Checking default tags...');
    
    const existingTags = await database.getAllTags();
    
    if (existingTags.length === 0) {
      logger.info('Creating default tags...');
      
      const defaultTags = [
        'Development',
        'Production',
        'Testing',
        'Documentation',
        'Draft',
        'Reviewed',
        'Approved'
      ];
      
      for (const tagName of defaultTags) {
        await database.createTag(tagName);
        logger.info(`Created tag: ${tagName}`);
      }
      
      logger.info('Default tags created successfully');
    } else {
      logger.info(`Found ${existingTags.length} existing tags`);
    }
  } catch (error) {
    logger.error('Failed to initialize default tags:', error);
    throw error;
  }
}

async function bootstrap() {
  try {
    // Load configuration
    const config = loadConfig();
    
    logger.info('Starting CalcpadS3 API...');
    
    // Initialize database
    const database = new Database(config.database.path);
    
    // Initialize services
    const passwordService = new PasswordService();
    const jwtService = new JwtService(
      config.authentication.local.jwt.secret,
      config.authentication.local.jwt.expiryInHours,
      config.authentication.local.jwt.issuer,
      config.authentication.local.jwt.audience
    );
    
    const userService = new UserService(database, passwordService, jwtService);
    const tagsService = new TagsService(database);
    const blobStorageService = new BlobStorageService(config.minio);
    
    // Perform initialization checks and setup
    await initializeSystem(database, blobStorageService, userService, passwordService, logger);
    
    // Initialize middleware
    const authMiddleware = new AuthMiddleware(jwtService);
    
    // Initialize controllers
    const authController = new AuthController(userService);
    const authInfoController = new AuthInfoController(config.authentication);
    const blobStorageController = new BlobStorageController(blobStorageService);
    const tagsController = new TagsController(tagsService);
    const userController = new UserController(userService);
    
    // Create Express app
    const app = express();
    
    // Configure middleware
    app.use(helmet());
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false
    }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Add request logging
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
    
    // Setup routes
    const routes = createRoutes(
      authController,
      authInfoController,
      blobStorageController,
      tagsController,
      userController,
      authMiddleware
    );
    
    app.use(routes);
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    
    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ message: 'Internal server error' });
    });
    
    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: 'Not found' });
    });
    
    // Start server
    app.listen(config.port, () => {
      logger.info(`CalcpadS3 API is running on port ${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${config.database.path}`);
      logger.info(`MinIO: ${config.minio.endpoint}`);
      logger.info(`Auth Provider: ${config.authentication.provider}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      await database.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      await database.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();