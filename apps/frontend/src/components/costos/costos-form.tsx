'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  CostSimulationResult,
  Formulation,
  UnidadPresentacion,
  simulateCost,
  updateFormulation,
} from '@/lib/api';
import { formatCosto } from '@/lib/format';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';

/** El IVA es una tasa legal fija, no un valor libre por producto. */
const IVA_PORCENTAJE = 19;

const UNIDADES_PRESENTACION: UnidadPresentacion[] = ['ml', 'L', 'g', 'kg'];

/** Aproxima ml como g (densidad 1) para poder estimar envases: es una guia informativa, igual que en Preparar. */
function gramosPorUnidad(cantidad: number, unidad: UnidadPresentacion): number {
  if (unidad === 'kg' || unidad === 'L') return cantidad * 1000;
  return cantidad;
}

interface Props {
  formulaciones: Formulation[];
  onFormulationUpdated?: () => void;
}

const RESULT_LABELS: Record<keyof CostSimulationResult, string> = {
  costoPorKg: 'Costo por kg',
  costoEscalado: 'Costo de produccion',
  precioVentaSugerido: 'Precio de venta sugerido (con margen)',
  precioConImpuesto: 'Precio con IVA (19%)',
  precioMayorista: 'Precio final con descuento',
  utilidadEstimada: 'Utilidad esperada',
};

const inputClasses =
  'rounded-lg border border-slate-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white';

interface MargenImpuestoCardProps {
  formulacion: Formulation;
  onSaved?: () => void;
}

/** Keyed by formulacion.id in the parent so its edit state resets naturally on selection change, no effect needed. */
function MargenImpuestoCard({ formulacion, onSaved }: MargenImpuestoCardProps) {
  const { showToast } = useToast();
  const [margenEdit, setMargenEdit] = useState(String(Number(formulacion.margenPorcentaje)));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFormulation(formulacion.id, {
        margenPorcentaje: Number(margenEdit),
        // El impuesto es el IVA fijo, no un valor libre: siempre se guarda en 19%.
        impuestoPorcentaje: IVA_PORCENTAJE,
      });
      showToast('Margen actualizado.');
      onSaved?.();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el margen.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        Margen e impuesto de esta formulacion
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Margen (%)
          <input
            type="number"
            min="0"
            max="99.99"
            step="0.01"
            className={inputClasses}
            value={margenEdit}
            onChange={(e) => setMargenEdit(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Impuesto (IVA fijo)
          <input
            type="text"
            disabled
            className={`${inputClasses} cursor-not-allowed opacity-70`}
            value={`${IVA_PORCENTAJE}%`}
            readOnly
          />
        </label>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-500">
        El impuesto es el IVA legal (19%) y aplica igual para todas las formulaciones, no se ajusta por producto.
        Solo el margen es editable aqui.
      </p>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-fit rounded-full border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:border-[#8B5CF6]/40 dark:text-[#a78bfa] dark:hover:bg-[#8B5CF6]/10"
      >
        {saving ? 'Guardando...' : 'Guardar margen'}
      </button>
    </div>
  );
}

export function CostosForm({ formulaciones, onFormulationUpdated }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [formulationId, setFormulationId] = useState(formulaciones[0]?.id ?? '');
  const [cantidadObjetivoKg, setCantidadObjetivoKg] = useState('1');
  const [tamanoPresentacion, setTamanoPresentacion] = useState('');
  const [unidadPresentacion, setUnidadPresentacion] = useState<UnidadPresentacion>('g');
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [descuentoMayoristaPorcentaje, setDescuentoMayoristaPorcentaje] = useState('10');
  const [costoEmpaque, setCostoEmpaque] = useState('');
  const [costoEtiqueta, setCostoEtiqueta] = useState('');
  const [costoTransporte, setCostoTransporte] = useState('');
  const [costoMermas, setCostoMermas] = useState('');
  const [resultado, setResultado] = useState<CostSimulationResult | null>(null);
  const [envasesResultado, setEnvasesResultado] = useState<number | null>(null);
  const [costoOperativoResultado, setCostoOperativoResultado] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formulacion = formulaciones.find((f) => f.id === formulationId);

  const cantidadPresentacion = Number(tamanoPresentacion);
  const envasesEstimados =
    cantidadPresentacion > 0 && Number.isFinite(cantidadPresentacion)
      ? (Number(cantidadObjetivoKg) * 1000) / gramosPorUnidad(cantidadPresentacion, unidadPresentacion)
      : null;

  const costoGastosGeneralesAuto =
    Number(user?.capacidadProduccionMensualKg ?? 0) > 0
      ? (Number(user?.gastoGeneralMensual ?? 0) / Number(user?.capacidadProduccionMensualKg ?? 1)) *
        Number(cantidadObjetivoKg)
      : 0;

  // Mismo patron que en Preparar: tiempo estimado de produccion de la formulacion, escalado a la
  // cantidad analizada, x las tarifas por hora configuradas en Configuracion.
  const cantidadBaseKgTiempo = Number(formulacion?.cantidadBaseKg ?? 0);
  const tiempoEscalado =
    formulacion?.tiempoProduccionHoras && cantidadBaseKgTiempo > 0
      ? (Number(formulacion.tiempoProduccionHoras) * Number(cantidadObjetivoKg)) / cantidadBaseKgTiempo
      : 0;
  const costoManoObraAuto = tiempoEscalado * Number(user?.tarifaManoObraHora ?? 0);
  const costoEnergiaAuto = tiempoEscalado * Number(user?.tarifaEnergiaHora ?? 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResultado(null);
    setEnvasesResultado(null);
    setCostoOperativoResultado(0);

    if (!formulationId) {
      setError('Selecciona una formulacion.');
      return;
    }

    try {
      setLoading(true);
      const envases = envasesEstimados ?? 1;
      // Mermas se ingresa como % del costo de ingredientes: se calcula aqui (mismo patron que en
      // Preparar), replicando el costeo del backend, para poder enviarlo ya en $ al simular.
      const cantidadBaseKg = Number(formulacion?.cantidadBaseKg ?? 0);
      const costoBaseTotal = formulacion?.ingredientes.reduce((total, i) => total + Number(i.precioTotal), 0) ?? 0;
      const costoEscaladoCliente =
        cantidadBaseKg > 0 ? (costoBaseTotal / cantidadBaseKg) * Number(cantidadObjetivoKg) : 0;

      const costoOperativo =
        (Number(costoEmpaque) || 0) * envases +
        (Number(costoEtiqueta) || 0) * envases +
        (Number(costoTransporte) || 0) +
        ((Number(costoMermas) || 0) / 100) * costoEscaladoCliente +
        costoGastosGeneralesAuto +
        costoManoObraAuto +
        costoEnergiaAuto;

      const result = await simulateCost({
        formulationId,
        cantidadObjetivoKg: Number(cantidadObjetivoKg),
        descuentoMayoristaPorcentaje: aplicarDescuento ? Number(descuentoMayoristaPorcentaje) : undefined,
        costoEmpaque: (Number(costoEmpaque) || 0) * envases,
        costoEtiqueta: (Number(costoEtiqueta) || 0) * envases,
        costoTransporte: Number(costoTransporte) || 0,
        costoMermas: ((Number(costoMermas) || 0) / 100) * costoEscaladoCliente,
        costoGastosGenerales: costoGastosGeneralesAuto || undefined,
        costoManoObra: costoManoObraAuto || undefined,
        costoEnergia: costoEnergiaAuto || undefined,
      });
      setResultado(result);
      setEnvasesResultado(envasesEstimados);
      setCostoOperativoResultado(costoOperativo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo calcular el analisis de costos.');
    } finally {
      setLoading(false);
    }
  }

  function handleRegistrarComoOrden() {
    const params = new URLSearchParams({ formulationId, cantidadObjetivoKg });
    if (tamanoPresentacion) {
      params.set('tamanoPresentacion', tamanoPresentacion);
      params.set('unidadPresentacion', unidadPresentacion);
    }
    if (costoEmpaque) params.set('costoEmpaque', costoEmpaque);
    if (costoEtiqueta) params.set('costoEtiqueta', costoEtiqueta);
    if (costoTransporte) params.set('costoTransporte', costoTransporte);
    if (costoMermas) params.set('costoMermas', costoMermas);
    router.push(`/preparar?${params.toString()}`);
  }

  if (formulaciones.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
        Crea una formulacion en la seccion Formulaciones antes de analizar costos.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4">
        <label className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/3 dark:text-zinc-300">
          Formulacion
          <select
            className={inputClasses}
            value={formulationId}
            onChange={(e) => setFormulationId(e.target.value)}
          >
            {formulaciones.map((f) => (
              <option key={f.id} value={f.id} className="text-slate-900">
                {f.nombreProducto}
              </option>
            ))}
          </select>
        </label>

        {formulacion && (
          <MargenImpuestoCard key={formulacion.id} formulacion={formulacion} onSaved={onFormulationUpdated} />
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
              Cantidad a analizar (kg)
              <input
                type="number"
                min="0.001"
                step="0.001"
                className={inputClasses}
                value={cantidadObjetivoKg}
                onChange={(e) => setCantidadObjetivoKg(e.target.value)}
                required
              />
            </label>
            <div className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
              <span id="tamano-presentacion-costos-label">Tamano de presentacion (opcional)</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Ej. 500"
                  aria-labelledby="tamano-presentacion-costos-label"
                  className={`w-full ${inputClasses}`}
                  value={tamanoPresentacion}
                  onChange={(e) => setTamanoPresentacion(e.target.value)}
                />
                <select
                  aria-label="Unidad de presentacion"
                  className={inputClasses}
                  value={unidadPresentacion}
                  onChange={(e) => setUnidadPresentacion(e.target.value as UnidadPresentacion)}
                >
                  {UNIDADES_PRESENTACION.map((unidad) => (
                    <option key={unidad} value={unidad} className="text-slate-900">
                      {unidad}
                    </option>
                  ))}
                </select>
              </div>
              {envasesEstimados !== null && (
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  ≈ {envasesEstimados.toFixed(1)} envase{envasesEstimados === 1 ? '' : 's'} de {tamanoPresentacion}{' '}
                  {unidadPresentacion}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              Costos operativos a considerar (opcional, para el analisis teorico)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
                Empaque (por envase)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={inputClasses}
                  value={costoEmpaque}
                  onChange={(e) => setCostoEmpaque(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
                Etiqueta (por envase)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={inputClasses}
                  value={costoEtiqueta}
                  onChange={(e) => setCostoEtiqueta(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
                Transporte
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={inputClasses}
                  value={costoTransporte}
                  onChange={(e) => setCostoTransporte(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
                Mermas (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className={inputClasses}
                  value={costoMermas}
                  onChange={(e) => setCostoMermas(e.target.value)}
                />
              </label>
              <label
                className="grid gap-1 text-sm text-slate-700 opacity-70 dark:text-zinc-300"
                title="Calculada: tiempo estimado de produccion de esta formulacion x tu tarifa/hora de mano de obra (Configuracion)."
              >
                Mano de obra (automatica)
                <input type="text" disabled className={inputClasses} value={formatCosto(costoManoObraAuto)} />
              </label>
              <label
                className="grid gap-1 text-sm text-slate-700 opacity-70 dark:text-zinc-300"
                title="Calculada: tiempo estimado de produccion de esta formulacion x tu tarifa/hora de energia (Configuracion)."
              >
                Energia/gas (automatica)
                <input type="text" disabled className={inputClasses} value={formatCosto(costoEnergiaAuto)} />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 opacity-70 dark:text-zinc-300">
                Gastos generales (automatico)
                <input
                  type="text"
                  disabled
                  className={inputClasses}
                  value={formatCosto(costoGastosGeneralesAuto)}
                />
              </label>
            </div>
            {!formulacion?.tiempoProduccionHoras && (
              <p className="-mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                ⚠ Mano de obra y energia van a quedar en $0 en este analisis: a esta formulacion le falta el tiempo
                estimado de produccion (edita la formulacion para agregarlo).
              </p>
            )}
            <p className="-mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Estos valores no se guardan: solo se usan para que el &quot;Precio de venta sugerido&quot; y la
              &quot;Utilidad esperada&quot; de este analisis cubran el costo total (ingredientes + operativos), no
              solo ingredientes. El &quot;Costo de produccion&quot; que se muestra abajo sigue siendo solo
              ingredientes. La mano de obra, la energia y los gastos generales se calculan solos con lo configurado
              en Configuracion y el tiempo estimado de produccion de la formulacion.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={aplicarDescuento}
              onChange={(e) => setAplicarDescuento(e.target.checked)}
            />
            Aplicar descuento (mayorista / promocion)
          </label>

          {aplicarDescuento && (
            <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
              Descuento (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputClasses}
                value={descuentoMayoristaPorcentaje}
                onChange={(e) => setDescuentoMayoristaPorcentaje(e.target.value)}
              />
            </label>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
          >
            {loading ? 'Calculando...' : 'Analizar'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Resultado</h3>
        {!resultado && (
          <p className="mt-3 text-slate-500 dark:text-zinc-500">Completa el formulario y analiza para ver el resultado.</p>
        )}
        {resultado && (
          <dl className="mt-3 grid gap-2">
            {(Object.keys(RESULT_LABELS) as Array<keyof CostSimulationResult>).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-white/5"
              >
                <dt className="text-sm text-slate-600 dark:text-zinc-400">{RESULT_LABELS[key]}</dt>
                <dd
                  className={`text-sm font-semibold ${key === 'utilidadEstimada' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}
                >
                  {formatCosto(resultado[key])}
                </dd>
              </div>
            ))}
            {envasesResultado !== null && (
              <div className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-white/5">
                <dt className="text-sm text-slate-600 dark:text-zinc-400">Envases estimados</dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                  ≈ {envasesResultado.toFixed(1)} de {tamanoPresentacion} {unidadPresentacion}
                </dd>
              </div>
            )}
            {costoOperativoResultado > 0 && (
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-sm text-slate-600 dark:text-zinc-400">Costo operativo incluido arriba</dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatCosto(costoOperativoResultado)}
                </dd>
              </div>
            )}
          </dl>
        )}
        {resultado && (
          <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
            El IVA (19%) se aplica sobre el precio de venta sugerido y se refleja en &quot;Precio con IVA&quot;. El
            descuento que activaste arriba se aplica despues, sobre ese precio con IVA, y se refleja en &quot;Precio
            final con descuento&quot; (si no marcaste descuento, es igual al precio con IVA).
          </p>
        )}
        {resultado && (
          <>
            <button
              type="button"
              onClick={handleRegistrarComoOrden}
              className="mt-4 w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
            >
              Registrar como orden de produccion
            </button>
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
              Te lleva a Preparar con estos mismos datos ya cargados, listos para confirmar el lote.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
