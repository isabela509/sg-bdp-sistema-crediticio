/**
 * SG-BDP — Motor de Scoring Crediticio
 * Banco de Desarrollo Productivo S.A.M.
 *
 * Calcula el puntaje crediticio (0-1000) y la categoría de riesgo
 * a partir de cinco factores ponderados, conforme al prototipo SG-BDP.
 */

// Ponderación máxima de cada factor (suma = 100 pts → escalado a 1000)
const FACTORES = {
  historialCrediticio: 35, // Historial de pagos y morosidad
  capacidadPago:       30, // Ratios financieros e ingresos
  garantias:           20, // Cobertura y LTV de garantías
  antiguedadCliente:   10, // Tiempo de relación con el banco
  sectorEconomico:      5, // Riesgo del sector
};

/**
 * Calcula el scoring crediticio de una solicitud.
 * @param {Object} datos - Variables de evaluación (valores normalizados 0-1).
 * @returns {Object} Resultado con puntaje, categoría, probabilidad y recomendación.
 */
function calcularScore(datos) {
  const {
    historialCrediticio = 0, // 0-1 (1 = sin morosidad)
    capacidadPago = 0,       // 0-1 (1 = ratios óptimos)
    garantias = 0,           // 0-1 (1 = cobertura amplia, LTV bajo)
    antiguedadCliente = 0,   // 0-1 (1 = cliente antiguo y cumplido)
    sectorEconomico = 0,     // 0-1 (1 = sector de bajo riesgo)
  } = datos;

  // Validación de rango
  const variables = { historialCrediticio, capacidadPago, garantias, antiguedadCliente, sectorEconomico };
  for (const [k, v] of Object.entries(variables)) {
    if (v < 0 || v > 1) throw new Error(`La variable '${k}' debe estar entre 0 y 1.`);
  }

  // Puntos obtenidos por factor (sobre el máximo de cada uno)
  const puntos = {
    historialCrediticio: variables.historialCrediticio * FACTORES.historialCrediticio,
    capacidadPago:       variables.capacidadPago       * FACTORES.capacidadPago,
    garantias:           variables.garantias           * FACTORES.garantias,
    antiguedadCliente:   variables.antiguedadCliente   * FACTORES.antiguedadCliente,
    sectorEconomico:     variables.sectorEconomico     * FACTORES.sectorEconomico,
  };

  const totalPts = Object.values(puntos).reduce((a, b) => a + b, 0); // 0-100
  const score = Math.round(totalPts * 10); // escala 0-1000

  return {
    score,
    categoria: categoriaRiesgo(score),
    probabilidadIncumplimiento: probabilidadIncumplimiento(score),
    recomendacion: score >= 600 ? "APROBAR" : "RECHAZAR",
    detalleFactores: puntos,
  };
}

/** Determina la categoría de riesgo según el puntaje. */
function categoriaRiesgo(score) {
  if (score >= 700) return "BAJO";
  if (score >= 500) return "MEDIO";
  return "ALTO";
}

/** Estima la probabilidad de incumplimiento (%) de forma inversa al puntaje. */
function probabilidadIncumplimiento(score) {
  const pct = (1000 - score) / 1000 * 25; // 0% a 25%
  return Math.round(pct * 10) / 10;
}

module.exports = { calcularScore, categoriaRiesgo, probabilidadIncumplimiento, FACTORES };
