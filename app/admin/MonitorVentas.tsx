import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// --- Tipos ---
interface OrderSummary {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  client_name: string;
  seller_name: string;
}

export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado para filtros (Por defecto: HOY)
  const [filterDate, setFilterDate] = useState(new Date());

  // Cargar Pedidos
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Rango de fechas para el filtro (Inicio y Fin del día seleccionado)
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('pedidos_auxiliares')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          clients:client_id ( name ),
          employees:seller_id ( full_name )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Mapeo para aplanar la estructura y facilitar el renderizado
        const formattedData: OrderSummary[] = data.map((item: any) => {
          // Normalizar clients y employees (pueden ser array u objeto)
          const clientData = Array.isArray(item.clients) ? item.clients[0] : item.clients;
          const employeeData = Array.isArray(item.employees) ? item.employees[0] : item.employees;
          
          return {
            id: item.id,
            total_amount: item.total_amount,
            status: item.status,
            created_at: item.created_at,
            client_name: clientData?.name || 'Cliente Desconocido',
            seller_name: employeeData?.full_name || 'Vendedor Desconocido',
          };
        });
        setOrders(formattedData);
      }
    } catch (error) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [filterDate]) // Recargar si cambia la fecha
  );

  // Cálculos de Totales (Dashboard en tiempo real)
  const stats = useMemo(() => {
    const totalSales = orders.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
    const totalOrders = orders.length;
    return { totalSales, totalOrders };
  }, [orders]);

  const handleOrderPress = (orderId: string) => {
    router.push(`/pedidos/${orderId}` as any);
  };

  // Renderizado de cada Tarjeta de Pedido
  const renderItem = ({ item }: { item: OrderSummary }) => {
    const time = new Date(item.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    
    // Configuración visual según estado
    const statusConfig: any = {
      pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pendiente', icon: 'clock-outline' },
      delivered: { color: '#10B981', bg: '#D1FAE5', label: 'Entregado', icon: 'check-circle-outline' },
      cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelado', icon: 'close-circle-outline' },
    };
    const currentStatus = statusConfig[item.status] || statusConfig.pending;

    return (
      <TouchableOpacity 
        style={styles.orderCard} 
        onPress={() => handleOrderPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{item.id.toString().slice(0, 8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
            <MaterialCommunityIcons name={currentStatus.icon} size={14} color={currentStatus.color} />
            <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="briefcase" size={16} color="#6B7280" />
            <Text style={styles.sellerName} numberOfLines={1}>{item.seller_name}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.amountText}>Bs {item.total_amount.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Monitor de Ventas</Text>
            <TouchableOpacity onPress={() => fetchOrders()}>
              <Ionicons name="refresh" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Dashboard Resumen */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Ventas del Día</Text>
              <Text style={styles.statValue}>Bs {stats.totalSales.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Pedidos</Text>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
            </View>
          </View>
        </View>

        {/* Selector de Fecha Simple (Hoy / Ayer) - Se puede expandir */}
        <View style={styles.dateFilterContainer}>
          <Text style={styles.dateTextDisplay}>
            Mostrando: {filterDate.toLocaleDateString('es-BO')}
          </Text>
          {/* Aquí podrías poner un botón para abrir un DatePicker */}
        </View>

        {/* Lista */}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={orders}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No hay pedidos en esta fecha</Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#2a8c4a',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#E5E7EB',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dateFilterContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dateTextDisplay: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Order Card Styles
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a8c4a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 16,
  }
});
