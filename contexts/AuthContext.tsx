import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  jobTitle: string | null;
  role: string | null;
  status: 'Habilitado' | 'Deshabilitado' | null;
};

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  loading: true, 
  isAdmin: false,
  jobTitle: null,
  role: null,
  status: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<'Habilitado' | 'Deshabilitado' | null>(null);

  // Función centralizada para validar perfil y permisos
  const checkUserProfile = async (userId: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] Verificando perfil del usuario:', userId);
      
      // Consultamos status y role frescos de la DB
      const { data, error } = await supabase
        .from('employees')
        .select('role, job_title, status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error verificando perfil:', error);
        // Si RLS bloquea la lectura, es probable que esté deshabilitado
        return false;
      }

      if (data) {
        console.log('[AuthContext] Perfil obtenido:', { 
          role: data.role, 
          status: data.status,
          job_title: data.job_title 
        });

        // --- KILL SWITCH: Seguridad Crítica ---
        if (data.status === 'Deshabilitado') {
          console.warn('[AuthContext] ⚠️ Usuario deshabilitado detectado. Cerrando sesión...');
          
          Alert.alert(
            'Acceso Denegado', 
            'Tu cuenta ha sido deshabilitada. Contacta al administrador.',
            [{ text: 'OK' }]
          );
          
          await supabase.auth.signOut();
          setSession(null);
          setRole(null);
          setJobTitle(null);
          setStatus(null);
          return false;
        }

        // Si está habilitado, actualizamos estado
        setRole(data.role);
        setJobTitle(data.job_title || data.role);
        setStatus(data.status as 'Habilitado' | 'Deshabilitado');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AuthContext] Error inesperado:', error);
      return false;
    }
  };

  useEffect(() => {
    let statusSubscription: any = null;

    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        // SIEMPRE verificamos contra la DB al iniciar la app
        const isValid = await checkUserProfile(session.user.id);
        
        if (isValid && session.user.id) {
          // 3. Configurar suscripción en tiempo real para detectar cambios de status
          console.log('[AuthContext] Configurando suscripción en tiempo real...');
          
          statusSubscription = supabase
            .channel('employee-status-changes')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'employees',
                filter: `id=eq.${session.user.id}`
              },
              async (payload) => {
                console.log('[AuthContext] 🔄 Cambio detectado en employee:', payload);
                
                // Re-verificar perfil cuando hay cambios
                if (payload.new) {
                  const newStatus = (payload.new as any).status;
                  
                  if (newStatus === 'Deshabilitado') {
                    console.warn('[AuthContext] ⚠️ Status cambiado a Deshabilitado en tiempo real');
                    
                    Alert.alert(
                      'Acceso Revocado',
                      'Tu cuenta ha sido deshabilitada. La sesión se cerrará.',
                      [{ text: 'OK' }]
                    );
                    
                    await supabase.auth.signOut();
                    setSession(null);
                    setRole(null);
                    setJobTitle(null);
                    setStatus(null);
                  } else {
                    // Actualizar datos si cambió algo más
                    await checkUserProfile(session.user.id);
                  }
                }
              }
            )
            .subscribe((status) => {
              console.log('[AuthContext] Estado de suscripción:', status);
            });
        }
      }
      
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación (Login, Logout, Auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] Auth state cambió:', _event);
      
      setSession(session);
      
      if (session?.user) {
        // Al loguearse o refrescar token, verificamos status nuevamente
        await checkUserProfile(session.user.id);
      } else {
        // Limpieza al cerrar sesión
        setRole(null);
        setJobTitle(null);
        setStatus(null);
        
        // Limpiar suscripción en tiempo real
        if (statusSubscription) {
          console.log('[AuthContext] Cancelando suscripción en tiempo real...');
          statusSubscription.unsubscribe();
          statusSubscription = null;
        }
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (statusSubscription) {
        statusSubscription.unsubscribe();
      }
    };
  }, []);

  const isAdmin = role === 'Administrador';

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, jobTitle, role, status }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};