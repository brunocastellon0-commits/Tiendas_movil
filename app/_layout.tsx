import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
//para los temas
import { ThemeProvider } from '../contexts/ThemeContext';

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