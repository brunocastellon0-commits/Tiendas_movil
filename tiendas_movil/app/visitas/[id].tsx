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

interface VisitDetail {
  id: number;
  seller_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  outcome: 'sale' | 'no_sale' | 'closed';
  notes: string | null;
  gps_accuracy_meters: number | null;
  clients: {
    name: string;
    phones: string;
    address: string;
  };
  empleados: {
    full_name: string; 
  };
}

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitDetail();
  }, [id]);

  const fetchVisitDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          seller_id,
          client_id,
          start_time,
          end_time,
          duration_seconds,
          outcome,
          notes,
          gps_accuracy_meters,
          clients:client_id (
            name,
            phones,
            address
          ),
          empleados:seller_id (
            full_name 
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching visit:', error);
        Alert.alert('Error', 'No se pudo cargar el detalle de la visita');
        return;
      }

      if (data) {
        const rawData = data as any;
        
        // Manejo del cliente y empleado (array vs objeto)
        const rawClient = Array.isArray(rawData.clients) ? rawData.clients[0] : rawData.clients;
        const rawEmpleado = Array.isArray(rawData.empleados) ? rawData.empleados[0] : rawData.empleados;
        
        const formattedVisit: VisitDetail = {
          id: rawData.id,
          seller_id: rawData.seller_id,
          client_id: rawData.client_id,
          start_time: rawData.start_time,
          end_time: rawData.end_time,
          duration_seconds: rawData.duration_seconds,
          outcome: rawData.outcome,
          notes: rawData.notes,
          gps_accuracy_meters: rawData.gps_accuracy_meters,
          clients: {
            name: rawClient?.name || 'Sin nombre',
            address: rawClient?.address || 'Sin dirección',
            phones: rawClient?.phones || 'Sin teléfono'
          },
          empleados: {
          
            full_name: rawEmpleado?.full_name || 'Sin nombre' 
          }
        };

        setVisit(formattedVisit);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const outcomeConfig = {
    sale: { 
      bg: '#DCFCE7', 
      color: '#166534', 
      label: 'Venta Realizada', 
      icon: 'checkmark-circle' 
    },
    no_sale: { 
      bg: '#FEF9C3', 
      color: '#854D0E', 
      label: 'Sin Venta', 
      icon: 'close-circle' 
    },
    closed: { 
      bg: '#FEE2E2', 
      color: '#991B1B', 
      label: 'Tienda Cerrada', 
      icon: 'lock-closed' 
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2a8c4a" />
          <Text style={styles.loadingText}>Cargando visita...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Visita no encontrada</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const outcome = outcomeConfig[visit.outcome] || outcomeConfig.no_sale;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

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
            <Text style={styles.headerTitle}>Detalle de la Visita</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Visit ID y Outcome */}
        <View style={styles.card}>
          <View style={styles.visitIdRow}>
            <Text style={styles.visitIdLabel}>Visita</Text>
            <Text style={styles.visitIdValue}>#{visit.id}</Text>
          </View>
          <View style={[styles.outcomeBadgeLarge, { backgroundColor: outcome.bg }]}>
            <Ionicons name={outcome.icon as any} size={24} color={outcome.color} />
            <Text style={[styles.outcomeTextLarge, { color: outcome.color }]}>
              {outcome.label}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.dateText}>{formatDate(visit.start_time)}</Text>
          </View>
        </View>

        {/* Cliente Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#2a8c4a" />
              <Text style={styles.infoText}>{visit.clients.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#2a8c4a" />
              <Text style={styles.infoText}>{visit.clients.phones}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#2a8c4a" />
              <Text style={styles.infoText}>{visit.clients.address}</Text>
            </View>
          </View>
        </View>

        {/* Vendedor Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendedor</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={20} color="#3B82F6" />
              {/* CORRECCIÓN 4: Renderizamos full_name */}
              <Text style={styles.infoText}>{visit.empleados.full_name}</Text>
            </View>
          </View>
        </View>

        {/* Información de Tiempo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información de Tiempo</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="log-in-outline" size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Hora de Inicio</Text>
                <Text style={styles.infoText}>{formatTime(visit.start_time)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Hora de Finalización</Text>
                <Text style={styles.infoText}>{formatTime(visit.end_time)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Duración Total</Text>
                <Text style={[styles.infoText, styles.durationText]}>
                  {formatDuration(visit.duration_seconds)}
                </Text>
              </View>
            </View>
            {visit.gps_accuracy_meters !== null && (
              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={20} color="#6B7280" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.infoLabel}>Precisión GPS</Text>
                  <Text style={styles.infoText}>±{visit.gps_accuracy_meters.toFixed(1)}m</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notas */}
        {visit.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notas</Text>
            <View style={styles.notesContainer}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
              <Text style={styles.notesText}>{visit.notes}</Text>
            </View>
          </View>
        )}
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
  visitIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  visitIdLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  visitIdValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  outcomeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  outcomeTextLarge: {
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
  infoGroup: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a8c4a',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
});