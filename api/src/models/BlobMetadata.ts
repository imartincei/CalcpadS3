export interface BlobMetadata {
  fileName: string;
  category?: string;
  created?: string;
  updated?: string;
  reviewed?: string;
  tested?: string;
  createdBy?: string;
  size: number;
  lastModified: string;
  contentType?: string;
  etag: string;
  versionId?: string;
  isDir: boolean;
  isLatest: boolean;
}

export interface BlobInfo {
  fileName: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
  metadata: Record<string, string>;
  tags: Record<string, string>;
}

export interface UploadRequest {
  file: Express.Multer.File;
  tags?: string[];
  metadata?: {
    category?: string;
    created?: string;
    updated?: string;
    reviewed?: string;
    tested?: string;
  };
}

export interface TagsUpdateRequest {
  tags: string[];
}

export interface FileVersion {
  versionId: string;
  lastModified: string;
  size: number;
  etag: string;
  isLatest: boolean;
}