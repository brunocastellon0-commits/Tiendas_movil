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
        // Canal para tracking GPS (conexión/desconexión)
        await Notifications.setNotificationChannelAsync('employee-tracking', {
          name: 'Rastreo de Empleados',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2a8c4a',
        });

        // Canal para visitas (inicio/fin con colores de resultado)
        await Notifications.setNotificationChannelAsync('visit-tracking', {
          name: 'Visitas a Clientes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#3B82F6',
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
   * Notificar activación de ubicación GPS.
   * Se muestra en el dispositivo del empleado al activar el tracking.
   */
  async notifyEmployeeConnected(employeeName: string): Promise<void> {
    await this.sendLocalNotification(
      '🟢 Ubicación Activada',
      `${employeeName} está registrando su recorrido GPS`,
      { type: 'employee_connected', employeeName }
    );
  },

  /**
   * Notificar desactivación de ubicación GPS.
   * Se muestra en el dispositivo del empleado al pausar el tracking.
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
   * Notificar inicio de visita a un cliente.
   * 📍 Se muestra en el dispositivo del vendedor.
   */
  async notifyVisitStarted(clientName: string): Promise<void> {
    await this.sendLocalNotification(
      '📍 Visita Iniciada',
      `Visita a ${clientName} registrada. GPS guardado correctamente.`,
      { type: 'visit_started' }
    );
  },

  /**
   * Notificar finalización de visita.
   * 🟢 Venta  →  Verde
   * 🟡 Sin venta → Amarillo
   * 🔴 Cerrado →  Rojo
   */
  async notifyVisitEnded(
    clientName: string,
    outcome: 'sale' | 'no_sale' | 'closed',
    durationMinutes: number
  ): Promise<void> {
    const emojiMap = { sale: '🟢', no_sale: '🟡', closed: '🔴' };
    const labelMap = { sale: 'Venta realizada', no_sale: 'Sin venta', closed: 'Tienda cerrada' };

    await this.sendLocalNotification(
      `${emojiMap[outcome]} Visita Finalizada — ${labelMap[outcome]}`,
      `${clientName} · Duración: ${durationMinutes} min.`,
      { type: 'visit_ended', outcome }
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
