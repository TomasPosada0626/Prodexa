import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { R2StorageService } from './r2-storage.service';

const R2_ENV_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

@Module({
  providers: [
    LocalDiskStorageService,
    R2StorageService,
    {
      provide: StorageService,
      useFactory: (local: LocalDiskStorageService, r2: R2StorageService) => {
        const presentes = R2_ENV_VARS.filter((key) => !!process.env[key]);
        if (presentes.length === 0) {
          return local;
        }
        if (presentes.length < R2_ENV_VARS.length) {
          // Config a medias: mejor fallar fuerte al iniciar que caer en silencio a
          // disco local y perder imagenes en produccion sin que nadie se entere.
          const faltantes = R2_ENV_VARS.filter((key) => !process.env[key]);
          throw new Error(
            `Configuracion de R2 incompleta: faltan ${faltantes.join(', ')}.`,
          );
        }
        return r2;
      },
      inject: [LocalDiskStorageService, R2StorageService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
