import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Image, Dimensions
} from 'react-native';
// Librerías de iconos (Ionicons para UI general, MaterialCommunityIcons para cosas específicas como camiones)
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// SafeAreaView asegura que el contenido no choque con el "notch" o la barra de estado del celular
import { SafeAreaView } from 'react-native-safe-area-context';
// Hooks propios y de navegación
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
// Componente para degradados de color (usado en el Header)
import { LinearGradient } from 'expo-linear-gradient';
// Nuestro hook personalizado para manejar colores (Dark/Light)
import { useTheme } from '../../contexts/ThemeContext';

// Definimos la estructura de datos de un Pedido (TypeScript)
interface Order {
  id: string;
  client_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  clients: { name: string };
}

// Obtenemos el ancho de la pantalla para calcular tamaños responsivos (ej: ancho de botones)
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  // --- 1. HOOKS Y ESTADO ---

  // Obtenemos los colores dinámicos y el estado del tema (oscuro o no)
  const { colors, isDark } = useTheme();
  // Datos de sesión del usuario y si es admin
  const { session, isAdmin } = useAuth();
  // Router para navegar a otras pantallas
  const router = useRouter();

  // Estados locales para guardar los pedidos, la carga y las estadísticas
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, pendingCount: 0, deliveredCount: 0 });

  // --- 2. CONFIGURACIÓN VISUAL ---

  // Lógica para el color del Header:
  // - Si es Dark Mode: Usamos el verde de marca oscureciéndose hacia abajo (para no brillar demasiado).
  // - Si es Light Mode: Usamos el verde brillante original.
  const headerGradientColors = (isDark
    ? [colors.brandGreen, '#14532d']
    : ['#00D15B', '#077E4F']) as [string, string];

  // Función simple para obtener la fecha de hoy formateada (ej: "Hoy, 04/01/26")
  const getFormattedDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    return `Hoy, ${day}/${month}/${year}`;
  };
  const fechaHoy = getFormattedDate();

  // Obtenemos el primer nombre del usuario para saludarlo
  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || "Usuario";

  // --- 3. LÓGICA DE DATOS (SUPABASE) ---

  const fetchOrders = async () => {
    try {
      if (!session?.user) return; // Si no hay usuario, no hacemos nada

      const today = new Date().toISOString().split('T')[0]; // Fecha de hoy (YYYY-MM-DD)

      // Consulta a Supabase: Pedidos del usuario actual, de hoy en adelante
      const { data, error } = await supabase
        .from('pedidos_auxiliares')
        .select(`id, client_id, total_amount, status, created_at, clients:client_id ( name )`)
        .eq('seller_id', session.user.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(10); // Traemos solo los últimos 10

      if (data) {
        // Formateamos los datos (a veces Supabase devuelve arrays en relaciones)
        const ordersWithClients = data.map(order => ({
          ...order,
          clients: Array.isArray(order.clients) ? order.clients[0] : order.clients
        }));
        setOrders(ordersWithClients as Order[]);

        // Calculamos estadísticas al vuelo (suma de ventas, conteo de estados)
        setStats({
          totalSales: data.reduce((sum, order) => sum + (order.total_amount || 0), 0),
          pendingCount: data.filter(o => o.status === 'pending').length,
          deliveredCount: data.filter(o => o.status === 'delivered').length,
        });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // useFocusEffect ejecuta fetchOrders cada vez que la pantalla vuelve a tener el foco (al volver atrás)
  useFocusEffect(useCallback(() => { setLoading(true); fetchOrders(); }, [session]));

  // --- 4. RENDERIZADO (UI) ---

  return (
    // Contenedor principal con fondo dinámico (colors.bgStart viene de tu tema)
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* A. FONDO DECORATIVO (LAS BOLITAS) */}
      <View style={styles.backgroundShapes}>
        <View style={[styles.shapeCircle, {
          top: 180, right: -60, width: 250, height: 250,
          backgroundColor: colors.brandGreen,
          opacity: colors.bubbleOpacity // Opacidad controlada por el tema
        }]} />
        <View style={[styles.shapeCircle, {
          bottom: 100, left: -80, width: 320, height: 320,
          backgroundColor: colors.brandGreen,
          opacity: isDark ? 0.05 : 0.03 // Más sutil en dark mode
        }]} />
      </View>

      {/* B. HEADER (Encabezado Verde Curvo) */}
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCurve}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            {/* Logo y Nombre App */}
            <View style={styles.headerLeft}>
              <Image source={require('../../assets/images/logoTiendasMovil.png')} style={styles.logoImageLarge} />
              <Text style={styles.headerAppName}>Tiendas Móvil</Text>
            </View>
            {/* Botones Derecha (Notificación y Perfil) */}
            <View style={styles.headerRightButtons}>
              <TouchableOpacity style={styles.iconBtnTransparent} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={28} color="#FFF" />
                <View style={styles.badgeSmall} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnProfile} activeOpacity={0.7} onPress={() => { }}>
                <Ionicons name="person-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* C. CONTENIDO SCROLLABLE */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }} // Espacio al final para que no tape el menú inferior
        showsVerticalScrollIndicator={false}
      >

        {/* 1. TARJETA RESUMEN DEL DÍA */}
        <View style={[styles.floatingCard, {
          backgroundColor: colors.cardBg, // Fondo tarjeta dinámico
          borderColor: colors.cardBorder,
          borderWidth: isDark ? 1 : 0 // Borde sutil solo en dark mode
        }]}>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greetingText, { color: colors.textMain }]}>Hola, {userName}</Text>
          </View>

          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Resumen del Día</Text>
            {/* Badge de fecha con colores condicionales */}
            <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.2)' : '#E8F5E9' }]}>
              <Text style={[styles.dateText, { color: isDark ? '#4ADE80' : '#166534' }]}>{fechaHoy}</Text>
            </View>
          </View>

          {/* Estadísticas (Ventas, Pendientes, Entregas) */}
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
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Entregas</Text>
                <View style={[styles.statIndicator, { backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          )}
        </View>

        {/* 2. GRID DE ACCIONES RÁPIDAS (Botones) */}
        <View style={styles.gridSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMain }]}>Acciones Rápidas</Text>
          <View style={styles.gridContainer}>

            {/* Usamos el componente MenuButton reutilizable */}
            <MenuButton
              title="Clientes"
              iconLib="Ionicons" icon="people"
              color={colors.brandGreen}
              themeColors={colors} isDark={isDark}
              onPress={() => router.push('/clients/clients')}
            />
            <MenuButton
              title="Rutas"
              iconLib="MaterialCommunityIcons" icon="map-marker-path"
              // Ajustamos el color del icono en dark mode porque el azul oscuro no se ve bien
              color={isDark ? colors.iconGray : '#334155'}
              themeColors={colors} isDark={isDark}
              onPress={() => router.push('/map')}
            />
            {/* ... Resto de botones ... */}
            <MenuButton title="Inventario" iconLib="MaterialCommunityIcons" icon="package-variant-closed" color="#0D9488" themeColors={colors} isDark={isDark} onPress={() => router.push('/admin/productos/Productos')} />
            <MenuButton title="Proveedores" iconLib="MaterialCommunityIcons" icon="truck-delivery" color="#EAB308" themeColors={colors} isDark={isDark} onPress={() => router.push('/admin/proveedores/ListarProveedores')} />

            {/* Botones exclusivos para admin */}
            {isAdmin && <MenuButton title="Zonas" iconLib="MaterialCommunityIcons" icon="map-marker-radius" color="#2563EB" themeColors={colors} isDark={isDark} onPress={() => router.push('/admin/zonas/Zonas')} />}
            {isAdmin && <MenuButton title="Personal" iconLib="MaterialCommunityIcons" icon="card-account-details" color={isDark ? colors.iconGray : '#475569'} themeColors={colors} isDark={isDark} onPress={() => router.push('/admin/Empleados')} />}
            {isAdmin && <MenuButton title="Categorías" iconLib="MaterialCommunityIcons" icon="shape" color="#16A34A" themeColors={colors} isDark={isDark} onPress={() => router.push('/admin/categorias/categoria')} />}

          </View>
        </View>

        {/* 3. LISTA DE ÚLTIMOS PEDIDOS */}
        <View style={[styles.floatingCard, {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          borderWidth: isDark ? 1 : 0
        }]}>

          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Últimos Pedidos</Text>
            <TouchableOpacity onPress={() => { }}>
              <Text style={{ color: colors.brandGreen, fontWeight: '600' }}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ordersListContainer}>
            {orders.map((order, index) => {
              // Lógica para determinar si es el último de la lista (para quitar el borde inferior)
              const isLast = index === orders.length - 1;
              const isDelivered = order.status === 'delivered';

              // Colores de estado
              const statusColor = isDelivered ? colors.brandGreen : '#F59E0B';
              const iconName = isDelivered ? "check-circle" : "clock-time-four";
              // Fondo del icono (más oscuro en dark mode para no encandilar)
              const iconBg = isDelivered
                ? (isDark ? 'rgba(42, 140, 74, 0.2)' : '#E8F5E9')
                : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF3E0');

              return (
                <View key={order.id} style={[
                  styles.orderRowItem,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.cardBorder : '#F1F5F9' }
                ]}>
                  {/* Icono estado */}
                  <View style={[styles.orderIconCircle, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={iconName} size={20} color={statusColor} />
                  </View>
                  {/* Info */}
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderClient, { color: colors.textMain }]} numberOfLines={1}>{order.clients?.name || 'Cliente'}</Text>
                    <Text style={[styles.orderDate, { color: colors.textSub }]}>
                      {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} •
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {/* Precio */}
                  <View style={styles.orderRight}>
                    <Text style={[styles.orderPrice, { color: isDelivered ? colors.textMain : '#F59E0B' }]}>
                      Bs {order.total_amount}
                    </Text>
                    <Text style={[styles.orderStatusText, { color: statusColor }]}>
                      {isDelivered ? 'Entregado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Mensaje vacío */}
            {orders.length === 0 && (
              <Text style={{ textAlign: 'center', color: colors.textSub, padding: 20 }}>No hay pedidos recientes</Text>
            )}
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

// --- COMPONENTE REUTILIZABLE: BOTÓN DE MENÚ ---
// Recibe props de color y tema para adaptarse automáticamente
const MenuButton = ({ title, icon, iconLib, color, themeColors, isDark, onPress }: any) => {
  const IconComponent = iconLib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconCard, {
        // Fondo del botón: Blanco en light, Gris tarjeta en dark
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

// --- ESTILOS ESTÁTICOS (Layout) ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  // Formas de fondo
  backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  shapeCircle: { position: 'absolute', borderRadius: 999 },

  // Header Curvo
  headerCurve: { height: 220, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingHorizontal: 25, position: 'absolute', width: '100%', zIndex: 0 },
  headerContent: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImageLarge: { width: 40, height: 40, resizeMode: 'contain' },
  headerAppName: { fontSize: 20, fontWeight: 'bold', color: '#FFF', letterSpacing: 0.5 },
  headerRightButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtnTransparent: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  iconBtnProfile: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  badgeSmall: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  scrollView: { flex: 1, marginTop: 120 }, // Margen para que el scroll empiece debajo del header

  // Estilos de Tarjetas
  floatingCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 25 },
  greetingContainer: { marginBottom: 15 },
  greetingText: { fontSize: 18, fontWeight: 'bold' },
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

  // Grid de Botones
  gridSection: { paddingHorizontal: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', marginLeft: 15, marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  menuBtn: { width: width / 3 - 14, alignItems: 'center', marginBottom: 24 },
  menuIconCard: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1 },
  menuText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Lista Pedidos
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