import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

// fs.existsSync/mkdirSync no son redefinibles con jest.spyOn en este entorno
// (propiedades no configurables del modulo real) — se automockea el modulo
// completo, que si permite controlar el valor de retorno por test.
jest.mock('fs');
const fsMock = jest.mocked(fs);

import {
  UploadsController,
  asegurarDirectorioDeImagenes,
  generarNombreArchivo,
  imageFileFilter,
} from './uploads.controller';

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(() => {
    controller = new UploadsController();
  });

  it('lanza BadRequestException si no llega archivo (rechazado por el filtro de mimetype)', () => {
    expect(() =>
      controller.uploadImage(undefined as unknown as Express.Multer.File),
    ).toThrow(BadRequestException);
  });

  it('devuelve la url publica del archivo subido', () => {
    const file = { filename: 'abc123.png' } as Express.Multer.File;

    expect(controller.uploadImage(file)).toEqual({
      url: '/uploads/images/abc123.png',
    });
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

describe('asegurarDirectorioDeImagenes', () => {
  beforeEach(() => {
    fsMock.existsSync.mockClear();
    fsMock.mkdirSync.mockClear();
  });

  it('crea el directorio si no existe', () => {
    fsMock.existsSync.mockReturnValue(false);

    asegurarDirectorioDeImagenes('/tmp/uploads/images');

    expect(fsMock.mkdirSync).toHaveBeenCalledWith('/tmp/uploads/images', {
      recursive: true,
    });
  });

  it('no hace nada si el directorio ya existe', () => {
    fsMock.existsSync.mockReturnValue(true);

    asegurarDirectorioDeImagenes('/tmp/uploads/images');

    expect(fsMock.mkdirSync).not.toHaveBeenCalled();
  });
});
