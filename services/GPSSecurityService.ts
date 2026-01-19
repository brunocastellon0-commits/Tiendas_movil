import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * 🛡️ SERVICIO DE SEGURIDAD GPS - NIVEL EMPRESA
 * 
 * Sistema anti-fraude inspirado en Uber, Rappi, Didi
 * ADAPTADO A TUS TABLAS EXISTENTES (location_history, location_events)
 * 
 * 4 CAPAS DE SEGURIDAD:
 * 1. Detección en el teléfono (mock, root, dev mode)
 * 2. Verificación de coherencia física (velocidad, distancia)
 * 3. Seguimiento pasivo (usa tu location_history existente)
 * 4. Puntaje de confianza (se agrega columna a employees)
 */

interface GPSValidationResult {
  isValid: boolean;
  isMocked: boolean;
  isDeveloperMode: boolean;
  isRooted: boolean;
  trustScore: number;
  reasons: string[];
  location?: Location.LocationObject;
}

export const GPSSecurityService = {
  
  // 🔴 CAPA 1: DETECCIÓN EN EL TELÉFONO
  
  /**
   * Detectar si el GPS es falso (mock location)
   */
  async detectMockGPS(): Promise<boolean> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // En Android, expo-location detecta mock automáticamente
      if (location.mocked === true) {

        return true;
      }

      return false;
    } catch (error) {

      return false;
    }
  },

  /**
   * Detectar si el modo desarrollador está activo (Android)
   */
  async detectDeveloperMode(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return false;

      // En react-native-device-info, este método no existe en todas las versiones
      // Retornamos false por defecto para evitar errores
      // Si quieres implementarlo, necesitas permisos especiales en Android

      return false;
    } catch (error) {

      return false;
    }
  },

  /**
   * Detectar si el dispositivo está rooteado/jailbroken
   */
  async detectRootedDevice(): Promise<boolean> {
    // Detección de root desactivada (requiere librería especializada)
    // Para Expo Go, siempre retornamos false
    return false;
  },

  /**
   * VALIDACIÓN COMPLETA antes de aceptar ubicación
   */
  async validateGPSLocation(): Promise<GPSValidationResult> {
    const reasons: string[] = [];
    let trustScore = 100;

    // Obtener ubicación
    let location: Location.LocationObject | undefined;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      return {
        isValid: false,
        isMocked: false,
        isDeveloperMode: false,
        isRooted: false,
        trustScore: 0,
        reasons: ['No se pudo obtener ubicación GPS'],
      };
    }

    // 1. Verificar Mock GPS
    const isMocked = location.mocked === true;
    if (isMocked) {
      trustScore -= 40;
      reasons.push('GPS falso detectado (Mock Location)');
    }

    // 2. Verificar Modo Desarrollador
    const isDeveloperMode = await this.detectDeveloperMode();
    if (isDeveloperMode) {
      trustScore -= 20;
      reasons.push('Modo desarrollador activo');
    }

    // 3. Verificar Root
    const isRooted = await this.detectRootedDevice();
    if (isRooted) {
      trustScore -= 50;
      reasons.push('Dispositivo rooteado/jailbroken');
    }

    // 4. Verificar precisión GPS
    if (location.coords.accuracy && location.coords.accuracy > 100) {
      trustScore -= 10;
      reasons.push(`Precisión GPS baja (${location.coords.accuracy.toFixed(0)}m)`);
    }

    const isValid = trustScore >= 60;

    return {
      isValid,
      isMocked,
      isDeveloperMode,
      isRooted,
      trustScore,
      reasons,
      location,
    };
  },

  // 🔴 CAPA 2: VERIFICACIÓN DE COHERENCIA FÍSICA

  /**
   * Calcular distancia entre dos puntos (Haversine)
   * Retorna distancia en kilómetros
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Extraer lat/lng de formato PostGIS
   */
  parsePostGISLocation(location: any): { lat: number; lng: number } | null {
    try {
      // GeoJSON format
      if (location?.coordinates && Array.isArray(location.coordinates)) {
        return {
          lng: location.coordinates[0],
          lat: location.coordinates[1],
        };
      }
      // WKT string format
      if (typeof location === 'string' && location.includes('POINT(')) {
        const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
        if (match) {
          return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2]),
          };
        }
      }
      return null;
    } catch (error) {

      return null;
    }
  },

  /**
   * Verificar si el movimiento es físicamente posible
   * USA TU TABLA EXISTENTE: location_history
   */
  async verifyPhysicalCoherence(
    currentLat: number,
    currentLng: number
  ): Promise<{ isValid: boolean; reason?: string; speed?: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isValid: true };

      // Obtener último punto de TU TABLA location_history
      const { data: lastLog } = await supabase
        .from('location_history')
        .select('location, timestamp')
        .eq('employee_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!lastLog) return { isValid: true }; // Primer punto

      // Parsear ubicación de PostGIS
      const lastLocation = this.parsePostGISLocation(lastLog.location);
      if (!lastLocation) return { isValid: true };

      // Calcular distancia
      const distance = this.calculateDistance(
        lastLocation.lat,
        lastLocation.lng,
        currentLat,
        currentLng
      );

      // Calcular tiempo transcurrido (en horas)
      const lastTime = new Date(lastLog.timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeElapsedHours = (currentTime - lastTime) / (1000 * 60 * 60);

      // Calcular velocidad (km/h)
      const speed = distance / timeElapsedHours;

      // Verificar si es humanamente posible
      // Máximo: 120 km/h (considerando vehículo)
      if (speed > 120) {

        return {
          isValid: false,
          reason: `Velocidad imposible: ${speed.toFixed(0)} km/h`,
          speed,
        };
      }

      // Verificar teletransporte (> 50km en < 5 min)
      if (distance > 50 && timeElapsedHours < 0.083) { // 5 minutos

        return {
          isValid: false,
          reason: 'Salto de ubicación imposible',
          speed,
        };
      }

      return { isValid: true, speed };

    } catch (error) {

      return { isValid: true }; // En caso de error, permitir
    }
  },

  // 🔴 CAPA 3: SEGUIMIENTO PASIVO (USA TU location_history)
  // Ya lo tienes implementado en LocationService.ts

  // 🔴 CAPA 4: PUNTAJE DE CONFIANZA

  /**
   * Obtener el trust score actual del empleado
   */
  async getCurrentTrustScore(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 100;

      const { data: employee } = await supabase
        .from('employees')
        .select('gps_trust_score')
        .eq('id', user.id)
        .single();

      return employee?.gps_trust_score || 100;
    } catch (error) {

      return 100;
    }
  },

  /**
   * Actualizar el trust score del empleado
   * REGISTRA EN TU TABLA location_events
   */
  async updateTrustScore(penalty: number, reason: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 100;

      // Obtener score actual
      const currentScore = await this.getCurrentTrustScore();
      const newScore = Math.max(0, currentScore - penalty);

      // Actualizar en employees
      await supabase
        .from('employees')
        .update({ gps_trust_score: newScore })
        .eq('id', user.id);

      // Registrar evento en TU TABLA location_events
      await supabase
        .from('location_events')
        .insert({
          employee_id: user.id,
          event_type: 'disabled', // Usamos 'disabled' para eventos de fraude
          location: null,
          reason: `FRAUDE: ${reason} (Score: ${currentScore} → ${newScore})`,
          timestamp: new Date().toISOString(),
        });



      return newScore;
    } catch (error) {

      return 100;
    }
  },

  /**
   * Verificar si el empleado está bloqueado por bajo trust score
   */
  async isEmployeeBlocked(): Promise<{ isBlocked: boolean; score: number; message?: string }> {
    const score = await this.getCurrentTrustScore();
    
    if (score < 60) {
      return {
        isBlocked: true,
        score,
        message: 'Tu cuenta ha sido bloqueada por actividad sospechosa de GPS. Contacta a tu supervisor.',
      };
    }

    return { isBlocked: false, score };
  },

  /**
   * FUNCIÓN PRINCIPAL: Validar ubicación antes de permitir acciones
   * Úsala ANTES de registrar visitas o pedidos
   */
  async validateAndSaveLocation(): Promise<{
    success: boolean;
    message: string;
    location?: Location.LocationObject;
    trustScore: number;
  }> {
    try {
      // 1. Verificar si está bloqueado
      const blockStatus = await this.isEmployeeBlocked();
      if (blockStatus.isBlocked) {
        return {
          success: false,
          message: blockStatus.message || 'Cuenta bloqueada',
          trustScore: blockStatus.score,
        };
      }

      // 2. Validar GPS local
      const validation = await this.validateGPSLocation();
      
      if (!validation.isValid || !validation.location) {
        // Aplicar penalización
        if (validation.isMocked) {
          await this.updateTrustScore(40, 'GPS falso detectado');
        }
        if (validation.isRooted) {
          await this.updateTrustScore(50, 'Dispositivo rooteado');
        }
        if (validation.isDeveloperMode) {
          await this.updateTrustScore(20, 'Modo desarrollador activo');
        }

        return {
          success: false,
          message: validation.reasons.join(', '),
          trustScore: validation.trustScore,
        };
      }

      // 3. Verificar coherencia física
      const coherence = await this.verifyPhysicalCoherence(
        validation.location.coords.latitude,
        validation.location.coords.longitude
      );

      if (!coherence.isValid) {
        await this.updateTrustScore(30, coherence.reason || 'Movimiento imposible');
        return {
          success: false,
          message: coherence.reason || 'Movimiento sospechoso detectado',
          trustScore: validation.trustScore - 30,
        };
      }

      // 4. Todo OK - La ubicación se guarda en location_history desde LocationService
      return {
        success: true,
        message: 'Ubicación validada correctamente',
        location: validation.location,
        trustScore: validation.trustScore,
      };

    } catch (error) {

      return {
        success: false,
        message: 'Error validando ubicación',
        trustScore: 0,
      };
    }
  },
};
