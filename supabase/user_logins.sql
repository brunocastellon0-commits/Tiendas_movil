-- =====================================================
-- TABLA: user_logins
-- Registra cada inicio de sesión de los empleados
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_logins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT,
  job_title     TEXT,
  login_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info   TEXT,          -- Opcional: info del dispositivo
  ip_address    TEXT,          -- Opcional: IP si se puede obtener
  status        TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'blocked'))
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_user_logins_employee_id ON public.user_logins(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_logins_login_at    ON public.user_logins(login_at DESC);

-- =======================
-- ROW LEVEL SECURITY
-- =======================
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

-- Administradores pueden ver TODOS los logins
CREATE POLICY "Admins can view all logins"
  ON public.user_logins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid()
        AND role = 'Administrador'
    )
  );

-- Cada empleado puede ver SOLO sus propios logins
CREATE POLICY "Employees can view own logins"
  ON public.user_logins
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Solo el sistema (service role) o el propio usuario pueden insertar registros
CREATE POLICY "Authenticated users can insert own login"
  ON public.user_logins
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Nadie puede actualizar o eliminar registros de login (auditoria inmutable)
-- (Sin políticas UPDATE/DELETE = bloqueado por RLS)


-- =======================
-- VISTA ÚTIL PARA ADMIN
-- =======================
CREATE OR REPLACE VIEW public.v_user_logins_detail AS
SELECT
  ul.id,
  ul.login_at,
  ul.status,
  ul.device_info,
  e.full_name,
  e.email,
  e.role,
  e.job_title
FROM public.user_logins ul
JOIN public.employees e ON e.id = ul.employee_id
ORDER BY ul.login_at DESC;
