-- ====================================================================
-- TRACKING DE UBICACIÓN - SQL PARA EJECUTAR EN SUPABASE
-- ====================================================================
-- INSTRUCCIONES: 
-- 1. Abre Supabase → SQL Editor
-- 2. Copia TODO este archivo
-- 3. Pega y ejecuta (Run)
-- ====================================================================

-- ====================================================================
-- TABLA 1: location_history
-- Guarda el recorrido completo del empleado (cada 30 segundos)
-- ====================================================================

CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  accuracy FLOAT,              
  speed FLOAT,                 
  heading FLOAT,               
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_location_history_employee 
  ON location_history(employee_id);

CREATE INDEX IF NOT EXISTS idx_location_history_timestamp 
  ON location_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_history_employee_timestamp 
  ON location_history(employee_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_history_location 
  ON location_history USING GIST(location);

-- Habilitar RLS
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Política 1: Empleados pueden insertar su propio historial
DROP POLICY IF EXISTS "Employees can insert own location history" ON location_history;
CREATE POLICY "Employees can insert own location history"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Política 2: Empleados pueden ver su propio historial
DROP POLICY IF EXISTS "Employees can view own location history" ON location_history;
CREATE POLICY "Employees can view own location history"
  ON location_history FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Política 3: Admins pueden ver todo
DROP POLICY IF EXISTS "Admins can view all location history" ON location_history;
CREATE POLICY "Admins can view all location history"
  ON location_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Política 4: Admins pueden eliminar historial antiguo
DROP POLICY IF EXISTS "Admins can delete location history" ON location_history;
CREATE POLICY "Admins can delete location history"
  ON location_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ====================================================================
-- TABLA 2: location_events
-- Registra cuando se activa/desactiva el tracking (alertas)
-- ====================================================================

CREATE TABLE IF NOT EXISTS location_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enabled', 'disabled')),
  location geography(Point, 4326),
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_location_events_employee 
  ON location_events(employee_id);

CREATE INDEX IF NOT EXISTS idx_location_events_timestamp 
  ON location_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_events_type 
  ON location_events(event_type);

CREATE INDEX IF NOT EXISTS idx_location_events_employee_timestamp 
  ON location_events(employee_id, timestamp DESC);

-- Habilitar RLS
ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

-- Política 1: Empleados pueden insertar sus eventos
DROP POLICY IF EXISTS "Employees can insert own location events" ON location_events;
CREATE POLICY "Employees can insert own location events"
  ON location_events FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Política 2: Empleados pueden ver sus eventos
DROP POLICY IF EXISTS "Employees can view own location events" ON location_events;
CREATE POLICY "Employees can view own location events"
  ON location_events FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Política 3: Admins pueden ver todos los eventos
DROP POLICY IF EXISTS "Admins can view all location events" ON location_events;
CREATE POLICY "Admins can view all location events"
  ON location_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ====================================================================
-- ✅ VERIFICACIÓN - Ejecuta esto para confirmar que todo está OK
-- ====================================================================

-- Ver las nuevas tablas creadas
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('location_history', 'location_events')
ORDER BY table_name;

-- Ver los índices creados
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename IN ('location_history', 'location_events')
ORDER BY tablename, indexname;

-- Ver las políticas RLS
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('location_history', 'location_events')
ORDER BY tablename, policyname;

-- ====================================================================
-- 🎉 ¡LISTO! Si ves resultados en las 3 queries de arriba, todo está OK
-- ====================================================================
