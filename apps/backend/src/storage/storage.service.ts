/** Token de inyeccion y contrato para guardar un archivo subido. Se usa como clase
 * abstracta (no un token de Symbol/string) por consistencia con el unico
 * custom-provider que ya existia en el proyecto ({provide: APP_GUARD, useClass:...}). */
export abstract class StorageService {
  abstract upload(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string>;
}
