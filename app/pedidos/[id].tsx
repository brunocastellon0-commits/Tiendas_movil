import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
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
  tipo_pago?: string;
  numero_documento?: string;
  observacion?: string;
  items: OrderItem[];
  clients: {
    name: string;
    phone: string;
    address: string;
  };
  visits: VisitInfo | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { bg: '#FEF9C3', color: '#854D0E', label: 'Pendiente',  icon: 'time-outline',          gradFrom: '#F59E0B', gradTo: '#D97706' },
  Pendiente: { bg: '#FEF9C3', color: '#854D0E', label: 'Pendiente',  icon: 'time-outline',          gradFrom: '#F59E0B', gradTo: '#D97706' },
  delivered: { bg: '#DCFCE7', color: '#166534', label: 'Entregado',  icon: 'checkmark-circle',      gradFrom: '#22C55E', gradTo: '#16A34A' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado',  icon: 'close-circle',          gradFrom: '#EF4444', gradTo: '#DC2626' },
} as const;

const OUTCOME_CONFIG = {
  sale:    { label: 'Venta',     color: '#10B981', icon: 'checkmark-circle-outline' },
  no_sale: { label: 'Sin Venta', color: '#F59E0B', icon: 'close-circle-outline'    },
  closed:  { label: 'Cerrado',   color: '#6B7280', icon: 'lock-closed-outline'     },
  pending: { label: 'En curso',  color: '#3B82F6', icon: 'time-outline'            },
} as const;

const fmtDuration = (sec: number | null) => {
  if (!sec) return 'N/A';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrderDetail(); }, [id]);

  const fetchOrderDetail = async () => {
    try {
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
          clients:client_id ( name, phones, address ),
          visits:visit_id ( id, start_time, end_time, duration_seconds, outcome, notes )
        `)
        .eq('id', id)
        .single();

      // También intentamos traer número de documento / tipo_pago / observación
      // de la tabla real de pedidos si existe un match por id
      const { data: pedidoData } = await supabase
        .from('pedidos')
        .select('numero_documento, tipo_pago, observacion')
        .eq('id', id)
        .maybeSingle();

      if (error) { Alert.alert('Error', 'No se pudo cargar el pedido'); return; }

      if (data) {
        const raw = data as any;
        const jsonItems = raw.items || [];
        const mappedItems: OrderItem[] = Array.isArray(jsonItems)
          ? jsonItems.map((i: any) => ({
              name:  i.name  || 'Producto',
              qty:   Number(i.qty   || i.quantity   || 0),
              price: Number(i.price || i.unit_price || 0),
            }))
          : [];

        const rawClient = Array.isArray(raw.clients) ? raw.clients[0] : raw.clients;

        setOrder({
          id: raw.id,
          client_id:       raw.client_id,
          seller_id:       raw.seller_id,
          visit_id:        raw.visit_id,
          total_amount:    raw.total_amount,
          status:          raw.status,
          created_at:      raw.created_at,
          tipo_pago:       pedidoData?.tipo_pago,
          numero_documento: pedidoData?.numero_documento,
          observacion:     pedidoData?.observacion,
          clients: {
            name:    rawClient?.name    || 'Sin nombre',
            address: rawClient?.address || 'Sin dirección',
            phone:   rawClient?.phones  || '',
          },
          items:  mappedItems,
          visits: Array.isArray(raw.visits) ? raw.visits[0] : raw.visits,
        });
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando pedido...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.textMain }]}>Pedido no encontrado</Text>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.brandGreen }]} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusKey = order.status as keyof typeof STATUS_CONFIG;
  const st = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const visit = order.visits;
  const outcomeKey = (visit?.outcome ?? 'pending') as keyof typeof OUTCOME_CONFIG;
  const oc = OUTCOME_CONFIG[outcomeKey] ?? OUTCOME_CONFIG.pending;

  const orderDate = new Date(order.created_at).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const orderTime = new Date(order.created_at).toLocaleTimeString('es-BO', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HEADER CON GRADIENTE ── */}
      <LinearGradient
        colors={[colors.brandGreen, '#1e6b38']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalle del Pedido</Text>
            <TouchableOpacity onPress={fetchOrderDetail} style={styles.iconBtn}>
              <Ionicons name="reload" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Badge de estado en el header */}
          <View style={styles.headerStatusRow}>
            <View style={[styles.headerStatusBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name={st.icon as any} size={15} color="#FFF" />
              <Text style={styles.headerStatusText}>{st.label}</Text>
            </View>
            <Text style={styles.headerOrderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── CONTENIDO ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── CARD: DATOS DEL PEDIDO ── */}
        <View style={[styles.formSheet, {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }]}>
          <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>DATOS DEL PEDIDO</Text>

          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.fieldCaption, { color: colors.textSub }]}>NRO. DOC</Text>
              <Text style={[styles.fieldValue, { color: colors.textMain }]}>
                {order.numero_documento || 'S/N'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fieldCaption, { color: colors.textSub }]}>FECHA</Text>
              <Text style={[styles.fieldValue, { color: colors.textMain }]}>{orderDate}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />

          <View style={styles.rowBetween}>
            {/* Estado */}
            <View>
              <Text style={[styles.fieldCaption, { color: colors.textSub }]}>ESTADO</Text>
              <View style={[styles.statePill, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon as any} size={13} color={st.color} />
                <Text style={[styles.statePillText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            {/* Tipo de pago */}
            {order.tipo_pago && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>TIPO DE PAGO</Text>
                <View style={[styles.statePill, {
                  backgroundColor: order.tipo_pago === 'Crédito'
                    ? (isDark ? 'rgba(37,99,235,0.2)' : '#EFF6FF')
                    : (isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4'),
                }]}>
                  <MaterialCommunityIcons
                    name={order.tipo_pago === 'Crédito' ? 'credit-card-outline' : 'cash'}
                    size={13}
                    color={order.tipo_pago === 'Crédito' ? '#2563EB' : colors.brandGreen}
                  />
                  <Text style={[styles.statePillText, {
                    color: order.tipo_pago === 'Crédito' ? '#2563EB' : colors.brandGreen,
                  }]}>
                    {order.tipo_pago}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />

          <View style={[styles.dateRow, { justifyContent: 'flex-start', gap: 6 }]}>
            <Ionicons name="time-outline" size={14} color={colors.textSub} />
            <Text style={[styles.fieldCaption, { color: colors.textSub, marginBottom: 0 }]}>
              {orderDate} • {orderTime}
            </Text>
          </View>
        </View>

        {/* ── CARD: CLIENTE ── */}
        <View style={[styles.formSheet, {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }]}>
          <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>CLIENTE</Text>

          <View style={styles.clientRow}>
            <View style={[styles.clientIcon, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4' }]}>
              <Ionicons name="person" size={18} color={colors.brandGreen} />
            </View>
            <Text style={[styles.clientName, { color: colors.textMain }]}>{order.clients.name}</Text>
          </View>

          {order.clients.phone ? (
            <TouchableOpacity
              style={styles.clientRow}
              onPress={() => Linking.openURL(`tel:${order.clients.phone}`)}
            >
              <View style={[styles.clientIcon, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4' }]}>
                <Ionicons name="call" size={18} color={colors.brandGreen} />
              </View>
              <Text style={[styles.clientName, { color: colors.brandGreen }]}>{order.clients.phone}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.clientRow}>
            <View style={[styles.clientIcon, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4' }]}>
              <Ionicons name="location" size={18} color={colors.brandGreen} />
            </View>
            <Text style={[styles.clientName, { color: colors.textMain }]}>{order.clients.address}</Text>
          </View>
        </View>

        {/* ── CARD: VISITA (si existe) ── */}
        {visit && (
          <View style={[styles.formSheet, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <Text style={[styles.sectionLabel, { color: '#3B82F6' }]}>INFORMACIÓN DE VISITA</Text>

            <View style={styles.visitGrid}>
              <View style={[styles.visitCell, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                <Ionicons name="time-outline" size={18} color="#3B82F6" style={{ marginBottom: 4 }} />
                <Text style={[styles.visitCellLabel, { color: colors.textSub }]}>DURACIÓN</Text>
                <Text style={[styles.visitCellValue, { color: colors.textMain }]}>
                  {fmtDuration(visit.duration_seconds)}
                </Text>
              </View>

              <View style={[styles.visitCell, { backgroundColor: isDark ? `${oc.color}22` : `${oc.color}18` }]}>
                <Ionicons name={oc.icon as any} size={18} color={oc.color} style={{ marginBottom: 4 }} />
                <Text style={[styles.visitCellLabel, { color: colors.textSub }]}>RESULTADO</Text>
                <Text style={[styles.visitCellValue, { color: oc.color }]}>{oc.label}</Text>
              </View>
            </View>

            {visit.notes && (
              <View style={[styles.notesBox, { backgroundColor: isDark ? colors.inputBg : '#F9FAFB', borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSub} />
                <Text style={[styles.notesText, { color: colors.textMain }]}>{visit.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── CARD: PRODUCTOS ── */}
        <View style={[styles.formSheet, {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }]}>
          <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>
            PRODUCTOS ({order.items.length})
          </Text>

          {/* Cabecera tabla */}
          <View style={[styles.tableHeader, {
            backgroundColor: isDark ? colors.inputBg : '#F9FAFB',
            borderBottomColor: isDark ? '#444' : '#E5E7EB',
          }]}>
            <Text style={[styles.th, { flex: 3, color: colors.textSub }]}>PRODUCTO</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center', color: colors.textSub }]}>CANT.</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right', color: colors.textSub }]}>SUBTOTAL</Text>
          </View>

          {order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: isDark ? '#333' : '#F3F4F6',
                    backgroundColor: index % 2 !== 0
                      ? (isDark ? colors.inputBg : '#F9FAFB')
                      : colors.cardBg,
                  },
                ]}
              >
                <View style={{ flex: 3 }}>
                  <Text style={[styles.cellName, { color: colors.textMain }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cellPrice, { color: colors.textSub }]}>
                    Bs {item.price.toFixed(2)} c/u
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.cellQty, { color: colors.textMain }]}>{item.qty}</Text>
                </View>
                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                  <Text style={[styles.cellTotal, { color: colors.brandGreen }]}>
                    Bs {(item.qty * item.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyItems}>
              <Ionicons name="cube-outline" size={32} color={colors.textSub} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSub }]}>Sin productos</Text>
            </View>
          )}

          {/* Totalizador */}
          <View style={[styles.totalsSection, { borderTopColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSub }]}>SUBTOTAL</Text>
              <Text style={[styles.totalValue, { color: colors.textMain }]}>
                Bs {order.items.reduce((s, i) => s + i.qty * i.price, 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabelFinal, { color: colors.textMain }]}>TOTAL</Text>
              <Text style={[styles.totalValueFinal, { color: colors.brandGreen }]}>
                Bs {order.total_amount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Observaciones */}
          {order.observacion && (
            <View style={[styles.notesBox, {
              backgroundColor: isDark ? colors.inputBg : '#F9FAFB',
              borderColor: isDark ? colors.cardBorder : '#E5E7EB',
              marginTop: 12,
            }]}>
              <Ionicons name="chatbox-outline" size={16} color={colors.textSub} />
              <Text style={[styles.notesText, { color: colors.textMain }]}>{order.observacion}</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos — misma tokens que NuevoPedido
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorTitle:  { fontSize: 18, fontWeight: '600', marginTop: 15, marginBottom: 20 },
  backBtn:     { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Header
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerContent: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  headerStatusText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  headerOrderId:    { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },

  scrollView: { flex: 1, marginTop: 8 },

  // Cards
  formSheet: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 14,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldCaption: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  fieldValue:   { fontSize: 14, fontWeight: '700' },
  divider:      { height: 1, marginVertical: 12 },
  dateRow:      { flexDirection: 'row', alignItems: 'center' },

  // Estado pill
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 6,
  },
  statePillText: { fontSize: 12, fontWeight: '700' },

  // Cliente
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  clientIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  clientName: { fontSize: 14, fontWeight: '600', flex: 1 },

  // Visita
  visitGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  visitCell:  {
    flex: 1, borderRadius: 14, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  visitCellLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  visitCellValue: { fontSize: 16, fontWeight: '800' },

  // Notas
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 10, padding: 12, borderWidth: 1,
  },
  notesText: { fontSize: 13, flex: 1, lineHeight: 20 },

  // Tabla productos
  tableHeader: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 2, borderBottomWidth: 1,
  },
  th:        { fontSize: 10, fontWeight: '800' },
  tableRow:  {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  cellName:  { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  cellPrice: { fontSize: 10, marginTop: 1 },
  cellQty:   { fontSize: 15, fontWeight: '700' },
  cellTotal: { fontSize: 13, fontWeight: '700' },
  emptyItems:{ padding: 30, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13 },

  // Totalizador
  totalsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1.5 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  totalLabel:      { fontSize: 11, fontWeight: '700' },
  totalValue:      { fontSize: 14, fontWeight: '700' },
  totalLabelFinal: { fontSize: 14, fontWeight: '900' },
  totalValueFinal: { fontSize: 22, fontWeight: '800' },
});