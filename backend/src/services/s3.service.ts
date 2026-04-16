import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class S3Service {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
    this.bucketName = process.env.STORAGE_BUCKET_NAME || '';
    if (!this.bucketName) {
      console.warn('[S3Service] STORAGE_BUCKET_NAME is not set');
    }
  }

  async putObject(key: string, content: any, contentType: string = 'text/plain'): Promise<string> {
    console.log(`[S3Service] Uploading to ${key}...`);

    const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        );
        return key;
      } catch (error) {
        attempt++;
        console.error(`[S3Service] Attempt ${attempt} failed for ${key}:`, error);
        if (attempt >= maxRetries) {
          throw new Error(
            `Failed to upload to S3 after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        // Wait before retrying (exponential backoff: 500ms, 1000ms, etc.)
        const delay = Math.pow(2, attempt) * 250;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Unexpected failure in putObject for ${key}`);
  }

  async getObject(key: string): Promise<string | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return (await response.Body?.transformToString()) || null;
    } catch (error) {
      console.error(`[S3Service] Error fetching object ${key}:`, error);
      return null;
    }
  }
}
