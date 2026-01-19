import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Definición de interfaces para el tipado estricto
interface OrderItem {
  id?: string;
  name: string;
  qty: number;
  price: number;
}

interface VisitInfo {
  id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  outcome: string;
  notes: string | null;
}

interface OrderDetail {
  id: string;
  client_id: string;
  seller_id: string;
  visit_id: number | null;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  clients: {
    name: string;
    phone: string; // Mapeado desde 'phones' en la base de datos
    address: string;
  };
  visits: VisitInfo | null;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      // Solicitamos la columna 'items' directa, ya que es un JSONB
      const { data, error } = await supabase
        .from('pedidos_auxiliares')
        .select(`
          id,
          client_id,
          seller_id,
          visit_id,
          total_amount,
          status,
          created_at,
          items, 
          clients:client_id (
            name,
            phones,
            address
          ),
          visits:visit_id (
            id,
            start_time,
            end_time,
            duration_seconds,
            outcome,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        Alert.alert('Error', 'No se pudo cargar el detalle del pedido');
        return;
      }

      if (data) {
        const rawData = data as any;

        // Mapeo directo del JSONB. Asumimos que la estructura guardada es compatible.
        const jsonItems = rawData.items || [];
        const mappedItems: OrderItem[] = Array.isArray(jsonItems)
          ? jsonItems.map((item: any) => ({
            name: item.name || 'Producto sin nombre',
            qty: Number(item.qty || item.quantity || 0),
            price: Number(item.price || item.unit_price || 0)
          }))
          : [];

        // Manejo del cliente (array vs objeto) y corrección de phones
        const rawClient = Array.isArray(rawData.clients) ? rawData.clients[0] : rawData.clients;

        const mappedClient = {
          name: rawClient?.name || 'Sin nombre',
          address: rawClient?.address || 'Sin dirección',
          phone: rawClient?.phones || 'Sin teléfono'
        };

        const formattedOrder: OrderDetail = {
          id: rawData.id,
          client_id: rawData.client_id,
          seller_id: rawData.seller_id,
          visit_id: rawData.visit_id,
          total_amount: rawData.total_amount,
          status: rawData.status,
          created_at: rawData.created_at,
          clients: mappedClient,
          items: mappedItems,
          visits: Array.isArray(rawData.visits) ? rawData.visits[0] : rawData.visits,
        };

        setOrder(formattedOrder);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: { bg: '#FEF9C3', color: '#854D0E', label: 'Pendiente', icon: 'time-outline' },
    delivered: { bg: '#DCFCE7', color: '#166534', label: 'Entregado', icon: 'checkmark-circle' },
    cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado', icon: 'close-circle' },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2a8c4a" />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Pedido no encontrado</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;

  const orderDate = new Date(order.created_at).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const orderTime = new Date(order.created_at).toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del Pedido</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Order ID y Status */}
        <View style={styles.card}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdLabel}>Pedido</Text>
            <Text style={styles.orderIdValue}>#{order.id.toString().slice(0, 8)}</Text>
          </View>
          <View style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={24} color={status.color} />
            <Text style={[styles.statusTextLarge, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.dateText}>{orderDate} • {orderTime}</Text>
          </View>
        </View>

        {/* Cliente Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <View style={styles.clientInfo}>
            <View style={styles.clientRow}>
              <Ionicons name="person-outline" size={20} color="#2a8c4a" />
              <Text style={styles.clientText}>{order.clients.name}</Text>
            </View>
            <View style={styles.clientRow}>
              <Ionicons name="call-outline" size={20} color="#2a8c4a" />
              <Text style={styles.clientText}>{order.clients.phone}</Text>
            </View>
            <View style={styles.clientRow}>
              <Ionicons name="location-outline" size={20} color="#2a8c4a" />
              <Text style={styles.clientText}>{order.clients.address}</Text>
            </View>
          </View>
        </View>

        {/* Información de Visita (Renderizado Condicional) */}
        {order.visits && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información de Visita</Text>
            <View style={styles.clientInfo}>
              <View style={styles.clientRow}>
                <Ionicons name="time-outline" size={20} color="#3B82F6" />
                <Text style={styles.clientText}>
                  Duración: {order.visits.duration_seconds
                    ? `${Math.floor(order.visits.duration_seconds / 60)}m ${order.visits.duration_seconds % 60}s`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.clientRow}>
                <Ionicons
                  name={
                    order.visits.outcome === 'sale' ? 'checkmark-circle-outline' :
                      order.visits.outcome === 'no_sale' ? 'close-circle-outline' :
                        'lock-closed-outline'
                  }
                  size={20}
                  color={
                    order.visits.outcome === 'sale' ? '#10B981' :
                      order.visits.outcome === 'no_sale' ? '#F59E0B' :
                        '#6B7280'
                  }
                />
                <Text style={styles.clientText}>
                  Resultado: {
                    order.visits.outcome === 'sale' ? 'Venta' :
                      order.visits.outcome === 'no_sale' ? 'Sin Venta' :
                        'Cerrado'
                  }
                </Text>
              </View>
              {order.visits.notes && (
                <View style={styles.notesContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                  <Text style={styles.notesText}>{order.visits.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Items del pedido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productos</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item: OrderItem, index: number) => {
              const itemTotal = item.qty * item.price;

              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>
                      {item.qty} x Bs {item.price.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>Bs {itemTotal.toFixed(2)}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noItemsText}>No hay productos en este pedido</Text>
          )}

          {/* Total */}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>Bs {order.total_amount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderIdLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderIdValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  clientInfo: {
    gap: 12,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  noItemsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a8c4a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 15,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2a8c4a',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});