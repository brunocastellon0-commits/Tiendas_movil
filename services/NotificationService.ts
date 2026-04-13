import { Platform } from 'react-native';

// expo-notifications: en Expo Go SDK 53+ las push remotas no están disponibles.
// CRÍTICO: NO hacer require() en el top-level porque 'DevicePushTokenAutoRegistration.fx.js'
// se ejecuta globalmente al cargar el módulo y lanza un ERROR en consola aunque esté en try/catch.
// Solución: cargamos el módulo LAZILY sólo cuando se necesita una función local.

let _notificationsModule: typeof import('expo-notifications') | null | undefined = undefined;
let _handlerSet = false;

function getNotifications(): typeof import('expo-notifications') | null {
  if (_notificationsModule !== undefined) return _notificationsModule;
  try {
    _notificationsModule = require('expo-notifications');
    // Configurar handler sólo la primera vez y sólo para notificaciones locales
    if (_notificationsModule && !_handlerSet) {
      _handlerSet = true;
      _notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (_) {
    _notificationsModule = null; // Expo Go SDK 53 — ignoramos silenciosamente
  }
  return _notificationsModule;
}

export const NotificationService = {
  /**
   * Solicitar permisos de notificaciones
   */
  async requestPermissions(): Promise<boolean> {
    const N = getNotifications();
    if (!N) return false;
    try {
      const { status: existingStatus } = await N.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await N.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return false;

      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('employee-tracking', {
          name: 'Rastreo de Empleados',
          importance: N.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2a8c4a',
        });

        await N.setNotificationChannelAsync('visit-tracking', {
          name: 'Visitas a Clientes',
          importance: N.AndroidImportance.HIGH,
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
    const N = getNotifications();
    if (!N) return;
    try {
      await N.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: N.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (_) { }
  },

  async notifyEmployeeConnected(employeeName: string): Promise<void> {
    await this.sendLocalNotification(
      'Ubicación Activada',
      `${employeeName} está registrando su recorrido GPS`,
      { type: 'employee_connected', employeeName }
    );
  },

  async notifyEmployeeDisconnected(employeeName: string, reason?: string): Promise<void> {
    const msg = reason
      ? `${employeeName} pausó el tracking: ${reason}`
      : `${employeeName} pausó el tracking de ubicación`;
    await this.sendLocalNotification(
      'Ubicación Pausada',
      msg,
      { type: 'employee_disconnected', employeeName, reason }
    );
  },

  async notifyVisitStarted(clientName: string): Promise<void> {
    await this.sendLocalNotification(
      'Visita Iniciada',
      `Visita a ${clientName} registrada. GPS guardado correctamente.`,
      { type: 'visit_started' }
    );
  },

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

  setupNotificationListener(callback: (n: any) => void) {
    const N = getNotifications();
    if (!N) return { remove: () => { } };
    return N.addNotificationReceivedListener(callback);
  },

  setupNotificationResponseListener(callback: (r: any) => void) {
    const N = getNotifications();
    if (!N) return { remove: () => { } };
    return N.addNotificationResponseReceivedListener(callback);
  },
};
