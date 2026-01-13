-- 🔍 DEBUG: Verificar ubicación del último cliente registrado
-- Ejecuta esta query en el Editor SQL de Supabase

SELECT 
  id,
  name,
  code,
  created_at,
  
  -- Coordenadas extraídas
  ST_X(location::geometry) as longitude,  -- X es Longitud
  ST_Y(location::geometry) as latitude,   -- Y es Latitud
  
  -- Formato WKT completo
  ST_AsText(location::geometry) as wkt_format,
  
  -- Formato para pegar en Google Maps (Lat, Lon)
  CONCAT(
    ST_Y(location::geometry), 
    ', ', 
    ST_X(location::geometry)
  ) as google_maps_format,
  
  -- Validación si está en Bolivia
  CASE 
    WHEN ST_Y(location::geometry) BETWEEN -23 AND -9 
         AND ST_X(location::geometry) BETWEEN -70 AND -57 
    THEN '✅ Está en Bolivia'
    ELSE '❌ FUERA de Bolivia (coordenadas invertidas?)'
  END as validacion

FROM clients
WHERE location IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
