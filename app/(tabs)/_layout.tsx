import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// TabLayout
//
// Tab bar visible: Inicio + Mapa (igual para Admin y Vendedor).
// La diferencia de acceso entre roles se controla en el home mediante adminOnly.
//
// Vendedor ve en el home: Clientes, Cobranza, Pedidos, Reporte Inventario, Catálogo.
// Admin ve en el home: todo lo anterior + Inventario, Proveedores, Zonas, Personal, Categorías.
// ─────────────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  if (loading || !session) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.iconGray,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? colors.cardBg : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 12,
          height: Platform.OS === 'ios' ? 80 : 65,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 3,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      {/* ── INICIO ── visible para todos */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <View style={[
                styles.iconBubble,
                focused && { backgroundColor: isDark ? 'rgba(42,140,74,0.18)' : 'rgba(42,140,74,0.1)' },
              ]}>
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={24}
                  color={color}
                />
              </View>
            </View>
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={[
              styles.tabLabel,
              { color },
              focused && styles.tabLabelActive,
            ]}>
              Inicio
            </Text>
          ),
        }}
      />

      {/* ── MAPA ── visible para todos */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <View style={[
                styles.iconBubble,
                focused && { backgroundColor: isDark ? 'rgba(42,140,74,0.18)' : 'rgba(42,140,74,0.1)' },
              ]}>
                <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
              </View>
            </View>
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}>
              Mapa
            </Text>
          ),
        }}
      />

      {/* ── Ocultos del tab bar — se navegan desde el home o rutas internas ── */}
      <Tabs.Screen name="rutas"      options={{ href: null }} />
      <Tabs.Screen name="inventario" options={{ href: null }} />
      <Tabs.Screen name="explore"    options={{ href: null }} />
      <Tabs.Screen name="profile"    options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});