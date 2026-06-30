-- ============================================================
-- WMS: Warehouse Management System — Multi-Ubicación
-- Ejecutar DESPUÉS de supabase_almacen.sql
-- ============================================================

-- 1. Catálogo de ubicaciones físicas
-- ============================================================
CREATE TABLE IF NOT EXISTS almacen_ubicaciones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT,
  nombre      TEXT        NOT NULL,
  descripcion TEXT,
  tipo        TEXT        NOT NULL DEFAULT 'Almacén',  -- Almacén | Estante | Bin | Obra | Taller | Externo
  activa      BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE almacen_ubicaciones DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_almacen_ubicaciones_activa ON almacen_ubicaciones(activa);

-- 2. Stock por equipo × ubicación
-- ============================================================
CREATE TABLE IF NOT EXISTS almacen_stock_ubicacion (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id    UUID        NOT NULL REFERENCES almacen_equipos(id)     ON DELETE CASCADE,
  ubicacion_id UUID        NOT NULL REFERENCES almacen_ubicaciones(id) ON DELETE CASCADE,
  stock_actual NUMERIC     NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipo_id, ubicacion_id)
);

ALTER TABLE almacen_stock_ubicacion DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_almacen_stock_ubi_equipo    ON almacen_stock_ubicacion(equipo_id);
CREATE INDEX IF NOT EXISTS idx_almacen_stock_ubi_ubicacion ON almacen_stock_ubicacion(ubicacion_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_almacen_stock_ubicacion_updated_at
  BEFORE UPDATE ON almacen_stock_ubicacion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Columnas de ubicación en kardex
-- ============================================================
ALTER TABLE almacen_kardex
  ADD COLUMN IF NOT EXISTS ubicacion_origen_id  UUID REFERENCES almacen_ubicaciones(id),
  ADD COLUMN IF NOT EXISTS ubicacion_destino_id UUID REFERENCES almacen_ubicaciones(id);

CREATE INDEX IF NOT EXISTS idx_almacen_kardex_ubi_origen
  ON almacen_kardex(ubicacion_origen_id)  WHERE ubicacion_origen_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_almacen_kardex_ubi_destino
  ON almacen_kardex(ubicacion_destino_id) WHERE ubicacion_destino_id IS NOT NULL;

-- 4. Ubicación destino en ítems de recepción
-- ============================================================
ALTER TABLE almacen_recepcion_items
  ADD COLUMN IF NOT EXISTS ubicacion_destino_id UUID REFERENCES almacen_ubicaciones(id);

-- 5. Ubicación origen en ítems de despacho
-- ============================================================
ALTER TABLE almacen_despacho_items
  ADD COLUMN IF NOT EXISTS ubicacion_origen_id UUID REFERENCES almacen_ubicaciones(id);

-- 6. Seed de ubicaciones de ejemplo (opcional — borrar si no se necesita)
-- ============================================================
INSERT INTO almacen_ubicaciones (id, codigo, nombre, descripcion, tipo, activa, sort_order) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'ALM-01', 'Almacén Central',    'Almacén principal de la empresa',      'Almacén', true, 0),
  ('a0000001-0000-4000-8000-000000000002', 'ALM-02', 'Almacén Secundario', 'Almacén de desborde o cuarentena',     'Almacén', true, 1),
  ('a0000001-0000-4000-8000-000000000003', 'OBR-01', 'Obra Norte',         'Ubicación en obra - zona norte',       'Obra',    true, 2),
  ('a0000001-0000-4000-8000-000000000004', 'OBR-02', 'Obra Sur',           'Ubicación en obra - zona sur',         'Obra',    true, 3),
  ('a0000001-0000-4000-8000-000000000005', 'TAL-01', 'Taller',             'Taller de mantenimiento y reparación', 'Taller',  true, 4),
  ('a0000001-0000-4000-8000-000000000006', 'EST-01', 'Estante A1',         'Estante A, fila 1',                    'Estante', true, 5),
  ('a0000001-0000-4000-8000-000000000007', 'EST-02', 'Estante A2',         'Estante A, fila 2',                    'Estante', true, 6)
ON CONFLICT (id) DO NOTHING;
