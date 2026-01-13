# 📍 Guía de Verificación de Ubicaciones GPS

Esta guía te ayudará a verificar que las ubicaciones de **clientes** y **empleados** se estén guardando correctamente en Supabase.

---

## ⚠️ Regla de Oro: Orden de Coordenadas

### Frontend (React Native, Google Maps)
```
Orden: Latitude, Longitude (Lat, Lon)
```

### Backend (Supabase, PostGIS, WKT)
```
Orden: Longitude, Latitude (Lon, Lat) - Es decir (X, Y)
```

### Ejemplo Real: Cochabamba, Bolivia
- **Latitud:** -17.3935
- **Longitud:** -66.1568

**✅ Correcto en BD (Formato WKT):**
```
POINT(-66.1568 -17.3935)
```
o con SRID explícito:
```
SRID=4326;POINT(-66.1568 -17.3935)
```

**❌ Incorrecto (Invertido) - Cae en la Antártida:**
```
POINT(-17.3935 -66.1568)
```

### 📝 Nota sobre Formatos

**WKT (Well-Known Text):** Es el formato que usamos para enviar a Supabase
- Formato: `POINT(longitude latitude)`
- Ventaja: Compatible directamente con columnas `geography` de PostGIS
- Ejemplo: `SRID=4326;POINT(-66.1568 -17.3935)`

**GeoJSON:** Es el formato interno que PostGIS usa para almacenar
- Formato: `{"type": "Point", "coordinates": [longitude, latitude]}`
- PostGIS convierte automáticamente de WKT a GeoJSON internamente

---

## 🔍 Queries de Verificación

### 1. Verificar Clientes con Ubicación

```sql
-- Ver todos los clientes con sus coordenadas en formato legible
SELECT 
  id,
  name,
  code,
  ST_Y(location::geometry) as latitude,   -- Y es Latitud
  ST_X(location::geometry) as longitude,  -- X es Longitud
  location -- Muestra el GeoJSON completo
FROM clients
WHERE location IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Verificar Empleados con Ubicación

```sql
-- Ver todos los empleados con sus coordenadas
SELECT 
  id,
  full_name,
  role,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude,
  location -- Muestra el GeoJSON completo
FROM employees
WHERE location IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### 3. Validar Rango de Coordenadas (Bolivia)

```sql
-- Esta query verifica que las coordenadas estén en Bolivia
-- Bolivia está aproximadamente entre:
-- Latitud: -9° a -23°
-- Longitud: -57° a -70°

SELECT 
  id,
  name,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude,
  CASE 
    WHEN ST_Y(location::geometry) BETWEEN -23 AND -9 
         AND ST_X(location::geometry) BETWEEN -70 AND -57 THEN '✅ En Bolivia'
    ELSE '❌ Fuera de Bolivia'
  END as validacion
FROM clients
WHERE location IS NOT NULL;
```

### 4. Encontrar Puntos con Coordenadas Nulas (Island Null)

```sql
-- Buscar puntos en (0, 0) que caen en el océano frente a África
SELECT 
  id,
  name,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM clients
WHERE 
  location IS NOT NULL
  AND ST_X(location::geometry) = 0 
  AND ST_Y(location::geometry) = 0;
```

### 5. Calcular Distancia entre Cliente y Empleado

```sql
-- Calcular distancia en metros entre un cliente y empleado
SELECT 
  c.name as cliente,
  e.full_name as empleado,
  ST_Distance(
    c.location::geography,
    e.location::geography
  ) as distancia_metros
FROM clients c
CROSS JOIN employees e
WHERE c.location IS NOT NULL 
  AND e.location IS NOT NULL
  AND c.id = 'ID_DEL_CLIENTE_AQUI'
  AND e.id = 'ID_DEL_EMPLEADO_AQUI';
```

---

## 🧪 Cómo Probar en la App

### Paso 1: Registrar un Cliente
1. Abre la app y ve a **Registrar Cliente**
2. Llena los datos básicos (Nombre, Código)
3. Presiona **"Capturar Ubicación GPS"**
4. Espera a que aparezcan las coordenadas en pantalla
5. Guarda el cliente

### Paso 2: Verificar en Supabase
1. Ve al **Editor SQL** de Supabase
2. Ejecuta la siguiente query:

```sql
SELECT 
  name,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM clients
ORDER BY created_at DESC
LIMIT 1;
```

3. **Compara** las coordenadas mostradas en la app vs. Supabase:
   - En la app se muestra como: `Lat: -17.393500, Lon: -66.156800`
   - En Supabase debe aparecer: `latitude: -17.393500, longitude: -66.156800`

### Paso 3: Visualizar en Mapa
Copia las coordenadas y pégalas en Google Maps en este formato:
```
-17.393500, -66.156800
```

Si el punto aparece en el lugar correcto, **¡todo funciona bien!** ✅

---

## ❌ Problemas Comunes

### Problema 1: El punto aparece en otro continente
**Causa:** Coordenadas invertidas
**Solución:** Verificar que el array `coordinates` use `[longitude, latitude]`

### Problema 2: El punto cae en el océano (0, 0)
**Causa:** GPS devolvió coordenadas nulas
**Solución:** Agregar validación antes de guardar

### Problema 3: El punto está a 100-500 metros del lugar real
**Causa:** Precisión del GPS baja (Balanced o Low)
**Solución:** Usar `Location.Accuracy.High`

### Problema 4: El punto es string en lugar de número
**Causa:** Coordenadas enviadas como strings
**Solución:** Asegurar que sean `number` (float)

---

## ✅ Checklist de Implementación

- [x] **Orden correcto:** `POINT(longitude latitude)` - Longitud primero
- [x] **Formato WKT:** `SRID=4326;POINT(lon lat)` como texto (string)
- [x] **Precisión alta:** `accuracy: Location.Accuracy.High`
- [x] **Validación de nulos:** `if (latitude === 0 && longitude === 0) return`
- [x] **Tipos correctos:** Coordenadas son `number`, formato final es `string` WKT

---

## 📊 Visualización Rápida

Si quieres ver todos los puntos en un mapa:

1. Ve a [geojson.io](https://geojson.io)
2. Ejecuta esta query en Supabase:

```sql
SELECT 
  jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', location,
        'properties', jsonb_build_object(
          'name', name,
          'code', code
        )
      )
    )
  )
FROM clients
WHERE location IS NOT NULL;
```

3. Copia el resultado y pégalo en geojson.io
4. Verás todos tus clientes en el mapa 🗺️
