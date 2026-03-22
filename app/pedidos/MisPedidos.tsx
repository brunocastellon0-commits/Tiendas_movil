import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

type DateFilter = 'hoy' | 'semana' | 'todo';

// --- INTERFACES ---
interface DetalleItem {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: {
    nombre_producto: string;
    codigo_producto: string;
  } | null;
}

interface Pedido {
  id: string;
  clients_id: string;
  total_venta: number;
  estado: string;
  crated_at: string;
  clients: {
    name: string;
    code: string;
  } | null;
}

const { width } = Dimensions.get('window');

export default function MisPedidos() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();

  // --- ESTADO PRINCIPAL ---
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVentas, setTotalVentas] = useState(0);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoy');

  // Notas locales por pedido: { [pedidoId]: string }
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Nota que se está editando en el modal
  const [modalNote, setModalNote] = useState('');

  // --- ESTADO DEL MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [saving, setSaving] = useState(false);
  // Mapa local de cantidades editadas: { [detalleId]: cantidad }
  const [editedQtys, setEditedQtys] = useState<Record<string, string>>({});

  // Colores del header
  const headerGradient = (isDark
    ? [colors.brandGreen, '#14532d']
    : ['#00D15B', '#077E4F']) as [string, string];

  // --- CARGA DE PEDIDOS ---
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      if (!session?.user) return;

      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('id', session.user.id)
        .single();

      const empId = empData?.id ?? session.user.id;
      setEmpleadoId(empId);

      // Calcular rango de fechas según filtro
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      let fromDate = `${today}T00:00:00`;
      if (dateFilter === 'semana') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        fromDate = weekAgo.toISOString();
      }

      let query = supabase
        .from('pedidos')
        .select(`
          id,
          clients_id,
          total_venta,
          estado,
          crated_at,
          clients:clients_id (name, code)
        `)
        .eq('empleado_id', empId)
        .order('crated_at', { ascending: false });

      if (dateFilter !== 'todo') {
        query = query.gte('crated_at', fromDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando pedidos:', error);
        return;
      }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        clients: Array.isArray(p.clients) ? p.clients[0] : p.clients,
      })) as Pedido[];

      setPedidos(mapped);
      setTotalVentas(mapped.reduce((sum, p) => sum + (p.total_venta || 0), 0));
    } catch (e) {
      console.error('Error general:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchPedidos();
  }, [session, dateFilter]));

  // --- ABRIR MODAL Y CARGAR DETALLES ---
  const openModal = async (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setModalVisible(true);
    setLoadingDetalles(true);
    setDetalles([]);
    setEditedQtys({});
    // Cargar la nota guardada para este pedido
    setModalNote(notes[pedido.id] || '');

    try {
      const { data, error } = await supabase
        .from('detalle_pedido')
        .select(`
          id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
          productos:producto_id (nombre_producto, codigo_producto)
        `)
        .eq('pedido_id', pedido.id);

      if (error) {
        Alert.alert('Error', 'No se pudo cargar el detalle del pedido');
        return;
      }

      const mappedDetalles = (data || []).map((d: any) => ({
        ...d,
        productos: Array.isArray(d.productos) ? d.productos[0] : d.productos,
      })) as DetalleItem[];

      setDetalles(mappedDetalles);

      // Inicializar el mapa de cantidades editables
      const initialQtys: Record<string, string> = {};
      mappedDetalles.forEach(d => {
        initialQtys[d.id] = d.cantidad.toString();
      });
      setEditedQtys(initialQtys);
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoadingDetalles(false);
    }
  };

  const closeModal = () => {
    // Guardar nota local al cerrar
    if (selectedPedido && modalNote.trim()) {
      setNotes(prev => ({ ...prev, [selectedPedido.id]: modalNote.trim() }));
    } else if (selectedPedido && !modalNote.trim()) {
      setNotes(prev => { const n = { ...prev }; delete n[selectedPedido.id]; return n; });
    }
    setModalVisible(false);
    setSelectedPedido(null);
    setDetalles([]);
    setEditedQtys({});
    setModalNote('');
  };

  // --- CÁLCULO DEL TOTAL EN TIEMPO REAL ---
  const calcularTotalModal = () => {
    return detalles.reduce((sum, d) => {
      const qty = parseFloat(editedQtys[d.id] || '0') || 0;
      return sum + qty * d.precio_unitario;
    }, 0);
  };

  // --- GUARDAR CAMBIOS ---
  const guardarCambios = async () => {
    if (!selectedPedido) return;
    setSaving(true);

    try {
      // Actualizar cada línea de detalle
      for (const detalle of detalles) {
        const nuevaCantidad = parseFloat(editedQtys[detalle.id] || '0') || 0;
        const nuevoSubtotal = nuevaCantidad * detalle.precio_unitario;

        const { error } = await supabase
          .from('detalle_pedido')
          .update({
            cantidad: nuevaCantidad,
            subtotal: nuevoSubtotal,
          })
          .eq('id', detalle.id);

        if (error) throw error;
      }

      // Actualizar el total_venta del pedido
      const nuevoTotal = calcularTotalModal();
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ total_venta: nuevoTotal })
        .eq('id', selectedPedido.id);

      if (pedidoError) throw pedidoError;

      Alert.alert('¡Éxito!', 'Pedido actualizado correctamente');
      closeModal();
      fetchPedidos(); // Refrescar la lista
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el pedido');
    } finally {
      setSaving(false);
    }
  };

  // --- HELPERS DE UI ---
  const getEstadoConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pagado':
      case 'delivered':
        return { color: '#16A34A', bg: isDark ? 'rgba(22,163,74,0.18)' : '#DCFCE7', label: 'Pagado' };
      case 'cancelado':
      case 'cancelled':
        return { color: '#DC2626', bg: isDark ? 'rgba(220,38,38,0.18)' : '#FEE2E2', label: 'Cancelado' };
      default:
        return { color: '#D97706', bg: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7', label: 'Pendiente' };
    }
  };

  const formatFecha = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <LinearGradient colors={headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Mis Pedidos</Text>
              <Text style={styles.headerSubtitle}>
                {dateFilter === 'hoy' ? 'Pedidos del día' : dateFilter === 'semana' ? 'Esta semana' : 'Todos los pedidos'}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* FILTROS DE FECHA */}
          <View style={styles.dateFilterRow}>
            {([['hoy', 'Hoy'], ['semana', 'Semana'], ['todo', 'Todo']] as [DateFilter, string][]).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.dateChip,
                  dateFilter === val && styles.dateChipActive,
                ]}
                onPress={() => setDateFilter(val)}
              >
                <Text style={[styles.dateChipText, dateFilter === val && styles.dateChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* TARJETA RESUMEN */}
      <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
        <View style={styles.summaryLeft}>
          <View style={[styles.summaryIconBg, { backgroundColor: isDark ? 'rgba(42,140,74,0.18)' : '#E8F5E9' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={28} color={colors.brandGreen} />
          </View>
          <View style={{ marginLeft: 14 }}>
            <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Ventas Totales Hoy</Text>
            {loading ? (
              <ActivityIndicator color={colors.brandGreen} style={{ marginTop: 4 }} />
            ) : (
              <Text style={[styles.summaryAmount, { color: colors.textMain }]}>
                Bs {totalVentas.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.badgeCount, { backgroundColor: isDark ? 'rgba(124,58,237,0.18)' : '#EDE9FE' }]}>
          <Text style={[styles.badgeCountText, { color: '#7C3AED' }]}>{pedidos.length}</Text>
          <Text style={[styles.badgeCountLabel, { color: '#7C3AED' }]}>pedidos</Text>
        </View>
      </View>

      {/* LISTA DE PEDIDOS */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando pedidos...</Text>
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.emptyCenter}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Sin pedidos hoy</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSub }]}>Cuando registres pedidos, aparecerán aquí.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {pedidos.map((pedido, index) => {
            const estadoConfig = getEstadoConfig(pedido.estado);
            const isLast = index === pedidos.length - 1;
            return (
              <TouchableOpacity
                key={pedido.id}
                activeOpacity={0.75}
                onPress={() => openModal(pedido)}
                style={[
                  styles.pedidoCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: notes[pedido.id]
                      ? '#7C3AED'
                      : (isDark ? colors.cardBorder : '#E2E8F0'),
                    borderWidth: notes[pedido.id] ? 2 : 1,
                  },
                  !isLast && { marginBottom: 12 },
                ]}
              >
                {/* Fila superior: cliente + estado */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    {pedido.clients?.code && (
                      <Text style={[styles.clientCode, { color: colors.textSub }]}>
                        Cód. {pedido.clients.code}
                      </Text>
                    )}
                    <Text style={[styles.clientName, { color: colors.textMain }]} numberOfLines={1}>
                      {pedido.clients?.name || 'Cliente'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {notes[pedido.id] && (
                      <View style={styles.noteIcon}>
                        <Ionicons name="document-text" size={13} color="#7C3AED" />
                      </View>
                    )}
                    <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.bg }]}>
                      <Text style={[styles.estadoText, { color: estadoConfig.color }]}>
                        {estadoConfig.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Fila inferior: fecha + total + icono editar */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.fechaRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textSub} />
                    <Text style={[styles.fechaText, { color: colors.textSub }]}>
                      {formatFecha(pedido.crated_at)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalAmount, { color: colors.brandGreen }]}>
                      Bs {(pedido.total_venta || 0).toFixed(2)}
                    </Text>
                    <View style={[styles.editIconBg, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : '#EDE9FE' }]}>
                      <Ionicons name="pencil" size={14} color="#7C3AED" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ============================================================ */}
      {/* MODAL DE EDICIÓN                                             */}
      {/* ============================================================ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>

            {/* Header del modal */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? colors.cardBorder : '#E2E8F0' }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Detalle del Pedido</Text>
                {selectedPedido && (
                  <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
                    #{selectedPedido.id.slice(0, 8).toUpperCase()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
                <Ionicons name="close" size={22} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

              {/* Info del cliente */}
              {selectedPedido && (
                <View style={[styles.modalInfoCard, { backgroundColor: isDark ? '#1a2d42' : '#F8FAFC' }]}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-circle-outline" size={20} color={colors.brandGreen} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.infoLabel, { color: colors.textSub }]}>Cliente</Text>
                      <Text style={[styles.infoValue, { color: colors.textMain }]}>
                        {selectedPedido.clients?.code ? `[${selectedPedido.clients.code}] ` : ''}
                        {selectedPedido.clients?.name || 'Sin nombre'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.infoDivider, { backgroundColor: isDark ? colors.cardBorder : '#E2E8F0' }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={colors.brandGreen} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.infoLabel, { color: colors.textSub }]}>Fecha</Text>
                      <Text style={[styles.infoValue, { color: colors.textMain }]}>
                        {formatFecha(selectedPedido.crated_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Título sección productos */}
              <Text style={[styles.productosSectionTitle, { color: colors.textSub }]}>PRODUCTOS</Text>

              {loadingDetalles ? (
                <ActivityIndicator color={colors.brandGreen} style={{ marginVertical: 30 }} />
              ) : detalles.length === 0 ? (
                <Text style={[styles.noDetallesText, { color: colors.textSub }]}>No hay productos en este pedido.</Text>
              ) : (
                <>
                  {/* Cabecera de la tabla */}
                  <View style={[styles.tableHead, { backgroundColor: isDark ? '#1a2d42' : '#F1F5F9' }]}>
                    <Text style={[styles.thText, { flex: 3 }]}>Producto</Text>
                    <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
                    <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Subtotal</Text>
                  </View>

                  {/* Filas de productos */}
                  {detalles.map((detalle, index) => {
                    const qty = parseFloat(editedQtys[detalle.id] || '0') || 0;
                    const subtotal = qty * detalle.precio_unitario;
                    const isLastRow = index === detalles.length - 1;
                    return (
                      <View
                        key={detalle.id}
                        style={[
                          styles.tableRow,
                          { borderBottomColor: isDark ? colors.cardBorder : '#E2E8F0' },
                          isLastRow && { borderBottomWidth: 0 },
                        ]}
                      >
                        {/* Nombre + código */}
                        <View style={{ flex: 3 }}>
                          <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>
                            {detalle.productos?.nombre_producto || 'Producto'}
                          </Text>
                          <Text style={[styles.prodCode, { color: colors.textSub }]}>
                            {detalle.productos?.codigo_producto || ''}
                          </Text>
                          <Text style={[styles.prodUnitPrice, { color: colors.textSub }]}>
                            Bs {detalle.precio_unitario.toFixed(2)} c/u
                          </Text>
                        </View>

                        {/* Input cantidad */}
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <TextInput
                            style={[
                              styles.qtyInput,
                              {
                                color: colors.textMain,
                                backgroundColor: isDark ? '#1a2d42' : '#F9FAFB',
                                borderColor: colors.brandGreen,
                              },
                            ]}
                            value={editedQtys[detalle.id] ?? detalle.cantidad.toString()}
                            onChangeText={(val) =>
                              setEditedQtys(prev => ({ ...prev, [detalle.id]: val }))
                            }
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>

                        {/* Subtotal calculado */}
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          <Text style={[styles.subtotalText, { color: colors.textMain }]}>
                            Bs {subtotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Total general */}
                  <View style={[styles.totalBar, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4', borderColor: isDark ? 'rgba(42,140,74,0.3)' : '#BBF7D0' }]}>
                    <Text style={[styles.totalBarLabel, { color: colors.textSub }]}>TOTAL</Text>
                    <Text style={[styles.totalBarAmount, { color: colors.brandGreen }]}>
                      Bs {calcularTotalModal().toFixed(2)}
                    </Text>
                  </View>

                  {/* NOTAS LOCALES */}
                  <View style={styles.notasSection}>
                    <Text style={[styles.notasLabel, { color: colors.textSub }]}>
                      <Ionicons name="document-text-outline" size={13} /> NOTAS DEL PEDIDO
                    </Text>
                    <TextInput
                      style={[
                        styles.notasInput,
                        {
                          backgroundColor: isDark ? '#1a2d42' : '#F9FAFB',
                          color: colors.textMain,
                          borderColor: modalNote.trim() ? '#7C3AED' : (isDark ? colors.cardBorder : '#E2E8F0'),
                        },
                      ]}
                      placeholder="Ej: Es factura, a crédito 30 días..."
                      placeholderTextColor={colors.textSub}
                      value={modalNote}
                      onChangeText={setModalNote}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Botones de acción */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? colors.cardBorder : '#E2E8F0' }]}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]} onPress={closeModal}>
                <Text style={[styles.cancelBtnText, { color: colors.textSub }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.brandGreen }, saving && { opacity: 0.7 }]}
                onPress={guardarCambios}
                disabled={saving || loadingDetalles}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1 },

  // HEADER
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleBlock: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // FILTROS DE FECHA
  dateFilterRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  dateChip: {
    flex: 1, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  dateChipActive: { backgroundColor: '#fff' },
  dateChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  dateChipTextActive: { color: '#2a8c4a' },

  // TARJETA RESUMEN
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryIconBg: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  summaryAmount: { fontSize: 22, fontWeight: '900' },
  badgeCount: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  badgeCountText: { fontSize: 22, fontWeight: '900' },
  badgeCountLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // LOADING / EMPTY
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // LISTA
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  pedidoCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  clientCode: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: '700' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fechaText: { fontSize: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  editIconBg: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  noteIcon: {
    backgroundColor: '#EDE9FE', padding: 4, borderRadius: 8,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(100,116,139,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // INFO CARD
  modalInfoCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, marginVertical: 12 },

  // TABLA PRODUCTOS
  productosSectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 18, marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  thText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginHorizontal: 4,
  },
  prodName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  prodCode: { fontSize: 11, marginBottom: 2 },
  prodUnitPrice: { fontSize: 11 },
  qtyInput: {
    width: 52, height: 38,
    borderWidth: 2,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
  },
  subtotalText: { fontSize: 14, fontWeight: '700' },

  // TOTAL BAR
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  totalBarLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  totalBarAmount: { fontSize: 22, fontWeight: '900' },

  noDetallesText: { textAlign: 'center', fontSize: 14, padding: 30 },

  // NOTAS
  notasSection: { marginHorizontal: 16, marginTop: 16 },
  notasLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  notasInput: {
    borderWidth: 1.5, borderRadius: 12, padding: 12,
    fontSize: 14, minHeight: 75,
  },

  // FOOTER DEL MODAL
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    shadowColor: '#2a8c4a',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
