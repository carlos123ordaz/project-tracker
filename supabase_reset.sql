-- ============================================================
-- RESET COMPLETO — elimina todo y lo recrea desde cero
-- Incluye: core, presupuestos, cronogramas, RRHH/GPS,
--          compras, valorizaciones y módulo de Cotizaciones
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase
-- ============================================================


-- ============================================================
-- 1. ELIMINAR TRIGGERS EN auth.users
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- ============================================================
-- 2. ELIMINAR FUNCIONES con CASCADE
--    (elimina automáticamente todos los triggers dependientes)
-- ============================================================

DROP FUNCTION IF EXISTS update_updated_at()        CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()           CASCADE;
DROP FUNCTION IF EXISTS fn_set_cotizacion_numero() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()   CASCADE;


-- ============================================================
-- 3. ELIMINAR TABLAS (orden por dependencias FK)
-- ============================================================

-- Módulo Formularios
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_fields      CASCADE;
DROP TABLE IF EXISTS forms            CASCADE;

-- Compras: BOM y Seguimiento
DROP TABLE IF EXISTS compras_bom          CASCADE;
DROP TABLE IF EXISTS compras_seguimiento  CASCADE;

-- Módulo Cotizaciones
DROP TABLE IF EXISTS cotizacion_cashflow_ingresos  CASCADE;
DROP TABLE IF EXISTS cotizacion_cashflow_egresos   CASCADE;
DROP TABLE IF EXISTS cotizacion_cronograma         CASCADE;
DROP TABLE IF EXISTS cotizacion_gastos_generales   CASCADE;
DROP TABLE IF EXISTS cotizacion_partidas           CASCADE;
DROP TABLE IF EXISTS cotizacion_secciones          CASCADE;
DROP TABLE IF EXISTS cotizacion_disciplinas        CASCADE;
DROP TABLE IF EXISTS cotizaciones                  CASCADE;
DROP TABLE IF EXISTS personal_tarifas              CASCADE;

-- Core
DROP TABLE IF EXISTS budget_pie_rows        CASCADE;
DROP TABLE IF EXISTS comparison_quotes      CASCADE;
DROP TABLE IF EXISTS comparison_items       CASCADE;
DROP TABLE IF EXISTS comparison_suppliers   CASCADE;
DROP TABLE IF EXISTS purchase_comparisons   CASCADE;
DROP TABLE IF EXISTS suppliers              CASCADE;
DROP TABLE IF EXISTS articles               CASCADE;
DROP TABLE IF EXISTS valuation_items        CASCADE;
DROP TABLE IF EXISTS valuations             CASCADE;
DROP TABLE IF EXISTS attendance_records     CASCADE;
DROP TABLE IF EXISTS module_permissions     CASCADE;
DROP TABLE IF EXISTS user_profiles          CASCADE;
DROP TABLE IF EXISTS schedule_actuals       CASCADE;
DROP TABLE IF EXISTS schedule_tasks         CASCADE;
DROP TABLE IF EXISTS schedules              CASCADE;
DROP TABLE IF EXISTS apu_lines              CASCADE;
DROP TABLE IF EXISTS budget_items           CASCADE;
DROP TABLE IF EXISTS budget_gg_items        CASCADE;
DROP TABLE IF EXISTS budget_resources       CASCADE;
DROP TABLE IF EXISTS budgets                CASCADE;
DROP TABLE IF EXISTS audit_logs             CASCADE;
DROP TABLE IF EXISTS tasks                  CASCADE;
DROP TABLE IF EXISTS projects               CASCADE;
DROP TABLE IF EXISTS team_members           CASCADE;
DROP TABLE IF EXISTS task_statuses          CASCADE;
DROP TABLE IF EXISTS task_priorities        CASCADE;
DROP TABLE IF EXISTS task_types             CASCADE;
DROP TABLE IF EXISTS libro_insumos          CASCADE;
DROP TABLE IF EXISTS libro_partidas         CASCADE;
DROP TABLE IF EXISTS libros                 CASCADE;


-- ============================================================
-- 4. CREAR TABLAS
-- ============================================================

-- ── Perfil de usuario ──────────────────────────────────────

CREATE TABLE user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT    NOT NULL,
  full_name      TEXT    NOT NULL DEFAULT '',
  role           TEXT    NOT NULL DEFAULT '',
  check_in_time  TIME,
  check_out_time TIME,
  shift          TEXT    NOT NULL DEFAULT 'Día',
  is_superadmin  BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Permisos de módulo por usuario ─────────────────────────

CREATE TABLE module_permissions (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module     TEXT    NOT NULL,
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_add    BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- ── Catálogos de configuración ─────────────────────────────

CREATE TABLE task_statuses (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  color      TEXT    NOT NULL DEFAULT '#6B7280',
  dot_color  TEXT    NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_priorities (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  color      TEXT    NOT NULL DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_types (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Miembros del equipo ────────────────────────────────────

CREATE TABLE team_members (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT '',
  email      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Proyectos ──────────────────────────────────────────────

CREATE TABLE projects (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  focus_area TEXT NOT NULL DEFAULT 'Proyectos',
  initiative TEXT NOT NULL DEFAULT '',
  leader     TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date   DATE,
  color      TEXT NOT NULL DEFAULT 'Dodger Blue',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tareas ─────────────────────────────────────────────────

CREATE TABLE tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number      INTEGER NOT NULL,
  type        TEXT    NOT NULL DEFAULT '',
  name        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'No Iniciado',
  priority    TEXT    NOT NULL DEFAULT 'Media',
  start_date  DATE,
  end_date    DATE,
  assigned_to TEXT,
  budget      NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2) DEFAULT 0,
  progress    NUMERIC(5,2)  DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  label       TEXT,
  notes       TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Log de auditoría ───────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT,
  user_name   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  entity_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Presupuestos ───────────────────────────────────────────

CREATE TABLE budgets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  name         TEXT    NOT NULL,
  client       TEXT    NOT NULL DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'Borrador',
  currency     TEXT    NOT NULL DEFAULT 'USD',
  indirect_pct NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  utility_pct  NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  igv_pct      NUMERIC(5,4) NOT NULL DEFAULT 0.18,
  gg_months    INTEGER      NOT NULL DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_resources (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind       TEXT    NOT NULL DEFAULT 'material',
  name       TEXT    NOT NULL,
  unit       TEXT    NOT NULL DEFAULT 'und',
  price      NUMERIC(14,4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  categoria  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  type        TEXT    NOT NULL DEFAULT 'item',
  code        TEXT    NOT NULL DEFAULT '',
  name        TEXT    NOT NULL,
  unit        TEXT    NOT NULL DEFAULT 'm2',
  qty         NUMERIC(14,4) NOT NULL DEFAULT 1,
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

CREATE TABLE budget_gg_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id  UUID    NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  rubro      TEXT    NOT NULL DEFAULT 'gestion',
  code       TEXT    NOT NULL DEFAULT '',
  name       TEXT    NOT NULL,
  unit       TEXT    NOT NULL DEFAULT 'glb',
  qty        NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  months     INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cronogramas ────────────────────────────────────────────

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

CREATE TABLE schedule_actuals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id     UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  period_date     DATE NOT NULL,
  executed_amount NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, item_id, period_date)
);

-- ── Asistencia (con coordenadas GPS) ──────────────────────

CREATE TABLE attendance_records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date                DATE    NOT NULL,
  collaborator_id     UUID    NOT NULL REFERENCES user_profiles(id),
  collaborator_name   TEXT    NOT NULL,
  project_id          UUID    REFERENCES projects(id) ON DELETE SET NULL,
  project_name        TEXT,
  project_type        TEXT,
  shift               TEXT    NOT NULL DEFAULT 'Día',
  check_in_time       TIMESTAMPTZ,
  check_out_time      TIMESTAMPTZ,
  scheduled_hours     NUMERIC(5,2) NOT NULL DEFAULT 0,
  real_hours          NUMERIC(5,2) NOT NULL DEFAULT 0,
  extra_hours         NUMERIC(5,2) NOT NULL DEFAULT 0,
  condition           TEXT    NOT NULL DEFAULT 'Asistencia',
  motive              TEXT    NOT NULL DEFAULT 'Ninguno',
  observations        TEXT    NOT NULL DEFAULT '',
  check_in_lat        DOUBLE PRECISION,
  check_in_lng        DOUBLE PRECISION,
  check_in_accuracy   DOUBLE PRECISION,
  check_out_lat       DOUBLE PRECISION,
  check_out_lng       DOUBLE PRECISION,
  check_out_accuracy  DOUBLE PRECISION,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Compras: Artículos ─────────────────────────────────────

CREATE TABLE articles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT,
  name        TEXT    NOT NULL,
  description TEXT,
  unit        TEXT    NOT NULL DEFAULT 'und',
  category    TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Compras: Proveedores ───────────────────────────────────

CREATE TABLE suppliers (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  ruc        TEXT,
  contact    TEXT,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Compras: Comparativos de Precios ───────────────────────

CREATE TABLE purchase_comparisons (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  number     INTEGER GENERATED ALWAYS AS IDENTITY,
  title      TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'Borrador'
               CHECK (status IN ('Borrador','En Evaluación','Aprobado','Cerrado')),
  currency   TEXT    NOT NULL DEFAULT 'PEN',
  notes      TEXT,
  project_id UUID    REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comparison_items (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id  UUID    NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  article_id     UUID    REFERENCES articles(id) ON DELETE SET NULL,
  budget_item_id UUID    REFERENCES budget_items(id) ON DELETE SET NULL,
  description    TEXT    NOT NULL,
  unit           TEXT    NOT NULL DEFAULT 'und',
  quantity       NUMERIC(14,4) NOT NULL DEFAULT 1,
  notes          TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comparison_suppliers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id UUID    NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  supplier_id   UUID    REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT    NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comparison_quotes (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comparison_id          UUID          NOT NULL REFERENCES purchase_comparisons(id) ON DELETE CASCADE,
  item_id                UUID          NOT NULL REFERENCES comparison_items(id) ON DELETE CASCADE,
  comparison_supplier_id UUID          NOT NULL REFERENCES comparison_suppliers(id) ON DELETE CASCADE,
  unit_price             NUMERIC(14,4) NOT NULL DEFAULT 0,
  delivery_days          INTEGER,
  notes                  TEXT,
  is_selected            BOOLEAN       NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, comparison_supplier_id)
);

-- ── Libro de Precios ──────────────────────────────────────

CREATE TABLE libros (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL UNIQUE,
  descripcion TEXT,
  anio        INTEGER,
  fuente      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE libro_partidas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT,
  libro_nombre    TEXT        NOT NULL DEFAULT '',
  codigo          TEXT        NOT NULL DEFAULT '',
  edt_grupo       TEXT,
  partida         TEXT        NOT NULL,
  unidad          TEXT        NOT NULL DEFAULT '',
  precio_unitario NUMERIC     DEFAULT 0,
  mano_de_obra    NUMERIC     DEFAULT 0,
  material        NUMERIC     DEFAULT 0,
  equipo          NUMERIC     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT libro_partidas_codigo_unidad_libro_key UNIQUE (codigo, unidad, libro_nombre)
);

CREATE TABLE libro_insumos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file     TEXT,
  libro_nombre    TEXT        NOT NULL DEFAULT '',
  nombre          TEXT        NOT NULL,
  categoria       TEXT        NOT NULL DEFAULT '',
  unidad          TEXT,
  cantidad        NUMERIC     DEFAULT 0,
  precio_unitario NUMERIC     DEFAULT 0,
  total           NUMERIC     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT libro_insumos_nombre_unidad_libro_key UNIQUE (nombre, unidad, libro_nombre)
);

-- ── Compras: Seguimiento de Gestión ───────────────────────

CREATE TABLE compras_seguimiento (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante   TEXT        NOT NULL,
  tarea         TEXT        NOT NULL,
  prioridad     TEXT        NOT NULL DEFAULT 'ALTO' CHECK (prioridad IN ('ALTO','MEDIO','BAJO')),
  responsable   TEXT        NOT NULL DEFAULT '',
  asignado      DATE,
  vence         DATE,
  status        NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (status >= 0 AND status <= 1),
  status_final  TEXT        NOT NULL DEFAULT 'PENDIENTE' CHECK (status_final IN ('PENDIENTE','EN PROCESO','CULMINADO')),
  nota          TEXT        NOT NULL DEFAULT '',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Compras: BOM ───────────────────────────────────────────

CREATE TABLE compras_bom (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item            TEXT        NOT NULL DEFAULT '',
  proceso         TEXT        NOT NULL DEFAULT 'Compra' CHECK (proceso IN ('Compra','Fabricación')),
  tipo            TEXT        NOT NULL DEFAULT '',
  cantidad        TEXT        NOT NULL DEFAULT '',
  descripcion     TEXT        NOT NULL,
  codigo          TEXT        NOT NULL DEFAULT '',
  material        TEXT        NOT NULL DEFAULT '',
  masa            TEXT        NOT NULL DEFAULT '',
  dxf             TEXT        NOT NULL DEFAULT 'NO',
  comentarios     TEXT        NOT NULL DEFAULT '',
  polimetales     NUMERIC(12,4) NOT NULL DEFAULT 0,
  othero          NUMERIC(12,4) NOT NULL DEFAULT 0,
  pernos_y_pernos NUMERIC(12,4) NOT NULL DEFAULT 0,
  ducasse         NUMERIC(12,4) NOT NULL DEFAULT 0,
  em_metal        NUMERIC(12,4) NOT NULL DEFAULT 0,
  imagen          TEXT,
  estado_cot      TEXT        NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_cot IN ('COMPRADO','PENDIENTE','EN PROCESO')),
  observaciones   TEXT        NOT NULL DEFAULT '',
  sort_order      INT         NOT NULL DEFAULT 0,
  custom_fields   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Módulo Formularios ─────────────────────────────────────

CREATE TABLE forms (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  description TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_fields (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id              UUID    REFERENCES forms(id) ON DELETE CASCADE,
  order_index          INTEGER NOT NULL,
  label                TEXT    NOT NULL,
  field_key            TEXT    NOT NULL,
  field_type           TEXT    NOT NULL,  -- radio | checkbox | text | textarea | date | time | select | passenger_list
  options              JSONB   DEFAULT '[]',
  required             BOOLEAN DEFAULT true,
  placeholder          TEXT,
  help_text            TEXT,
  conditional_on_key   TEXT    DEFAULT NULL,
  conditional_on_value TEXT    DEFAULT NULL,
  UNIQUE(form_id, field_key)
);

CREATE TABLE form_submissions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id         UUID        REFERENCES forms(id),
  submitted_by    UUID        REFERENCES auth.users(id),
  submitter_name  TEXT,
  submitter_email TEXT,
  answers         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        DEFAULT 'Pendiente',  -- Pendiente | En proceso | Completado | Cancelado
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Pie de Presupuesto (config global) ────────────────────

CREATE TABLE budget_pie_rows (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  variable    TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  formula     TEXT    NOT NULL DEFAULT '',
  highlight   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Valorizaciones ─────────────────────────────────────────

CREATE TABLE valuations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number          INTEGER NOT NULL,
  title           TEXT,
  period_start    DATE    NOT NULL,
  period_end      DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'Borrador',
  contract_amount NUMERIC(16,2) DEFAULT 0,
  advance_pct     NUMERIC(5,2)  DEFAULT 0,
  retention_pct   NUMERIC(5,2)  DEFAULT 5,
  igv_rate        NUMERIC(5,2)  DEFAULT 18,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE valuation_items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation_id      UUID    NOT NULL REFERENCES valuations(id) ON DELETE CASCADE,
  code              TEXT    DEFAULT '',
  description       TEXT    NOT NULL DEFAULT '',
  unit              TEXT    DEFAULT 'und',
  unit_price        NUMERIC(14,4) DEFAULT 0,
  quantity_contract NUMERIC(14,4) DEFAULT 0,
  quantity_previous NUMERIC(14,4) DEFAULT 0,
  quantity_current  NUMERIC(14,4) DEFAULT 0,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Módulo Cotizaciones ────────────────────────────────────

CREATE TABLE personal_tarifas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil          TEXT        NOT NULL,
  tipo_contrato   TEXT        NOT NULL DEFAULT 'planilla',  -- planilla | recibo
  factor_empresa  NUMERIC(5,3) NOT NULL DEFAULT 1.400,
  sueldo_seg_a    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sueldo_seg_b    NUMERIC(12,2) NOT NULL DEFAULT 0,
  sueldo_seg_c    NUMERIC(12,2) NOT NULL DEFAULT 0,
  orden           INT         NOT NULL DEFAULT 0,
  activo          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizaciones (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         TEXT        UNIQUE,                        -- auto-generado por trigger; NULL hasta insertar
  titulo         TEXT        NOT NULL,
  cliente        TEXT,
  proyecto       TEXT,
  ubicacion      TEXT,
  descripcion    TEXT,
  segmento       TEXT        NOT NULL DEFAULT 'B',          -- A | B | C
  tipo_cambio    NUMERIC(8,4) NOT NULL DEFAULT 3.75,
  status         TEXT        NOT NULL DEFAULT 'Borrador',
  plazo_semanas  INT,
  garantia_meses INT,
  validez_dias   INT         DEFAULT 30,
  notas          TEXT,
  created_by     UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_disciplinas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id   UUID        NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL,
  nombre          TEXT        NOT NULL,
  imprevistos_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  margen_pct      NUMERIC(5,2) NOT NULL DEFAULT 15,
  orden           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_secciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID NOT NULL REFERENCES cotizacion_disciplinas(id) ON DELETE CASCADE,
  codigo        TEXT,
  nombre        TEXT NOT NULL,
  orden         INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_partidas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion_id      UUID        NOT NULL REFERENCES cotizacion_secciones(id) ON DELETE CASCADE,
  disciplina_id   UUID        NOT NULL REFERENCES cotizacion_disciplinas(id) ON DELETE CASCADE,
  tipo            TEXT        NOT NULL DEFAULT 'mo',  -- mo | material | viatico | epp | subcontrato | otro
  codigo          TEXT,
  descripcion     TEXT        NOT NULL,
  area            TEXT,
  producto_bitrix TEXT,
  perfil_id       UUID        REFERENCES personal_tarifas(id),
  personas        INT,
  dias            INT,
  unidad          TEXT        DEFAULT 'glb',
  metrado         NUMERIC(14,4) DEFAULT 1,
  precio_unitario NUMERIC(14,4) DEFAULT 0,
  costo_compra    NUMERIC(14,4) DEFAULT 0,
  notas           TEXT,
  orden           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_gastos_generales (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID        NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  categoria     TEXT        NOT NULL DEFAULT 'Variables',  -- 'Variables' | 'Fijos'
  descripcion   TEXT        NOT NULL,
  unidad        TEXT        NOT NULL DEFAULT 'MES',
  tiempo_pct    NUMERIC(5,3) DEFAULT 0,
  cantidad      INT         DEFAULT 1,
  mensual_usd   NUMERIC(14,2) DEFAULT 0,
  orden         INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_cronograma (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  item          INT  NOT NULL DEFAULT 0,
  descripcion   TEXT NOT NULL,
  semana_inicio INT  NOT NULL DEFAULT 1,
  semana_fin    INT  NOT NULL DEFAULT 1,
  tipo          TEXT NOT NULL DEFAULT 'tarea',  -- 'tarea' | 'hito' | 'entregable'
  color         TEXT DEFAULT null,
  orden         INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_cashflow_egresos (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID  NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  descripcion   TEXT  NOT NULL,
  periodos      JSONB NOT NULL DEFAULT '[]',
  orden         INT   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_cashflow_ingresos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID        NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  descripcion   TEXT        NOT NULL,
  porcentaje    NUMERIC(5,2) NOT NULL DEFAULT 0,
  periodos      JSONB       NOT NULL DEFAULT '[]',
  orden         INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 5. ÍNDICES
-- ============================================================

-- Core
CREATE INDEX idx_tasks_project_id          ON tasks(project_id);
CREATE INDEX idx_tasks_status              ON tasks(status);
CREATE INDEX idx_tasks_sort_order          ON tasks(status, sort_order);
CREATE INDEX idx_tasks_assigned_to         ON tasks(assigned_to);
CREATE INDEX idx_tasks_start_date          ON tasks(start_date);
CREATE INDEX idx_tasks_end_date            ON tasks(end_date);
CREATE INDEX idx_audit_logs_created_at     ON audit_logs(created_at DESC);
CREATE INDEX idx_budget_items_budget_id    ON budget_items(budget_id);
CREATE INDEX idx_budget_items_parent_id    ON budget_items(parent_id);
CREATE INDEX idx_apu_lines_item_id         ON apu_lines(item_id);
CREATE INDEX idx_budget_resources_kind     ON budget_resources(kind);
CREATE INDEX idx_schedules_budget_id       ON schedules(budget_id);
CREATE INDEX idx_schedule_tasks_schedule   ON schedule_tasks(schedule_id);
CREATE INDEX idx_schedule_tasks_item       ON schedule_tasks(item_id);
CREATE INDEX idx_schedule_actuals_schedule ON schedule_actuals(schedule_id);
CREATE INDEX idx_schedule_actuals_period   ON schedule_actuals(period_date);
CREATE INDEX idx_budget_gg_items_budget    ON budget_gg_items(budget_id);
CREATE INDEX idx_module_permissions_user   ON module_permissions(user_id);
CREATE INDEX idx_attendance_date           ON attendance_records(date);
CREATE INDEX idx_attendance_collaborator   ON attendance_records(collaborator_id);
CREATE INDEX idx_suppliers_name            ON suppliers(name);
CREATE INDEX idx_purchase_comparisons_proj ON purchase_comparisons(project_id);
CREATE INDEX idx_comparison_items_comp     ON comparison_items(comparison_id);
CREATE INDEX idx_comparison_quotes_item    ON comparison_quotes(item_id);
CREATE INDEX idx_valuations_project        ON valuations(project_id);
CREATE INDEX idx_valuation_items_val       ON valuation_items(valuation_id);
CREATE INDEX idx_articles_name             ON articles(name);
CREATE INDEX idx_budget_pie_rows_order     ON budget_pie_rows(sort_order);
CREATE INDEX idx_libro_partidas_libro      ON libro_partidas(libro_nombre);
CREATE INDEX idx_libro_partidas_codigo     ON libro_partidas(codigo);
CREATE INDEX idx_libro_insumos_libro       ON libro_insumos(libro_nombre);

-- Compras BOM y Seguimiento
CREATE INDEX idx_compras_seguimiento_status ON compras_seguimiento(status_final);
CREATE INDEX idx_compras_seguimiento_vence  ON compras_seguimiento(vence);
CREATE INDEX idx_compras_bom_estado         ON compras_bom(estado_cot);
CREATE INDEX idx_compras_bom_proceso        ON compras_bom(proceso);

-- Formularios
CREATE INDEX idx_form_fields_form       ON form_fields(form_id);
CREATE INDEX idx_form_submissions_form  ON form_submissions(form_id);

-- Cotizaciones
CREATE INDEX idx_cotizacion_disciplinas_cot ON cotizacion_disciplinas(cotizacion_id);
CREATE INDEX idx_cotizacion_secciones_disc  ON cotizacion_secciones(disciplina_id);
CREATE INDEX idx_cotizacion_partidas_sec    ON cotizacion_partidas(seccion_id);
CREATE INDEX idx_cotizacion_partidas_disc   ON cotizacion_partidas(disciplina_id);
CREATE INDEX idx_gastos_generales_cot       ON cotizacion_gastos_generales(cotizacion_id);
CREATE INDEX idx_cronograma_cot             ON cotizacion_cronograma(cotizacion_id);
CREATE INDEX idx_cashflow_egresos_cot       ON cotizacion_cashflow_egresos(cotizacion_id);
CREATE INDEX idx_cashflow_ingresos_cot      ON cotizacion_cashflow_ingresos(cotizacion_id);


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

-- Core
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_module_permissions_updated_at
  BEFORE UPDATE ON module_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budget_gg_items_updated_at
  BEFORE UPDATE ON budget_gg_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_comparisons_updated_at
  BEFORE UPDATE ON purchase_comparisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comparison_items_updated_at
  BEFORE UPDATE ON comparison_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comparison_quotes_updated_at
  BEFORE UPDATE ON comparison_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_valuations_updated_at
  BEFORE UPDATE ON valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_budget_pie_rows_updated_at
  BEFORE UPDATE ON budget_pie_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_compras_seguimiento_updated
  BEFORE UPDATE ON compras_seguimiento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_compras_bom_updated
  BEFORE UPDATE ON compras_bom
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_forms_updated
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_form_submissions_updated
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cotizaciones
CREATE TRIGGER trg_cotizaciones_updated_at
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cotizacion_partidas_updated_at
  BEFORE UPDATE ON cotizacion_partidas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 7. TRIGGER: auto-número de cotización
--    Genera '001', '002'... si se inserta sin numero
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_cotizacion_numero()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_next INT;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(numero::text,'[^0-9]','','g'),'') AS INT)), 0) + 1
  INTO v_next FROM cotizaciones;
  NEW.numero := LPAD(v_next::TEXT, 3, '0');
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_cotizacion_numero
BEFORE INSERT ON cotizaciones
FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero::text = '')
EXECUTE FUNCTION fn_set_cotizacion_numero();


-- ============================================================
-- 8. TRIGGER: crear perfil al registrar usuario en auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS
ALTER TABLE user_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_priorities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_resources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu_lines                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_gg_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_actuals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_comparisons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_pie_rows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE libros                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE libro_partidas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE libro_insumos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_tarifas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_disciplinas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_secciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_partidas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_gastos_generales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_cronograma       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_cashflow_egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_cashflow_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_seguimiento          ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_bom                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions             ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso total para usuarios autenticados
CREATE POLICY "Allow all on task_statuses"        ON task_statuses        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_priorities"      ON task_priorities      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_types"           ON task_types           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on team_members"         ON team_members         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects"             ON projects             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks"                ON tasks                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_logs"           ON audit_logs           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budgets"              ON budgets              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_resources"     ON budget_resources     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_items"         ON budget_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on apu_lines"            ON apu_lines            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_gg_items"      ON budget_gg_items      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedules"            ON schedules            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule_tasks"       ON schedule_tasks       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule_actuals"     ON schedule_actuals     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on articles"             ON articles             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on suppliers"            ON suppliers            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on purchase_comparisons" ON purchase_comparisons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comparison_items"     ON comparison_items     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comparison_suppliers" ON comparison_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comparison_quotes"    ON comparison_quotes    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on valuations"           ON valuations           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on valuation_items"      ON valuation_items      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_pie_rows"      ON budget_pie_rows      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on libros"               ON libros               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on libro_partidas"       ON libro_partidas       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on libro_insumos"        ON libro_insumos        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth all on personal_tarifas"      ON personal_tarifas     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizaciones"                ON cotizaciones                FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_disciplinas"      ON cotizacion_disciplinas      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_secciones"        ON cotizacion_secciones        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_partidas"         ON cotizacion_partidas         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_gastos_generales" ON cotizacion_gastos_generales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_cronograma"       ON cotizacion_cronograma       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_cashflow_egresos"  ON cotizacion_cashflow_egresos  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on cotizacion_cashflow_ingresos" ON cotizacion_cashflow_ingresos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on compras_seguimiento"          ON compras_seguimiento          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all on compras_bom"                  ON compras_bom                  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth read forms"                          ON forms            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth all forms"                           ON forms            FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth read form_fields"                    ON form_fields      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth all form_fields"                     ON form_fields      FOR ALL    USING (auth.role() = 'authenticated');
CREATE POLICY "auth read form_submissions"               ON form_submissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert form_submissions"             ON form_submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth update form_submissions"             ON form_submissions FOR UPDATE USING (auth.role() = 'authenticated');

-- user_profiles
CREATE POLICY "Authenticated read user_profiles"
  ON user_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write user_profiles"
  ON user_profiles FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- module_permissions
CREATE POLICY "Authenticated read module_permissions"
  ON module_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write module_permissions"
  ON module_permissions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- attendance_records
CREATE POLICY "Authenticated read attendance"
  ON attendance_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write attendance"
  ON attendance_records FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================
-- 10. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('bom-images', 'bom-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read bom-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'bom-images');

CREATE POLICY "auth upload bom-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bom-images' AND auth.role() = 'authenticated');

CREATE POLICY "auth delete bom-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'bom-images' AND auth.role() = 'authenticated');


-- ============================================================
-- PRIMER SUPERADMIN (ejecutar manualmente después del primer login)
-- ============================================================
--
--   UPDATE user_profiles SET is_superadmin = true
--   WHERE email = 'tu-email@empresa.com';
--
-- ============================================================
