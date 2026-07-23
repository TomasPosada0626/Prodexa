'use client';

import { useState } from 'react';
import { createFormulation, Formulation, updateFormulation } from '@/lib/api';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';

interface IngredientRow {
  nombre: string;
  porcentaje: string;
  precioKg: string;
}

const EMPTY_ROW: IngredientRow = {
  nombre: '',
  porcentaje: '',
  precioKg: '',
};

const inputClasses =
  'rounded-lg border border-slate-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500';
const inputRowClasses =
  'rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500';
const computedBoxClasses =
  'rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400';

interface Props {
  /** Si se pasa, el formulario edita esta formulacion en vez de crear una nueva. */
  formulacion?: Formulation;
  onSaved?: () => void;
  onCancel?: () => void;
}

/** cantidad_gramos se deriva del % sobre la cantidad base declarada de la formulacion, no se captura a mano. */
function computeGramos(porcentaje: string, cantidadBaseKg: string): number | null {
  const pct = Number(porcentaje);
  const baseKg = Number(cantidadBaseKg);
  if (!Number.isFinite(pct) || !Number.isFinite(baseKg) || baseKg <= 0) return null;
  return (pct / 100) * baseKg * 1000;
}

/** precio_total se deriva de precio_kg * cantidad_kg, no se captura a mano. */
function computePrecioTotal(gramos: number | null, precioKg: string): number | null {
  if (gramos === null) return null;
  const precio = Number(precioKg);
  if (!Number.isFinite(precio)) return null;
  return Math.round((gramos / 1000) * precio * 100) / 100;
}

function rowsFromFormulacion(formulacion?: Formulation): IngredientRow[] {
  if (!formulacion || formulacion.ingredientes.length === 0) return [{ ...EMPTY_ROW }];
  return [...formulacion.ingredientes]
    .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
    .map((i) => ({
      nombre: i.nombre,
      porcentaje: String(Number(i.porcentaje)),
      precioKg: String(Number(i.precioKg)),
    }));
}

export function FormulacionForm({ formulacion, onSaved, onCancel }: Props) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isEditing = Boolean(formulacion);
  const [nombreProducto, setNombreProducto] = useState(formulacion?.nombreProducto ?? '');
  const [categoria, setCategoria] = useState(formulacion?.categoria ?? '');
  const [registroSanitario, setRegistroSanitario] = useState(formulacion?.registroSanitario ?? '');
  const [registroSanitarioVencimiento, setRegistroSanitarioVencimiento] = useState(
    formulacion?.registroSanitarioVencimiento?.slice(0, 10) ?? '',
  );
  const [cantidadBaseKg, setCantidadBaseKg] = useState(
    formulacion ? String(Number(formulacion.cantidadBaseKg)) : '',
  );
  const [vidaUtilDias, setVidaUtilDias] = useState(
    formulacion?.vidaUtilDias ? String(formulacion.vidaUtilDias) : '',
  );
  const [tiempoProduccionHoras, setTiempoProduccionHoras] = useState(
    formulacion?.tiempoProduccionHoras ? String(Number(formulacion.tiempoProduccionHoras)) : '',
  );
  const [preparacionHtml, setPreparacionHtml] = useState(formulacion?.preparacionHtml ?? '');
  const [mostrarPreparacion, setMostrarPreparacion] = useState(Boolean(formulacion?.preparacionHtml));
  const [ingredientes, setIngredientes] = useState<IngredientRow[]>(() => rowsFromFormulacion(formulacion));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sumaPorcentajes = ingredientes.reduce((total, row) => total + (Number(row.porcentaje) || 0), 0);

  function updateIngrediente(index: number, field: keyof IngredientRow, value: string) {
    setIngredientes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addIngrediente() {
    setIngredientes((rows) => [...rows, { ...EMPTY_ROW }]);
  }

  function removeIngrediente(index: number) {
    setIngredientes((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!nombreProducto.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!(Number(cantidadBaseKg) > 0)) {
      setError('Ingresa la cantidad base en kg de esta formulacion.');
      return;
    }
    if (ingredientes.length === 0) {
      setError('Agrega al menos un ingrediente.');
      return;
    }

    // Siempre de mayor a menor porcentaje, sin importar el orden en que se hayan agregado o
    // editado las filas: asi la lista guardada queda consistente cada vez que se guarda.
    const ingredientesPayload = ingredientes
      .map((row) => {
        const cantidadGramosBase = computeGramos(row.porcentaje, cantidadBaseKg) ?? 0;
        const cantidadKg = cantidadGramosBase / 1000;
        const precioKg = Number(row.precioKg);
        return {
          nombre: row.nombre.trim(),
          porcentaje: Number(row.porcentaje),
          cantidadGramosBase,
          cantidadKg,
          precioKg,
          precioTotal: Math.round(cantidadKg * precioKg * 100) / 100,
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);

    try {
      setSubmitting(true);
      if (isEditing && formulacion) {
        await updateFormulation(formulacion.id, {
          nombreProducto: nombreProducto.trim(),
          categoria: categoria.trim() || undefined,
          registroSanitario: registroSanitario.trim() || undefined,
          registroSanitarioVencimiento: registroSanitarioVencimiento || undefined,
          preparacionHtml: preparacionHtml.trim() || undefined,
          cantidadBaseKg: Number(cantidadBaseKg),
          vidaUtilDias: vidaUtilDias ? Number(vidaUtilDias) : undefined,
          tiempoProduccionHoras: tiempoProduccionHoras ? Number(tiempoProduccionHoras) : undefined,
          ingredientes: ingredientesPayload,
        });
        showToast(`"${nombreProducto.trim()}" actualizada correctamente.`);
      } else {
        await createFormulation({
          nombreProducto: nombreProducto.trim(),
          categoria: categoria.trim() || undefined,
          registroSanitario: registroSanitario.trim() || undefined,
          registroSanitarioVencimiento: registroSanitarioVencimiento || undefined,
          preparacionHtml: preparacionHtml.trim() || undefined,
          cantidadBaseKg: Number(cantidadBaseKg),
          margenPorcentaje: user ? Number(user.margenPorDefecto) : undefined,
          vidaUtilDias: vidaUtilDias ? Number(vidaUtilDias) : undefined,
          tiempoProduccionHoras: tiempoProduccionHoras ? Number(tiempoProduccionHoras) : undefined,
          ingredientes: ingredientesPayload,
        });
        showToast(`"${nombreProducto.trim()}" creada correctamente.`);
        setNombreProducto('');
        setCategoria('');
        setRegistroSanitario('');
        setRegistroSanitarioVencimiento('');
        setCantidadBaseKg('');
        setVidaUtilDias('');
        setTiempoProduccionHoras('');
        setPreparacionHtml('');
        setMostrarPreparacion(false);
        setIngredientes([{ ...EMPTY_ROW }]);
      }
      onSaved?.();
    } catch {
      setError(
        isEditing
          ? 'No se pudo guardar los cambios. Verifica los datos e intenta de nuevo.'
          : 'No se pudo crear la formulacion. Verifica los datos e intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Nombre del producto
          <input
            className={inputClasses}
            value={nombreProducto}
            onChange={(e) => setNombreProducto(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Categoria (opcional)
          <input
            className={inputClasses}
            placeholder="Ej. Salsas, Cremas"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Cantidad base (kg)
          <input
            type="number"
            min="0.001"
            step="0.001"
            className={inputClasses}
            value={cantidadBaseKg}
            onChange={(e) => setCantidadBaseKg(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Registro sanitario (opcional)
          <input
            className={inputClasses}
            value={registroSanitario}
            onChange={(e) => setRegistroSanitario(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Vencimiento del registro (opcional)
          <input
            type="date"
            className={inputClasses}
            value={registroSanitarioVencimiento}
            onChange={(e) => setRegistroSanitarioVencimiento(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Vida util del producto en dias (opcional)
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Ej. 180"
            className={inputClasses}
            value={vidaUtilDias}
            onChange={(e) => setVidaUtilDias(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700 dark:text-zinc-300">
          Tiempo estimado de produccion en horas (opcional)
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Ej. 2"
            className={inputClasses}
            value={tiempoProduccionHoras}
            onChange={(e) => setTiempoProduccionHoras(e.target.value)}
          />
        </label>
      </div>
      {!tiempoProduccionHoras && (
        <p className="-mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          Sin tiempo estimado, la mano de obra y la energia de cada lote de este producto se calcularan en $0 (no se
          cobraran). Complétalo si quieres que esos costos se incluyan en el precio y la utilidad.
        </p>
      )}
      <p className="-mt-2 text-xs text-slate-500 dark:text-zinc-500">
        Con ese nombre se guardara la formulacion. La categoria y el registro sanitario son opcionales, pero se
        recomienda agregarlos. La cantidad base es el lote en kg con el que se estandarizo esta formula; en
        Produccion podras recalcularla para cualquier lote que necesites (1, 2, 3, 10 kg, etc.). La vida util se
        usa para sugerir automaticamente la fecha de vencimiento de cada lote que produzcas. El tiempo estimado
        de produccion (para el lote base) se usa para calcular automaticamente la mano de obra propia y la
        energia de cada lote que produzcas, escalado segun la cantidad.
      </p>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Ingredientes</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
              Suma de porcentajes: {sumaPorcentajes.toFixed(2)}%
            </span>
            <button
              type="button"
              onClick={addIngrediente}
              className="rounded-full border border-sky-300 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-[#8B5CF6]/40 dark:text-[#a78bfa] dark:hover:bg-[#8B5CF6]/10"
            >
              + Agregar ingrediente
            </button>
          </div>
        </div>
        {!(Number(cantidadBaseKg) > 0) && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Ingresa la cantidad base (kg) arriba para que los gramos y el precio total de cada ingrediente se
            calculen solos.
          </p>
        )}
        {ingredientes.map((row, index) => {
          const gramos = computeGramos(row.porcentaje, cantidadBaseKg);
          const precioTotal = computePrecioTotal(gramos, row.precioKg);

          return (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  placeholder="Nombre"
                  className={`${inputRowClasses} sm:col-span-2`}
                  value={row.nombre}
                  onChange={(e) => updateIngrediente(index, 'nombre', e.target.value)}
                  required
                />
                <input
                  placeholder="% en formula"
                  type="number"
                  step="0.0001"
                  className={inputRowClasses}
                  value={row.porcentaje}
                  onChange={(e) => updateIngrediente(index, 'porcentaje', e.target.value)}
                  required
                />
                <div className="flex gap-1">
                  <input
                    placeholder="Precio/kg"
                    type="number"
                    step="0.01"
                    className={`w-full ${inputRowClasses}`}
                    value={row.precioKg}
                    onChange={(e) => updateIngrediente(index, 'precioKg', e.target.value)}
                    required
                  />
                  {ingredientes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngrediente(index)}
                      className="rounded-lg border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      aria-label="Quitar ingrediente"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={computedBoxClasses}>
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Gramos
                  </span>
                  {gramos !== null ? gramos.toFixed(2) : '—'}
                </div>
                <div className={computedBoxClasses}>
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Kg
                  </span>
                  {gramos !== null ? (gramos / 1000).toFixed(4) : '—'}
                </div>
                <div className={computedBoxClasses}>
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-slate-600 dark:text-zinc-400">
                    Precio total
                  </span>
                  {precioTotal !== null ? `$${precioTotal.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setMostrarPreparacion((v) => !v)}
          className="flex w-fit items-center gap-1 text-sm font-semibold text-slate-800 dark:text-zinc-200"
        >
          <span className={`transition-transform ${mostrarPreparacion ? 'rotate-90' : ''}`}>▶</span>
          Preparacion (opcional)
        </button>
        {mostrarPreparacion && (
          <RichTextEditor
            value={preparacionHtml}
            onChange={setPreparacionHtml}
            placeholder="Describe el proceso de preparacion, notas y recomendaciones..."
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
        >
          {submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear formulacion'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-fit rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
