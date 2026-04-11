import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Layout de Seguridad para Administración
 *
 * Envuelve y protege genéricamente TODAS las rutas dentro de la carpeta /admin.
 * Esto reemplaza la necesidad de colocar `useRoleGuard` dentro de cada vista.
 * Si el usuario no es Admin (ej. Vendedor saltándose la URL), este layout bloquea
 * el renderizado de los hijos e impide el acceso desviándolo al Home.
 */
export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la autenticación terminó de cargar y el usuario NO es un admin
    // interceptamos la navegación y lo redirigimos silenciosamente.
    if (!loading && !isAdmin) {
      router.replace('/(tabs)' as any);
    }
  }, [isAdmin, loading]);

  // Mientras valida el contexto, mostramos pantalla de espera
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2a8c4a" />
      </View>
    );
  }

  // Si pasa la validación, dejamos pasar la renderización ocultando el cabezal por defecto
  // para que cada pantalla dibuje sus barras superiores como ya lo hacían.
  if (!isAdmin) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
