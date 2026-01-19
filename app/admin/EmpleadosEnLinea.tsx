import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

interface EmployeeOnline {
  id: string;
  full_name: string;
  job_title: string;
  role: string;
  location: any;
  created_at: string;
  lat: number | null;
  lng: number | null;
  lastUpdate: string;
}

export default function EmpleadosEnLineaScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOnline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOnlineEmployees();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      fetchOnlineEmployees(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchOnlineEmployees = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Obtener empleados activos que tienen ubicación (GPS activado)
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, job_title, role, location, created_at')
        .eq('status', 'active')
        .not('location', 'is', null)
        .order('full_name');

      if (error) {

        Alert.alert('Error', 'No se pudieron cargar los empleados en línea');
        return;
      }

      if (data) {
        // Procesar ubicaciones
        const processed = data.map((emp: any) => {
          let lat = null;
          let lng = null;

          if (emp.location) {
            // GeoJSON format
            if (emp.location.coordinates && Array.isArray(emp.location.coordinates)) {
              lng = emp.location.coordinates[0];
              lat = emp.location.coordinates[1];
            }
            // WKT string format
            else if (typeof emp.location === 'string' && emp.location.includes('POINT(')) {
              const match = emp.location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
              if (match) {
                lng = parseFloat(match[1]);
                lat = parseFloat(match[2]);
              }
            }
          }

          // Calcular tiempo desde última actualización
          const lastUpdate = emp.created_at 
            ? new Date(emp.created_at).toLocaleString('es-BO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Desconocido';

          return {
            ...emp,
            lat,
            lng,
            lastUpdate,
          };
        });

        setEmployees(processed);

      }
    } catch (error) {

      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOnlineEmployees();
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    return name.substring(0, 2);
  };

  const getStatusColor = () => {
    return '#10B981'; // Verde para en línea
  };

  const renderEmployeeCard = ({ item }: { item: EmployeeOnline }) => {
    const hasLocation = item.lat !== null && item.lng !== null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName}>{item.full_name}</Text>
            <Text style={styles.employeeRole}>{item.job_title || item.role}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>En línea</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="navigate-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Ubicación GPS:</Text>
            {hasLocation ? (
              <Text style={styles.infoValue}>
                {item.lat?.toFixed(6)}, {item.lng?.toFixed(6)}
              </Text>
            ) : (
              <Text style={[styles.infoValue, { color: '#EF4444' }]}>Sin ubicación</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <Text style={styles.infoLabel}>Última actualización:</Text>
            <Text style={styles.infoValue}>{item.lastUpdate}</Text>
          </View>
        </View>

        {hasLocation && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Navegar al mapa centrado en este empleado
                router.push('/(tabs)/map');
                // TODO: Implementar centrado en el empleado específico
              }}
            >
              <Ionicons name="map-outline" size={18} color="#2a8c4a" />
              <Text style={styles.actionButtonText}>Ver en Mapa</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2a8c4a" />
          <Text style={styles.loadingText}>Cargando empleados en línea...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Empleados en Línea</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => fetchOnlineEmployees()}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={32} color="#10B981" />
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>En Línea</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="navigate" size={32} color="#3B82F6" />
          <Text style={styles.statValue}>
            {employees.filter(e => e.lat && e.lng).length}
          </Text>
          <Text style={styles.statLabel}>Con GPS</Text>
        </View>
      </View>

      {/* Lista de empleados */}
      {employees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No hay empleados en línea</Text>
          <Text style={styles.emptyText}>
            Los empleados aparecerán aquí cuando activen su ubicación GPS
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployeeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2a8c4a']}
              tintColor="#2a8c4a"
            />
          }
        />
      )}
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  employeeRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
