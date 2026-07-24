import * as fs from 'fs';

// fs.existsSync/mkdirSync no son redefinibles con jest.spyOn en este entorno
// (propiedades no configurables del modulo real) — se automockea el modulo
// completo, que si permite controlar el valor de retorno por test.
jest.mock('fs');
jest.mock('fs/promises');
const fsMock = jest.mocked(fs);

import { writeFile } from 'fs/promises';
import {
  LocalDiskStorageService,
  asegurarDirectorioDeImagenes,
} from './local-disk-storage.service';

const writeFileMock = jest.mocked(writeFile);

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

describe('LocalDiskStorageService', () => {
  it('escribe el buffer en disco y devuelve la url relativa esperada', async () => {
    fsMock.existsSync.mockReturnValue(true);
    writeFileMock.mockResolvedValue();
    const service = new LocalDiskStorageService();

    const url = await service.upload(Buffer.from('contenido'), 'abc123.png');

    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('abc123.png') as string,
      Buffer.from('contenido'),
    );
    expect(url).toBe('/uploads/images/abc123.png');
  });
});
