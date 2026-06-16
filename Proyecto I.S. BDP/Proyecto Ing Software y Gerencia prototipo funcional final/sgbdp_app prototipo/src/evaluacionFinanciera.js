/**
 * SG-BDP — Evaluación Financiera
 * Calcula los ratios financieros del solicitante y los compara
 * con los mínimos requeridos (benchmark), conforme al prototipo.
 */

// Mínimos requeridos por ratio (benchmark del prototipo)
const BENCHMARK = {
  liquidezCorriente: 1.5, // mínimo
  indiceSolvencia:   1.5, // mínimo
  icc:               0.4, // máximo (cobertura de cuotas)
  ltv:               80,  // máximo (Loan to Value, %)
};

/**
 * Evalúa los indicadores financieros del solicitante.
 * @param {Object} ef - Datos financieros.
 * @returns {Object} Ratios calculados y su cumplimiento.
 */
function evaluarFinanzas(ef) {
  const {
    activoCorriente, pasivoCorriente,
    activoTotal, pasivoTotal,
    cuotaMensual, ingresosMensuales,
    montoCredito, valorGarantias,
  } = ef;

  const liquidezCorriente = redondear(activoCorriente / pasivoCorriente);
  const indiceSolvencia   = redondear(activoTotal / pasivoTotal);
  const icc               = redondear(cuotaMensual / ingresosMensuales);
  const ltv               = redondear((montoCredito / valorGarantias) * 100);

  return {
    liquidezCorriente: cumple(liquidezCorriente, BENCHMARK.liquidezCorriente, "min"),
    indiceSolvencia:   cumple(indiceSolvencia, BENCHMARK.indiceSolvencia, "min"),
    icc:               cumple(icc, BENCHMARK.icc, "max"),
    ltv:               cumple(ltv, BENCHMARK.ltv, "max"),
  };
}

/** Construye el resultado de un ratio indicando si cumple el benchmark. */
function cumple(valor, limite, tipo) {
  const ok = tipo === "min" ? valor >= limite : valor <= limite;
  return { valor, limite, tipo, cumple: ok };
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

/** Normaliza la capacidad de pago a escala 0-1 para alimentar el scoring. */
function capacidadPagoNormalizada(ratios) {
  const aprobados = Object.values(ratios).filter(r => r.cumple).length;
  return aprobados / Object.keys(ratios).length;
}

module.exports = { evaluarFinanzas, capacidadPagoNormalizada, BENCHMARK };
