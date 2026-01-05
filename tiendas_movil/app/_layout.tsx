import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { LocationService } from '../services/LocationService';

// proteccion de rutas
const InitialLayout = () => {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

  // 🔄 TRACKING AUTOMÁTICO DE UBICACIÓN (cada 5 minutos)
  useEffect(() => {
    if (!session) return; // Solo trackear si hay sesión activa

    let intervalId: ReturnType<typeof setInterval>;

    const startTracking = async () => {
      // 1. Pedir permiso al iniciar
      const hasPermission = await LocationService.requestPermissions();
      
      if (hasPermission) {
        // 2. Subir la primera ubicación inmediatamente
        await LocationService.updateMyLocation();

        // 3. Crear un intervalo para subir cada 5 minutos (300,000 ms)
        intervalId = setInterval(async () => {
          await LocationService.updateMyLocation();
        }, 5 * 60 * 1000); // 5 minutos
      }
    };

    startTracking();

    // Limpieza al cerrar la app o componente
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [session]);

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
      <InitialLayout />
    </AuthProvider>
  );
}