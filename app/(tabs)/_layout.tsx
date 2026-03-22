import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '../../contexts/ThemeContext'; // Importamos el contexto para los colores

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter(); // Router para hacer las redirecciones manuales

  return (
    <Tabs
      screenOptions={{
        // Colores de los iconos (Activo vs Inactivo)
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.iconGray,
        headerShown: false,
        tabBarButton: HapticTab, // Efecto háptico al pulsar

        // Estilo de la barra flotante
        tabBarStyle: {
          // Fondo dinámico: Blanco (Light) o Gris Azulado de Tarjeta (Dark)
          backgroundColor: isDark ? colors.cardBg : '#FFFFFF',
          borderTopWidth: 0,

          // Configuración de sombra
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: isDark ? 0.3 : 0.15,
          shadowRadius: 10,

          // Altura y espaciado
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 10,

          // Bordes redondeados y posición absoluta para que "flote"
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        }
      }}>

      {/* PESTAÑA 1: INICIO (Pantalla Real) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* PESTAÑA 2: UBICACIÓN (Pantalla Real - Tu Mapa) */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Ubicación',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "location" : "location-outline"} size={28} color={color} />
          ),
        }}
      />

      {/* PESTAÑA OCULTA: Rutas (deshabilitada) */}
      <Tabs.Screen
        name="rutas"
        options={{ href: null }}
      />

      {/* PESTAÑA 4: INVENTARIO (Botón de Acción Rápida) */}
      <Tabs.Screen
        name="inventario"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/admin/productos/Productos');
          },
        }}
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "package-variant" : "package-variant-closed"} size={28} color={color} />
          ),
        }}
      />

      {/* PESTAÑA OCULTA: Explore (Existe pero no se muestra en el menú) */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}
