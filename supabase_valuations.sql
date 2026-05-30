-- ── Tablas de Valorizaciones ──────────────────────────────────
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS valuations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number          INTEGER NOT NULL,
  title           TEXT,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Borrador',
  contract_amount NUMERIC(16,2) DEFAULT 0,
  advance_pct     NUMERIC(5,2)  DEFAULT 0,
  retention_pct   NUMERIC(5,2)  DEFAULT 5,
  igv_rate        NUMERIC(5,2)  DEFAULT 18,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS valuation_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation_id        UUID NOT NULL REFERENCES valuations(id) ON DELETE CASCADE,
  code                TEXT DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  unit                TEXT DEFAULT 'und',
  unit_price          NUMERIC(14,4) DEFAULT 0,
  quantity_contract   NUMERIC(14,4) DEFAULT 0,
  quantity_previous   NUMERIC(14,4) DEFAULT 0,
  quantity_current    NUMERIC(14,4) DEFAULT 0,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE valuations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_auth_valuations"
  ON valuations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_auth_valuation_items"
  ON valuation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger para valuations
CREATE TRIGGER set_updated_at_valuations
  BEFORE UPDATE ON valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
