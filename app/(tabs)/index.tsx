import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// 1. Importamos ambas librerías de iconos
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
// 2. Importamos contextos y servicios propios
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

// --- INTERFACES ---
interface Order {
  id: string;
  clients_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  clients: { name: string };
}

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  // --- HOOKS Y ESTADO ---
  const { colors, isDark } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, pendingCount: 0, deliveredCount: 0 });

  // Estado para guardar el rol del usuario (Ej: 'Administrador', 'Preventista')
  const [userRole, setUserRole] = useState<string>('');

  // Colores del Header (Verde corporativo)
  const headerGradientColors = (isDark
    ? [colors.brandGreen, '#14532d']
    : ['#00D15B', '#077E4F']) as [string, string];

  // Generar fecha y nombre para el saludo
  const getFormattedDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    return `Hoy, ${day}/${month}/${year}`;
  };
  const fechaHoy = getFormattedDate();
  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || "Usuario";

  // --- 1. CONFIGURACIÓN MAESTRA DEL MENÚ ---
  // Aquí defines todos los botones posibles. Es fácil editar iconos o rutas aquí.
  const allMenuOptions = [
    {
      id: 'clients',
      title: 'Clientes',
      iconLib: 'Ionicons',
      icon: 'people',
      color: colors.brandGreen,
      route: '/clients/clients'
    },
    {
      id: 'routes',
      title: 'Rutas',
      iconLib: 'MaterialCommunityIcons',
      icon: 'map-marker-path',
      color: isDark ? colors.iconGray : '#334155',
      route: '/map'
    },
    {
      id: 'cobranza',
      title: 'Hoja de Cobranza', // Nombre actualizado
      iconLib: 'Ionicons',
      icon: 'reader-outline', // Icono de "Hoja/Lectura"
      color: '#DC2626',
      route: '/Reportes/HojaCobranza'
    },
    {
      id: 'inventory',
      title: 'Inventario',
      iconLib: 'MaterialCommunityIcons',
      icon: 'clipboard-list-outline', // Icono tipo Tabla/Lista
      color: '#0D9488',
      route: '/admin/productos/Productos'
    },
    {
      id: 'providers',
      title: 'Proveedores',
      iconLib: 'MaterialCommunityIcons',
      icon: 'truck-delivery',
      color: '#EAB308',
      route: '/admin/proveedores/ListarProveedores'
    },
    {
      id: 'zones',
      title: 'Zonas',
      iconLib: 'MaterialCommunityIcons',
      icon: 'map-marker-radius',
      color: '#2563EB',
      route: '/admin/zonas/Zonas'
    },
    {
      id: 'staff',
      title: 'Personal',
      iconLib: 'MaterialCommunityIcons',
      icon: 'card-account-details',
      color: isDark ? colors.iconGray : '#475569',
      route: '/admin/Empleados'
    },
    {
      id: 'categories',
      title: 'Categorías',
      iconLib: 'Ionicons',
      icon: 'grid-outline', // Icono de Grilla/Categoría
      color: '#16A34A',
      route: '/admin/categorias/categoria'
    },
  ];

  // --- 2. LÓGICA DE DATOS (Roles y Pedidos) ---
  const fetchOrdersAndRole = async () => {
    try {
      if (!session?.user) return;

      const today = new Date().toISOString().split('T')[0];

      // A. Obtener el Rol del Empleado desde Supabase
      const { data: employeeData } = await supabase
        .from('employees')
        .select('job_title')
        .eq('id', session.user.id)
        .single();

      const role = employeeData?.job_title || 'Preventista'; // Valor por defecto seguro
      setUserRole(role);

      // B. Obtener Pedidos (Usamos 'crated_at' porque así está en tu BD)
      let ordersQuery = supabase
        .from('pedidos')
        .select(`id, clients_id, total_venta, estado, crated_at, clients(name)`)
        .gte('crated_at', `${today}T00:00:00`)
        .order('crated_at', { ascending: false })
        .limit(10);

      // Si es Preventista, filtramos para ver SOLO sus ventas
      if (role === 'Preventista') {
        ordersQuery = ordersQuery.eq('empleado_id', session.user.id);
      }

      const { data, error } = await ordersQuery;

      if (error) {
        console.error('Error cargando pedidos:', error);
        return;
      }

      if (data) {
        // Mapeamos los datos para usarlos en la UI
        const ordersWithClients = data.map((order: any) => ({
          ...order,
          client_id: order.clients_id,
          total_amount: order.total_venta,
          status: order.estado,
          created_at: order.crated_at, // Mapeamos crated_at a created_at
          clients: order.clients || { name: 'Cliente' }
        }));
        setOrders(ordersWithClients as Order[]);

        // Estadísticas simples
        setStats({
          totalSales: data.reduce((sum, order) => sum + (order.total_venta || 0), 0),
          pendingCount: data.filter(o => o.estado === 'pending' || o.estado === 'Pendiente').length,
          deliveredCount: data.filter(o => o.estado === 'delivered' || o.estado === 'Pagado').length,
        });
      }
    } catch (error) {
      console.error('Error general fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar carga cada vez que la pantalla recibe foco
  useFocusEffect(useCallback(() => { setLoading(true); fetchOrdersAndRole(); }, [session]));

  // --- 3. FILTRO DE VISTAS SEGÚN ROL ---
  const visibleMenuOptions = allMenuOptions.filter(option => {
    // Si el rol es "Preventista", solo mostramos estos 3 módulos
    if (userRole === 'Preventista') {
      return ['clients', 'routes', 'cobranza'].includes(option.id);
    }
    // Si es Administrador (u otro), mostramos todo
    return true;
  });

  // --- 4. RENDERIZADO (UI) ---
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* FONDO DECORATIVO */}
      <View style={styles.backgroundShapes}>
        <View style={[styles.shapeCircle, { top: 180, right: -60, width: 250, height: 250, backgroundColor: colors.brandGreen, opacity: colors.bubbleOpacity }]} />
        <View style={[styles.shapeCircle, { bottom: 100, left: -80, width: 320, height: 320, backgroundColor: colors.brandGreen, opacity: isDark ? 0.05 : 0.03 }]} />
      </View>

      {/* HEADER */}
      <LinearGradient colors={headerGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCurve}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Image source={require('../../assets/images/logoTiendasMovil.png')} style={styles.logoImageLarge} />
              <Text style={styles.headerAppName}>Tiendas Móvil</Text>
            </View>
            <View style={styles.headerRightButtons}>
              <TouchableOpacity style={styles.iconBtnProfile} activeOpacity={0.7} onPress={() => router.push('/profile')}>
                <Ionicons name="person-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* SCROLL PRINCIPAL */}
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* A. TARJETA RESUMEN (KPIs) */}
        <View style={[styles.floatingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greetingText, { color: colors.textMain }]}>Hola, {userName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.brandGreen }]}>
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
          </View>

          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Resumen del Día</Text>
            <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.2)' : '#E8F5E9' }]}>
              <Text style={[styles.dateText, { color: isDark ? '#4ADE80' : '#166534' }]}>{fechaHoy}</Text>
            </View>
          </View>

          {loading ? <ActivityIndicator color={colors.brandGreen} /> : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textMain }]}>Bs {stats.totalSales.toFixed(0)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Ventas</Text>
                <View style={[styles.statIndicator, { backgroundColor: colors.brandGreen }]} />
              </View>
              <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E2E8F0' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textMain }]}>{stats.pendingCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Pendientes</Text>
                <View style={[styles.statIndicator, { backgroundColor: '#F59E0B' }]} />
              </View>
              <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E2E8F0' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textMain }]}>{stats.deliveredCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Pagados</Text>
                <View style={[styles.statIndicator, { backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          )}
        </View>

        {/* B. GRID DE MÓDULOS (DINÁMICO) */}
        <View style={styles.gridSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Módulos</Text>
          <View style={styles.gridContainer}>
            {/* Renderizamos la lista filtrada de botones */}
            {visibleMenuOptions.map((item) => (
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

        {/* C. LISTA DE ÚLTIMOS MOVIMIENTOS */}
        <View style={[styles.floatingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Últimos Movimientos</Text>
          </View>

          <View style={styles.ordersListContainer}>
            {orders.map((order, index) => {
              const isLast = index === orders.length - 1;
              const isDelivered = order.status === 'Pagado' || order.status === 'delivered';
              const statusColor = isDelivered ? colors.brandGreen : '#F59E0B';
              const iconName = isDelivered ? "check-circle" : "clock-time-four";
              const iconBg = isDelivered ? (isDark ? 'rgba(42, 140, 74, 0.2)' : '#E8F5E9') : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF3E0');

              return (
                <View key={order.id} style={[styles.orderRowItem, !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.cardBorder : '#F1F5F9' }]}>
                  <View style={[styles.orderIconCircle, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={iconName} size={20} color={statusColor} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderClient, { color: colors.textMain }]} numberOfLines={1}>{order.clients?.name}</Text>
                    <Text style={[styles.orderDate, { color: colors.textSub }]}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={[styles.orderPrice, { color: isDelivered ? colors.textMain : '#F59E0B' }]}>Bs {order.total_amount}</Text>
                    <Text style={[styles.orderStatusText, { color: statusColor }]}>{isDelivered ? 'Pagado' : 'Pendiente'}</Text>
                  </View>
                </View>
              );
            })}
            {orders.length === 0 && (
              <Text style={{ textAlign: 'center', color: colors.textSub, padding: 20 }}>No hay actividad reciente</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// --- COMPONENTE BOTÓN DE MENÚ (Reutilizable) ---
const MenuButton = ({ title, icon, iconLib, color, themeColors, isDark, onPress }: any) => {
  const IconComponent = iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconCard, {
        backgroundColor: isDark ? themeColors.cardBg : '#FFFFFF',
        shadowColor: color,
        borderColor: isDark ? themeColors.cardBorder : '#F8FAFC',
        borderWidth: 1
      }]}>
        <IconComponent name={icon} size={28} color={color} />
      </View>
      <Text style={[styles.menuText, { color: themeColors.textSub }]}>{title}</Text>
    </TouchableOpacity>
  );
};

// --- ESTILOS ---
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
  headerRightButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtnProfile: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },

  scrollView: { flex: 1, marginTop: 120 },

  floatingCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 25 },

  greetingContainer: { marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingText: { fontSize: 18, fontWeight: 'bold' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, justifyContent: 'center' },
  dateText: { fontSize: 13, fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statIndicator: { width: 24, height: 4, borderRadius: 2, marginTop: 10 },
  divider: { width: 1, height: 35, alignSelf: 'center' },

  gridSection: { paddingHorizontal: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', marginLeft: 15, marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  menuBtn: { width: width / 3 - 14, alignItems: 'center', marginBottom: 24 },
  menuIconCard: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1 },
  menuText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  ordersListContainer: { marginTop: 5 },
  orderRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  orderIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  orderInfo: { flex: 1 },
  orderClient: { fontSize: 15, fontWeight: 'bold' },
  orderDate: { fontSize: 12, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 15, fontWeight: 'bold' },
  orderStatusText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});