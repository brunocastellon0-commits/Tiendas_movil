-- =====================================================
-- POLÍTICAS RLS PARA QUE ADMIN VEA TODAS LAS VISITAS
-- =====================================================

-- 1. Política para que ADMIN pueda ver TODAS las visitas
CREATE POLICY "Admins can view all visits"
ON visits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'Administrador'
  )
);

-- 2. Política para que ADMIN pueda ver TODOS los pedidos
CREATE POLICY "Admins can view all orders"
ON pedidos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.role = 'Administrador'
  )
);

-- 3. Política para que ADMIN pueda ver TODOS los empleados (para ubicaciones)
CREATE POLICY "Admins can view all employees"
ON employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND e.role = 'Administrador'
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver políticas actuales de visits
SELECT * FROM pg_policies WHERE tablename = 'visits';

-- Ver políticas actuales de pedidos
SELECT * FROM pg_policies WHERE tablename = 'pedidos';

-- Ver políticas actuales de employees
SELECT * FROM pg_policies WHERE tablename = 'employees';
