const { calcularScore } = require("./scoring/scoring");
const { evaluarFinanzas, capacidadPagoNormalizada } = require("./backend/evaluacionFinanciera");

// Caso del prototipo: Empresa ABC S.A. (score esperado ~750, bajo riesgo)
const financieros = {
  activoCorriente: 250000, pasivoCorriente: 100000,  // liquidez 2.5
  activoTotal: 850000, pasivoTotal: 472000,           // solvencia 1.8
  cuotaMensual: 15750, ingresosMensuales: 45000,      // icc 0.35
  montoCredito: 250000, valorGarantias: 385000,       // ltv ~65
};
const ratios = evaluarFinanzas(financieros);
console.log("=== EVALUACIÓN FINANCIERA ===");
for (const [k, r] of Object.entries(ratios)) {
  console.log(`${k}: ${r.valor} (límite ${r.tipo} ${r.limite}) → ${r.cumple ? "CUMPLE" : "NO CUMPLE"}`);
}

const resultado = calcularScore({
  historialCrediticio: 0.91,
  capacidadPago: 0.90,
  garantias: 0.90,
  antiguedadCliente: 0.90,
  sectorEconomico: 0.80,
});
console.log("\n=== MOTOR DE SCORING ===");
console.log("Score:", resultado.score, "/1000");
console.log("Categoría:", resultado.categoria);
console.log("Prob. incumplimiento:", resultado.probabilidadIncumplimiento + "%");
console.log("Recomendación:", resultado.recomendacion);
console.log("Factores:", JSON.stringify(resultado.detalleFactores, null, 0));
