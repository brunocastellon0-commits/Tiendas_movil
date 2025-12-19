import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
      // No hay visita activa, esto es normal
      console.log('No hay visitas activas');
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
      const start = new Date();
      
      // Creamos la fila "abierta" en la BD
      const { data, error } = await supabase
        .from('visits')
        .insert({
          seller_id: session.user.id,
          client_id: clientId,
          start_time: start.toISOString(),
          outcome: 'pending' // Estado inicial
        })
        .select()
        .single();

      if (error) throw error;

      // Guardamos el ID en memoria para usarlo en los pedidos
      setVisitId(data.id);
      setStartTime(start);
      setIsVisiting(true);
      
      Alert.alert('✅ Visita Iniciada', 'El cronómetro ha comenzado.');
      
    } catch (error: any) {
      console.error(error);
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

      // Preparar los datos de actualización
      const updateData = {
        end_time: endTime.toISOString(),
        duration_seconds: duration,
        outcome: outcome,
        notes: notes,
        gps_accuracy_meters: location.coords.accuracy,
        check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`
      };

      console.log('🔄 Actualizando visita ID:', visitId);
      console.log('📊 Datos a actualizar:', updateData);

      // C. ACTUALIZAR (UPDATE) la visita que abrimos al principio
      const { data, error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId)
        .select(); // Pedir que devuelva los datos actualizados

      if (error) {
        console.error('❌ Error al actualizar visita:', error);
        throw new Error(`Error de base de datos: ${error.message}\nCódigo: ${error.code}`);
      }

      if (!data || data.length === 0) {
        console.error('⚠️ La actualización no afectó ninguna fila');
        throw new Error('No se pudo actualizar la visita. Verifica las políticas de RLS en Supabase.');
      }

      console.log('✅ Visita actualizada exitosamente:', data);

      const outcomeText = outcome === 'sale' ? 'Venta realizada' : 
                          outcome === 'no_sale' ? 'Sin venta' : 'Tienda cerrada';

      Alert.alert(
        '✅ Visita Finalizada', 
        `${outcomeText}\nDuración: ${Math.floor(duration/60)}min ${duration % 60}seg`
      );

      // Resetear estado
      setIsVisiting(false);
      setVisitId(null);
      setStartTime(null);

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cerrar la visita: ' + error.message);
    } finally {
      setLoading(false);
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