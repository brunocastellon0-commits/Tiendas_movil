import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GPSSecurityService } from '../services/GPSSecurityService';

export const useVisitTracker = () => {
  const { session } = useAuth();
  const [isVisiting, setIsVisiting] = useState(false);
  const [visitId, setVisitId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Verificar si hay una visita activa al cargar
  useEffect(() => {
    checkActiveVisit();
  }, [session?.user?.id]);

  const checkActiveVisit = async () => {
    if (!session?.user) return;

    try {
      // Buscar visitas activas (pendientes) del usuario
      const { data, error } = await supabase
        .from('visits')
        .select('id, start_time')
        .eq('seller_id', session.user.id)
        .eq('outcome', 'pending')
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        // Hay una visita activa
        setVisitId(data.id);
        setStartTime(new Date(data.start_time));
        setIsVisiting(true);
      }
    } catch (error) {
      // No hay visita activa
    }
  };

  const startVisit = async (clientId: string) => {
    if (!session?.user) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    // Verificar si ya hay una visita activa
    if (isVisiting && visitId) {
      Alert.alert(
        'Visita Activa',
        'Ya tienes una visita en curso. Debes finalizarla antes de iniciar otra.'
      );
      return;
    }
    
    setLoading(true);
    try {
      // Verificar si el empleado está bloqueado
      const blockStatus = await GPSSecurityService.isEmployeeBlocked();
      if (blockStatus.isBlocked) {
        Alert.alert(
          '🚨 Cuenta Bloqueada',
          blockStatus.message || 'Tu cuenta ha sido bloqueada por actividad sospechosa de GPS.',
          [{ text: 'Entendido' }]
        );
        setLoading(false);
        return;
      }

      // Validar ubicación GPS
      const validation = await GPSSecurityService.validateAndSaveLocation();
      
      if (!validation.success) {
        // Mensaje específico si no tiene ubicación activada
        const message = validation.message.includes('No se pudo obtener ubicación')
          ? 'Por favor activa la ubicación GPS de tu dispositivo para iniciar visitas.'
          : validation.message;
        
        Alert.alert(
          '⚠️ GPS Requerido',
          message,
          [{ text: 'Entendido' }]
        );
        setLoading(false);
        return;
      }

      const start = new Date();
      
      // Creamos la fila "abierta" en la BD
      const { data, error } = await supabase
        .from('visits')
        .insert({
          seller_id: session.user.id,
          client_id: clientId,
          start_time: start.toISOString(),
          outcome: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setVisitId(data.id);
      setStartTime(start);
      setIsVisiting(true);
      
    } catch (error: any) {

      Alert.alert('Error', 'No se pudo iniciar la visita. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const endVisit = async (
    outcome: 'sale' | 'no_sale' | 'closed',
    notes: string
  ) => {
    if (!visitId || !startTime) {
      Alert.alert('Error', 'No hay una visita activa');
      return;
    }

    setLoading(true);

    try {
      // Validar ubicación GPS antes de cerrar
      const validation = await GPSSecurityService.validateAndSaveLocation();
      
      if (!validation.success) {
        // Mensaje específico si no tiene ubicación activada
        const message = validation.message.includes('No se pudo obtener ubicación')
          ? 'Por favor activa la ubicación GPS de tu dispositivo para finalizar visitas.'
          : validation.message;
        
        Alert.alert(
          '⚠️ GPS Requerido',
          message,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Forzar Cierre', 
              style: 'destructive',
              onPress: async () => {
                await GPSSecurityService.updateTrustScore(
                  20, 
                  'Forzó cierre de visita con GPS inválido'
                );
                await finalizarVisitaSinValidacion(outcome, notes);
              }
            }
          ]
        );
        setLoading(false);
        return;
      }

      // A. Pedir Permisos GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere ubicación para cerrar la visita.');
        setLoading(false);
        return;
      }

      // B. Capturar GPS de Alta Precisión (Auditoría)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      const updateData = {
        end_time: endTime.toISOString(),
        duration_seconds: duration,
        outcome: outcome,
        notes: notes,
        gps_accuracy_meters: location.coords.accuracy,
        check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`
      };

      const { data, error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId)
        .select();

      if (error) {
        throw new Error(`Error de base de datos: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar la visita.');
      }

      Alert.alert(
        '✅ Visita Finalizada', 
        'La visita se ha guardado correctamente.'
      );

      // Resetear estado
      setIsVisiting(false);
      setVisitId(null);
      setStartTime(null);

    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cerrar la visita.');
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para forzar cierre sin validación (penaliza al usuario)
  const finalizarVisitaSinValidacion = async (
    outcome: 'sale' | 'no_sale' | 'closed',
    notes: string
  ) => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const endTime = new Date();
      const duration = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;

      await supabase
        .from('visits')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: duration,
          outcome: outcome,
          notes: notes + ' [FORZADO - GPS INVÁLIDO]',
          gps_accuracy_meters: location.coords.accuracy,
          check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`
        })
        .eq('id', visitId);

      setIsVisiting(false);
      setVisitId(null);
      setStartTime(null);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cerrar la visita.');
    }
  };

  return {
    isVisiting,
    visitId,  
    startVisit,
    endVisit,
    loading,
    startTime,
    checkActiveVisit
  };
};
