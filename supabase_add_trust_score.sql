-- ====================================================================
-- 🛡️ SISTEMA ANTI-FRAUDE GPS - SQL MÍNIMO
-- ====================================================================
-- SOLO AGREGA 1 COLUMNA A TU TABLA EXISTENTE
-- Usa tus tablas location_history y location_events que ya tienes
-- ====================================================================

-- PASO 1: Agregar columna gps_trust_score a employees
-- ====================================================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS gps_trust_score INTEGER DEFAULT 100;

-- PASO 2: Agregar constraint (verificando si ya existe)
-- ====================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_gps_trust_score'
  ) THEN
    ALTER TABLE employees 
    ADD CONSTRAINT check_gps_trust_score 
    CHECK (gps_trust_score >= 0 AND gps_trust_score <= 100);
  END IF;
END $$;

-- PASO 3: Actualizar empleados existentes (darles score 100)
-- ====================================================================
UPDATE employees 
SET gps_trust_score = 100 
WHERE gps_trust_score IS NULL;

-- ====================================================================
-- ✅ VERIFICACIÓN - Ejecuta esto para confirmar
-- ====================================================================
SELECT 
  id,
  full_name,
  gps_trust_score
FROM employees
LIMIT 5;

-- ====================================================================
-- 📊 FUNCIÓN ÚTIL: Ver empleados sospechosos
-- ====================================================================
CREATE OR REPLACE FUNCTION get_suspicious_employees()
RETURNS TABLE (
  employee_id UUID,
  full_name TEXT,
  gps_trust_score INTEGER,
  fraud_events_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.full_name,
    e.gps_trust_score,
    COUNT(CASE WHEN le.reason LIKE 'FRAUDE:%' THEN 1 END) as fraud_events_count
  FROM employees e
  LEFT JOIN location_events le ON e.id = le.employee_id
  WHERE e.gps_trust_score < 70
  GROUP BY e.id, e.full_name, e.gps_trust_score
  ORDER BY e.gps_trust_score ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 🎉 ¡LISTO! 
-- ====================================================================
-- Ahora tienes:
-- ✅ Columna gps_trust_score en employees
-- ✅ Tus tablas location_history y location_events se usan tal cual
-- ✅ Función para ver empleados sospechosos
-- ====================================================================
