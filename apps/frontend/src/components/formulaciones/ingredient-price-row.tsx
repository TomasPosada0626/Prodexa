'use client';

import { useState } from 'react';
import {
  ApiError,
  Ingredient,
  SupplierPrice,
  getIngredientPriceHistory,
  updateIngredientPrice,
} from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { formatCosto } from '@/lib/format';

interface Props {
  formulationId: string;
  ingrediente: Ingredient;
  onUpdated: () => void;
}

const inputClasses =
  'rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white';

const HISTORIAL_POR_PAGINA = 5;

export function IngredientPriceRow({ formulationId, ingrediente, onUpdated }: Props) {
  const { user } = useAuth();
  const puedeEditar = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState(String(Number(ingrediente.precioKg)));
  const [proveedor, setProveedor] = useState('');
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historial, setHistorial] = useState<SupplierPrice[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paginaHistorial, setPaginaHistorial] = useState(0);

  async function handleSavePrice() {
    if (!proveedor.trim()) {
      showToast('Ingresa el proveedor de este precio.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateIngredientPrice(formulationId, ingrediente.id, {
        precioKg: Number(nuevoPrecio),
        proveedor: proveedor.trim(),
      });
      showToast(`Precio de "${ingrediente.nombre}" actualizado.`);
      setEditing(false);
      setProveedor('');
      setHistorial(null);
      onUpdated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar el precio.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && historial === null) {
      setLoadingHistory(true);
      try {
        const data = await getIngredientPriceHistory(formulationId, ingrediente.id);
        setHistorial(data);
        setPaginaHistorial(0);
      } catch {
        setHistorial([]);
      } finally {
        setLoadingHistory(false);
      }
    }
  }

  const totalPaginasHistorial = historial ? Math.ceil(historial.length / HISTORIAL_POR_PAGINA) : 0;
  const historialPagina =
    historial?.slice(
      paginaHistorial * HISTORIAL_POR_PAGINA,
      paginaHistorial * HISTORIAL_POR_PAGINA + HISTORIAL_POR_PAGINA,
    ) ?? [];

  return (
    <>
      <tr className="border-b border-slate-100 dark:border-white/5">
        <td className="py-1.5 pr-2 text-slate-700 dark:text-zinc-300">{ingrediente.nombre}</td>
        <td className="py-1.5 pr-2 text-slate-600 dark:text-zinc-400">{Number(ingrediente.porcentaje)}%</td>
        <td className="py-1.5 pr-2 text-slate-600 dark:text-zinc-400">
          {Number(ingrediente.cantidadGramosBase)} g
        </td>
        <td className="py-1.5 pr-2 text-slate-600 dark:text-zinc-400">
          {formatCosto(Number(ingrediente.precioKg))}/kg
        </td>
        <td className="py-1.5 pr-2 font-medium text-slate-800 dark:text-zinc-200">
          {formatCosto(Number(ingrediente.precioTotal))}
        </td>
        <td className="py-1.5 text-right">
          <span className="flex items-center justify-end gap-2 text-xs whitespace-nowrap">
            <button
              type="button"
              onClick={handleToggleHistory}
              className="text-slate-400 underline-offset-2 hover:underline dark:text-zinc-500"
            >
              Historial
            </button>
            {puedeEditar && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="text-sky-600 underline-offset-2 hover:underline dark:text-[#a78bfa]"
              >
                Actualizar precio
              </button>
            )}
          </span>
        </td>
      </tr>

      {editing && (
        <tr>
          <td colSpan={6} className="pb-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClasses}
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  aria-label="Nuevo precio por kg"
                />
                <input
                  type="text"
                  placeholder="Proveedor (o NA si no aplica)"
                  required
                  className={inputClasses}
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  aria-label="Proveedor de este precio"
                />
                <button
                  type="button"
                  onClick={handleSavePrice}
                  disabled={saving || !proveedor.trim()}
                  className="rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60 dark:bg-[#8B5CF6] dark:hover:bg-[#7c3aed]"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-zinc-500">
                El proveedor es obligatorio para poder comparar precios despues. Si no tienes uno definido (ej.
                insumo producido internamente), escribe <span className="font-mono">NA</span>.
              </p>
            </div>
          </td>
        </tr>
      )}

      {showHistory && (
        <tr>
          <td colSpan={6} className="pb-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                Historial de precios · {ingrediente.nombre}
              </p>
              {loadingHistory && <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-500">Cargando historial...</p>}
              {!loadingHistory && historial?.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-500">
                  Sin cambios de precio registrados todavia.
                </p>
              )}
              {!loadingHistory && historial && historial.length > 0 && (
                <>
                  <ul className="mt-1.5 grid gap-1 text-xs text-slate-600 dark:text-zinc-400">
                    {historialPagina.map((precio) => (
                      <li key={precio.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          Precio: {formatCosto(Number(precio.precioKg))}/kg
                        </span>
                        <span>Proveedor: {precio.proveedor ?? 'NA'}</span>
                        <span>Fecha: {new Date(precio.vigenteDesde).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                  {totalPaginasHistorial > 1 && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setPaginaHistorial((p) => Math.max(0, p - 1))}
                        disabled={paginaHistorial === 0}
                        className="rounded-full border border-slate-300 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                      >
                        Anterior
                      </button>
                      <span>
                        Pagina {paginaHistorial + 1} de {totalPaginasHistorial}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaHistorial((p) => Math.min(totalPaginasHistorial - 1, p + 1))}
                        disabled={paginaHistorial >= totalPaginasHistorial - 1}
                        className="rounded-full border border-slate-300 px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
