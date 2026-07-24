import { BadRequestException } from '@nestjs/common';
import {
  UploadsController,
  generarNombreArchivo,
  imageFileFilter,
} from './uploads.controller';

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
      buffer: Buffer.from('fake-image'),
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
