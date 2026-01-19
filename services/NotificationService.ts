import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

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
      
      if (finalStatus !== 'granted') {

        return false;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('employee-tracking', {
          name: 'Rastreo de Empleados',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2a8c4a',
        });
      }

      return true;
    } catch (error) {

      return false;
    }
  },

  /**
   * Enviar notificación local (solo para administradores)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Inmediato
      });
    } catch (error) {

    }
  },

  /**
   * Notificar a administradores sobre conexión de empleado
   * Solo envía alerta local, NO guarda en base de datos
   */
  async notifyEmployeeConnected(employeeName: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si el usuario actual es admin
      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      // Solo notificar si es administrador
      if (employee?.role === 'Administrador') {
        await this.sendLocalNotification(
          '🟢 Empleado Conectado',
          `${employeeName} activó su ubicación GPS`,
          { type: 'employee_connected', employeeName }
        );

      }
    } catch (error) {

    }
  },

  /**
   * Notificar a administradores sobre desconexión de empleado
   * Solo envía alerta local, NO guarda en base de datos
   */
  async notifyEmployeeDisconnected(employeeName: string, reason?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar si el usuario actual es admin
      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      // Solo notificar si es administrador
      if (employee?.role === 'Administrador') {
        const message = reason 
          ? `${employeeName} desactivó su ubicación GPS: ${reason}`
          : `${employeeName} desactivó su ubicación GPS`;

        await this.sendLocalNotification(
          '🔴 Empleado Desconectado',
          message,
          { type: 'employee_disconnected', employeeName, reason }
        );

      }
    } catch (error) {

    }
  },

  /**
   * Configurar listener para notificaciones recibidas
   */
  setupNotificationListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return subscription;
  },

  /**
   * Configurar listener para cuando el usuario toca una notificación
   */
  setupNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return subscription;
  },
};
