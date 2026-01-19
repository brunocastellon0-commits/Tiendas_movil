# ✅ INTEGRACIÓN COMPLETADA - SISTEMA ANTI-FRAUDE GPS

## 🎯 ¿Qué se hizo?

Se integró el sistema de seguridad GPS en el flujo de visitas de tu app.

---

## 📍 ARCHIVOS MODIFICADOS

### 1. `hooks/hookVisita.ts`
**Cambios:**
- ✅ Validación GPS al **INICIAR** visita
- ✅ Validación GPS al **FINALIZAR** visita
- ✅ Opción de "Forzar Cierre" (penaliza al usuario)
- ✅ Muestra Trust Score en las alertas

**Flujo:**
```
Usuario presiona "Iniciar Visita"
    ↓
🛡️ Validación GPS Anti-Fraude
    ↓
¿Bloqueado? → ❌ No permite iniciar
¿Mock GPS? → ❌ No permite iniciar
¿Velocidad imposible? → ❌ No permite iniciar
    ↓
✅ GPS válido → Inicia visita
    ↓
Muestra: "Trust Score GPS: 95/100"
```

---

## 🔒 PROTECCIONES IMPLEMENTADAS

### Al Iniciar Visita:
1. **Verifica si está bloqueado** (trust score < 60)
   - Si está bloqueado → Muestra mensaje y NO permite iniciar
   
2. **Valida GPS actual**
   - Detecta Mock GPS
   - Verifica coherencia física (velocidad)
   - Calcula trust score
   
3. **Si GPS es inválido**
   - Muestra razón específica
   - NO permite iniciar visita
   - Penaliza trust score

### Al Finalizar Visita:
1. **Valida GPS de cierre**
   - Mismas verificaciones que al iniciar
   
2. **Si GPS es inválido**
   - Ofrece 2 opciones:
     - **Cancelar**: No cierra la visita
     - **Forzar Cierre**: Cierra pero:
       - Penaliza -20 puntos
       - Agrega "[FORZADO - GPS INVÁLIDO]" a las notas
       - Registra el evento de fraude

---

## 📊 MENSAJES QUE VERÁ EL USUARIO

### ✅ GPS Válido (Iniciar):
```
✅ Visita Iniciada
El cronómetro ha comenzado.

Trust Score GPS: 95/100
```

### ❌ GPS Inválido (Iniciar):
```
⚠️ GPS No Válido
GPS falso detectado (Mock Location)

No puedes iniciar visitas con GPS manipulado.
```

### 🚨 Cuenta Bloqueada:
```
🚨 Cuenta Bloqueada
Tu cuenta ha sido bloqueada por actividad 
sospechosa de GPS. Contacta a tu supervisor.
```

### ✅ GPS Válido (Finalizar):
```
✅ Visita Finalizada
Venta realizada
Duración: 15min 30seg

Trust Score GPS: 92/100
```

### ⚠️ Forzar Cierre:
```
⚠️ Visita Cerrada
Se ha registrado el cierre forzado. 
Tu trust score ha sido penalizado.
```

---

## 🎮 CÓMO PROBARLO

### Prueba 1: Visita Normal (GPS Válido)
1. Abre la app
2. Ve al mapa
3. Presiona "Iniciar Visita" en un cliente
4. Debería iniciar normalmente
5. Finaliza la visita
6. Debería cerrar normalmente

### Prueba 2: Mock GPS (GPS Falso)
1. Instala "Fake GPS Location" en Android
2. Activa ubicación falsa
3. Intenta iniciar visita
4. Debería mostrar: "GPS falso detectado"
5. NO debería permitir iniciar

### Prueba 3: Velocidad Imposible
1. Inicia visita en punto A
2. Espera 2 minutos
3. Muévete 100km (con fake GPS)
4. Intenta iniciar otra visita
5. Debería detectar: "Velocidad imposible"

### Prueba 4: Cuenta Bloqueada
1. Simula fraude varias veces
2. El trust score bajará
3. Cuando llegue a < 60
4. La app bloqueará al usuario

---

## 📈 MONITOREO (Para Admins)

### Ver empleados con bajo trust score:
```sql
-- En Supabase SQL Editor
SELECT * FROM get_suspicious_employees();
```

### Ver eventos de fraude:
```sql
SELECT 
  e.full_name,
  le.reason,
  le.timestamp
FROM location_events le
JOIN employees e ON e.id = le.employee_id
WHERE le.reason LIKE 'FRAUDE:%'
ORDER BY le.timestamp DESC
LIMIT 20;
```

### Ver visitas forzadas:
```sql
SELECT 
  v.id,
  e.full_name,
  v.notes,
  v.start_time
FROM visits v
JOIN employees e ON e.id = v.seller_id
WHERE v.notes LIKE '%[FORZADO - GPS INVÁLIDO]%'
ORDER BY v.start_time DESC;
```

---

## ⚙️ CONFIGURACIÓN

### Cambiar umbral de bloqueo:
En `services/GPSSecurityService.ts` línea ~330:
```typescript
if (score < 60) { // ← Cambiar aquí (default: 60)
```

### Cambiar penalización por forzar cierre:
En `hooks/hookVisita.ts` línea ~156:
```typescript
await GPSSecurityService.updateTrustScore(
  20, // ← Cambiar aquí (default: 20)
  'Forzó cierre de visita con GPS inválido'
);
```

---

## 🚀 PRÓXIMOS PASOS

1. **Ejecuta el SQL en Supabase:**
   - Archivo: `supabase_add_trust_score.sql`
   - Esto agrega la columna `gps_trust_score`

2. **Prueba en desarrollo:**
   - Inicia una visita normal
   - Verifica que funcione

3. **Opcional: Pantalla de bloqueo**
   - Si quieres mostrar una pantalla dedicada cuando el usuario esté bloqueado
   - Usa el componente `GPSBlockedScreen.tsx`

---

## ❓ FAQ

**P: ¿Funciona en Expo Go?**
R: La detección de Mock GPS SÍ funciona. La detección de Root/Developer Mode está desactivada temporalmente.

**P: ¿Qué pasa si un empleado legítimo es bloqueado?**
R: El admin puede resetear su score:
```sql
UPDATE employees 
SET gps_trust_score = 100 
WHERE id = 'uuid-del-empleado';
```

**P: ¿Se puede desactivar temporalmente?**
R: Sí, comenta las líneas de validación en `hookVisita.ts` (líneas 62-91 y 139-168)

**P: ¿Afecta el rendimiento?**
R: Mínimo. La validación toma ~1-2 segundos.

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa los logs en la consola
2. Verifica que ejecutaste el SQL en Supabase
3. Asegúrate de tener `react-native-device-info` instalado

---

**¡Listo!** Tu app ahora tiene protección anti-fraude GPS nivel empresa. 🛡️
