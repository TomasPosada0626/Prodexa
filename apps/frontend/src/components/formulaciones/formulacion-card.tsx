'use client';

import { useState } from 'react';
import { ApiError, createFormulation, Formulation, deleteFormulation, updateFormulation } from '@/lib/api';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Collapsible } from '@/components/shared/collapsible';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { exportFichaTecnicaPdf } from '@/lib/pdf';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { FormulacionForm } from './formulacion-form';
import { IngredientPriceRow } from './ingredient-price-row';

interface Props {
  formulacion: Formulation;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function FormulacionCard({ formulacion, onDeleted, onUpdated }: Props) {
  const { user } = useAuth();
  const puedeEditar = user?.rol === 'ADMIN' || user?.rol === 'COORDINADOR';
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [archivando, setArchivando] = useState(false);
  // Si el borrado falla porque ya hay lotes de produccion registrados, se ofrece archivar en
  // su lugar en vez de solo mostrar el error: guarda el mensaje exacto (incluye el conteo).
  const [archivarPrompt, setArchivarPrompt] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteFormulation(formulacion.id);
      showToast(`"${formulacion.nombreProducto}" eliminada.`);
      setConfirmOpen(false);
      onDeleted();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo eliminar la formulacion.';
      if (message.includes('lote')) {
        setConfirmOpen(false);
        setArchivarPrompt(message);
      } else {
        showToast(message, 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleArchivar(activa: boolean) {
    setArchivando(true);
    try {
      await updateFormulation(formulacion.id, { activa });
      showToast(activa ? `"${formulacion.nombreProducto}" reactivada.` : `"${formulacion.nombreProducto}" archivada.`);
      setArchivarPrompt(null);
      onUpdated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo actualizar la formulacion.', 'error');
    } finally {
      setArchivando(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      await createFormulation({
        nombreProducto: `${formulacion.nombreProducto} (copia)`,
        categoria: formulacion.categoria ?? undefined,
        preparacionHtml: formulacion.preparacionHtml ?? undefined,
        cantidadBaseKg: Number(formulacion.cantidadBaseKg),
        margenPorcentaje: Number(formulacion.margenPorcentaje),
        impuestoPorcentaje: Number(formulacion.impuestoPorcentaje),
        ingredientes: formulacion.ingredientes.map((i) => ({
          nombre: i.nombre,
          porcentaje: Number(i.porcentaje),
          cantidadGramosBase: Number(i.cantidadGramosBase),
          cantidadKg: Number(i.cantidadKg),
          precioKg: Number(i.precioKg),
          precioTotal: Number(i.precioTotal),
        })),
      });
      showToast(`"${formulacion.nombreProducto} (copia)" creada.`);
      onUpdated();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo duplicar la formulacion.', 'error');
    } finally {
      setDuplicating(false);
    }
  }

  if (editing) {
    return (
      <FormulacionForm
        key={formulacion.id}
        formulacion={formulacion}
        onSaved={() => {
          setEditing(false);
          onUpdated();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{formulacion.nombreProducto}</h4>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
          {!formulacion.activa && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-white/10 dark:text-zinc-300">
              Archivada
            </span>
          )}
          {formulacion.categoria && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-[#8B5CF6]/10 dark:text-[#a78bfa]">
              {formulacion.categoria}
            </span>
          )}
          {formulacion.registroSanitario && <span>Registro sanitario: {formulacion.registroSanitario}</span>}
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700 dark:bg-[#8B5CF6]/10 dark:text-[#a78bfa]">
            Margen {Number(formulacion.margenPorcentaje)}%
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/5 dark:text-zinc-400">
            Impuesto {Number(formulacion.impuestoPorcentaje)}%
          </span>
          <button
            type="button"
            onClick={() => exportFichaTecnicaPdf(formulacion)}
            className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            Exportar PDF
          </button>
          {puedeEditar && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={duplicating}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
              >
                {duplicating ? 'Duplicando...' : 'Duplicar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full border border-sky-200 px-2 py-0.5 text-sky-700 hover:bg-sky-50 dark:border-[#8B5CF6]/40 dark:text-[#a78bfa] dark:hover:bg-[#8B5CF6]/10"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => void handleArchivar(!formulacion.activa)}
                disabled={archivando}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
              >
                {archivando ? 'Guardando...' : formulacion.activa ? 'Archivar' : 'Reactivar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="rounded-full border border-red-200 px-2 py-0.5 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <Collapsible title={`Ingredientes (${formulacion.ingredientes.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-zinc-500">
                <th className="py-1.5 pr-2 font-medium">Ingrediente</th>
                <th className="py-1.5 pr-2 font-medium">% en formula</th>
                <th className="py-1.5 pr-2 font-medium">Cantidad</th>
                <th className="py-1.5 pr-2 font-medium">Precio/kg</th>
                <th className="py-1.5 pr-2 font-medium">Costo total</th>
                <th className="py-1.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...formulacion.ingredientes]
                .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
                .map((ingrediente) => (
                <IngredientPriceRow
                  key={ingrediente.id}
                  formulationId={formulacion.id}
                  ingrediente={ingrediente}
                  onUpdated={onUpdated}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      {formulacion.preparacionHtml && (
        <Collapsible title="Preparacion">
          <div
            className="prose prose-sm max-w-none text-slate-600 dark:text-zinc-400 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(formulacion.preparacionHtml) }}
          />
        </Collapsible>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar formulacion"
        description={`Vas a eliminar "${formulacion.nombreProducto}" junto con todos sus ingredientes. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={archivarPrompt !== null}
        title="No se puede eliminar: archivar en su lugar"
        description={`${archivarPrompt ?? ''} Archivarla la oculta de Preparar y Costos, pero conserva todo su historial intacto y la puedes reactivar cuando quieras.`}
        confirmLabel="Archivar"
        loading={archivando}
        onConfirm={() => void handleArchivar(false)}
        onCancel={() => setArchivarPrompt(null)}
      />
    </article>
  );
}
