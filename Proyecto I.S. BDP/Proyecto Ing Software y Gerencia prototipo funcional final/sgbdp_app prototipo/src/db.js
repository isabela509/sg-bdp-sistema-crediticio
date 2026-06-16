/**
 * SG-BDP — Capa de Persistencia (Base de Datos)
 * Banco de Desarrollo Productivo S.A.M.
 *
 * Implementa un almacén de datos persistente en archivo JSON.
 * En producción, esta capa se reemplaza por PostgreSQL (ver scripts/01_schema.sql)
 * sin cambiar el resto de la aplicación, gracias a la separación en capas.
 */
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "sgbdp.json");

// Esquema inicial con datos de ejemplo (seed)
const ESQUEMA_INICIAL = {
  usuarios: [
    // password de todos: "123456" (hash bcrypt generado al iniciar)
    { id: 1, nombre: "Juan Pérez",  email: "oficial@bdp.com.bo",  rol: "oficial",       password: "" },
    { id: 2, nombre: "Ana Gómez",   email: "analista@bdp.com.bo", rol: "analista",      password: "" },
    { id: 3, nombre: "Admin BDP",   email: "admin@bdp.com.bo",    rol: "administrador", password: "" },
  ],
  clientes: [
    { id: 1, codigo: "CLI-001", tipo: "empresa", nombre: "Empresa ABC S.A.", nit: "1023456789", scoring: 0 },
    { id: 2, codigo: "CLI-002", tipo: "empresa", nombre: "Constructora del Sur", nit: "1098765432", scoring: 0 },
  ],
  solicitudes: [],
  auditoria: [],
  secuencias: { solicitud: 1, auditoria: 1 },
};

function cargar() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(ESQUEMA_INICIAL, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function guardar(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Registrar una acción en la pista de auditoría (TDR 3.2.2)
function auditar(db, usuarioId, accion, entidad, detalle) {
  db.auditoria.push({
    id: db.secuencias.auditoria++,
    usuarioId, accion, entidad,
    detalle: detalle || {},
    fecha: new Date().toISOString(),
  });
}

module.exports = { cargar, guardar, auditar, DB_FILE, ESQUEMA_INICIAL };
