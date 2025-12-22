import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface Order {
  id: string;
  client_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  clients: {
    name: string;
  };
}

export default function HomeScreen() {
  const { session, jobTitle, isAdmin } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingCount: 0,
    deliveredCount: 0,
  });

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario";

  // Función para cargar pedidos desde Supabase
  const fetchOrders = async () => {
    try {
      if (!session?.user) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('pedidos_auxiliares')
        .select(`
          id,
          client_id,
          total_amount,
          status,
          created_at,
          clients:client_id (
            name
          )
        `)
        .eq('seller_id', session.user.id)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error cargando pedidos:', error);
        return;
      }

      if (data) {
        // Supabase devuelve un objeto cuando usas client_id (no un array)
        const ordersWithClients = data.map(order => ({
          ...order,
          clients: Array.isArray(order.clients) ? order.clients[0] : order.clients
        }));
        
        setOrders(ordersWithClients as Order[]);
        
        // Calcular estadísticas del día
        const totalSales = data.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const pendingCount = data.filter(o => o.status === 'pending').length;
        const deliveredCount = data.filter(o => o.status === 'delivered').length;
        
        setStats({
          totalSales,
          pendingCount,
          deliveredCount,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [session])
  ); 

  return (
    <View style={styles.container}>
      {/* --- HEADER ROJO --- */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <MaterialCommunityIcons name="store" size={24} color="#fff" style={{marginRight: 8}}/>
               <Text style={styles.headerTitle}>Tiendas Móvil</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userRole}>{jobTitle || "Empleado"}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Espacio para que no lo tape el TabBar
      >
        
        {/* --- RESUMEN DEL DÍA (Tarjeta Flotante) --- */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Resumen del Día</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#2a8c4a" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#E0F2F1' }]}>
                  <Ionicons name="trending-up" size={20} color="#009688" />
                </View>
                <Text style={styles.statLabel}>Ventas</Text>
                <Text style={styles.statValue}>Bs {stats.totalSales.toFixed(2)}</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="clipboard-outline" size={20} color="#EF5350" />
                </View>
                <Text style={styles.statLabel}>Pendientes</Text>
                <Text style={styles.statValue}>{stats.pendingCount}</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#42A5F5" />
                </View>
                <Text style={styles.statLabel}>Entregados</Text>
                <Text style={styles.statValue}>{stats.deliveredCount}</Text>
              </View>
            </View>
          )}
        </View>

        {/* --- ACCIONES RÁPIDAS --- */}
        <Text style={styles.sectionHeader}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          
          {/* Botón 1: Empleados - Solo para Administradores */}
          {isAdmin && (
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/admin/Empleados' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#2a8c4a' }]}>
                <Ionicons name="people" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Empleados</Text>
            </TouchableOpacity>
          )}

          {/* Botón 2: Ver Clientes */}
          <TouchableOpacity style={styles.actionCard}
          onPress={() => router.push('/clients/clients' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Ver Clientes</Text>
          </TouchableOpacity>

          {/* Botón 3: Rutas */}
          <TouchableOpacity style={styles.actionCard}
           onPress={() => router.push('/map' as any)}
           >
            <View style={[styles.actionIcon, { backgroundColor: '#64c27b' }]}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Rutas</Text>
          </TouchableOpacity>

          {/* Botón 4: Inventario */}
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#9333EA' }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Inventario</Text>
          </TouchableOpacity>
        </View>

        {/* --- ÚLTIMOS PEDIDOS --- */}
        <Text style={styles.sectionHeader}>Últimos Pedidos</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay pedidos hoy</Text>
            <Text style={styles.emptySubtext}>Los pedidos que crees aparecerán aquí</Text>
          </View>
        ) : (
          orders.map((order) => {
            if (!order) return null;
            
            const statusConfig = {
              pending: { bg: '#FEF9C3', color: '#854D0E', label: 'Pendiente' },
              delivered: { bg: '#DCFCE7', color: '#166534', label: 'Entregado' },
              cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado' },
            };
            
            const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
            
            // Manejo seguro de la relación con cliente
            let clientName = 'Cliente sin nombre';
            if (order.clients) {
              if (typeof order.clients === 'object' && 'name' in order.clients) {
                clientName = order.clients.name || 'Cliente sin nombre';
              }
            }
            
            const orderTime = new Date(order.created_at).toLocaleTimeString('es-BO', {
              hour: '2-digit',
              minute: '2-digit',
            });
            
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{order.id.toString().slice(0, 8)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={styles.orderRow}>
                  <Text style={styles.clientName}>{clientName}</Text>
                  <Text style={styles.orderAmount}>Bs {order.total_amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.orderTime}>{orderTime}</Text>
              </View>
            );
          }).filter(Boolean)
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Gris muy claro de fondo
  },
  header: {
    backgroundColor: '#2a8c4a', // Verde corporativo
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationBtn: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444', // Rojo más claro o amarillo
    borderWidth: 1.5,
    borderColor: '#2a8c4a',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#2a8c4a',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#FECACA', // Rojo muy claro
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -25, // Para que la tarjeta se superponga al header
  },
  
  // --- CARD RESUMEN ---
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
  },

  // --- GRID DE ACCIONES ---
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  actionCard: {
    backgroundColor: '#fff',
    width: '48%', // Casi la mitad
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // --- LISTA DE PEDIDOS ---
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2a8c4a', // Detalle estético
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontWeight: 'bold',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});