-- ====================================================================
-- MIGRACION: Sistema de Tracking de Ubicación
-- Fecha: 2026-01-12
-- Descripción: Agrega tablas para historial de rutas y eventos de tracking
-- ====================================================================

-- ====================================================================
-- PASO 1: Verificar/Agregar columna location en employees
-- ====================================================================

-- Primero, verificamos si la columna ya existe
-- (Ejecuta esto para ver si existe)
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'location';

-- Si NO existe, ejecuta esto:
-- ALTER TABLE employees 
-- ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- ====================================================================
-- PASO 2: Crear tabla location_history
-- ====================================================================

CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  accuracy FLOAT,              -- Precisión del GPS en metros
  speed FLOAT,                 -- Velocidad en m/s
  heading FLOAT,               -- Dirección en grados (0-360)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para documentación
COMMENT ON TABLE location_history IS 'Historial completo de ubicaciones de empleados (cada 30s cuando tracking activo)';
COMMENT ON COLUMN location_history.accuracy IS 'Precisión del GPS en metros';
COMMENT ON COLUMN location_history.speed IS 'Velocidad en m/s al momento de la captura';
COMMENT ON COLUMN location_history.heading IS 'Dirección del movimiento en grados (0-360)';

-- ====================================================================
-- PASO 3: Crear índices para location_history
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_location_history_employee 
ON location_history(employee_id);

CREATE INDEX IF NOT EXISTS idx_location_history_timestamp 
ON location_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_history_location 
ON location_history USING GIST(location);

-- Índice compuesto para consultas comunes (empleado + fecha)
CREATE INDEX IF NOT EXISTS idx_location_history_employee_timestamp 
ON location_history(employee_id, timestamp DESC);

-- ====================================================================
-- PASO 4: Configurar RLS para location_history
-- ====================================================================

-- Habilitar Row Level Security
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Política: Los empleados pueden insertar su propio historial
DROP POLICY IF EXISTS "Employees can insert own location history" ON location_history;
CREATE POLICY "Employees can insert own location history"
ON location_history FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Política: Los empleados pueden ver su propio historial
DROP POLICY IF EXISTS "Employees can view own location history" ON location_history;
CREATE POLICY "Employees can view own location history"
ON location_history FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Política: Los administradores pueden ver todo el historial
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

-- Política: Los administradores pueden eliminar historial antiguo
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
-- PASO 5: Crear tabla location_events
-- ====================================================================

CREATE TABLE IF NOT EXISTS location_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enabled', 'disabled')),
  location geography(Point, 4326),  -- Puede ser NULL si no se pudo obtener ubicación
  reason TEXT,                       -- Razón opcional del evento
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE location_events IS 'Registro de eventos de activación/desactivación de tracking de ubicación';
COMMENT ON COLUMN location_events.event_type IS 'Tipo: enabled (activado) o disabled (desactivado)';
COMMENT ON COLUMN location_events.reason IS 'Razón del evento (ej: "Usuario desactivó desde toggle")';

-- ====================================================================
-- PASO 6: Crear índices para location_events
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_location_events_employee 
ON location_events(employee_id);

CREATE INDEX IF NOT EXISTS idx_location_events_timestamp 
ON location_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_events_type 
ON location_events(event_type);

-- Índice compuesto para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_location_events_employee_timestamp 
ON location_events(employee_id, timestamp DESC);

-- ====================================================================
-- PASO 7: Configurar RLS para location_events
-- ====================================================================

-- Habilitar Row Level Security
ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

-- Política: Los empleados pueden insertar sus propios eventos
DROP POLICY IF EXISTS "Employees can insert own location events" ON location_events;
CREATE POLICY "Employees can insert own location events"
ON location_events FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Política: Los empleados pueden ver sus propios eventos
DROP POLICY IF EXISTS "Employees can view own location events" ON location_events;
CREATE POLICY "Employees can view own location events"
ON location_events FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Política: Los administradores pueden ver todos los eventos
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
-- PASO 8 (OPCIONAL): Función para limpiar historial antiguo
-- ====================================================================

CREATE OR REPLACE FUNCTION cleanup_old_location_history(days_to_keep INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Solo los admins pueden ejecutar esta función
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden limpiar el historial';
  END IF;

  DELETE FROM location_history 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_location_history IS 'Elimina historial de ubicación más antiguo que X días (por defecto 60)';

-- ====================================================================
-- PASO 9 (OPCIONAL): Vista para obtener última ubicación de empleados
-- ====================================================================

CREATE OR REPLACE VIEW employee_latest_locations AS
SELECT DISTINCT ON (employee_id)
  employee_id,
  location,
  timestamp,
  accuracy,
  speed,
  heading
FROM location_history
ORDER BY employee_id, timestamp DESC;

COMMENT ON VIEW employee_latest_locations IS 'Vista con la última ubicación capturada de cada empleado';

-- ====================================================================
-- PASO 10 (OPCIONAL): Función para obtener ruta de un empleado en un día
-- ====================================================================

CREATE OR REPLACE FUNCTION get_employee_route(
  p_employee_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  timestamp TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy FLOAT,
  speed FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permisos: el mismo empleado o un admin
  IF NOT (
    auth.uid() = p_employee_id 
    OR EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ver esta ruta';
  END IF;

  RETURN QUERY
  SELECT 
    lh.timestamp,
    ST_Y(lh.location::geometry) AS latitude,
    ST_X(lh.location::geometry) AS longitude,
    lh.accuracy,
    lh.speed
  FROM location_history lh
  WHERE lh.employee_id = p_employee_id
    AND lh.timestamp >= p_date::TIMESTAMPTZ
    AND lh.timestamp < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
  ORDER BY lh.timestamp ASC;
END;
$$;

COMMENT ON FUNCTION get_employee_route IS 'Obtiene la ruta completa de un empleado para una fecha específica';

-- ====================================================================
-- VERIFICACIÓN FINAL
-- ====================================================================

-- Ejecuta estas queries para verificar que todo se creó correctamente:

-- 1. Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('location_history', 'location_events')
ORDER BY table_name;

-- 2. Verificar índices
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('location_history', 'location_events')
ORDER BY tablename, indexname;

-- 3. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('location_history', 'location_events')
ORDER BY tablename, policyname;

-- ====================================================================
-- FIN DE LA MIGRACIÓN
-- ====================================================================
