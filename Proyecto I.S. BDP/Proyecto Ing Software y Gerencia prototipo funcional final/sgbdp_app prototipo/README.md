# SG-BDP — Sistema de Gestión de Solicitudes de Crédito
### Banco de Desarrollo Productivo S.A.M. · Licitación Pública Nº 04/2023

Aplicación web funcional del proceso crediticio PYME y Banca Empresa.

---

## Cómo ejecutar (3 pasos)

Necesitas tener **Node.js** instalado (versión 18 o superior).

```bash
# 1. Entrar a la carpeta del proyecto
cd sgbdp_app

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Iniciar el servidor
npm start
```

Luego abre el navegador en: **http://localhost:3000**

---

## Usuarios de prueba

Todos usan la contraseña: **123456**

| Correo | Rol | Qué puede hacer |
|---|---|---|
| oficial@bdp.com.bo | Oficial de Crédito | Registrar solicitudes y evaluar (scoring) |
| analista@bdp.com.bo | Analista de Riesgo | Aprobar o rechazar, ver auditoría |
| admin@bdp.com.bo | Administrador | Ver auditoría |

---

## Demo sugerida para la defensa (flujo completo)

1. **Inicia sesión** como `oficial@bdp.com.bo`.
2. Ve a **"Nueva Solicitud"** y registra una (cliente Empresa ABC, Bs 250.000).
3. En la lista, presiona **"Evaluar"** → el sistema calcula el scoring real (929/1000) y muestra factores y ratios.
4. **Cierra sesión** e inicia como `analista@bdp.com.bo`.
5. Presiona **"Aprobar"** → la solicitud cambia a "Aprobación Final".
6. Ve a la pestaña **"Auditoría"** → verás todas las acciones registradas con usuario y fecha.

**Punto fuerte para mostrar:** si como oficial intentas aprobar, el sistema lo bloquea (control de acceso por rol). Eso demuestra seguridad real.

---

## Arquitectura

```
sgbdp_app/
├── src/
│   ├── server.js              ← Servidor Express + API REST
│   ├── db.js                  ← Capa de persistencia
│   ├── scoring.js             ← Motor de scoring (calcularScore)
│   └── evaluacionFinanciera.js ← Cálculo de ratios financieros
├── public/
│   └── index.html             ← Interfaz web (login, dashboard, scoring)
└── data/
    └── sgbdp.json             ← Base de datos (se crea automáticamente)
```

**Capas:** presentación (public) → API/lógica (server, scoring, evaluación) → persistencia (db).
Esta separación permite reemplazar la persistencia por **PostgreSQL** (ver `scripts/01_schema.sql`) sin tocar el resto.

## Tecnologías

- **Node.js + Express** — servidor y API REST
- **JWT (jsonwebtoken)** — autenticación al portador
- **bcryptjs** — contraseñas encriptadas (hash)
- Almacenamiento en archivo JSON (demostración; en producción: PostgreSQL)

## Endpoints de la API

| Método | Endpoint | Rol | Función |
|---|---|---|---|
| POST | /api/login | — | Autenticar y obtener token JWT |
| GET | /api/clientes | autenticado | Listar clientes |
| POST | /api/solicitudes | oficial | Registrar solicitud |
| GET | /api/solicitudes | autenticado | Listar solicitudes |
| POST | /api/solicitudes/:id/evaluar | oficial | Evaluar finanzas + scoring |
| PATCH | /api/solicitudes/:id/decision | analista | Aprobar / rechazar |
| GET | /api/auditoria | analista/admin | Ver pistas de auditoría |
