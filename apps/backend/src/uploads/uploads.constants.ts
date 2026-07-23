import { join } from 'path';

/** Carpeta donde quedan los archivos subidos (imagenes de la preparacion de formulaciones). */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

export const UPLOADS_IMAGES_SUBDIR = 'images';

export const UPLOADS_URL_PREFIX = '/uploads';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
