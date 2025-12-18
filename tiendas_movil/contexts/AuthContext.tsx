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

  // Obtener role y job_title del usuario desde los metadatos
  const role = session?.user?.user_metadata?.role as string | null;
  const jobTitle = session?.user?.user_metadata?.job_title as string | null;
  
  // El usuario es admin si su role es "Administrador"
  const isAdmin = role === 'Administrador';

  useEffect(() => {
    // 1. Cargar sesión inicial al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (Login, Logout, Auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, jobTitle, role }}>
      {children}
    </AuthContext.Provider>
  );
};