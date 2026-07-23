export interface CostSimulationInput {
  costoBaseTotal: number;
  cantidadBaseKg: number;
  cantidadObjetivoKg: number;
  margenPorcentaje: number;
  impuestoPorcentaje?: number;
  descuentoMayoristaPorcentaje?: number;
  /**
   * Suma de costos operativos reales de este lote (empaque, etiqueta, mano de obra/maquila,
   * energia, transporte, mermas), ya calculados en $ para la cantidad objetivo. Si se envia, el
   * precio sugerido y la utilidad se calculan sobre el costo TOTAL (ingredientes + operativos), no
   * solo sobre el costo de ingredientes: de lo contrario el precio sugerido queda por debajo de lo
   * que realmente cuesta producir, y la utilidad reportada queda inflada.
   */
  costosOperativosTotal?: number;
}

export interface CostSimulationResult {
  costoPorKg: number;
  costoEscalado: number;
  precioVentaSugerido: number;
  precioConImpuesto: number;
  precioMayorista: number;
  utilidadEstimada: number;
}
