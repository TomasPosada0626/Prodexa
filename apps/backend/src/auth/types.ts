export type RolOrganizacion = 'ADMIN' | 'COORDINADOR' | 'MIEMBRO';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  rol: RolOrganizacion;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre: string | null;
  margenPorDefecto: string;
  tarifaManoObraHora: string;
  tarifaEnergiaHora: string;
  gastoGeneralMensual: string;
  /** Promedio de kg producidos (excluye RECHAZADO) en los ultimos meses YA completos, calculado
   * en cada login/refresh — no es un dato que el usuario escriba, se ajusta solo con el historial real. */
  capacidadProduccionMensualKg: string;
  /** Cuantos meses completos entraron en ese promedio (0 si aun no hay historial suficiente). */
  capacidadMesesBase: number;
  organizationId: string;
  organizationNombre: string;
  rol: RolOrganizacion;
}

/**
 * The principal attached to the request by JwtStrategy — derived from the JWT payload alone, no DB
 * round trip. Si un ADMIN cambia el rol de alguien, ese cambio se refleja cuando el access token
 * corto (15 min) se renueve, no al instante — mismo comportamiento que ya existe para revocar sesiones.
 */
export interface RequestUser {
  id: string;
  email: string;
  organizationId: string;
  rol: RolOrganizacion;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
