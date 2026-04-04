import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useLocationPermission } from '../../hooks/useLocationPermission';


// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
interface Order {
  id: string;
  clients_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  clients: { name: string };
}

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DEFINICIÓN DE MÓDULOS
//
// adminOnly: true  → solo se muestra a Administrador
// adminOnly: false → se muestra a todos (vendedor y admin)
//
// Módulos del vendedor: clients, cobranza, pedidos, reporteInventario
// Módulos del admin:    todos
// ─────────────────────────────────────────────────────────────────────────────
const MENU_MODULES = [
  {
    id: 'clients',
    title: 'Clientes',
    iconLib: 'Ionicons',
    icon: 'people',
    color: '#2a8c4a',
    route: '/clients/clients',
    adminOnly: false,
  },
  {
    id: 'cobranza',
    title: 'Hoja de Cobranza',
    iconLib: 'Ionicons',
    icon: 'reader-outline',
    color: '#DC2626',
    route: '/Reportes/HojaCobranza',
    adminOnly: false,
  },
  {
    id: 'pedidos',
    title: 'Pedidos',
    iconLib: 'MaterialCommunityIcons',
    icon: 'clipboard-text-outline',
    color: '#7C3AED',
    route: '/pedidos/MisPedidos',
    adminOnly: false,
  },
  {
    id: 'reporteInventario',
    title: 'Reporte Inventario',
    iconLib: 'MaterialCommunityIcons',
    icon: 'chart-bar',
    color: '#0D9488',
    route: '/Reportes/ReporteInventario',
    adminOnly: false,
  },
  {
    id: 'catalogo',
    title: 'Catálogo',
    iconLib: 'MaterialCommunityIcons',
    icon: 'book-open-page-variant-outline',
    color: '#EA580C',
    route: '/catalogo/Catalogo',
    adminOnly: false,
  },
  // ── Solo Admin ──────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    title: 'Inventario',
    iconLib: 'MaterialCommunityIcons',
    icon: 'clipboard-list-outline',
    color: '#0D9488',
    route: '/admin/productos/Productos',
    adminOnly: true,
  },
  {
    id: 'providers',
    title: 'Proveedores',
    iconLib: 'MaterialCommunityIcons',
    icon: 'truck-delivery',
    color: '#EAB308',
    route: '/admin/proveedores/ListarProveedores',
    adminOnly: true,
  },
  {
    id: 'zones',
    title: 'Zonas',
    iconLib: 'MaterialCommunityIcons',
    icon: 'map-marker-radius',
    color: '#2563EB',
    route: '/admin/zonas/Zonas',
    adminOnly: true,
  },
  {
    id: 'staff',
    title: 'Personal',
    iconLib: 'MaterialCommunityIcons',
    icon: 'card-account-details',
    color: '#475569',
    route: '/admin/Empleados',
    adminOnly: true,
  },
  {
    id: 'categories',
    title: 'Categorías',
    iconLib: 'Ionicons',
    icon: 'grid-outline',
    color: '#16A34A',
    route: '/admin/categorias/categoria',
    adminOnly: true,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  // isAdmin viene del AuthContext — es estable, no parpadeará
  const { session, isAdmin, jobTitle } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, totalCount: 0 });

  const headerGradientColors = (
    isDark ? [colors.brandGreen, '#14532d'] : ['#00D15B', '#077E4F']
  ) as [string, string];

  const getFormattedDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    return `Hoy, ${day}/${month}/${year}`;
  };

  const fechaHoy = getFormattedDate();
  const [userName, setUserName] = useState(
    session?.user?.user_metadata?.full_name?.split(' ')[0] || ''
  );

  // ── Pedir permiso de ubicación al entrar al home (cada login) ──────────────
  // Si el permiso ya estaba concedido no hace nada visible.
  // Si fue denegado, muestra un alert suave con acceso a Ajustes.
  useLocationPermission();

  const visibleModules = useMemo(
    () => MENU_MODULES.filter(m => isAdmin || !m.adminOnly),
    [isAdmin]
  );


  // ── Carga de estadísticas ───────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      if (!session?.user) return;

      // Usamos hora local Bolivia para que el filtro "hoy" no se desfase por UTC
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const todayStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00-04:00`;
      const todayEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T23:59:59-04:00`;

      // Cargar nombre desde employees si aún no lo tenemos
      if (!userName) {
        const { data: empData } = await supabase
          .from('employees')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        if (empData?.full_name) {
          setUserName(empData.full_name.split(' ')[0]);
        } else {
          setUserName('Usuario');
        }
      }

      let query = supabase
        .from('pedidos')
        .select('id, total_venta, estado')
        .gte('crated_at', todayStart)
        .lte('crated_at', todayEnd);

      // Vendedor solo ve sus propios pedidos
      if (!isAdmin) {
        query = query.eq('empleado_id', session.user.id);
      }

      const { data } = await query;
      if (data) {
        setStats({
          totalSales: data.reduce((s, o) => s + (o.total_venta || 0), 0),
          totalCount: data.length,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [session, isAdmin]));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fondo decorativo */}
      <View style={styles.backgroundShapes}>
        <View style={[styles.shapeCircle, {
          top: 180, right: -60, width: 250, height: 250,
          backgroundColor: colors.brandGreen, opacity: colors.bubbleOpacity,
        }]} />
        <View style={[styles.shapeCircle, {
          bottom: 100, left: -80, width: 320, height: 320,
          backgroundColor: colors.brandGreen, opacity: isDark ? 0.05 : 0.03,
        }]} />
      </View>

      {/* Header */}
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCurve}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/images/logoTiendasMovil.png')}
                style={styles.logoImageLarge}
              />
              <Text style={styles.headerAppName}>Tiendas Movil</Text>
            </View>
            <TouchableOpacity
              style={styles.iconBtnProfile}
              activeOpacity={0.7}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="person-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Scroll principal */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Tarjeta KPIs */}
        <View style={[styles.floatingCard, {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          borderWidth: isDark ? 1 : 0,
        }]}>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greetingText, { color: colors.textMain }]}>
              Hola, {userName}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.brandGreen }]}>
              <Text style={styles.roleText}>
                {jobTitle?.toUpperCase() ?? (isAdmin ? 'ADMINISTRADOR' : 'PREVENTISTA')}
              </Text>
            </View>
          </View>

          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Resumen del Día</Text>
            <View style={[styles.dateBadge, {
              backgroundColor: isDark ? 'rgba(42,140,74,0.2)' : '#E8F5E9',
            }]}>
              <Text style={[styles.dateText, { color: isDark ? '#4ADE80' : '#166534' }]}>
                {fechaHoy}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.brandGreen} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textMain }]}>
                  Bs {stats.totalSales.toFixed(0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Ventas</Text>
                <View style={[styles.statIndicator, { backgroundColor: colors.brandGreen }]} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? colors.cardBorder : '#E2E8F0' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textMain }]}>{stats.totalCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Total pedidos</Text>
                <View style={[styles.statIndicator, { backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          )}
        </View>

        {/* Grid de módulos */}
        <View style={styles.gridSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Modulos</Text>
          <View style={styles.gridContainer}>
            {visibleModules.map(item => (
              <MenuButton
                key={item.id}
                title={item.title}
                iconLib={item.iconLib}
                icon={item.icon}
                color={item.color}
                themeColors={colors}
                isDark={isDark}
                onPress={() => router.push(item.route as any)}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuButton
// ─────────────────────────────────────────────────────────────────────────────
const MenuButton = ({ title, icon, iconLib, color, themeColors, isDark, onPress }: any) => {
  const IconComponent = iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconCard, {
        backgroundColor: isDark ? themeColors.cardBg : '#FFFFFF',
        shadowColor: color,
        borderColor: isDark ? themeColors.cardBorder : '#F8FAFC',
        borderWidth: 1,
      }]}>
        <IconComponent name={icon} size={28} color={color} />
      </View>
      <Text style={[styles.menuText, { color: themeColors.textSub }]}>{title}</Text>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  shapeCircle: { position: 'absolute', borderRadius: 999 },

  headerCurve: { height: 220, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingHorizontal: 25, position: 'absolute', width: '100%', zIndex: 0 },
  headerContent: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImageLarge: { width: 40, height: 40, resizeMode: 'contain' },
  headerAppName: { fontSize: 20, fontWeight: 'bold', color: '#FFF', letterSpacing: 0.5 },
  iconBtnProfile: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  scrollView: { flex: 1, marginTop: 120 },

  floatingCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 25 },
  greetingContainer: { marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingText: { fontSize: 18, fontWeight: 'bold' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dateText: { fontSize: 13, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statIndicator: { width: 24, height: 4, borderRadius: 2, marginTop: 10 },
  statDivider: { width: 1, height: 35, alignSelf: 'center' },

  gridSection: { paddingHorizontal: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', marginLeft: 15, marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  menuBtn: { width: width / 3 - 14, alignItems: 'center', marginBottom: 24 },
  menuIconCard: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  menuText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});