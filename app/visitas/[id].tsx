import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

function parseGeoPoint(value: any): { lat: number | null; lng: number | null } {
  if (!value) return { lat: null, lng: null };
  try {
    if (typeof value === 'string') {
      const m = value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
    }
  } catch (_) { }
  return { lat: null, lng: null };
}

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
  check_in_location: any;
  check_out_location: any;
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
  const { colors, isDark } = useTheme();

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado para el modal de mensaje (1 segundo)
  const [toast, setToast] = useState({ visible: false, text: '', isError: false });

  const showToast = (text: string, isError = false) => {
    setToast({ visible: true, text, isError });
    setTimeout(() => {
      setToast({ visible: false, text: '', isError: false });
    }, 1000); // Exactamente 1 segundo
  };

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
          check_in_location,
          check_out_location,
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
        showToast('No se pudo cargar el detalle', true);
        return;
      }

      if (data) {
        const rawData = data as any;
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
          check_in_location: rawData.check_in_location,
          check_out_location: rawData.check_out_location,
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
      showToast('Ocurrió un error inesperado', true);
    } finally {
      setLoading(false);
    }
  };

  const outcomeConfig = {
    sale: { 
      bg: isDark ? 'rgba(22, 101, 52, 0.2)' : '#DCFCE7', 
      color: isDark ? '#4ade80' : '#166534', 
      label: 'Venta Realizada', 
      icon: 'checkmark-circle' 
    },
    no_sale: { 
      bg: isDark ? 'rgba(133, 77, 14, 0.2)' : '#FEF9C3', 
      color: isDark ? '#facc15' : '#854D0E', 
      label: 'Sin Venta', 
      icon: 'close-circle' 
    },
    closed: { 
      bg: isDark ? 'rgba(153, 27, 27, 0.2)' : '#FEE2E2', 
      color: isDark ? '#f87171' : '#991B1B', 
      label: 'Tienda Cerrada', 
      icon: 'lock-closed' 
    },
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando visita...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.textMain }]}>Visita no encontrada</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.brandGreen }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver al Mapa</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const outcome = outcomeConfig[visit.outcome] || outcomeConfig.no_sale;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-BO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-BO', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const renderMap = () => {
    if (!visit) return null;
    const locIn = parseGeoPoint(visit.check_in_location);
    const locOut = parseGeoPoint(visit.check_out_location);
    const centerLat = locIn.lat || locOut.lat || -17.3895;
    const centerLng = locIn.lng || locOut.lng || -66.1568;

    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;padding:0;}#map{width:100%;height:100vh;}
.custom-marker { background: ${colors.brandGreen}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4); text-align: center; color: white; line-height: 24px; font-size: 12px; font-weight: bold; }
${isDark ? `
.leaflet-popup-content-wrapper, .leaflet-popup-tip { background: #1c1c1e !important; color: #f3f4f6 !important; }
.leaflet-popup-content b { color: #f9fafb !important; }
` : ''}
</style></head><body><div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false}).setView([${centerLat}, ${centerLng}], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'',maxZoom:19}).addTo(map);
var iconIn = L.divIcon({className: 'custom-marker', html: 'A', iconSize: [24,24]});
var iconOut = L.divIcon({className: 'custom-marker', html: 'B', iconSize: [24,24]});
${locIn.lat ? `L.marker([${locIn.lat}, ${locIn.lng}], {icon: iconIn}).addTo(map).bindPopup("<b>Inicio de Visita</b>").openPopup();` : ''}
${locOut.lat ? `L.marker([${locOut.lat}, ${locOut.lng}], {icon: iconOut}).addTo(map).bindPopup("<b>Fin de Visita</b>");` : ''}
</script></body></html>`;

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
        <Text style={[styles.cardTitle, { color: colors.textMain }]}>Ubicación GPS</Text>
        <View style={[styles.mapBorder, { backgroundColor: isDark ? colors.inputBg : '#f3f4f6' }]}>
          <WebView source={{ html }} style={styles.mapView} scrollEnabled={false} pointerEvents="none" />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header Curvo Dinámico */}
      <LinearGradient
        colors={[colors.brandGreen, '#166534']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de la Visita</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Visit ID y Outcome */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
          <View style={styles.visitIdRow}>
            <Text style={[styles.visitIdLabel, { color: colors.textSub }]}>Visita</Text>
            <Text style={[styles.visitIdValue, { color: colors.textMain }]}>#{visit.id}</Text>
          </View>
          <View style={[styles.outcomeBadgeLarge, { backgroundColor: outcome.bg }]}>
            <Ionicons name={outcome.icon as any} size={24} color={outcome.color} />
            <Text style={[styles.outcomeTextLarge, { color: outcome.color }]}>
              {outcome.label}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSub} />
            <Text style={[styles.dateText, { color: colors.textSub }]}>{formatDate(visit.start_time)}</Text>
          </View>
        </View>

        {/* Cliente Info */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.cardTitle, { color: colors.textMain }]}>Cliente</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={colors.brandGreen} />
              <Text style={[styles.infoText, { color: colors.textMain }]}>{visit.clients.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={colors.brandGreen} />
              <Text style={[styles.infoText, { color: colors.textMain }]}>{visit.clients.phones}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={colors.brandGreen} />
              <Text style={[styles.infoText, { color: colors.textMain }]}>{visit.clients.address}</Text>
            </View>
          </View>
        </View>

        {/* Vendedor Info */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.cardTitle, { color: colors.textMain }]}>Vendedor</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={20} color="#3B82F6" />
              <Text style={[styles.infoText, { color: colors.textMain }]}>{visit.empleados.full_name}</Text>
            </View>
          </View>
        </View>

        {/* Mapa de ubicación */}
        {(visit.check_in_location || visit.check_out_location) && renderMap()}

        {/* Información de Tiempo */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.cardTitle, { color: colors.textMain }]}>Información de Tiempo</Text>
          <View style={styles.infoGroup}>
            <View style={styles.infoRow}>
              <Ionicons name="log-in-outline" size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textSub }]}>Hora de Inicio</Text>
                <Text style={[styles.infoText, { color: colors.textMain }]}>{formatTime(visit.start_time)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textSub }]}>Hora de Finalización</Text>
                <Text style={[styles.infoText, { color: colors.textMain }]}>{formatTime(visit.end_time)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoLabel, { color: colors.textSub }]}>Duración Total</Text>
                <Text style={[styles.infoText, styles.durationText, { color: colors.brandGreen }]}>
                  {formatDuration(visit.duration_seconds)}
                </Text>
              </View>
            </View>
            {visit.gps_accuracy_meters !== null && (
              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={20} color={colors.textSub} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoLabel, { color: colors.textSub }]}>Precisión GPS</Text>
                  <Text style={[styles.infoText, { color: colors.textMain }]}>±{visit.gps_accuracy_meters.toFixed(1)}m</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notas */}
        {visit.notes && (
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, shadowColor: colors.shadowColor }]}>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>Notas</Text>
            <View style={[styles.notesContainer, { backgroundColor: isDark ? colors.inputBg : '#F3F4F6' }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.iconGray} />
              <Text style={[styles.notesText, { color: colors.textMain }]}>{visit.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- MODAL DE MENSAJE (1 SEGUNDO) --- */}
      <Modal transparent visible={toast.visible} animationType="fade">
        <View style={styles.toastOverlay}>
          <View style={[styles.toastCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <Ionicons name={toast.isError ? "alert-circle" : "checkmark-circle"} size={40} color={toast.isError ? "#EF4444" : colors.brandGreen} />
            <Text style={[styles.toastText, { color: colors.textMain }]}>{toast.text}</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    marginTop: -20, // Overlap effect
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  visitIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  visitIdLabel: { fontSize: 14 },
  visitIdValue: { fontSize: 18, fontWeight: 'bold' },
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
    marginLeft: 6,
  },
  infoGroup: { gap: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapBorder: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapView: { flex: 1 },
  // Modal Styles
  toastOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  toastCard: {
    width: '70%',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  toastText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});