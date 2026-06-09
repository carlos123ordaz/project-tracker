-- ═══════════════════════════════════════════════════════════
--  Módulo Compras — Schema completo
--  Ejecutar UNA sola vez en: Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Proveedores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT          NOT NULL,
  ruc        TEXT,
  contact    TEXT,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  notes      TEXT,
  is_active  BOOLEAN       NOT NULL DEFAULT true,
  sort_order INT           NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2. Comparativos de Precios ──────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_comparisons (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  number     INT           GENERATED ALWAYS AS IDENTITY,
  title      TEXT          NOT NULL,
  status     TEXT          NOT NULL DEFAULT 'Borrador'
               CHECK (status IN ('Borrador','En Evaluación','Aprobado','Cerrado')),
  currency   TEXT          NOT NULL DEFAULT 'PEN',
  notes      TEXT,
  project_id UUID          REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 3. Ítems del Comparativo ────────────────────────────────────
CREATE TABLE IF NOT EXISTS comparison_items (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id  UUID          NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  budget_item_id UUID          REFERENCES budget_items(id) ON DELETE SET NULL,
  description    TEXT          NOT NULL,
  unit           TEXT          NOT NULL DEFAULT 'und',
  quantity       NUMERIC(14,4) NOT NULL DEFAULT 1,
  notes          TEXT,
  sort_order     INT           NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 4. Proveedores en el Comparativo ────────────────────────────
CREATE TABLE IF NOT EXISTS comparison_suppliers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID        NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  supplier_id   UUID        REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT        NOT NULL,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Cotizaciones ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comparison_quotes (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id          UUID          NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  item_id                UUID          NOT NULL REFERENCES comparison_items(id) ON DELETE CASCADE,
  comparison_supplier_id UUID          NOT NULL REFERENCES comparison_suppliers(id) ON DELETE CASCADE,
  unit_price             NUMERIC(14,4) NOT NULL DEFAULT 0,
  delivery_days          INT,
  notes                  TEXT,
  is_selected            BOOLEAN       NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (item_id, comparison_supplier_id)
);

-- 6. Triggers updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS suppliers_updated_at            ON suppliers;
DROP TRIGGER IF EXISTS purchase_comparisons_updated_at ON purchase_comparisons;
DROP TRIGGER IF EXISTS comparison_items_updated_at     ON comparison_items;
DROP TRIGGER IF EXISTS comparison_quotes_updated_at    ON comparison_quotes;

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER purchase_comparisons_updated_at
  BEFORE UPDATE ON purchase_comparisons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comparison_items_updated_at
  BEFORE UPDATE ON comparison_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER comparison_quotes_updated_at
  BEFORE UPDATE ON comparison_quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. RLS ──────────────────────────────────────────────────────
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_comparisons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_suppliers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_quotes     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_suppliers"            ON suppliers            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_purchase_comparisons" ON purchase_comparisons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comparison_items"     ON comparison_items     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comparison_suppliers" ON comparison_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_comparison_quotes"    ON comparison_quotes    FOR ALL TO authenticated USING (true) WITH CHECK (true);
