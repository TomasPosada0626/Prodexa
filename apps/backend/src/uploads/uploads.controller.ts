import { randomUUID } from 'crypto';
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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MIME_TO_EXTENSION,
} from './uploads.constants';

/** Rechaza el archivo ANTES de subirlo si el mimetype no es una imagen soportada. */
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
  constructor(private readonly storageService: StorageService) {}

  @Post('images')
  @ApiOperation({
    summary:
      'Subir una imagen (usada por el editor de preparacion de formulaciones)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException(
        'Solo se permiten imagenes PNG, JPEG, WEBP o GIF.',
      );
    }
    const filename = generarNombreArchivo(file.mimetype);
    const url = await this.storageService.upload(
      file.buffer,
      filename,
      file.mimetype,
    );
    return { url };
  }
}
