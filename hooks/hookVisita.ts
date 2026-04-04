import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showVisitToast } from '../components/VisitToast';

// Solicita permisos de GPS de forma explícita y retorna las coords o null.
// Si el usuario denegó el permiso, muestra un alert con instrucciones para
// habilitarlo manualmente en la configuración del dispositivo.
const requestGPSCoords = async (): Promise<{ point: string; accuracy: number | null } | null> => {
  try {
    // Primero revisamos el estado actual sin pedirlo de nuevo si ya se decidió
    const { status: currentStatus } = await Location.getForegroundPermissionsAsync();

    if (currentStatus === 'denied') {
      // El usuario ya denegó antes — no podemos volver a preguntar en Android.
      // Debemos mandarlo a Configuración.
      Alert.alert(
        'Permiso de ubicación denegado',
        'Para registrar tu visita con GPS necesitas habilitar la ubicación en la ' +
          'configuración de tu dispositivo.\n\nVe a: Ajustes → Aplicaciones → [esta app] → Permisos → Ubicación → Permitir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir ajustes',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return null;
    }

    // Si todavía no se ha pedido (undetermined) o ya fue granted, solicitamos/confirmamos
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Ubicación no disponible',
        'No se pudo obtener el permiso de ubicación. La visita se registrará sin coordenadas GPS.',
        [{ text: 'Entendido' }]
      );
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      point: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
      accuracy: loc.coords.accuracy ?? null,
    };
  } catch (e) {
    console.warn('[hookVisita] No se pudo obtener coordenadas GPS:', e);
    return null;
  }
};

// Ajuste para mandar la hora exacta de Bolivia (-04:00) y evitar saltos de día por UTC
const getBoliviaIsoString = () => {
  const now = new Date();
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}-04:00`;
};

export const useVisitTracker = () => {
  const { session } = useAuth();
  const [isVisiting, setIsVisiting] = useState(false);
  const [visitId, setVisitId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // El check inicial no tiene clientId aún; se hace desde useFocusEffect en [id].tsx
  }, [session?.user?.id]);

  // clientId es OBLIGATORIO: solo busca visita activa para ESE cliente específico.
  // Sin él, una visita de otro cliente contaminaría el estado de esta pantalla.
  const checkActiveVisit = async (clientId?: string) => {
    if (!session?.user) return;
    try {
      let query = supabase
        .from('visits')
        .select('id, start_time')
        .eq('seller_id', session.user.id)
        .eq('outcome', 'pending')
        .order('start_time', { ascending: false })
        .limit(1);

      // Filtramos por cliente para que cada perfil tenga su estado propio
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.single();

      if (data && !error) {
        setVisitId(data.id);
        setStartTime(new Date(data.start_time));
        setIsVisiting(true);
      } else {
        // Siempre reseteamos para este cliente — sin esto, un cliente anterior
        // podía dejar isVisiting=true al navegar a un cliente sin visita.
        setIsVisiting(false);
        setVisitId(null);
        setStartTime(null);
      }
    } catch {
      // .single() lanza error cuando no hay filas — es el caso normal (sin visita)
      setIsVisiting(false);
      setVisitId(null);
      setStartTime(null);
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
      // Pedimos GPS al inicio para que el mapa web dibuje el globito (check_in_location)
      // requestGPSCoords() maneja permisos denegados con un Alert claro al usuario.
      const gpsResult = await requestGPSCoords();
      const point    = gpsResult?.point    ?? null;
      const accuracy = gpsResult?.accuracy ?? null;

      const start = new Date();
      const localTime = getBoliviaIsoString();

      const { data, error } = await supabase
        .from('visits')
        .insert({
          seller_id: session.user.id,
          client_id: clientId,
          start_time: localTime,
          created_at: localTime, // Clave para el filtro web
          outcome: 'pending',
          check_in_location: point,
          gps_accuracy_meters: accuracy
        })
        .select()
        .single();

      if (error) throw error;

      setVisitId(data.id);
      setStartTime(start);
      setIsVisiting(true);

      // Lanzamos el mensaje de éxito al darle al botón
      showVisitToast({
        title: 'Visita iniciada',
        subtitle: '',
        type: 'success',
      });

    } catch (error: any) {
      Alert.alert('Error', 'No se pudo iniciar la visita. Revisa tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Mapeamos los 3 resultados con sus toasts correspondientes:
  // Venta → 'success' (verde), Sin Venta → 'info' (azul), Cerrado → 'error' (rojo)
  const endVisit = async (outcome: 'sale' | 'no_sale' | 'closed', notes: string) => {
    if (!visitId || !startTime) {
      Alert.alert('Error', 'No hay una visita activa.');
      return;
    }

    setLoading(true);
    try {
      // GPS al finalizar (check_out_location para el mapa web). No bloqueante.
      // Reutilizamos requestGPSCoords() para consistencia en el manejo de permisos.
      const gpsOut         = await requestGPSCoords();
      const checkOutPoint    = gpsOut?.point    ?? null;
      const checkOutAccuracy = gpsOut?.accuracy ?? null;

      const endTime = new Date();
      const localEndTime = getBoliviaIsoString(); // ← hora local Bolivia, no UTC
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      const { data, error } = await supabase
        .from('visits')
        .update({
          end_time: localEndTime,
          duration_seconds: duration,
          outcome,
          notes,
          ...(checkOutAccuracy !== null && { gps_accuracy_meters: checkOutAccuracy }),
          ...(checkOutPoint !== null && { check_out_location: checkOutPoint }),
        })
        .eq('id', visitId)
        .select();

      if (error) throw new Error(`Error de base de datos: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar la visita. Verifica las políticas de RLS en Supabase.');
      }

      // Mapeo exacto: Venta=success | Sin Venta=info | Cerrado=error
      const toastMap: Record<typeof outcome, { title: string; subtitle: string; type: 'success' | 'info' | 'error' }> = {
        sale: { title: 'Venta realizada', subtitle: 'El pedido quedó registrado correctamente.', type: 'success' },
        no_sale: { title: 'Sin venta', subtitle: 'La visita fue cerrada sin pedido.', type: 'info' },
        closed: { title: 'Cliente cerrado', subtitle: 'El local estaba cerrado al momento de la visita.', type: 'error' },
      };

      showVisitToast(toastMap[outcome]);

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