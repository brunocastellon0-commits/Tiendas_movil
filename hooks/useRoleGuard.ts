import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook de protección de pantalla por rol.
 *
 * Úsalo al inicio de cualquier pantalla exclusiva de Administrador:
 *   useRoleGuard('Administrador');
 *
 * Si el usuario logueado NO tiene el rol requerido, redirige al home
 * silenciosamente. Esto evita que un vendedor entre por URL directa.
 */
export const useRoleGuard = (requiredRole: 'Administrador') => {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    // Esperamos a que el AuthContext termine de cargar el rol antes de decidir
    if (loading) return;

    const hasAccess = role?.trim().toLowerCase() === requiredRole.toLowerCase();
    if (!hasAccess) {
      // Redirige al home — no mostramos error porque en uso normal
      // el vendedor nunca llega aquí (el módulo no aparece en su home)
      router.replace('/(tabs)');
    }
  }, [role, loading]);
};
