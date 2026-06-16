/**
 * SG-BDP — Servidor Principal
 * Banco de Desarrollo Productivo S.A.M. · Licitación Pública Nº 04/2023
 *
 * API REST + servidor de la interfaz web. Autenticación JWT, autorización
 * por rol y persistencia real. Ejecutar con: node src/server.js
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const { cargar, guardar, auditar } = require("./db");
const { calcularScore } = require("./scoring");
const { evaluarFinanzas, capacidadPagoNormalizada } = require("./evaluacionFinanciera");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "sg-bdp-secret-2026";

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Inicializar contraseñas (hash de "123456") la primera vez
(function initPasswords() {
  const db = cargar();
  let cambio = false;
  for (const u of db.usuarios) {
    if (!u.password) { u.password = bcrypt.hashSync("123456", 8); cambio = true; }
  }
  if (cambio) guardar(db);
})();

// ---------- Middleware de autenticación (JWT) ----------
function autenticar(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try { req.usuario = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ error: "Token inválido o expirado" }); }
}
// ---------- Middleware de autorización por rol ----------
function autorizar(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol))
      return res.status(403).json({ error: "Acceso denegado para el rol " + req.usuario.rol });
    next();
  };
}

// ============ AUTENTICACIÓN ============
// POST /api/login  → valida credenciales y devuelve un JWT
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const db = cargar();
  const u = db.usuarios.find(x => x.email === email);
  if (!u || !bcrypt.compareSync(password || "", u.password))
    return res.status(401).json({ error: "Credenciales inválidas" });
  const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, SECRET, { expiresIn: "8h" });
  auditar(db, u.id, "LOGIN", "usuarios", { email });
  guardar(db);
  res.json({ token, usuario: { nombre: u.nombre, rol: u.rol } });
});

// ============ CLIENTES ============
app.get("/api/clientes", autenticar, (req, res) => {
  res.json(cargar().clientes);
});

// ============ SOLICITUDES ============
// POST /api/solicitudes  → registrar (Oficial)
app.post("/api/solicitudes", autenticar, autorizar("oficial"), (req, res) => {
  const { clienteId, monto, plazo, destino } = req.body;
  if (!clienteId || !monto || !plazo)
    return res.status(400).json({ error: "Datos incompletos: clienteId, monto y plazo son obligatorios" });
  const db = cargar();
  const cliente = db.clientes.find(c => c.id === Number(clienteId));
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
  const sol = {
    id: db.secuencias.solicitud++,
    codigo: "SOL-2026-" + String(db.secuencias.solicitud).padStart(3, "0"),
    clienteId: Number(clienteId), clienteNombre: cliente.nombre,
    monto: Number(monto), plazo: Number(plazo), destino: destino || "Capital de inversión",
    estado: "Solicitud Inicial", paso: 1,
    evaluacion: null, oficialId: req.usuario.id,
    creadoEn: new Date().toISOString(),
  };
  db.solicitudes.push(sol);
  auditar(db, req.usuario.id, "INSERT", "solicitudes", { codigo: sol.codigo, monto: sol.monto });
  guardar(db);
  res.status(201).json(sol);
});

// GET /api/solicitudes  → listar
app.get("/api/solicitudes", autenticar, (req, res) => {
  res.json(cargar().solicitudes);
});

// POST /api/solicitudes/:id/evaluar  → evaluación financiera + scoring (Oficial)
app.post("/api/solicitudes/:id/evaluar", autenticar, autorizar("oficial"), (req, res) => {
  const db = cargar();
  const sol = db.solicitudes.find(s => s.id === Number(req.params.id));
  if (!sol) return res.status(404).json({ error: "Solicitud no encontrada" });

  const f = req.body.financieros || {};
  const ratios = evaluarFinanzas(f);
  const score = calcularScore({
    historialCrediticio: num(req.body.historialCrediticio),
    capacidadPago: capacidadPagoNormalizada(ratios),
    garantias: num(req.body.garantias),
    antiguedadCliente: num(req.body.antiguedadCliente),
    sectorEconomico: num(req.body.sectorEconomico),
  });
  sol.evaluacion = { ratios, scoring: score };
  sol.estado = "Scoring Crediticio"; sol.paso = 3;
  // actualizar scoring del cliente
  const cli = db.clientes.find(c => c.id === sol.clienteId);
  if (cli) cli.scoring = score.score;
  auditar(db, req.usuario.id, "UPDATE", "solicitudes", { codigo: sol.codigo, score: score.score });
  guardar(db);
  res.json(sol);
});

// PATCH /api/solicitudes/:id/decision  → aprobar/rechazar (Analista)
app.patch("/api/solicitudes/:id/decision", autenticar, autorizar("analista"), (req, res) => {
  const { decision, observacion } = req.body;
  if (!["aprobar", "rechazar"].includes(decision))
    return res.status(400).json({ error: "Decisión inválida (use 'aprobar' o 'rechazar')" });
  const db = cargar();
  const sol = db.solicitudes.find(s => s.id === Number(req.params.id));
  if (!sol) return res.status(404).json({ error: "Solicitud no encontrada" });
  if (!sol.evaluacion) return res.status(409).json({ error: "La solicitud no tiene scoring calculado" });
  sol.estado = decision === "aprobar" ? "Aprobación Final" : "Rechazado";
  sol.paso = decision === "aprobar" ? 5 : 0;
  sol.observacion = observacion || "";
  auditar(db, req.usuario.id, "DECISION", "solicitudes", { codigo: sol.codigo, decision });
  guardar(db);
  res.json(sol);
});

// ============ AUDITORÍA ============
app.get("/api/auditoria", autenticar, autorizar("administrador", "analista"), (req, res) => {
  res.json(cargar().auditoria.slice(-50).reverse());
});

function num(v) { const n = Number(v); return isNaN(n) ? 0 : Math.max(0, Math.min(1, n)); }

app.listen(PORT, () => {
  console.log(`\n  SG-BDP corriendo en  http://localhost:${PORT}\n`);
  console.log("  Usuarios de prueba (contraseña: 123456):");
  console.log("   • oficial@bdp.com.bo   (Oficial de Crédito)");
  console.log("   • analista@bdp.com.bo  (Analista de Riesgo)");
  console.log("   • admin@bdp.com.bo     (Administrador)\n");
});

module.exports = app;
