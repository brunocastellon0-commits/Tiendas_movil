/**
 * useLocationPermission
 *
 * Hook que garantiza que el permiso de ubicación esté activo.
 * Se usa en dos momentos clave:
 *   1. Al entrar al home (después de login) — checkOnMount = true
 *   2. Antes de confirmar un pedido       — llamando a ensureGranted()
 *
 * Flujo:
 *   - Si el permiso está granted → no hace nada visible.
 *   - Si está denied/undetermined → muestra Alert con botón para Ajustes.
 *   - ensureGranted() → devuelve true si finalmente fue concedido, false si no.
 */
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

// Mensaje estándar para toda la app
const showDeniedAlert = (onRetry?: () => void) => {
  Alert.alert(
    '📍 Ubicación requerida',
    'Esta acción necesita tu ubicación para registrar la venta correctamente. ' +
    'Por favor actívala en Ajustes.',
    [
      { text: 'Ahora no', style: 'cancel' },
      {
        text: 'Abrir Ajustes',
        onPress: async () => {
          await Linking.openSettings();
          // Después de que el usuario vuelva de Ajustes podemos reintentar
          onRetry?.();
        },
      },
    ]
  );
};

/**
 * Solicita permiso si no está concedido.
 * @returns true si el permiso queda concedido, false en caso contrario.
 */
export async function ensureLocationGranted(): Promise<boolean> {
  try {
    // 1. Verificar estado actual sin mostrar el diálogo nativo si ya fue decidido
    const { status: currentStatus } = await Location.getForegroundPermissionsAsync();

    if (currentStatus === 'granted') return true;

    // 2. Si aún no fue solicitado, pedir ahora
    if (currentStatus === 'undetermined') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') return true;
    }

    // 3. Status es 'denied' — mostrar alert con acceso a Ajustes
    showDeniedAlert();
    return false;
  } catch {
    return false;
  }
}

/**
 * Hook que solicita el permiso automáticamente al montar el componente.
 * Úsalo en la pantalla de Home para pedir al iniciar sesión.
 */
export function useLocationPermission() {
  useEffect(() => {
    // Solo solicita — no bloquea la navegación.
    // Si el usuario deniega, la próxima vez que intente confirmar un pedido
    // se le vuelve a presentar el alert con acceso a Ajustes.
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'denied') {
        // Avisamos de forma suave, sin bloquear el flujo de login
        Alert.alert(
          '📍 Ubicación desactivada',
          'La app necesita tu ubicación para registrar ventas y visitas. ' +
          'Se te pedirá nuevamente cuando intentes confirmar un pedido.',
          [
            { text: 'Entendido', style: 'cancel' },
            { text: 'Activar ahora', onPress: () => Linking.openSettings() },
          ]
        );
      }
    })();
  }, []);
}
