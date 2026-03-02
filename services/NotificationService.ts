import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  /**
   * Solicitar permisos de notificaciones
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return false;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('employee-tracking', {
          name: 'Rastreo de Empleados',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2a8c4a',
        });
      }

      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Enviar notificación local inmediata
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (_) {}
  },

  /**
   * Notificar activación de ubicación.
   * NOTA: El bug anterior verificaba si el usuario actual era admin antes de notificar,
   * lo que siempre era false en el celular del vendedor. Ahora la notificación se muestra
   * siempre en el dispositivo donde se activa. El admin puede ver los eventos via
   * location_events en Supabase (que el LocationService ya guarda correctamente).
   */
  async notifyEmployeeConnected(employeeName: string): Promise<void> {
    await this.sendLocalNotification(
      '🟢 Ubicación Activada',
      `${employeeName} está registrando su recorrido GPS`,
      { type: 'employee_connected', employeeName }
    );
  },

  /**
   * Notificar desactivación de ubicación.
   */
  async notifyEmployeeDisconnected(employeeName: string, reason?: string): Promise<void> {
    const msg = reason
      ? `${employeeName} pausó el tracking: ${reason}`
      : `${employeeName} pausó el tracking de ubicación`;

    await this.sendLocalNotification(
      '🔴 Ubicación Pausada',
      msg,
      { type: 'employee_disconnected', employeeName, reason }
    );
  },

  /**
   * Listener para notificaciones recibidas
   */
  setupNotificationListener(callback: (n: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  /**
   * Listener para cuando el usuario toca una notificación
   */
  setupNotificationResponseListener(callback: (r: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
