import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import {
  UPLOADS_DIR,
  UPLOADS_IMAGES_SUBDIR,
  UPLOADS_URL_PREFIX,
} from '../uploads/uploads.constants';
import { StorageService } from './storage.service';

const imagesDir = join(UPLOADS_DIR, UPLOADS_IMAGES_SUBDIR);

/** Crea la carpeta de imagenes si todavia no existe (idempotente). Extraida como
 * funcion propia (en vez de codigo suelto a nivel de modulo) para poder probarla
 * directo con fs mockeado, sin depender de mockear el import completo. */
export function asegurarDirectorioDeImagenes(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Implementacion por defecto: disco local, servido por app.useStaticAssets en
 * main.ts. Usada cuando no hay credenciales de R2 configuradas (desarrollo local,
 * CI) — se pierde en cada deploy en un plan gratuito sin disco persistente, pero no
 * requiere ninguna cuenta externa para trabajar. */
@Injectable()
export class LocalDiskStorageService extends StorageService {
  constructor() {
    super();
    asegurarDirectorioDeImagenes(imagesDir);
  }

  async upload(buffer: Buffer, filename: string): Promise<string> {
    await writeFile(join(imagesDir, filename), buffer);
    return `${UPLOADS_URL_PREFIX}/${UPLOADS_IMAGES_SUBDIR}/${filename}`;
  }
}
