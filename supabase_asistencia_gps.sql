-- Migración: agregar coordenadas GPS a registros de asistencia
-- Ejecutar en: Supabase > SQL Editor

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS check_in_lat      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lat     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lng     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_accuracy DOUBLE PRECISION;
