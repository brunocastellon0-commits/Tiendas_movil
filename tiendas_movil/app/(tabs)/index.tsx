import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext'; // Para obtener datos reales del usuario
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { session, jobTitle, isAdmin } = useAuth();
  const router = useRouter();
  
  // Obtenemos el nombre del usuario o usamos uno por defecto
  const userName = session?.user?.user_metadata?.full_name || "Usuario"; 

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
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="trending-up" size={20} color="#009688" />
              </View>
              <Text style={styles.statLabel}>Ventas</Text>
              <Text style={styles.statValue}>$45.250</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="clipboard-outline" size={20} color="#EF5350" />
              </View>
              <Text style={styles.statLabel}>Pendientes</Text>
              <Text style={styles.statValue}>8</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="map-outline" size={20} color="#42A5F5" />
              </View>
              <Text style={styles.statLabel}>Rutas</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
          </View>
        </View>

        {/* --- ACCIONES RÁPIDAS --- */}
        <Text style={styles.sectionHeader}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          
          {/* Botón 1: Registrar Empleado - Solo para Administradores */}
          {isAdmin && (
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/admin/RegistrarEmpleado' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DC2626' }]}>
                <Ionicons name="person-add" size={24} color="#fff" />
              </View>
              <Text style={styles.actionText}>Registrar Empleado</Text>
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
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: '#2563EB' }]}>
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
        
        {/* Item de Lista 1 */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>#12345</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.statusText, { color: '#166534' }]}>Entregado</Text>
            </View>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.clientName}>Tienda El Sol</Text>
            <Text style={styles.orderAmount}>$2500</Text>
          </View>
          <Text style={styles.orderTime}>09:30 AM</Text>
        </View>

        {/* Item de Lista 2 */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>#12344</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#FEF9C3' }]}>
              <Text style={[styles.statusText, { color: '#854D0E' }]}>Pendiente</Text>
            </View>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.clientName}>Minisuper López</Text>
            <Text style={styles.orderAmount}>$4200</Text>
          </View>
          <Text style={styles.orderTime}>08:15 AM</Text>
        </View>

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
    backgroundColor: '#DC2626', // Rojo corporativo
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
    borderColor: '#DC2626',
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
    color: '#DC2626',
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
    borderLeftColor: '#DC2626', // Detalle estético
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
});