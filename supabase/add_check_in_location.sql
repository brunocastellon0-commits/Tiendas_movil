-- =====================================================
-- MIGRACIÓN: Agregar check_in_location a visits
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columna de ubicación de ENTRADA a la visita
--    (si ya existe, este comando no falla gracias al IF NOT EXISTS)
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS check_in_location geometry(Point, 4326);

-- 2. Índice espacial para consultas rápidas en el mapa
CREATE INDEX IF NOT EXISTS idx_visits_check_in_location
  ON public.visits USING GIST (check_in_location);

-- Verificar que quedó bien:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'visits' ORDER BY column_name;
