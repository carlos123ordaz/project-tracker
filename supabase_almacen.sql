-- ============================================================
-- MÓDULO ALMACÉN
-- Ejecutar en el SQL Editor de Supabase
-- Tablas: equipos, kardex, pedidos, recepciones, despachos
-- ============================================================

-- ── 1. CATÁLOGO DE EQUIPOS / MATERIALES ──────────────────────

CREATE TABLE IF NOT EXISTS almacen_equipos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           TEXT,
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  categoria        TEXT,
  marca            TEXT,
  modelo           TEXT,
  serie            TEXT,
  estado           TEXT NOT NULL DEFAULT 'Activo'
                     CHECK (estado IN ('Activo','Inactivo','En Reparación','Dado de Baja')),
  ubicacion        TEXT,
  stock_actual     NUMERIC NOT NULL DEFAULT 0,
  stock_minimo     NUMERIC NOT NULL DEFAULT 0,
  unidad           TEXT NOT NULL DEFAULT 'UND',
  precio_unitario  NUMERIC NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_almacen_equipos
  BEFORE UPDATE ON almacen_equipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. KARDEX (movimientos de inventario) ─────────────────────

CREATE TABLE IF NOT EXISTS almacen_kardex (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id        UUID NOT NULL REFERENCES almacen_equipos(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('Entrada','Salida','Ajuste')),
  cantidad         NUMERIC NOT NULL,
  stock_anterior   NUMERIC NOT NULL DEFAULT 0,
  stock_nuevo      NUMERIC NOT NULL DEFAULT 0,
  motivo           TEXT,
  referencia_tipo  TEXT,   -- 'recepcion' | 'despacho' | 'manual'
  referencia_id    UUID,
  observacion      TEXT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almacen_kardex_equipo ON almacen_kardex(equipo_id);
CREATE INDEX IF NOT EXISTS idx_almacen_kardex_fecha  ON almacen_kardex(fecha DESC);

-- ── 3. PEDIDOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              SERIAL,
  proyecto_id         UUID REFERENCES projects(id) ON DELETE SET NULL,
  solicitado_por      TEXT,
  proveedor_sugerido  TEXT,
  estado              TEXT NOT NULL DEFAULT 'Borrador'
                        CHECK (estado IN ('Borrador','Pendiente','Aprobado','Enviado','Completado','Cancelado')),
  fecha_pedido        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_requerida     DATE,
  observaciones       TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_almacen_pedidos
  BEFORE UPDATE ON almacen_pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. ÍTEMS DE PEDIDO ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_pedido_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         UUID NOT NULL REFERENCES almacen_pedidos(id) ON DELETE CASCADE,
  equipo_id         UUID REFERENCES almacen_equipos(id) ON DELETE SET NULL,
  descripcion       TEXT NOT NULL,
  cantidad          NUMERIC NOT NULL DEFAULT 1,
  cantidad_aprobada NUMERIC,
  unidad            TEXT NOT NULL DEFAULT 'UND',
  precio_unitario   NUMERIC NOT NULL DEFAULT 0,
  observacion       TEXT,
  proveedor         TEXT,
  estado_item       TEXT CHECK (estado_item IN ('Pendiente','En Proceso','Recibido','Cancelado')),
  fecha_requerida   DATE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almacen_pedido_items_pedido ON almacen_pedido_items(pedido_id);

-- ── 5. RECEPCIONES LOGÍSTICAS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_recepciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           SERIAL,
  pedido_id        UUID REFERENCES almacen_pedidos(id) ON DELETE SET NULL,
  proveedor        TEXT,
  nro_factura      TEXT,
  guia_remision    TEXT,
  fecha_recepcion  DATE NOT NULL DEFAULT CURRENT_DATE,
  estado           TEXT NOT NULL DEFAULT 'Pendiente'
                     CHECK (estado IN ('Pendiente','Parcial','Completada')),
  observaciones    TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_almacen_recepciones
  BEFORE UPDATE ON almacen_recepciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. ÍTEMS DE RECEPCIÓN ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_recepcion_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recepcion_id    UUID NOT NULL REFERENCES almacen_recepciones(id) ON DELETE CASCADE,
  equipo_id       UUID REFERENCES almacen_equipos(id) ON DELETE SET NULL,
  pedido_item_id  UUID REFERENCES almacen_pedido_items(id) ON DELETE SET NULL,
  descripcion     TEXT NOT NULL,
  cantidad        NUMERIC NOT NULL DEFAULT 1,
  unidad          TEXT NOT NULL DEFAULT 'UND',
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  observacion     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almacen_recepcion_items_rec ON almacen_recepcion_items(recepcion_id);

-- ── 7. DESPACHOS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_despachos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         SERIAL,
  proyecto_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  destinatario   TEXT,
  direccion      TEXT,
  movilidad      TEXT,
  conductor      TEXT,
  placa          TEXT,
  guia_remision  TEXT,
  fecha_despacho DATE NOT NULL DEFAULT CURRENT_DATE,
  estado         TEXT NOT NULL DEFAULT 'Borrador'
                   CHECK (estado IN ('Borrador','Despachado','Entregado','Cancelado')),
  observaciones  TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_almacen_despachos
  BEFORE UPDATE ON almacen_despachos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 8. ÍTEMS DE DESPACHO ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS almacen_despacho_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id  UUID NOT NULL REFERENCES almacen_despachos(id) ON DELETE CASCADE,
  equipo_id    UUID REFERENCES almacen_equipos(id) ON DELETE SET NULL,
  descripcion  TEXT NOT NULL,
  cantidad     NUMERIC NOT NULL DEFAULT 1,
  unidad       TEXT NOT NULL DEFAULT 'UND',
  observacion  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almacen_despacho_items_desp ON almacen_despacho_items(despacho_id);

-- ── ROW LEVEL SECURITY (opcional — ajustar según necesidad) ───
-- Si tu proyecto usa RLS, habilita y configura políticas aquí.
-- Por defecto se deja sin RLS para coincidir con el resto del proyecto.

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
