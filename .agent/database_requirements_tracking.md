# Requerimientos de Base de Datos - Sistema de Tracking de Ubicación

## Resumen
El sistema de tracking necesita **2 nuevas tablas** y verificar que la tabla `employees` tenga la columna `location`.

---

## 📋 Verificaciones en Tablas Existentes

### Tabla: `employees`
**Necesita tener:**
- ✅ Columna `location` de tipo `geography(Point, 4326)`

**SQL para verificar:**
```sql
-- Ver las columnas de la tabla employees
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'employees';
```

**Si NO existe la columna `location`, agregar con:**
```sql
ALTER TABLE employees 
ADD COLUMN location geography(Point, 4326);
```

---

## 🆕 Nuevas Tablas Necesarias

### 1. Tabla: `location_history`
**Propósito:** Guardar el historial completo de la ruta del empleado (cada 30 segundos cuando tracking está activo)

**Estructura:**
```sql
CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  accuracy FLOAT,              -- Precisión del GPS en metros
  speed FLOAT,                 -- Velocidad en m/s
  heading FLOAT,               -- Dirección en grados (0-360)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_location_history_employee ON location_history(employee_id);
CREATE INDEX idx_location_history_timestamp ON location_history(timestamp);
CREATE INDEX idx_location_history_location ON location_history USING GIST(location);
```

**Políticas RLS (Row Level Security):**
```sql
-- Habilitar RLS
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Los empleados solo pueden insertar su propio historial
CREATE POLICY "Employees can insert own location history"
ON location_history FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Los empleados pueden ver su propio historial
CREATE POLICY "Employees can view own location history"
ON location_history FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Los administradores pueden ver todo
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
```

---

### 2. Tabla: `location_events`
**Propósito:** Registrar cuándo los empleados activan/desactivan el tracking (para alertas y auditoría)

**Estructura:**
```sql
CREATE TABLE location_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enabled', 'disabled')),
  location geography(Point, 4326),  -- Ubicación donde se activó/desactivó (puede ser NULL)
  reason TEXT,                       -- Razón opcional (ej: "Usuario desactivó desde toggle")
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_location_events_employee ON location_events(employee_id);
CREATE INDEX idx_location_events_timestamp ON location_events(timestamp);
CREATE INDEX idx_location_events_type ON location_events(event_type);
```

**Políticas RLS:**
```sql
-- Habilitar RLS
ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

-- Los empleados solo pueden insertar sus propios eventos
CREATE POLICY "Employees can insert own location events"
ON location_events FOR INSERT
TO authenticated
WITH CHECK (employee_id = auth.uid());

-- Los empleados pueden ver sus propios eventos
CREATE POLICY "Employees can view own location events"
ON location_events FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Los administradores pueden ver todos los eventos
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
```

---

## 🔧 Funcionalidades que Proporciona

### Lo que hace cada tabla:

**`employees.location`** (ya existe)
- Guarda la ubicación **actual** del empleado
- Se actualiza constantemente (cada 30s si tracking activo)
- Se usa para mostrar "burbujas" de empleados en el mapa en tiempo real

**`location_history`** (NUEVA)
- Guarda **todo el recorrido** del empleado
- Un punto cada 30 segundos cuando el tracking está activo
- Permite trazar rutas completas en el mapa
- Incluye datos como velocidad, dirección, precisión GPS

**`location_events`** (NUEVA)
- Registra **cuándo se activa/desactiva** el tracking
- Sirve para:
  - Alertas al administrador cuando alguien desactiva
  - Auditoría de comportamiento
  - Verificar cumplimiento de políticas

---

## 📊 Ejemplo de Uso

### Escenario: Empleado trabajando durante el día

**9:00 AM** - Empleado activa tracking desde el mapa
```
location_events: { employee_id: xxx, event_type: 'enabled', timestamp: '9:00' }
```

**9:00 - 17:00** - Se guarda ubicación cada 30s
```
location_history: 
  - { employee_id: xxx, location: Point(-66.1568, -17.3895), timestamp: '9:00' }
  - { employee_id: xxx, location: Point(-66.1570, -17.3897), timestamp: '9:00:30' }
  - { employee_id: xxx, location: Point(-66.1572, -17.3899), timestamp: '9:01' }
  ... (960 registros en 8 horas)
```

**12:30 PM** - Empleado desactiva tracking (almuerzo)
```
location_events: { employee_id: xxx, event_type: 'disabled', reason: 'Usuario desactivó', timestamp: '12:30' }
```

**13:30 PM** - Empleado reactiva tracking
```
location_events: { employee_id: xxx, event_type: 'enabled', timestamp: '13:30' }
```

---

## ✅ Checklist de Configuración

1. [ ] Verificar que tabla `employees` tenga columna `location`
2. [ ] Crear tabla `location_history`
3. [ ] Crear índices para `location_history`
4. [ ] Configurar RLS para `location_history`
5. [ ] Crear tabla `location_events`
6. [ ] Crear índices para `location_events`
7. [ ] Configurar RLS para `location_events`

---

## 🚨 Consideraciones Importantes

### Almacenamiento
- **30 segundos** = 2 puntos por minuto
- **8 horas diarias** = 960 puntos por empleado por día
- **20 días laborales** = 19,200 puntos por empleado por mes
- Con 10 empleados = ~192,000 registros/mes en `location_history`

### Recomendación de Limpieza
Puedes crear una función que elimine historial antiguo (ej: más de 60 días):
```sql
-- Ejecutar mensualmente
DELETE FROM location_history 
WHERE timestamp < NOW() - INTERVAL '60 days';
```

O convertir la tabla en una particionada por fecha para mejor rendimiento.

---

## 📝 Notas

- Todas las coordenadas usan **SRID 4326** (estándar GPS WGS84)
- El formato es `POINT(LONGITUD LATITUD)` - ⚠️ Longitud va primero
- Las políticas RLS aseguran que cada empleado solo vea sus propios datos
- Los administradores (role='admin') pueden ver todo
