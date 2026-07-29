import { BadRequestException } from '@nestjs/common';
import {
  UploadsController,
  detectarMimetypeReal,
  generarNombreArchivo,
  imageFileFilter,
} from './uploads.controller';

const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_BUFFER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

describe('UploadsController', () => {
  let controller: UploadsController;
  const storageService = {
    upload: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new UploadsController(storageService);
  });

  it('lanza BadRequestException si no llega archivo (rechazado por el filtro de mimetype)', async () => {
    await expect(
      controller.uploadImage(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('delega en StorageService.upload y devuelve la url que este retorne', async () => {
    storageService.upload.mockResolvedValue('/uploads/images/abc123.png');
    const file = {
      buffer: PNG_BUFFER,
      mimetype: 'image/png',
    } as Express.Multer.File;

    const result = await controller.uploadImage(file);

    expect(result).toEqual({ url: '/uploads/images/abc123.png' });
    expect(storageService.upload).toHaveBeenCalledWith(
      file.buffer,
      expect.stringMatching(/\.png$/) as string,
      'image/png',
    );
  });

  it('rechaza el archivo si la firma real no es una imagen soportada, sin importar el Content-Type declarado (mimetype spoofing)', async () => {
    const file = {
      buffer: Buffer.from('<script>alert(1)</script>'),
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(controller.uploadImage(file)).rejects.toThrow(
      BadRequestException,
    );
    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('usa el mimetype real detectado por firma, no el declarado por el cliente, para nombrar y guardar el archivo', async () => {
    storageService.upload.mockResolvedValue('/uploads/images/xyz.png');
    const file = {
      buffer: PNG_BUFFER,
      // El cliente declara jpeg, pero la firma real (los primeros bytes) es de un PNG.
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await controller.uploadImage(file);

    expect(storageService.upload).toHaveBeenCalledWith(
      file.buffer,
      expect.stringMatching(/\.png$/) as string,
      'image/png',
    );
  });
});

describe('detectarMimetypeReal', () => {
  it('detecta PNG por su firma de 8 bytes', () => {
    expect(detectarMimetypeReal(PNG_BUFFER)).toBe('image/png');
  });

  it('detecta JPEG por su firma de 3 bytes', () => {
    expect(detectarMimetypeReal(JPEG_BUFFER)).toBe('image/jpeg');
  });

  it.each([['GIF87a'], ['GIF89a']])(
    'detecta GIF (%s) por su firma de 6 bytes',
    (encabezado) => {
      expect(detectarMimetypeReal(Buffer.from(encabezado, 'ascii'))).toBe(
        'image/gif',
      );
    },
  );

  it('detecta WEBP por el contenedor RIFF....WEBP', () => {
    expect(detectarMimetypeReal(WEBP_BUFFER)).toBe('image/webp');
  });

  it('devuelve undefined para un buffer sin ninguna firma reconocida', () => {
    expect(
      detectarMimetypeReal(Buffer.from('<script></script>')),
    ).toBeUndefined();
  });

  it('devuelve undefined para un buffer mas corto que cualquier firma', () => {
    expect(detectarMimetypeReal(Buffer.from([0x89, 0x50]))).toBeUndefined();
  });

  it('no confunde un RIFF que no es WEBP (ej. un .wav)', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WAVE', 'ascii'),
    ]);
    expect(detectarMimetypeReal(wav)).toBeUndefined();
  });
});

describe('imageFileFilter', () => {
  function callFilter(mimetype: string): boolean {
    let aceptado = false;
    imageFileFilter(
      undefined,
      { mimetype } as Express.Multer.File,
      (_err, ok) => {
        aceptado = ok;
      },
    );
    return aceptado;
  }

  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])(
    'acepta %s',
    (mimetype) => {
      expect(callFilter(mimetype)).toBe(true);
    },
  );

  it.each(['application/pdf', 'application/x-msdownload', 'text/html', ''])(
    'rechaza %s',
    (mimetype) => {
      expect(callFilter(mimetype)).toBe(false);
    },
  );

  it('nunca pasa un Error al callback (el rechazo es por acceptFile=false, no por excepcion)', () => {
    let errorRecibido: Error | null = null;
    imageFileFilter(
      undefined,
      { mimetype: 'application/pdf' } as Express.Multer.File,
      (err) => {
        errorRecibido = err;
      },
    );
    expect(errorRecibido).toBeNull();
  });
});

describe('generarNombreArchivo', () => {
  it.each([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
  ])('usa la extension correcta para %s', (mimetype, extensionEsperada) => {
    expect(generarNombreArchivo(mimetype)).toMatch(
      new RegExp(`\\${extensionEsperada}$`),
    );
  });

  it('cae a .bin para un mimetype desconocido', () => {
    expect(generarNombreArchivo('application/octet-stream')).toMatch(/\.bin$/);
  });

  it('genera un nombre distinto en cada llamada (sin colisiones)', () => {
    expect(generarNombreArchivo('image/png')).not.toBe(
      generarNombreArchivo('image/png'),
    );
  });
});
