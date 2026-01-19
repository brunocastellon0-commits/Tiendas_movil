# 🛡️ SISTEMA ANTI-FRAUDE GPS - NIVEL EMPRESA

Sistema completo de seguridad GPS inspirado en **Uber, Rappi y Didi**.

## 🎯 ¿Qué hace?

Protege tu app de empleados que intenten:
- ❌ Usar GPS falso (Fake GPS)
- ❌ Marcar visitas desde su casa
- ❌ Simular rutas falsas
- ❌ Teletransportarse entre ubicaciones

## 🏗️ Arquitectura (4 Capas de Seguridad)

### CAPA 1: Detección en el Teléfono
- Detecta GPS falso (mock location)
- Detecta modo desarrollador activo
- Detecta dispositivos rooteados/jailbroken
- Verifica precisión del GPS

### CAPA 2: Verificación de Coherencia Física
- Calcula velocidad entre puntos
- Detecta teletransportes (saltos imposibles)
- Valida que el movimiento sea humanamente posible
- Máximo: 120 km/h

### CAPA 3: Seguimiento Pasivo
- Usa tu tabla `location_history` existente
- Graba el recorrido cada 30 segundos
- Permite revisar rutas completas

### CAPA 4: Puntaje de Confianza (Trust Score)
- Cada empleado empieza con 100 puntos
- Se restan puntos por actividad sospechosa:
  - Mock GPS: -40 puntos
  - Root: -50 puntos
  - Modo desarrollador: -20 puntos
  - Velocidad imposible: -30 puntos
- **Si baja de 60: App bloqueada** ❌

---

## 📦 INSTALACIÓN

### PASO 1: Ejecutar SQL en Supabase

1. Abre Supabase → SQL Editor
2. Copia y pega el contenido de `supabase_add_trust_score.sql`
3. Ejecuta (Run)

Esto agrega **solo 1 columna** a tu tabla `employees`:
```sql
gps_trust_score INTEGER DEFAULT 100
```

### PASO 2: Ya está listo ✅

El servicio usa tus tablas existentes:
- ✅ `location_history` (ya la tienes)
- ✅ `location_events` (ya la tienes)
- ✅ `employees` (solo se agregó 1 columna)

---

## 🚀 USO

### Opción A: Validar ANTES de registrar visita

```typescript
import { GPSSecurityService } from '../services/GPSSecurityService';

// Antes de permitir registrar visita
const validation = await GPSSecurityService.validateAndSaveLocation();

if (!validation.success) {
  Alert.alert(
    'GPS No Válido',
    validation.message,
    [{ text: 'OK' }]
  );
  return; // NO permitir registrar visita
}

// Si llegó aquí, el GPS es válido
// Continuar con el registro de visita...
```

### Opción B: Verificar al abrir la app

```typescript
// En tu _layout.tsx o componente principal
useEffect(() => {
  (async () => {
    const blockStatus = await GPSSecurityService.isEmployeeBlocked();
    
    if (blockStatus.isBlocked) {
      // Mostrar pantalla de bloqueo
      navigation.navigate('GPSBlocked', { 
        trustScore: blockStatus.score 
      });
    }
  })();
}, []);
```

### Opción C: Validación automática en LocationService

Modifica tu `LocationService.ts` existente:

```typescript
// En saveLocationToHistory()
async saveLocationToHistory(): Promise<void> {
  // AGREGAR ESTA VALIDACIÓN AL INICIO
  const validation = await GPSSecurityService.validateAndSaveLocation();
  
  if (!validation.success) {
    console.log('⚠️ GPS no válido:', validation.message);
    return; // No guardar ubicación falsa
  }

  // Tu código existente...
  const location = await Location.getCurrentPositionAsync({...});
  // ...
}
```

---

## 🎨 PANTALLA DE BLOQUEO

Cuando un empleado tiene score < 60, muestra:

```typescript
import GPSBlockedScreen from '../components/GPSBlockedScreen';

// En tu navegación
if (blockStatus.isBlocked) {
  return (
    <GPSBlockedScreen 
      trustScore={blockStatus.score}
      onContactSupport={() => {
        // Opcional: tu lógica personalizada
      }}
    />
  );
}
```

---

## 📊 MONITOREO (Para Admins)

### Ver empleados sospechosos

```sql
-- En Supabase SQL Editor
SELECT * FROM get_suspicious_employees();
```

Retorna:
```
employee_id | full_name      | gps_trust_score | fraud_events_count
------------|----------------|-----------------|-------------------
uuid-123    | Juan Pérez     | 40              | 3
uuid-456    | María López    | 55              | 2
```

### Ver eventos de fraude

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

---

## ⚙️ CONFIGURACIÓN

### Cambiar umbrales

En `GPSSecurityService.ts`:

```typescript
// Línea ~145: Cambiar score mínimo
const isValid = trustScore >= 60; // ← Cambiar aquí (default: 60)

// Línea ~242: Cambiar velocidad máxima
if (speed > 120) { // ← Cambiar aquí (default: 120 km/h)

// Línea ~251: Cambiar detección de teletransporte
if (distance > 50 && timeElapsedHours < 0.083) { // ← 50km en 5min
```

### Cambiar penalizaciones

```typescript
// Mock GPS
if (validation.isMocked) {
  await this.updateTrustScore(40, '...'); // ← Cambiar penalización
}

// Root
if (validation.isRooted) {
  await this.updateTrustScore(50, '...'); // ← Cambiar penalización
}
```

---

## 🔧 TROUBLESHOOTING

### "Error: isDevelopmentSettingsEnabled is not a function"

Solo funciona en Android. El código ya maneja esto:
```typescript
if (Platform.OS !== 'android') return false;
```

### "Mock location no se detecta"

`expo-location` detecta mock automáticamente en Android.
En iOS es más difícil de falsificar.

### "Empleado bloqueado sin razón"

Revisa los eventos:
```sql
SELECT * FROM location_events 
WHERE employee_id = 'uuid-del-empleado'
AND reason LIKE 'FRAUDE:%'
ORDER BY timestamp DESC;
```

---

## 📱 TESTING

### Probar detección de Mock GPS

1. Instala "Fake GPS Location" en Android
2. Activa ubicación falsa
3. Abre tu app
4. Intenta registrar visita
5. Debería mostrar: "GPS falso detectado"

### Probar bloqueo por velocidad

1. Registra ubicación en punto A
2. Espera 2 minutos
3. Intenta registrar ubicación a 100km de distancia
4. Debería rechazar: "Velocidad imposible"

---

## 🎯 RESULTADO FINAL

✅ Fake GPS deja de servir
✅ No pueden marcar visitas falsas  
✅ No pueden simular rutas
✅ El sistema se autodefiende
✅ Los admins ven quién hace fraude

---

## 📄 LEGAL

Agrega a tus términos de uso:

> "La aplicación detecta manipulación de ubicación GPS mediante 
> sistemas de seguridad automatizados. La detección de GPS falso, 
> dispositivos modificados o movimientos imposibles puede resultar 
> en la suspensión temporal o permanente de la cuenta."

---

## 🆘 SOPORTE

Si un empleado es bloqueado por error:

1. Revisa su historial en `location_events`
2. Si es legítimo, resetea su score:

```sql
UPDATE employees 
SET gps_trust_score = 100 
WHERE id = 'uuid-del-empleado';
```

---

## 🚀 PRÓXIMOS PASOS (Opcional)

- [ ] Dashboard de fraude para admins
- [ ] Alertas en tiempo real por WhatsApp
- [ ] Geofencing (alertas si sale de zona)
- [ ] Reportes semanales de confiabilidad

---

**¿Preguntas?** Revisa el código en:
- `services/GPSSecurityService.ts`
- `components/GPSBlockedScreen.tsx`
- `supabase_add_trust_score.sql`
