-- ============================================================
-- SG-BDP — Script de creación del esquema (PostgreSQL)
-- Banco de Desarrollo Productivo S.A.M.
-- Licitación Pública Nº 04/2023
-- ============================================================

-- Tabla: clientes
CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,      -- CLI-001
  tipo            VARCHAR(10) NOT NULL,             -- 'empresa' | 'persona'
  nombre          VARCHAR(150) NOT NULL,
  nit             VARCHAR(20),                      -- NIT (Bolivia)
  email           VARCHAR(120),
  telefono        VARCHAR(20),
  scoring         INTEGER DEFAULT 0,                -- 0-1000
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMP DEFAULT NOW()
);

-- Tabla: usuarios (personal del banco)
CREATE TABLE usuarios (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  email           VARCHAR(120) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,            -- encriptada
  rol             VARCHAR(20) NOT NULL,             -- oficial|analista|administrador
  mfa_habilitado  BOOLEAN DEFAULT TRUE,
  activo          BOOLEAN DEFAULT TRUE
);

-- Tabla: solicitudes
CREATE TABLE solicitudes (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,      -- SOL-2026-001
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  oficial_id      INTEGER REFERENCES usuarios(id),
  monto           NUMERIC(14,2) NOT NULL,           -- en Bs.
  plazo_meses     INTEGER NOT NULL,
  destino         VARCHAR(100),
  estado          VARCHAR(30) DEFAULT 'Solicitud Inicial',
  creado_en       TIMESTAMP DEFAULT NOW()
);

-- Tabla: evaluaciones (financiera + scoring)
CREATE TABLE evaluaciones (
  id                  SERIAL PRIMARY KEY,
  solicitud_id        INTEGER NOT NULL REFERENCES solicitudes(id),
  liquidez_corriente  NUMERIC(6,2),
  indice_solvencia    NUMERIC(6,2),
  icc                 NUMERIC(6,2),
  ltv                 NUMERIC(6,2),
  score               INTEGER,                      -- 0-1000
  categoria_riesgo    VARCHAR(10),                  -- BAJO|MEDIO|ALTO
  prob_incumplimiento NUMERIC(5,2),
  recomendacion       VARCHAR(10),                  -- APROBAR|RECHAZAR
  evaluado_en         TIMESTAMP DEFAULT NOW()
);

-- Tabla: garantias
CREATE TABLE garantias (
  id              SERIAL PRIMARY KEY,
  solicitud_id    INTEGER NOT NULL REFERENCES solicitudes(id),
  tipo            VARCHAR(40),                      -- inmueble|maquinaria|vehiculo
  descripcion     VARCHAR(200),
  valor_tasacion  NUMERIC(14,2),
  ltv             NUMERIC(6,2),
  estado          VARCHAR(20) DEFAULT 'En Revisión' -- Validada|En Revisión
);

-- Tabla: documentos
CREATE TABLE documentos (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,      -- DOC-001
  solicitud_id    INTEGER REFERENCES solicitudes(id),
  nombre          VARCHAR(150),
  tipo            VARCHAR(30),                      -- Financiero|Legal|Tributario|Garantias
  tamano_kb       INTEGER,
  estado          VARCHAR(20) DEFAULT 'En Revisión',-- Aprobado|En Revisión|Rechazado
  ruta_archivo    VARCHAR(255),
  creado_en       TIMESTAMP DEFAULT NOW()
);

-- Tabla: auditoria (pistas/logs - TDR 3.2.2)
CREATE TABLE auditoria (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER REFERENCES usuarios(id),
  accion          VARCHAR(50) NOT NULL,             -- INSERT|UPDATE|DELETE|LOGIN
  entidad         VARCHAR(50),
  entidad_id      INTEGER,
  detalle         JSONB,
  fecha           TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);

-- ============================================================
-- Trigger de auditoría sobre cambios de estado de solicitudes
-- ============================================================
CREATE OR REPLACE FUNCTION fn_auditar_solicitud()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditoria(usuario_id, accion, entidad, entidad_id, detalle)
  VALUES (NEW.oficial_id, TG_OP, 'solicitudes', NEW.id,
          jsonb_build_object('estado', NEW.estado, 'monto', NEW.monto));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_solicitud
AFTER INSERT OR UPDATE ON solicitudes
FOR EACH ROW EXECUTE FUNCTION fn_auditar_solicitud();
