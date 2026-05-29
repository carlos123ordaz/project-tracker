-- ============================================================
-- RESET COMPLETO — elimina todo y lo recrea desde cero
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- ============================================================
-- 1. ELIMINAR TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trigger_projects_updated_at           ON projects;
DROP TRIGGER IF EXISTS trigger_tasks_updated_at              ON tasks;
DROP TRIGGER IF EXISTS trigger_budgets_updated_at            ON budgets;
DROP TRIGGER IF EXISTS trigger_budget_items_updated_at       ON budget_items;
DROP TRIGGER IF EXISTS trigger_schedules_updated_at          ON schedules;
-- Nota: trigger_budget_gg_items_updated_at se elimina automáticamente con DROP TABLE budget_gg_items

-- ============================================================
-- 2. ELIMINAR FUNCIÓN
-- ============================================================

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================================
-- 3. ELIMINAR TABLAS (orden por dependencias FK)
-- ============================================================

DROP TABLE IF EXISTS schedule_actuals;
DROP TABLE IF EXISTS schedule_tasks;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS apu_lines;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS budget_gg_items;
DROP TABLE IF EXISTS budget_resources;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS task_statuses;
DROP TABLE IF EXISTS task_priorities;
DROP TABLE IF EXISTS task_types;

-- ============================================================
-- 4. CREAR TABLAS
-- ============================================================

CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  focus_area TEXT NOT NULL DEFAULT 'Proyectos',
  initiative TEXT NOT NULL DEFAULT '',
  leader TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  color TEXT NOT NULL DEFAULT 'Dodger Blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'No Iniciado',
  priority TEXT NOT NULL DEFAULT 'Media',
  start_date DATE,
  end_date DATE,
  assigned_to TEXT,
  budget NUMERIC(12, 2) DEFAULT 0,
  actual_cost NUMERIC(12, 2) DEFAULT 0,
  progress NUMERIC(5, 2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  label TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  entity_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  email TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  dot_color TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_priorities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budgets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  client        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Borrador',
  currency      TEXT NOT NULL DEFAULT 'USD',
  indirect_pct  NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  utility_pct   NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  igv_pct       NUMERIC(5,4) NOT NULL DEFAULT 0.18,
  gg_months     INTEGER      NOT NULL DEFAULT 3,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_resources (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'material',
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'und',
  price      NUMERIC(14,4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id  UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  type       TEXT NOT NULL DEFAULT 'item',
  code       TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'm2',
  qty        NUMERIC(14,4) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(14,4) NOT NULL DEFAULT 0,
  description TEXT         NOT NULL DEFAULT '',
  rendimiento TEXT         NOT NULL DEFAULT '',
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE apu_lines (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id     UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES budget_resources(id) ON DELETE CASCADE,
  qty         NUMERIC(14,4) NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, resource_id)
);

CREATE TABLE schedules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'week',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, item_id)
);

CREATE TABLE budget_gg_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  rubro       TEXT NOT NULL DEFAULT 'gestion',
  code        TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'glb',
  qty         NUMERIC(12, 4) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12, 4) NOT NULL DEFAULT 0,
  months      INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_actuals (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id      UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  period_date      DATE NOT NULL,
  executed_amount  NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, item_id, period_date)
);

-- ============================================================
-- 5. ÍNDICES
-- ============================================================

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_sort_order  ON tasks(status, sort_order);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_start_date  ON tasks(start_date);
CREATE INDEX idx_tasks_end_date    ON tasks(end_date);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs(created_at DESC);
CREATE INDEX idx_budget_items_budget_id  ON budget_items(budget_id);
CREATE INDEX idx_budget_items_parent_id  ON budget_items(parent_id);
CREATE INDEX idx_apu_lines_item_id       ON apu_lines(item_id);
CREATE INDEX idx_budget_resources_kind      ON budget_resources(kind);
CREATE INDEX idx_schedules_budget_id        ON schedules(budget_id);
CREATE INDEX idx_schedule_tasks_schedule_id ON schedule_tasks(schedule_id);
CREATE INDEX idx_schedule_tasks_item_id     ON schedule_tasks(item_id);
CREATE INDEX idx_schedule_actuals_schedule   ON schedule_actuals(schedule_id);
CREATE INDEX idx_schedule_actuals_period     ON schedule_actuals(period_date);
CREATE INDEX idx_budget_gg_items_budget_id   ON budget_gg_items(budget_id);

-- ============================================================
-- 6. FUNCIÓN Y TRIGGERS updated_at
-- ============================================================

CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_budget_gg_items_updated_at
  BEFORE UPDATE ON budget_gg_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_resources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu_lines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_actuals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_gg_items   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on projects"          ON projects          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks"             ON tasks             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on team_members"      ON team_members      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_statuses"     ON task_statuses     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_priorities"   ON task_priorities   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_types"        ON task_types        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs"        ON audit_logs        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budgets"           ON budgets           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_items"      ON budget_items      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_resources"  ON budget_resources  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on apu_lines"         ON apu_lines         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedules"         ON schedules         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule_tasks"    ON schedule_tasks    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule_actuals"  ON schedule_actuals  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_gg_items"   ON budget_gg_items   FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. DATOS INICIALES DE CONFIGURACIÓN
-- ============================================================

INSERT INTO task_statuses (name, color, dot_color, sort_order) VALUES
  ('No Iniciado', '#F3F4F6', '#9CA3AF', 0),
  ('En Progreso',  '#DBEAFE', '#3B82F6', 1),
  ('Retrasado',    '#FEE2E2', '#EF4444', 2),
  ('Completado',   '#D1FAE5', '#10B981', 3);

INSERT INTO task_priorities (name, color, sort_order) VALUES
  ('Crítica', '#FEF2F2', 0),
  ('Alta',    '#FFF7ED', 1),
  ('Media',   '#FEFCE8', 2),
  ('Baja',    '#F9FAFB', 3);

INSERT INTO task_types (name, sort_order) VALUES
  ('Diseño',               0),
  ('Ejecución',            1),
  ('Compras y Logistica',  2),
  ('Prueba',               3),
  ('Venta de Equipos',     4),
  ('Documentación',        5),
  ('Comercial',            6),
  ('Gerencia',             7),
  ('E-Mail',               8),
  ('Ingeniería',           9),
  ('Supervisión',         10),
  ('Gestión',             11);

INSERT INTO team_members (name, role, sort_order) VALUES
  ('Juan Jimenez',       'Líder de Proyecto',   0),
  ('Jhunior Contreras',  'Ingeniería',           1),
  ('Fiorella Rojas',     'Compras y Logística',  2),
  ('Brandon Coronado',   'Proyectos',            3),
  ('Richard Samayani',   'Proyectos',            4),
  ('Paolo Marcas',       'Proyectos',            5),
  ('Marco Alvitez',      'Venta de Equipos',     6),
  ('Marco Reyna',        'Proyectos',            7),
  ('Sabino Vicuña',      'Logística',            8),
  ('Fredy Huaman',       'Proyectos',            9),
  ('Dustin Gomez',       'Ingeniería',          10),
  ('Mariate Rios',       'Administración',      11),
  ('Jean Lucero',        'Venta de Equipos',    12),
  ('Francisco Gonzales', 'Gerencia',            13),
  ('Fabricante',         'Externo',             14);
