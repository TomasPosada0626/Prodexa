jest.mock('fs');
jest.mock('fs/promises');
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
}));

import * as fs from 'fs';
import { Test } from '@nestjs/testing';
import { StorageModule } from './storage.module';
import { StorageService } from './storage.service';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { R2StorageService } from './r2-storage.service';

const R2_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

describe('StorageModule', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.mocked(fs).existsSync.mockReturnValue(true);
    process.env = { ...ORIGINAL_ENV };
    for (const key of R2_KEYS) delete process.env[key];
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('usa LocalDiskStorageService cuando no hay ninguna variable de R2', async () => {
    const module = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(module.get(StorageService)).toBeInstanceOf(LocalDiskStorageService);
  });

  it('usa R2StorageService cuando las 5 variables de R2 estan presentes', async () => {
    for (const key of R2_KEYS) process.env[key] = 'valor-de-prueba';

    const module = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(module.get(StorageService)).toBeInstanceOf(R2StorageService);
  });

  it('falla fuerte si solo algunas variables de R2 estan configuradas', async () => {
    process.env.R2_ACCOUNT_ID = 'valor-de-prueba';
    process.env.R2_BUCKET_NAME = 'valor-de-prueba';

    await expect(
      Test.createTestingModule({ imports: [StorageModule] }).compile(),
    ).rejects.toThrow(/Configuracion de R2 incompleta/);
  });
});
