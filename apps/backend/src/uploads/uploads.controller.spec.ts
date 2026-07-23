import { BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

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
