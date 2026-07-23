'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, Supplier, getSuppliers } from '@/lib/api';
import { formatCosto } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/empty-state';

const selectClasses =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200';

interface PrecioPorIngrediente {
  ingredienteId: string;
  ingredienteNombre: string;
  formulationId: string;
  formulationNombre: string;
  proveedorId: string;
  proveedorNombre: string;
  precioKg: number;
  vigenteDesde: string;
}

/** Un ingrediente puede tener varias entradas de historial por proveedor; solo la mas reciente
 * (ya viene ordenada desc por vigenteDesde desde el backend) cuenta para comparar quien conviene hoy. */
function preciosVigentesPorIngrediente(proveedores: Supplier[]): PrecioPorIngrediente[] {
  const vistos = new Set<string>();
  const resultado: PrecioPorIngrediente[] = [];
  for (const proveedor of proveedores) {
    for (const precio of proveedor.precios) {
      const clave = `${proveedor.id}:${precio.ingredienteId}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      resultado.push({
        ingredienteId: precio.ingredienteId,
        ingredienteNombre: precio.ingredienteNombre,
        formulationId: precio.formulationId,
        formulationNombre: precio.formulationNombre,
        proveedorId: proveedor.id,
        proveedorNombre: proveedor.nombre,
        precioKg: precio.precioKg,
        vigenteDesde: precio.vigenteDesde,
      });
    }
  }
  return resultado;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formulacionSeleccionada, setFormulacionSeleccionada] = useState<string>('todas');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    getSuppliers()
      .then((data) => {
        if (!cancelled) setProveedores(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los proveedores.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preciosVigentes = useMemo(() => preciosVigentesPorIngrediente(proveedores ?? []), [proveedores]);

  const ingredientesConProveedorTotal = useMemo(
    () => new Set(preciosVigentes.map((p) => p.ingredienteId)).size,
    [preciosVigentes],
  );

  const formulaciones = useMemo(() => {
    const mapa = new Map<string, string>();
    preciosVigentes.forEach((p) => {
      if (!mapa.has(p.formulationId)) mapa.set(p.formulationId, p.formulationNombre);
    });
    return Array.from(mapa.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [preciosVigentes]);

  // Filtra por formulacion antes de armar la lista de ingredientes: asi puedes concentrarte en
  // "que proveedor conviene para ESTA receta" en vez de revolver ingredientes de todos los productos.
  const preciosFiltrados =
    formulacionSeleccionada === 'todas'
      ? preciosVigentes
      : preciosVigentes.filter((p) => p.formulationId === formulacionSeleccionada);

  const ingredientes = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string; formulationNombre: string }>();
    preciosFiltrados.forEach((p) => {
      if (!mapa.has(p.ingredienteId)) {
        mapa.set(p.ingredienteId, {
          id: p.ingredienteId,
          nombre: p.ingredienteNombre,
          formulationNombre: p.formulationNombre,
        });
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
     
  }, [preciosFiltrados]);

  const ingredienteActivo =
    ingredienteSeleccionado && ingredientes.some((i) => i.id === ingredienteSeleccionado)
      ? ingredienteSeleccionado
      : (ingredientes[0]?.id ?? '');

  const comparacion = preciosFiltrados
    .filter((p) => p.ingredienteId === ingredienteActivo)
    .sort((a, b) => a.precioKg - b.precioKg);

  const resumenPorProveedor = (proveedores ?? [])
    .map((proveedor) => {
      const propios = preciosFiltrados.filter((p) => p.proveedorId === proveedor.id);
      const precioPromedio = propios.length
        ? propios.reduce((total, p) => total + p.precioKg, 0) / propios.length
        : 0;
      const ultimoRegistro = propios.reduce<string | null>((ultimo, p) => {
        if (!ultimo || new Date(p.vigenteDesde).getTime() > new Date(ultimo).getTime()) return p.vigenteDesde;
        return ultimo;
      }, null);
      return {
        id: proveedor.id,
        nombre: proveedor.nombre,
        ingredientesCotizados: propios.length,
        precioPromedio,
        ultimoRegistro,
      };
    })
    // Con "todas" se listan tambien los proveedores en 0 (para poder detectar huerfanos abajo);
    // filtrando por una formulacion especifica, un proveedor que no cotiza nada AHI no aporta
    // nada a esa vista y solo confundiria con el concepto de "huerfano".
    .filter((p) => formulacionSeleccionada === 'todas' || p.ingredientesCotizados > 0)
    .sort((a, b) => b.ingredientesCotizados - a.ingredientesCotizados);

  // Un proveedor puede quedar sin ninguna cotizacion vigente si se borro el ingrediente/formulacion
  // que lo usaba (el Supplier en si no se borra en cascada, para no perder el historial del nombre).
  // Se detecta con los precios SIN filtrar por formulacion, para no confundir "sin datos en este
  // filtro" con "huerfano de verdad".
  const proveedoresHuerfanos = (proveedores ?? []).filter(
    (proveedor) => !preciosVigentes.some((p) => p.proveedorId === proveedor.id),
  ).length;

  const loading = proveedores === null && !error;

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Proveedores</h2>
        <p className="mt-1 text-slate-600 dark:text-zinc-400">
          Compara los precios de tus proveedores por ingrediente para saber cual conviene. Se crean automaticamente
          al registrar un precio de ingrediente en Formulaciones.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && (proveedores?.length ?? 0) === 0 && (
        <EmptyState
          title="Aun no tienes proveedores registrados"
          description="Registra el precio de un ingrediente con su proveedor en Formulaciones y aparecera aqui."
          actionLabel="Ir a Formulaciones"
          actionHref="/formulaciones"
        />
      )}

      {!loading && !error && (proveedores?.length ?? 0) > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Proveedores
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{proveedores?.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                Ingredientes con proveedor cotizado
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{ingredientesConProveedorTotal}</p>
            </div>
          </div>

          {formulaciones.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
              Filtrar por formulacion
              <select
                className={selectClasses}
                value={formulacionSeleccionada}
                onChange={(e) => {
                  setFormulacionSeleccionada(e.target.value);
                  setIngredienteSeleccionado('');
                }}
              >
                <option value="todas" className="text-slate-900">
                  Todas las formulaciones
                </option>
                {formulaciones.map((f) => (
                  <option key={f.id} value={f.id} className="text-slate-900">
                    {f.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          {ingredientes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-500">
              Esta formulacion aun no tiene ningun ingrediente con proveedor cotizado.
            </p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  ¿Que proveedor conviene?
                </h3>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                  Ingrediente
                  <select
                    className={selectClasses}
                    value={ingredienteActivo}
                    onChange={(e) => setIngredienteSeleccionado(e.target.value)}
                  >
                    {ingredientes.map((ing) => (
                      <option key={ing.id} value={ing.id} className="text-slate-900">
                        {ing.nombre} ({ing.formulationNombre})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {comparacion.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-zinc-500">
                  Ningun proveedor tiene un precio registrado para este ingrediente.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-120 text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                        <th className="py-2">Proveedor</th>
                        <th className="py-2">Precio por kg</th>
                        <th className="py-2">Ultima cotizacion</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparacion.map((p, i) => (
                        <tr key={p.proveedorId} className="border-b border-slate-100 dark:border-white/5">
                          <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">{p.proveedorNombre}</td>
                          <td
                            className={`py-2 font-semibold ${i === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-400'}`}
                          >
                            {formatCosto(p.precioKg)}
                          </td>
                          <td className="py-2 text-slate-600 dark:text-zinc-400">
                            {new Date(p.vigenteDesde).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            {i === 0 && comparacion.length > 1 && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Mas conveniente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/3">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              {formulacionSeleccionada === 'todas'
                ? 'Todos los proveedores'
                : `Proveedores de ${formulaciones.find((f) => f.id === formulacionSeleccionada)?.nombre ?? ''}`}
            </h3>
            <table className="w-full min-w-140 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                  <th className="py-2">Proveedor</th>
                  <th className="py-2">Ingredientes cotizados</th>
                  <th className="py-2">Precio promedio/kg</th>
                  <th className="py-2">Ultimo registro</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorProveedor.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">{p.nombre}</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">{p.ingredientesCotizados}</td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">
                      {p.ingredientesCotizados > 0 ? formatCosto(p.precioPromedio) : '—'}
                    </td>
                    <td className="py-2 text-slate-600 dark:text-zinc-400">
                      {p.ultimoRegistro ? new Date(p.ultimoRegistro).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proveedoresHuerfanos > 0 && (
              <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
                {proveedoresHuerfanos} proveedor{proveedoresHuerfanos === 1 ? '' : 'es'} sin ninguna cotizacion
                vigente (0 en la tabla) — probablemente porque el ingrediente o la formulacion que lo usaba se editó
                o eliminó despues. El proveedor se conserva para no perder el nombre, pero no cuenta para ninguna
                comparacion mientras no tenga un precio activo.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
