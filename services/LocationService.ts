import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export const LocationService = {
  
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
   * IMPORTANTE: El formato GeoJSON usa [LONGITUD, LATITUD] (no al revés)
   * PostGIS espera este orden específico
   */
  async updateMyLocation(): Promise<void> {
    try {
      // A. Obtener GPS del celular
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balanced ahorra batería, High es más preciso
      });

      const { latitude, longitude } = location.coords;

      // B. Obtener ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ No hay usuario autenticado');
        return;
      }

      // C. Subir a Supabase con formato WKT (PostGIS)
      // CRÍTICO: POINT(LONGITUD LATITUD) - Longitud va primero
      // El id del empleado ES el mismo que el user.id de auth
      const { error } = await supabase
        .from('employees')
        .update({
          location: `SRID=4326;POINT(${longitude} ${latitude})`
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Error subiendo ubicación:', error);
      } else {
        console.log(`📍 Ubicación actualizada: [${longitude}, ${latitude}]`);
      }

    } catch (error) {
      console.error('❌ Error en servicio de ubicación:', error);
    }
  }
};
