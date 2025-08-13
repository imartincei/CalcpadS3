import * as Minio from 'minio';
import { Readable } from 'stream';
import { BlobMetadata, BlobInfo, UserContext, FileVersion } from '../models';

export interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  useSSL: boolean;
}

export class BlobStorageService {
  private client: Minio.Client;
  private workingBucket: string;
  private stableBucket: string;

  constructor(config: MinioConfig) {
    this.client = new Minio.Client({
      endPoint: config.endpoint.split(':')[0],
      port: parseInt(config.endpoint.split(':')[1]) || (config.useSSL ? 443 : 80),
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });
    
    this.workingBucket = `${config.bucketName}-working`;
    this.stableBucket = `${config.bucketName}-stable`;
  }

  private getBucketName(userContext: UserContext): string {
    // Contributors work in working bucket, others access both
    return userContext.role <= 2 ? this.workingBucket : this.stableBucket;
  }

  async uploadFileAsync(
    fileName: string,
    stream: Readable,
    userContext: UserContext,
    contentType?: string,
    tags?: string[],
    metadata?: Record<string, string>
  ): Promise<string> {
    const bucketName = this.getBucketName(userContext);
    
    // Prepare metadata
    const metaData: Record<string, string> = {
      'Content-Type': contentType || 'application/octet-stream',
      'created-by': userContext.username,
      'created-at': new Date().toISOString(),
      ...metadata
    };

    // Upload file
    await this.client.putObject(bucketName, fileName, stream, undefined, metaData);

    // Set tags if provided
    if (tags && tags.length > 0) {
      const tagMap: Record<string, string> = {};
      tags.forEach((tag, index) => {
        tagMap[`tag-${index}`] = tag;
      });
      await this.client.setObjectTagging(bucketName, fileName, tagMap);
    }

    return fileName;
  }

  async downloadFileAsync(fileName: string, userContext: UserContext): Promise<Readable> {
    const buckets = [this.getBucketName(userContext)];
    
    // Admin users can access both buckets
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        return await this.client.getObject(bucket, fileName);
      } catch (error) {
        // Continue to next bucket if file not found
        continue;
      }
    }

    throw new Error(`File ${fileName} not found`);
  }

  async downloadFileVersionAsync(
    fileName: string,
    versionId: string,
    userContext: UserContext
  ): Promise<Readable> {
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        return await this.client.getObject(bucket, fileName, { versionId });
      } catch (error) {
        continue;
      }
    }

    throw new Error(`File ${fileName} version ${versionId} not found`);
  }

  async fileExistsAsync(fileName: string, userContext: UserContext): Promise<boolean> {
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        await this.client.statObject(bucket, fileName);
        return true;
      } catch (error) {
        continue;
      }
    }

    return false;
  }

  async deleteFileAsync(fileName: string, userContext: UserContext): Promise<boolean> {
    const buckets = [this.workingBucket, this.stableBucket];
    let deleted = false;

    for (const bucket of buckets) {
      try {
        await this.client.removeObject(bucket, fileName);
        deleted = true;
      } catch (error) {
        // File might not exist in this bucket
      }
    }

    return deleted;
  }

  async listFilesAsync(userContext: UserContext): Promise<string[]> {
    const files: string[] = [];
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        const stream = this.client.listObjects(bucket, '', true);
        
        for await (const obj of stream) {
          if (obj.name && !files.includes(obj.name)) {
            files.push(obj.name);
          }
        }
      } catch (error) {
        // Bucket might not exist or be accessible
      }
    }

    return files;
  }

  async listFilesWithMetadataAsync(userContext: UserContext): Promise<BlobMetadata[]> {
    const files: BlobMetadata[] = [];
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        const stream = this.client.listObjects(bucket, '', true);
        
        for await (const obj of stream) {
          if (obj.name) {
            try {
              const stat = await this.client.statObject(bucket, obj.name);
              const metadata: BlobMetadata = {
                fileName: obj.name,
                size: obj.size || 0,
                lastModified: obj.lastModified?.toISOString() || new Date().toISOString(),
                etag: obj.etag || '',
                contentType: stat.metaData?.['content-type'],
                isDir: false,
                isLatest: true,
                category: stat.metaData?.['category'],
                created: stat.metaData?.['created'],
                updated: stat.metaData?.['updated'],
                reviewed: stat.metaData?.['reviewed'],
                tested: stat.metaData?.['tested'],
                createdBy: stat.metaData?.['created-by']
              };
              
              files.push(metadata);
            } catch (error) {
              // Skip files we can't get metadata for
            }
          }
        }
      } catch (error) {
        // Bucket might not exist or be accessible
      }
    }

    return files;
  }

  async getFileMetadataAsync(fileName: string, userContext: UserContext): Promise<BlobMetadata | null> {
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        const stat = await this.client.statObject(bucket, fileName);
        
        return {
          fileName,
          size: stat.size,
          lastModified: stat.lastModified.toISOString(),
          etag: stat.etag,
          contentType: stat.metaData?.['content-type'],
          isDir: false,
          isLatest: true,
          category: stat.metaData?.['category'],
          created: stat.metaData?.['created'],
          updated: stat.metaData?.['updated'],
          reviewed: stat.metaData?.['reviewed'],
          tested: stat.metaData?.['tested'],
          createdBy: stat.metaData?.['created-by']
        };
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  async getFileTagsAsync(fileName: string, userContext: UserContext): Promise<string[]> {
    const buckets = [this.getBucketName(userContext)];
    
    // Admin users can access both buckets, so check both
    if (userContext.role === 3) {
      buckets.push(this.workingBucket); // Add the other bucket for admin users
    }

    for (const bucket of buckets) {
      try {
        const result = await this.client.getObjectTagging(bucket, fileName);
        
        if (result && typeof result === 'object') {
          // MinIO returns tags as key-value pairs where we stored them as "tag-0": "tagname"
          // We need to extract the values (the actual tag names)
          const tags = Object.values(result)
            .filter((value: unknown): value is string => typeof value === 'string' && (value as string).length > 0)
            .map(String);
          return tags;
        }
        return [];
      } catch (error) {
        // File doesn't exist in this bucket or has no tags, try next bucket
        continue;
      }
    }

    return [];
  }

  async setFileTagsAsync(
    fileName: string,
    tags: string[],
    userContext: UserContext
  ): Promise<boolean> {
    const bucketName = this.getBucketName(userContext);
    
    try {
      const tagMap: Record<string, string> = {};
      tags.forEach((tag, index) => {
        tagMap[`tag-${index}`] = tag;
      });
      
      await this.client.setObjectTagging(bucketName, fileName, tagMap);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteFileTagsAsync(fileName: string, userContext: UserContext): Promise<boolean> {
    const bucketName = this.getBucketName(userContext);
    
    try {
      await this.client.setObjectTagging(bucketName, fileName, {});
      return true;
    } catch (error) {
      return false;
    }
  }

  async listFileVersionsAsync(fileName: string, userContext: UserContext): Promise<FileVersion[]> {
    const buckets = [this.getBucketName(userContext)];
    
    if (userContext.role === 3) {
      buckets.push(userContext.role <= 2 ? this.stableBucket : this.workingBucket);
    }

    for (const bucket of buckets) {
      try {
        const stream = this.client.listObjects(bucket, fileName, true);
        const versions: FileVersion[] = [];
        
        for await (const obj of stream) {
          if (obj.name === fileName) {
            versions.push({
              versionId: obj.versionId || 'null',
              lastModified: obj.lastModified?.toISOString() || new Date().toISOString(),
              size: obj.size || 0,
              etag: obj.etag || '',
              isLatest: obj.isLatest || false
            });
          }
        }
        
        if (versions.length > 0) {
          return versions.sort((a, b) => 
            new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
          );
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  async getFileBase64Async(fileName: string, userContext: UserContext): Promise<string> {
    const stream = await this.downloadFileAsync(fileName, userContext);
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Bucket management methods for initialization
  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      console.error(`Error checking if bucket ${bucketName} exists:`, error);
      return false;
    }
  }

  async createBucket(bucketName: string): Promise<void> {
    try {
      await this.client.makeBucket(bucketName);
    } catch (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async enableVersioning(bucketName: string): Promise<void> {
    try {
      // MinIO client doesn't have a direct method for enabling versioning
      // This would typically be done via MinIO admin API or mc command
      // For now, we'll log this as a note for manual configuration
      console.log(`Note: Versioning should be enabled for bucket ${bucketName} via MinIO admin interface`);
    } catch (error) {
      console.error(`Error enabling versioning for bucket ${bucketName}:`, error);
      throw error;
    }
  }
}