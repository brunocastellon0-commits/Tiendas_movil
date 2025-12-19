import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  jobTitle: string | null;
  role: string | null;
};

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  loading: true, 
  isAdmin: false,
  jobTitle: null,
  role: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  // Cargar el role desde la tabla employees si no está en metadata
  const loadUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('role, phone')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setRole(data.role);
        setJobTitle(data.role); // Usar role como jobTitle también
      }
    } catch (error) {
      console.error('Error cargando role del usuario:', error);
    }
  };

  useEffect(() => {
    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        // Intentar obtener role de metadata primero
        const metaRole = session.user.user_metadata?.role || session.user.user_metadata?.job_title;
        
        if (metaRole) {
          setRole(metaRole);
          setJobTitle(metaRole);
        } else {
          // Si no está en metadata, cargar desde DB
          loadUserRole(session.user.id);
        }
      }
      
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        const metaRole = session.user.user_metadata?.role || session.user.user_metadata?.job_title;
        
        if (metaRole) {
          setRole(metaRole);
          setJobTitle(metaRole);
        } else {
          await loadUserRole(session.user.id);
        }
      } else {
        setRole(null);
        setJobTitle(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === 'Administrador';

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, jobTitle, role }}>
      {children}
    </AuthContext.Provider>
  );
};