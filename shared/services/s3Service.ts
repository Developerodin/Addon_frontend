// This file will contain AWS S3 integration for file upload and management
// AWS SDK for JavaScript v3 - modular packages
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface S3Config {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
}

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    this.bucketName = config.bucketName;
  }

  /**
   * Upload a file to S3
   * @param file File to upload
   * @param path Path/Key in the bucket
   * @returns Location URL and key of the uploaded file
   */
  async uploadFile(file: File, path: string): Promise<{ location: string; key: string }> {
    try {
      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer();
      
      // Generate a key for the file
      const key = `${path}/${file.name}`;
      
      // Set up the upload parameters
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type,
      };
      
      // Upload to S3
      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);
      
      // Generate a presigned URL for accessing the file
      const url = await this.getSignedUrl(key);
      
      return {
        location: url,
        key: key,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * List objects in a directory
   * @param prefix Directory prefix
   * @returns List of objects
   */
  async listObjects(prefix: string = '') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(command);
      
      // Process the results
      const directories = response.CommonPrefixes?.map(prefix => ({
        type: 'folder',
        name: prefix.Prefix?.split('/').slice(-2)[0] || '',
        path: prefix.Prefix || '',
      })) || [];
      
      const files = response.Contents?.map(item => ({
        type: 'file',
        name: item.Key?.split('/').pop() || '',
        path: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified?.toISOString() || new Date().toISOString(),
      })) || [];
      
      return { directories, files };
    } catch (error) {
      console.error('Error listing objects from S3:', error);
      throw error;
    }
  }

  /**
   * Delete an object from S3
   * @param key Object key
   */
  async deleteObject(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting object from S3:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for temporary access to a file
   * @param key Object key
   * @param expiresIn Expiration time in seconds (default: 3600)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Create a folder in S3 (S3 doesn't have folders, so we create an empty object with a trailing slash)
   * @param path Folder path
   * @returns Success status
   */
  async createFolder(path: string): Promise<boolean> {
    try {
      // Ensure path ends with a slash (S3 convention for folders)
      const folderPath = path.endsWith('/') ? path : `${path}/`;
      
      // Create an empty object with the folder path
      const params = {
        Bucket: this.bucketName,
        Key: folderPath,
        Body: '', // Empty content
      };
      
      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);
      
      return true;
    } catch (error) {
      console.error('Error creating folder in S3:', error);
      throw error;
    }
  }
}

export default S3Service; 