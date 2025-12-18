import { useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; 

export const useVisitTracker = () => {
  const { session } = useAuth();
  const [isVisiting, setIsVisiting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. INICIAR VISITA (El cronómetro arranca)
  const startVisit = () => {
    setStartTime(new Date());
    setIsVisiting(true);
  };

  // 2. FINALIZAR VISITA (El momento de la verdad)
  const endVisit = async (
    clientId: string, // UUID del cliente
    outcome: 'sale' | 'no_sale' | 'closed',
    notes: string
  ) => {
    if (!startTime || !session?.user) return;

    setLoading(true);

    try {
      // A. Pedir Permisos de GPS (Si no los tiene)
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'El dueño requiere tu ubicación para validar la visita.');
        setLoading(false);
        return;
      }

      // B. Capturar GPS de Alta Precisión (La Evidencia)
      // Accuracy.High es vital para saber si está en la tienda o en la esquina
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Cálculos finales
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000); // Segundos

      // C. Insertar en Supabase
      const { error } = await supabase.from('visits').insert({
        seller_id: session.user.id,
        client_id: clientId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: duration,
        outcome: outcome,
        notes: notes,
        gps_accuracy_meters: location.coords.accuracy, // Guardamos qué tan preciso fue
        // FORMATO POSTGIS: 'POINT(longitud latitud)'
        check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`
      });

      if (error) throw error;

      Alert.alert(
        'Visita Registrada', 
        `Duración: ${Math.floor(duration / 60)} min ${duration % 60} seg.\nUbicación capturada.`
      );

      // Resetear estado
      setIsVisiting(false);
      setStartTime(null);

    } catch (error: any) {
      console.error('Error cerrando visita:', error);
      Alert.alert('Error', 'No se pudo registrar la visita. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return {
    isVisiting,
    startVisit,
    endVisit,
    loading,
    startTime
  };
};