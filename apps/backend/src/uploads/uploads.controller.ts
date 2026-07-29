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

/**
 * multer's fileFilter (arriba) solo puede mirar el Content-Type que el cliente
 * declara — se llama antes de que el buffer exista, no despues. Ese header lo
 * controla quien sube el archivo, asi que no alcanza como control de seguridad
 * real: un .html o .svg con script puede llegar con Content-Type: image/png. Esta
 * funcion mira los primeros bytes reales del archivo (magic bytes) para los 4
 * formatos que este endpoint acepta — no hace falta una libreria de deteccion
 * generica de cientos de formatos para verificar 4 firmas conocidas y estables.
 */
export function detectarMimetypeReal(buffer: Buffer): string | undefined {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WEBP es un contenedor RIFF: "RIFF" + 4 bytes de tamano + "WEBP".
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return undefined;
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

    // Ya con el buffer completo, se valida la firma real del archivo y se usa ESE
    // resultado (no el mimetype declarado por el cliente) para el nombre y el tipo
    // que se guardan.
    const mimetypeReal = detectarMimetypeReal(file.buffer);
    if (!mimetypeReal) {
      throw new BadRequestException(
        'Solo se permiten imagenes PNG, JPEG, WEBP o GIF.',
      );
    }

    const filename = generarNombreArchivo(mimetypeReal);
    const url = await this.storageService.upload(
      file.buffer,
      filename,
      mimetypeReal,
    );
    return { url };
  }
}
