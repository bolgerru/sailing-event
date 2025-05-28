export type BlobStorageOperation = 'upload' | 'download' | 'delete';

export interface BlobFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface UploadResponse {
  success: boolean;
  file: BlobFile;
}

export interface DownloadResponse {
  success: boolean;
  file: BlobFile | null;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}