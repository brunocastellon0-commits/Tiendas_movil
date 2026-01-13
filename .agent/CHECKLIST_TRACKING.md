# ✅ CHECKLIST - Implementación de Tracking de Ubicación

## 📱 Código ya implementado (LISTO)

- ✅ **LocationService.ts** - Servicio extendido con:
  - Toggle activar/desactivar tracking
  - Guardado de historial cada 30 segundos
  - Registro de eventos (cuando se activa/desactiva)
  - Persistencia del estado con AsyncStorage
  
- ✅ **map.tsx** - Mapa actualizado con:
  - Toggle visual para activar/desactivar ubicación
  - Interfaz elegante con estado (Activa/Pausada)
  - Alertas de confirmación al desactivar
  - Mensajes informativos al usuario

- ✅ **Dependencias instaladas**:
  - `@react-native-async-storage/async-storage` ✅ Instalado

## 🗄️ Base de Datos - QUE DEBES REVISAR

### 1️⃣ Tabla `employees` (YA EXISTE)
**Verifica que tenga:**
```sql
-- Ejecuta esto en Supabase SQL Editor:
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'location';
```

**¿Qué esperas ver?**
- Si la columna existe: `location | USER-DEFINED | geography`
- Si NO existe: ejecuta desde el archivo `migration_tracking_system.sql` línea 18

### 2️⃣ Nueva Tabla `location_history` (CREAR)
**Para qué sirve:** Guardar TODO el recorrido del empleado (punto cada 30s)

**Cómo crear:**
- Abre Supabase → SQL Editor
- Ejecuta desde el archivo `.agent/migration_tracking_system.sql`:
  - Líneas 25-35: CREATE TABLE location_history
  - Líneas 43-55: CREATE INDEX (todos los índices)
  - Líneas 63-102: Políticas RLS

### 3️⃣ Nueva Tabla `location_events` (CREAR)
**Para qué sirve:** Registrar cuándo se activa/desactiva (alertas y auditoría)

**Cómo crear:**
- Ejecuta desde el archivo `.agent/migration_tracking_system.sql`:
  - Líneas 108-118: CREATE TABLE location_events
  - Líneas 130-147: CREATE INDEX
  - Líneas 155-189: Políticas RLS

### 4️⃣ OPCIONAL: Funciones auxiliares
Si quieres funcionalidad extra, ejecuta:
- Líneas 195-217: Función para limpiar historial antiguo
- Líneas 223-233: Vista de última ubicación
- Líneas 239-271: Función para obtener ruta de un día

## 🎯 Pasos para completar la implementación

### PASO 1: Revisar tu base de datos actual
```sql
-- Ver todas tus tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver estructura de employees
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'employees'
ORDER BY ordinal_position;
```

### PASO 2: Ejecutar migración
1. Abre Supabase Dashboard → SQL Editor
2. Copia el contenido de `.agent/migration_tracking_system.sql`
3. Ejecuta sección por sección (no todo de golpe)
4. Verifica que no haya errores

### PASO 3: Verificar creación
```sql
-- Ejecuta al final para verificar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('location_history', 'location_events');

-- Deberías ver 2 filas
```

## 🔧 Cómo funciona

### Cuando el empleado ACTIVA el tracking:
1. Se guarda un evento en `location_events`: `{event_type: 'enabled'}`
2. Se empieza a guardar ubicación cada 30 segundos en `location_history`
3. También se actualiza `employees.location` (para el mapa en tiempo real)
4. El estado se guarda en AsyncStorage para que persista al cerrar la app

### Cuando el empleado DESACTIVA el tracking:
1. Se registra evento en `location_events`: `{event_type: 'disabled', reason: '...'}`
2. Se detiene el guardado automático en `location_history`
3. El administrador puede ver cuándo y dónde desactivó

### Lo que el administrador puede ver:
- **Ubicación actual** de todos (tabla `employees.location`)
- **Ruta completa** del día (tabla `location_history`)
- **Historial de activaciones/desactivaciones** (tabla `location_events`)

## 📊 Consumo estimado de datos

**Por empleado:**
- 2 puntos/minuto × 480 minutos (8 horas) = **960 registros/día**
- 20 días laborales = **19,200 registros/mes**

**Con 10 empleados:**
- **~192,000 registros/mes** en `location_history`
- Cada registro ≈ 100 bytes → ~19 MB/mes

**Recomendación:** Configurar limpieza automática después de 60 días

## ⚠️ IMPORTANTE - Permisos

Verifica que la tabla `employees` tenga:
- Columna `role` con valores: `'admin'` y `'seller'` (o similar)
- Las políticas RLS usan `role = 'admin'` para dar acceso completo

Si tu tabla usa otro campo (ej: `is_admin`), modifica las políticas RLS:
```sql
-- En vez de:
AND role = 'admin'

-- Usa:
AND is_admin = true
```

## 📱 Prueba la funcionalidad

1. Abre la app en tu dispositivo/emulador
2. Ve a la pestaña "Mapa"
3. Deberías ver debajo del buscador un toggle:
   - 🔵 "Ubicación Activa" (cuando está ON)
   - ⚪ "Ubicación Pausada" (cuando está OFF)
4. Al activar: pide permisos de ubicación
5. Al desactivar: muestra confirmación

## 📁 Archivos importantes

- `.agent/database_requirements_tracking.md` - Documentación detallada
- `.agent/migration_tracking_system.sql` - Script SQL completo
- `services/LocationService.ts` - Lógica del tracking
- `app/(tabs)/map.tsx` - UI del mapa con toggle

---

## 🆘 Si algo falla

**Problema:** "Cannot find module async-storage"
- Solución: `npm install @react-native-async-storage/async-storage`

**Problema:** Errores RLS en Supabase
- Verifica que tu usuario tenga `id` que coincida con `employees.id`
- Verifica políticas con: `SELECT * FROM pg_policies WHERE tablename = 'location_history';`

**Problema:** No se guarda la ubicación
- Revisa consola: `console.log` en LocationService
- Verifica permisos GPS en el dispositivo
- Verifica que la tabla tenga la columna `location`

---

¿Necesitas que revise algo específico de tu base de datos actual?
