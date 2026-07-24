import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

/** Cloudflare R2 es compatible con la API de S3 — un solo PutObjectCommand alcanza,
 * sin multipart, ya que MAX_IMAGE_SIZE_BYTES limita a 5MB por archivo. */
@Injectable()
export class R2StorageService extends StorageService {
  private clientInstance: S3Client | null = null;

  // Construccion perezosa: StorageModule instancia esta clase incluso cuando el
  // proveedor activo termina siendo LocalDiskStorageService (ambas quedan inyectadas
  // en el factory que elige cual usar) — si el cliente se armara en el constructor,
  // un entorno sin credenciales de R2 (desarrollo local, CI) construiria un S3Client
  // con credenciales undefined sin necesidad, solo por existir la clase.
  private get client(): S3Client {
    if (!this.clientInstance) {
      this.clientInstance = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.clientInstance;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string> {
    const key = `images/${filename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }
}
