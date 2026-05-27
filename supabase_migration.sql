-- Migration: Add sort_order to tasks + audit_logs table
-- Run in Supabase SQL Editor (safe to run multiple times)

-- ============================================================
-- 1. sort_order en tasks (para ordenar cards en Kanban)
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Inicializar sort_order con el número de tarea * 1000
UPDATE tasks SET sort_order = number * 1000 WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(status, sort_order);

-- ============================================================
-- 2. Tabla audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  user_name  TEXT,
  action     TEXT NOT NULL,          -- crear | actualizar | eliminar | mover
  entity_type TEXT NOT NULL,         -- tarea | proyecto
  entity_id   TEXT,
  entity_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Allow all on audit_logs'
  ) THEN
    CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
