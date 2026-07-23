import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MIME_TO_EXTENSION,
  UPLOADS_DIR,
  UPLOADS_IMAGES_SUBDIR,
  UPLOADS_URL_PREFIX,
} from './uploads.constants';

const imagesDir = join(UPLOADS_DIR, UPLOADS_IMAGES_SUBDIR);

/** Crea la carpeta de imagenes si todavia no existe (idempotente). Extraida como
 * funcion propia (en vez de codigo suelto a nivel de modulo) para poder probarla
 * directo con fs mockeado, sin depender de mockear el import completo. */
export function asegurarDirectorioDeImagenes(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

asegurarDirectorioDeImagenes(imagesDir);

/** Rechaza el archivo ANTES de escribirlo a disco si el mimetype no es una imagen soportada. */
export function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  const esImagenPermitida = (
    ALLOWED_IMAGE_MIME_TYPES as readonly string[]
  ).includes(file.mimetype);
  callback(null, esImagenPermitida);
}

/** Nombre unico y seguro para el archivo guardado en disco: nunca el nombre original
 * del usuario (evita path traversal / colisiones), extension derivada del mimetype real. */
export function generarNombreArchivo(mimetype: string): string {
  const extension = MIME_TO_EXTENSION[mimetype] ?? '.bin';
  return `${randomUUID()}${extension}`;
}

@ApiTags('uploads')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('images')
  @ApiOperation({
    summary:
      'Subir una imagen (usada por el editor de preparacion de formulaciones)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: imagesDir,
        filename: (_req, file, callback) => {
          callback(null, generarNombreArchivo(file.mimetype));
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) {
      throw new BadRequestException(
        'Solo se permiten imagenes PNG, JPEG, WEBP o GIF.',
      );
    }
    return {
      url: `${UPLOADS_URL_PREFIX}/${UPLOADS_IMAGES_SUBDIR}/${file.filename}`,
    };
  }
}
