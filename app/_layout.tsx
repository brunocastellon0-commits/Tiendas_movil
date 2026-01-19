import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
//para los temas
import { ThemeProvider } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

// proteccion de rutas
const InitialLayout = () => {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Inicializar notificaciones para administradores
  useEffect(() => {
    if (session) {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Verificar si es administrador
          const { data: employee } = await supabase
            .from('employees')
            .select('role')
            .eq('id', user.id)
            .single();

          // Solo solicitar permisos si es administrador
          if (employee?.role === 'Administrador') {
            await NotificationService.requestPermissions();

          }
        } catch (error) {

        }
      })();
    }
  }, [session]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments[1] === 'login';

    if (!session && !inAuthGroup) {
      // Si no hay sesión y no está en el grupo de auth, mandar a Login
      router.replace('/(auth)/login' as any);
    } else if (session && inAuthGroup && !inLoginScreen) {
      // Si ya hay sesión y está en auth pero NO en login específicamente, redirigir
      // Esto permite que el login maneje su propia navegación con animación
      router.replace('/(tabs)' as any);
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Slot renderiza la pantalla actual (Login o Home)
  return <Slot />;
};

// El Layout Principal envuelve todo con el AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InitialLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
