import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { NotificationService } from './NotificationService';

const LOCATION_TRACKING_KEY = 'location_tracking_enabled';
const TRACKING_INTERVAL = 30000; // 30 segundos

export const LocationService = {
  trackingInterval: null as ReturnType<typeof setInterval> | null,
  
  /**
   * Solicitar permisos de ubicación al usuario
   * @returns true si se concedieron los permisos, false en caso contrario
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado', 
        'No podemos rastrear tu ubicación para coordinar visitas.'
      );
      return false;
    }
    return true;
  },

  /**
   * Obtener ubicación actual y subirla a Supabase
   * IMPORTANTE: El formato WKT usa POINT(LONGITUD LATITUD) - Longitud primero
   * PostGIS espera este orden específico
   */
  async updateMyLocation(): Promise<void> {
    try {
      // A. Obtener GPS del celular
      // 🎯 IMPORTANTE: Usar precisión ALTA para tracking preciso de empleados
      // High accuracy = GPS puro (~10m precisión)
      // Balanced = GPS + WiFi/Celular (~100m precisión, ahorra batería)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Validar que no sean coordenadas nulas (0,0 = "Island Null" en océano)
      if (latitude === 0 && longitude === 0) {

        return;
      }

      // B. Obtener ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {

        return;
      }

      // C. Subir a Supabase con formato WKT (Well-Known Text)
      // CRÍTICO: POINT(LONGITUDE LATITUDE) - Longitud va primero
      // SRID=4326 es el sistema de coordenadas WGS84 usado por GPS
      // El id del empleado ES el mismo que el user.id de auth
      const { error } = await supabase
        .from('employees')
        .update({
          location: `SRID=4326;POINT(${longitude} ${latitude})`
        })
        .eq('id', user.id);

      if (error) {

      } else {

      }

    } catch (error) {

    }
  },

  /**
   * Guardar ubicación en el historial (para trazar rutas)
   */
  async saveLocationToHistory(): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, speed, heading, accuracy } = location.coords;

      // Validar coordenadas
      if (latitude === 0 && longitude === 0) {

        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Guardar en tabla de historial
      const { error } = await supabase
        .from('location_history')
        .insert({
          employee_id: user.id,
          location: `SRID=4326;POINT(${longitude} ${latitude})`,
          accuracy: accuracy || null,
          speed: speed || null,
          heading: heading || null,
          timestamp: new Date().toISOString()
        });

      if (error) {

      } else {

      }

      // También actualizar la ubicación actual del empleado
      await this.updateMyLocation();

    } catch (error) {

    }
  },

  /**
   * Registrar evento de activación/desactivación
   */
  async logLocationEvent(eventType: 'enabled' | 'disabled', reason?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);

      const { error } = await supabase
        .from('location_events')
        .insert({
          employee_id: user.id,
          event_type: eventType,
          location: location ? `SRID=4326;POINT(${location.coords.longitude} ${location.coords.latitude})` : null,
          reason: reason || null,
          timestamp: new Date().toISOString()
        });

      if (error) {

      } else {

      }

    } catch (error) {

    }
  },

  /**
   * Verificar si el tracking está habilitado
   */
  async isTrackingEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(LOCATION_TRACKING_KEY);
      return value === 'true';
    } catch (error) {

      return false;
    }
  },

  /**
   * Activar tracking de ubicación
   */
  async enableTracking(): Promise<boolean> {
    try {
      // Verificar permisos primero
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      // Obtener nombre del empleado para la notificación
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', user.id)
          .single();

        // Enviar notificación a administradores
        if (employee?.full_name) {
          await NotificationService.notifyEmployeeConnected(employee.full_name);
        }
      }

      // Guardar estado
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'true');
      
      // Registrar evento
      await this.logLocationEvent('enabled', 'Usuario activó tracking desde mapa');

      // Guardar ubicación inicial
      await this.saveLocationToHistory();

      // Iniciar intervalo de tracking
      this.startTrackingInterval();


      return true;

    } catch (error) {

      return false;
    }
  },

  /**
   * Desactivar tracking de ubicación
   */
  async disableTracking(reason?: string): Promise<void> {
    try {
      // Obtener nombre del empleado para la notificación
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', user.id)
          .single();

        // Enviar notificación a administradores
        if (employee?.full_name) {
          await NotificationService.notifyEmployeeDisconnected(
            employee.full_name,
            reason || 'Usuario desactivó tracking desde mapa'
          );
        }

        // IMPORTANTE: Limpiar la ubicación en Supabase para que el empleado NO aparezca en el mapa
        const { error } = await supabase
          .from('employees')
          .update({ location: null })
          .eq('id', user.id);

        if (error) {

        } else {

        }
      }

      // Guardar estado
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'false');
      
      // Registrar evento
      await this.logLocationEvent('disabled', reason || 'Usuario desactivó tracking desde mapa');

      // Detener intervalo
      this.stopTrackingInterval();



    } catch (error) {

    }
  },

  /**
   * Iniciar intervalo de tracking automático
   */
  startTrackingInterval(): void {
    // Limpiar intervalo anterior si existe
    this.stopTrackingInterval();

    // Crear nuevo intervalo
    this.trackingInterval = setInterval(async () => {
      const isEnabled = await this.isTrackingEnabled();
      if (isEnabled) {
        await this.saveLocationToHistory();
      } else {
        this.stopTrackingInterval();
      }
    }, TRACKING_INTERVAL);


  },

  /**
   * Detener intervalo de tracking
   */
  stopTrackingInterval(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;

    }
  },

  /**
   * Inicializar servicio (llamar al inicio de la app)
   */
  async initialize(): Promise<void> {
    const isEnabled = await this.isTrackingEnabled();
    if (isEnabled) {

      this.startTrackingInterval();
    }
  }
};
