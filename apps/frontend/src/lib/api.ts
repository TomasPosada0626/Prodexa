const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Prisma serializa los campos Decimal como string en la respuesta JSON.
export interface Ingredient {
  id: string;
  nombre: string;
  porcentaje: string;
  cantidadGramosBase: string;
  cantidadKg: string;
  precioKg: string;
  precioTotal: string;
}

export type RegistroSanitarioEstadoManual = 'EN_TRAMITE' | 'SUSPENDIDO';

export interface Formulation {
  id: string;
  nombreProducto: string;
  categoria: string | null;
  registroSanitario: string | null;
  registroSanitarioVencimiento: string | null;
  registroSanitarioEstado: RegistroSanitarioEstadoManual | null;
  preparacionHtml: string | null;
  cantidadBaseKg: string;
  margenPorcentaje: string;
  impuestoPorcentaje: string;
  vidaUtilDias: number | null;
  tiempoProduccionHoras: string | null;
  createdAt: string;
  ingredientes: Ingredient[];
}

export interface IngredientInput {
  nombre: string;
  porcentaje: number;
  cantidadGramosBase: number;
  cantidadKg: number;
  precioKg: number;
  precioTotal: number;
}

export interface CreateFormulationInput {
  nombreProducto: string;
  categoria?: string;
  registroSanitario?: string;
  registroSanitarioVencimiento?: string;
  registroSanitarioEstado?: RegistroSanitarioEstadoManual | null;
  preparacionHtml?: string;
  cantidadBaseKg: number;
  margenPorcentaje?: number;
  impuestoPorcentaje?: number;
  vidaUtilDias?: number;
  tiempoProduccionHoras?: number;
  ingredientes: IngredientInput[];
}

export interface UpdateFormulationInput {
  nombreProducto?: string;
  categoria?: string;
  registroSanitario?: string | null;
  registroSanitarioVencimiento?: string | null;
  registroSanitarioEstado?: RegistroSanitarioEstadoManual | null;
  preparacionHtml?: string;
  cantidadBaseKg?: number;
  margenPorcentaje?: number;
  impuestoPorcentaje?: number;
  vidaUtilDias?: number;
  tiempoProduccionHoras?: number;
  ingredientes?: IngredientInput[];
}

export interface UpdateIngredientPriceInput {
  precioKg: number;
  proveedor: string;
}

export interface SupplierPrice {
  id: string;
  ingredientId: string;
  proveedor: string | null;
  precioKg: string;
  vigenteDesde: string;
  createdAt: string;
}

export interface FormulationSnapshot {
  nombreProducto: string;
  registroSanitario: string | null;
  registroSanitarioVencimiento: string | null;
  preparacionHtml: string | null;
  cantidadBaseKg: string;
  margenPorcentaje: string;
  impuestoPorcentaje: string;
  ingredientes: Array<{
    nombre: string;
    porcentaje: string;
    cantidadGramosBase: string;
    cantidadKg: string;
    precioKg: string;
    precioTotal: string;
  }>;
}

export interface FormulationVersion {
  id: string;
  formulationId: string;
  snapshot: FormulationSnapshot;
  createdAt: string;
}

export interface CostSimulationResult {
  costoPorKg: number;
  costoEscalado: number;
  precioVentaSugerido: number;
  precioConImpuesto: number;
  precioMayorista: number;
  utilidadEstimada: number;
}

export interface SimulateCostInput {
  formulationId: string;
  cantidadObjetivoKg: number;
  margenPorcentaje?: number;
  impuestoPorcentaje?: number;
  descuentoMayoristaPorcentaje?: number;
  /** Costos operativos ya calculados en $ para la cantidad objetivo (no en %), para que el precio
   * sugerido y la utilidad de este analisis reflejen el costo total, no solo ingredientes. */
  costoEmpaque?: number;
  costoEtiqueta?: number;
  costoTransporte?: number;
  costoMermas?: number;
  costoGastosGenerales?: number;
  costoManoObra?: number;
  costoEnergia?: number;
}

export type UnidadPresentacion = 'ml' | 'L' | 'g' | 'kg';
export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
/** Flujo fisico del lote (no de cobro): PLANIFICADO -> EN_PROCESO -> EN_CALIDAD -> TERMINADO,
 * o RECHAZADO si no pasa control de calidad (se excluye de utilidad/ingreso en los reportes). */
export type EstadoProduccion = 'PLANIFICADO' | 'EN_PROCESO' | 'EN_CALIDAD' | 'TERMINADO' | 'RECHAZADO';

export interface ProductionOrder {
  id: string;
  formulationId: string;
  numeroLote: string;
  cantidadObjetivoKg: string;
  costoEscalado: string;
  precioVentaSugerido: string;
  utilidadEstimada: string;
  margenPorcentaje: string;
  tamanoPresentacion: string | null;
  unidadPresentacion: UnidadPresentacion | null;
  fechaVencimiento: string | null;
  costoEmpaque: string;
  costoEtiqueta: string;
  esMaquila: boolean;
  maquilaIncluyeEmpaque: boolean;
  costoManoObra: string;
  costoEnergia: string;
  tiempoProduccionHoras: string | null;
  costoGastosGenerales: string;
  costoTransporte: string;
  costoMermas: string;
  precioVentaReal: string | null;
  estadoPago: EstadoPago;
  /** Suma de los abonos (Pago) registrados contra este lote — puede ser menor al ingreso total
   * si esta PARCIAL. Se recalcula solo al agregar/quitar un abono. */
  montoCobrado: string;
  fechaPago: string | null;
  estadoProduccion: EstadoProduccion;
  notasCalidad: string | null;
  createdAt: string;
}

export interface CreateProductionOrderInput {
  formulationId: string;
  cantidadObjetivoKg: number;
  margenPorcentaje?: number;
  impuestoPorcentaje?: number;
  tamanoPresentacion?: number;
  unidadPresentacion?: UnidadPresentacion;
  numeroLote?: string;
  fechaVencimiento?: string;
  costoEmpaque?: number;
  costoEtiqueta?: number;
  esMaquila?: boolean;
  maquilaIncluyeEmpaque?: boolean;
  costoManoObra?: number;
  costoEnergia?: number;
  tiempoProduccionHoras?: number;
  costoGastosGenerales?: number;
  costoTransporte?: number;
  costoMermas?: number;
  precioVentaReal?: number;
  estadoPago?: EstadoPago;
  fechaPago?: string;
  estadoProduccion?: EstadoProduccion;
  notasCalidad?: string;
}

export interface UpdateProductionOrderInput {
  cantidadObjetivoKg?: number;
  margenPorcentaje?: number;
  impuestoPorcentaje?: number;
  tamanoPresentacion?: number;
  unidadPresentacion?: UnidadPresentacion;
  numeroLote?: string;
  fechaVencimiento?: string;
  costoEmpaque?: number;
  costoEtiqueta?: number;
  esMaquila?: boolean;
  maquilaIncluyeEmpaque?: boolean;
  costoManoObra?: number;
  costoEnergia?: number;
  tiempoProduccionHoras?: number;
  costoGastosGenerales?: number;
  costoTransporte?: number;
  costoMermas?: number;
  precioVentaReal?: number;
  estadoPago?: EstadoPago;
  fechaPago?: string;
  estadoProduccion?: EstadoProduccion;
  notasCalidad?: string;
}

export type RolOrganizacion = 'ADMIN' | 'COORDINADOR' | 'MIEMBRO';

export interface AuthUser {
  id: string;
  email: string;
  nombre?: string | null;
  margenPorDefecto: string;
  tarifaManoObraHora: string;
  tarifaEnergiaHora: string;
  gastoGeneralMensual: string;
  /** Promedio de kg producidos en los ultimos meses ya completos (excluye RECHAZADO), calculado
   * por el backend en cada login/refresh — ya no es un dato que se escriba a mano. */
  capacidadProduccionMensualKg: string;
  /** Cuantos meses completos entraron en ese promedio (0 si aun no hay historial suficiente). */
  capacidadMesesBase: number;
  organizationId: string;
  organizationNombre: string;
  rol: RolOrganizacion;
}

export interface Member {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolOrganizacion;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  rol: RolOrganizacion;
  token: string;
  createdByUserId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  nombre?: string;
  nombreEmpresa?: string;
  invitationToken?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  nombre?: string;
  margenPorDefecto?: number;
}

/** Tarifas por hora: son de la EMPRESA (no del usuario), para que el mismo producto cueste lo
 * mismo sin importar quien de la organizacion registre el lote. Solo ADMIN/COORDINADOR editan. */
export interface UpdateOrganizationSettingsInput {
  tarifaManoObraHora?: number;
  tarifaEnergiaHora?: number;
  gastoGeneralMensual?: number;
}

export interface OrganizationSettings {
  tarifaManoObraHora: string;
  tarifaEnergiaHora: string;
  gastoGeneralMensual: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  // FormData (subida de archivos) no debe llevar Content-Type explicito: el navegador
  // necesita fijar el boundary del multipart el mismo, forzarlo a JSON rompe el body.
  const isFormData = init?.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
    cache: 'no-store',
  });
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const response = await rawFetch(path, init);

  // /auth/refresh nunca se reintenta a si mismo (evita recursion infinita si el refresh token
  // tambien es invalido). Todo lo demas, incluido /auth/me, si debe reintentar: es el chequeo de
  // sesion al cargar la app y es exactamente el caso donde el access token corto ya expiro pero
  // el refresh token (persistente) sigue siendo valido.
  if (response.status === 401 && !isRetry && path !== '/auth/refresh') {
    const refreshed = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? 'Error de comunicacion con la API', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function register(input: RegisterInput): Promise<AuthUser> {
  return request<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function login(input: LoginInput): Promise<AuthUser> {
  return request<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export async function logout(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' });
}

export function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ url: string }>('/uploads/images', { method: 'POST', body: formData });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

export function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
): Promise<OrganizationSettings> {
  return request<OrganizationSettings>('/organizations/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
}

export function getSessions(): Promise<Session[]> {
  return request<Session[]>('/auth/sessions');
}

export function revokeSession(id: string): Promise<void> {
  return request<void>(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export function getFormulations(): Promise<Formulation[]> {
  return request<Formulation[]>('/formulations');
}

export function getFormulation(id: string): Promise<Formulation> {
  return request<Formulation>(`/formulations/${id}`);
}

export function createFormulation(input: CreateFormulationInput): Promise<Formulation> {
  return request<Formulation>('/formulations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateFormulation(id: string, input: UpdateFormulationInput): Promise<Formulation> {
  return request<Formulation>(`/formulations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteFormulation(id: string): Promise<void> {
  return request<void>(`/formulations/${id}`, { method: 'DELETE' });
}

export function updateIngredientPrice(
  formulationId: string,
  ingredientId: string,
  input: UpdateIngredientPriceInput,
): Promise<Ingredient> {
  return request<Ingredient>(`/formulations/${formulationId}/ingredients/${ingredientId}/price`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getIngredientPriceHistory(
  formulationId: string,
  ingredientId: string,
): Promise<SupplierPrice[]> {
  return request<SupplierPrice[]>(`/formulations/${formulationId}/ingredients/${ingredientId}/price-history`);
}

export function getFormulationVersions(formulationId: string): Promise<FormulationVersion[]> {
  return request<FormulationVersion[]>(`/formulations/${formulationId}/versions`);
}

export function simulateCost(input: SimulateCostInput): Promise<CostSimulationResult> {
  return request<CostSimulationResult>('/simulations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createProductionOrder(input: CreateProductionOrderInput): Promise<ProductionOrder> {
  return request<ProductionOrder>('/production-orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getProductionOrders(formulationId?: string): Promise<ProductionOrder[]> {
  const query = formulationId ? `?formulationId=${encodeURIComponent(formulationId)}` : '';
  return request<ProductionOrder[]>(`/production-orders${query}`);
}

export function updateProductionOrder(
  id: string,
  input: UpdateProductionOrderInput,
): Promise<ProductionOrder> {
  return request<ProductionOrder>(`/production-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteProductionOrder(id: string): Promise<void> {
  return request<void>(`/production-orders/${id}`, { method: 'DELETE' });
}

export interface Pago {
  id: string;
  productionOrderId: string;
  monto: string;
  fecha: string;
  createdAt: string;
}

export interface CreatePagoInput {
  monto: number;
  fecha?: string;
}

/** Registra un abono/pago parcial contra un lote: el backend recalcula PENDIENTE/PARCIAL/PAGADO solo. */
export function addPago(productionOrderId: string, input: CreatePagoInput): Promise<ProductionOrder> {
  return request<ProductionOrder>(`/production-orders/${productionOrderId}/pagos`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPagos(productionOrderId: string): Promise<Pago[]> {
  return request<Pago[]>(`/production-orders/${productionOrderId}/pagos`);
}

export function deletePago(productionOrderId: string, pagoId: string): Promise<ProductionOrder> {
  return request<ProductionOrder>(`/production-orders/${productionOrderId}/pagos/${pagoId}`, {
    method: 'DELETE',
  });
}

export interface SupplierPrecio {
  id: string;
  precioKg: number;
  vigenteDesde: string;
  ingredienteId: string;
  ingredienteNombre: string;
  formulationId: string;
  formulationNombre: string;
}

export interface Supplier {
  id: string;
  nombre: string;
  createdAt: string;
  precios: SupplierPrecio[];
}

/** Proveedores de la empresa con su historial de precios, para comparar cual conviene. */
export function getSuppliers(): Promise<Supplier[]> {
  return request<Supplier[]>('/suppliers');
}

export interface AuditLogEntry {
  id: string;
  evento: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  usuario: { id: string; nombre: string | null; email: string } | null;
}

/** Bitacora de seguridad de la empresa (login/logout/registro/cambio de contrasena). Solo ADMIN. */
export function getAuditLog(): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>('/audit-log');
}

export function getMembers(): Promise<Member[]> {
  return request<Member[]>('/organizations/members');
}

export function updateMemberRole(id: string, rol: RolOrganizacion): Promise<Member> {
  return request<Member>(`/organizations/members/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  });
}

export function removeMember(id: string): Promise<void> {
  return request<void>(`/organizations/members/${id}`, { method: 'DELETE' });
}

export function createInvitation(rol: RolOrganizacion): Promise<Invitation> {
  return request<Invitation>('/organizations/invitations', {
    method: 'POST',
    body: JSON.stringify({ rol }),
  });
}

export function getPendingInvitations(): Promise<Invitation[]> {
  return request<Invitation[]>('/organizations/invitations');
}

export function revokeInvitation(id: string): Promise<void> {
  return request<void>(`/organizations/invitations/${id}`, { method: 'DELETE' });
}
