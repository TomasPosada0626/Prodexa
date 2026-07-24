const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

import { R2StorageService } from './r2-storage.service';

describe('R2StorageService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      R2_ACCOUNT_ID: 'cuenta-1',
      R2_ACCESS_KEY_ID: 'clave-acceso',
      R2_SECRET_ACCESS_KEY: 'clave-secreta',
      R2_BUCKET_NAME: 'prodexa-uploads',
      R2_PUBLIC_URL: 'https://cdn.prodexa.test',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('sube el buffer con PutObjectCommand y devuelve la url publica construida', async () => {
    sendMock.mockResolvedValue({});
    const service = new R2StorageService();

    const url = await service.upload(
      Buffer.from('contenido'),
      'abc123.png',
      'image/png',
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'prodexa-uploads',
          Key: 'images/abc123.png',
          ContentType: 'image/png',
        }) as object,
      }),
    );
    expect(url).toBe('https://cdn.prodexa.test/images/abc123.png');
  });
});
