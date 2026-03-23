import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showVisitToast } from '../components/VisitToast';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useVisitTracker
//
// Maneja el ciclo de vida de una visita de ventas.
//
// Notificaciones (modal visual que desaparece solo en 5 segundos):
//   Iniciar              → "Visita iniciada"
//   Finalizar con venta  → "Venta realizada"
//   Finalizar sin venta  → "Visita finalizada"
//   Finalizar cerrado    → "Visita finalizada"
//
// Para que los toasts funcionen, monta <VisitToast /> en app/clients/[id].tsx
// El cronómetro (startTime) está disponible para que el admin lo use en [id].tsx
// ─────────────────────────────────────────────────────────────────────────────
export const useVisitTracker = () => {
  const { session } = useAuth();
  const [isVisiting, setIsVisiting] = useState(false);
  const [visitId, setVisitId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkActiveVisit();
  }, [session?.user?.id]);

  const checkActiveVisit = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('id, start_time')
        .eq('seller_id', session.user.id)
        .eq('outcome', 'pending')
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setVisitId(data.id);
        setStartTime(new Date(data.start_time));
        setIsVisiting(true);
      }
    } catch {
      // Sin visita activa — es el caso normal
    }
  };

  const startVisit = async (clientId: string) => {
    if (!session?.user) {
      Alert.alert('Error', 'No se pudo identificar al usuario.');
      return;
    }

    if (isVisiting && visitId) {
      Alert.alert(
        'Visita en curso',
        'Ya tienes una visita activa. Debes finalizarla antes de iniciar otra.'
      );
      return;
    }

    setLoading(true);
    try {
      const start = new Date();

      const { data, error } = await supabase
        .from('visits')
        .insert({
          seller_id: session.user.id,
          client_id: clientId,
          start_time: start.toISOString(),
          outcome: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setVisitId(data.id);
      setStartTime(start);
      setIsVisiting(true);

      // Modal visual — desaparece solo en 5 segundos, sin botón OK
      showVisitToast({
        title: 'Visita iniciada',
        subtitle: 'La visita ha sido registrada correctamente.',
        type: 'success',
      });

    } catch (error: any) {
      Alert.alert('Error', 'No se pudo iniciar la visita. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const endVisit = async (outcome: 'sale' | 'no_sale' | 'closed', notes: string) => {
    if (!visitId || !startTime) {
      Alert.alert('Error', 'No hay una visita activa.');
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere ubicación para cerrar la visita.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      const { data, error } = await supabase
        .from('visits')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: duration,
          outcome,
          notes,
          gps_accuracy_meters: location.coords.accuracy,
          check_out_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
        })
        .eq('id', visitId)
        .select();

      if (error) throw new Error(`Error de base de datos: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar la visita. Verifica las políticas de RLS en Supabase.');
      }

      // Venta → verde, cualquier otro resultado → azul
      showVisitToast(
        outcome === 'sale'
          ? {
            title: 'Venta realizada',
            subtitle: 'El pedido quedó registrado correctamente.',
            type: 'success',
          }
          : {
            title: 'Visita finalizada',
            subtitle: 'La visita ha sido cerrada.',
            type: 'info',
          }
      );

      setIsVisiting(false);
      setVisitId(null);
      setStartTime(null);

    } catch (error: any) {
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
    checkActiveVisit,
  };
};