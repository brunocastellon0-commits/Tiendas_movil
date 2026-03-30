import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

// ─────────────────────────────────────────────────────────────────────────────
// ThemeContext
//
// Prioridad del tema:
//   1. Si el usuario cambió manualmente → persiste en AsyncStorage
//   2. Si nunca lo cambió → sigue al sistema operativo automáticamente
//
// Clave guardada: 'user_theme_preference'
//   - 'light' | 'dark' → el usuario eligió manualmente
//   - null              → sin preferencia guardada, sigue al sistema
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'user_theme_preference';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    colors: typeof Colors.light | typeof Colors.dark;
    toggleTheme: () => void;
    resetToSystem: () => void; // Borra la preferencia manual y vuelve a seguir al SO
    isDark: boolean;
    followsSystem: boolean;    // true si está siguiendo al dispositivo
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = useColorScheme() ?? 'light';

    // null = siguiendo al sistema, 'light'|'dark' = preferencia manual
    const [userPreference, setUserPreference] = useState<Theme | null>(null);
    const [loaded, setLoaded] = useState(false);

    // ── Cargar preferencia guardada al iniciar ──────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (saved === 'light' || saved === 'dark') {
                    setUserPreference(saved);
                }
            })
            .finally(() => setLoaded(true));
    }, []);

    // ── Tema efectivo: preferencia manual > sistema ─────────────────────────────
    const theme: Theme = userPreference ?? systemScheme;

    // ── Cambio manual: guarda en AsyncStorage ───────────────────────────────────
    const toggleTheme = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light';
        setUserPreference(next);
        AsyncStorage.setItem(STORAGE_KEY, next);
    };

    // ── Volver a seguir al sistema: borra la preferencia ───────────────────────
    const resetToSystem = () => {
        setUserPreference(null);
        AsyncStorage.removeItem(STORAGE_KEY);
    };

    const colors = Colors[theme];
    const isDark = theme === 'dark';
    const followsSystem = userPreference === null;

    // No renderiza hasta cargar la preferencia (evita flash de tema incorrecto)
    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, resetToSystem, isDark, followsSystem }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
    return context;
};