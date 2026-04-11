import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const startOfDay = (d: Date): Date => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const endOfDay = (d: Date): Date => { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; };
const startOfWeek = (d: Date): Date => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r; };
const endOfWeek = (d: Date): Date => { const r = startOfWeek(d); r.setDate(r.getDate() + 6); r.setHours(23, 59, 59, 999); return r; };
const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const formatWeekRange = (from: Date, to: Date) =>
  `${DIAS_ES[from.getDay()]} ${from.getDate()} - ${DIAS_ES[to.getDay()]} ${to.getDate()} ${MESES_ES[to.getMonth()]}`;
const formatDay = (d: Date) => `${DIAS_ES[d.getDay()]} ${d.getDate()} ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
const formatMonth = (d: Date) => `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;
};

const esHoy = (iso: string): boolean =>
  startOfDay(new Date(iso)).getTime() === startOfDay(new Date()).getTime();

type MainFilter = 'hoy' | 'semana';

interface DetalleItem {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: { nombre_producto: string; codigo_producto: string } | null;
}

interface Pedido {
  id: string;
  clients_id: string;
  total_venta: number;
  estado: string;
  crated_at: string;
  clients: { name: string; code: string } | null;
  empleados?: { full_name: string } | null; // Se agregó campo empleado
}

interface Producto {
  id: string;
  nombre_producto: string;
  codigo_producto: string;
  precio_base_venta: number;
  stock_actual: number;
}

const getEstadoConfig = (estado: string, isDark: boolean) => {
  switch (estado?.toLowerCase()) {
    case 'pagado': case 'delivered':
      return { color: '#16A34A', bg: isDark ? 'rgba(22,163,74,0.25)' : '#DCFCE7', label: 'Pagado' };
    case 'cancelado': case 'cancelled':
      return { color: '#EF4444', bg: isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2', label: 'Cancelado' };
    default:
      return { color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.25)' : '#FEF3C7', label: 'Pendiente' };
  }
};

export default function MisPedidos() {
  const router = useRouter();
  // ── TRAEMOS isAdmin PARA CONTROLAR EL ACCESO ──
  const { session, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();

  const [mainFilter, setMainFilter] = useState<MainFilter>('hoy');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedWeekRef, setSelectedWeekRef] = useState<Date | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVentas, setTotalVentas] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detalles, setDetalles] = useState<DetalleItem[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedQtys, setEditedQtys] = useState<Record<string, string>>({});
  const [modalNote, setModalNote] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [searchProd, setSearchProd] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [newItems, setNewItems] = useState<Record<string, { producto: Producto; qty: string }>>({});

  const getActiveRange = (): { from: Date; to: Date; label: string } => {
    const now = new Date();
    if (mainFilter === 'hoy') {
      const ref = selectedDay ?? now;
      return { from: startOfDay(ref), to: endOfDay(ref), label: formatDay(ref) };
    }
    if (mainFilter === 'semana') {
      const ref = selectedWeekRef ?? now;
      const from = startOfWeek(ref); const to = endOfWeek(ref);
      return { from, to, label: formatWeekRange(from, to) };
    }
    if (selectedDay) return { from: startOfDay(selectedDay), to: endOfDay(selectedDay), label: formatDay(selectedDay) };
    return { from: startOfMonth(now), to: endOfMonth(now), label: formatMonth(now) };
  };

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.user) return;
      const { from, to } = getActiveRange();

      // Consultamos el empleado para poder mostrar el nombre si es admin
      let query = supabase
        .from('pedidos')
        .select(`id, clients_id, total_venta, estado, crated_at, clients:clients_id (name, code), empleados:empleado_id (full_name)`)
        .gte('crated_at', from.toISOString())
        .lte('crated_at', to.toISOString())
        .order('crated_at', { ascending: false });

      // ── REGLA DE ADMIN: Si no es admin, filtramos por su propio ID ──
      if (!isAdmin) {
        query = query.eq('empleado_id', session.user.id);
      }

      const { data, error } = await query;
      if (error) { console.error(error); return; }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        clients: Array.isArray(p.clients) ? p.clients[0] : p.clients,
        empleados: Array.isArray(p.empleados) ? p.empleados[0] : p.empleados,
      })) as Pedido[];

      setPedidos(mapped);
      setTotalVentas(mapped.reduce((s, p) => s + (p.total_venta || 0), 0));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session, mainFilter, selectedDay, selectedWeekRef, isAdmin]);

  useFocusEffect(useCallback(() => { fetchPedidos(); }, [fetchPedidos]));

  const shiftWeek = (dir: -1 | 1) => {
    const ref = selectedWeekRef ?? new Date();
    const next = new Date(ref); next.setDate(next.getDate() + dir * 7); setSelectedWeekRef(next);
  };
  const shiftDay = (dir: -1 | 1) => {
    const ref = selectedDay ?? new Date();
    const next = new Date(ref); next.setDate(next.getDate() + dir); setSelectedDay(next);
  };

  const onPickerConfirm = (date: Date) => {
    setPickerVisible(false);
    if (mainFilter === 'semana') setSelectedWeekRef(date); else setSelectedDay(date);
  };
  const pickerDate = mainFilter === 'semana' ? (selectedWeekRef ?? new Date()) : (selectedDay ?? new Date());

  const openModal = async (pedido: Pedido, mode: 'view' | 'edit') => {
    setSelectedPedido(pedido);
    setModalMode(mode);
    setModalVisible(true);
    setLoadingDetalles(true);
    setDetalles([]);
    setEditedQtys({});
    setToDelete(new Set());
    setNewItems({});
    setSearchProd('');
    setShowAddPanel(false);
    setModalNote(notes[pedido.id] || '');
    try {
      const promises: PromiseLike<any>[] = [
        supabase
          .from('detalle_pedido')
          .select(`id, producto_id, cantidad, precio_unitario, subtotal, productos:producto_id (nombre_producto, codigo_producto)`)
          .eq('pedido_id', pedido.id),
      ];
      if (mode === 'edit') {
        promises.push(
          supabase
            .from('productos')
            .select('id, nombre_producto, codigo_producto, precio_base_venta, stock_actual')
            .eq('activo', true)
            .order('nombre_producto', { ascending: true })
        );
      }
      const [detalleRes, prodRes] = await Promise.all(promises);
      if (detalleRes.error) { Alert.alert('Error', 'No se pudo cargar el detalle'); return; }
      const mapped = (detalleRes.data || []).map((d: any) => ({
        ...d, productos: Array.isArray(d.productos) ? d.productos[0] : d.productos,
      })) as DetalleItem[];
      setDetalles(mapped);
      const qtys: Record<string, string> = {};
      mapped.forEach(d => { qtys[d.id] = d.cantidad.toString(); });
      setEditedQtys(qtys);
      if (prodRes) setAllProducts((prodRes.data || []) as Producto[]);
    } catch { Alert.alert('Error', 'Ocurrió un error inesperado'); }
    finally { setLoadingDetalles(false); }
  };

  const closeModal = () => {
    if (selectedPedido && modalNote.trim()) setNotes(p => ({ ...p, [selectedPedido.id]: modalNote.trim() }));
    else if (selectedPedido) setNotes(p => { const n = { ...p }; delete n[selectedPedido.id]; return n; });
    setModalVisible(false); setSelectedPedido(null); setDetalles([]); setEditedQtys({});
    setModalNote(''); setToDelete(new Set()); setNewItems({}); setSearchProd(''); setShowAddPanel(false);
  };

  const calcularTotalModal = () => {
    const existentes = detalles
      .filter(d => !toDelete.has(d.id))
      .reduce((s, d) => s + (parseFloat(editedQtys[d.id] || '0') || 0) * d.precio_unitario, 0);
    const nuevos = Object.values(newItems)
      .reduce((s, { producto, qty }) => s + (parseFloat(qty) || 0) * producto.precio_base_venta, 0);
    return existentes + nuevos;
  };

  const guardarCambios = async () => {
    if (!selectedPedido) return;
    const newEntries = Object.values(newItems);
    if (newEntries.some(({ qty }) => !(parseFloat(qty) > 0))) {
      Alert.alert('Cantidad inválida', 'Todos los productos nuevos deben tener una cantidad mayor a 0.'); return;
    }
    setSaving(true);
    try {
      for (const det of detalles.filter(d => !toDelete.has(d.id))) {
        const qty = parseFloat(editedQtys[det.id] || '0') || 0;
        const { error } = await supabase.from('detalle_pedido')
          .update({ cantidad: qty, subtotal: qty * det.precio_unitario }).eq('id', det.id);
        if (error) throw error;
      }
      if (toDelete.size > 0) {
        const { error } = await supabase.from('detalle_pedido').delete().in('id', Array.from(toDelete));
        if (error) throw error;
      }
      for (const { producto, qty } of newEntries) {
        const cantidad = parseFloat(qty) || 0;
        const { error } = await supabase.from('detalle_pedido').insert({
          pedido_id: selectedPedido.id, producto_id: producto.id,
          cantidad, precio_unitario: producto.precio_base_venta,
          subtotal: cantidad * producto.precio_base_venta,
        });
        if (error) throw error;
      }
      const { error } = await supabase.from('pedidos')
        .update({ total_venta: calcularTotalModal() }).eq('id', selectedPedido.id);
      if (error) throw error;
      Alert.alert('Éxito', 'Pedido actualizado correctamente');
      closeModal(); fetchPedidos();
    } catch (e: any) { Alert.alert('Error', e.message || 'No se pudo guardar el pedido'); }
    finally { setSaving(false); }
  };

  const generarPDF = async () => {
    if (!selectedPedido) return;
    try {
      const pedidoId = selectedPedido.id.slice(0, 8).toUpperCase();
      const cliente = selectedPedido.clients?.name || 'Sin nombre';
      const codigoCli = selectedPedido.clients?.code || '';
      const fechaDoc = formatFecha(selectedPedido.crated_at);
      const fechaHoy = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
      const estado = selectedPedido.estado || 'Pendiente';

      const filas = detalles.map((det, i) => {
        const qty = parseFloat(editedQtys[det.id] || det.cantidad.toString()) || 0;
        const sub = (qty * det.precio_unitario).toFixed(2);
        const bg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        return `<tr style="background:${bg};">
          <td style="padding:12px 16px;">
            <div style="font-weight:700;font-size:13px;color:#111827;">${det.productos?.nombre_producto || 'Producto'}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">${det.productos?.codigo_producto || ''}</div>
          </td>
          <td style="padding:12px 16px;text-align:center;font-size:13px;color:#374151;font-weight:600;">${qty}</td>
          <td style="padding:12px 16px;text-align:right;font-size:13px;color:#374151;">Bs ${det.precio_unitario.toFixed(2)}</td>
          <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:700;color:#059669;">Bs ${sub}</td>
        </tr>`;
      }).join('');

      const total = calcularTotalModal().toFixed(2);

      const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#F3F4F6;color:#111827;}
.page{max-width:680px;margin:0 auto;background:#fff;min-height:100vh;}
.header{background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px 40px 50px;position:relative;overflow:hidden;}
.header::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.06);}
.header::after{content:'';position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.04);}
.header-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;}
.company{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;}
.company-sub{font-size:11px;color:rgba(255,255,255,0.65);margin-top:3px;letter-spacing:0.5px;text-transform:uppercase;}
.doc-label{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;}
.header-id{margin-top:28px;position:relative;z-index:1;}
.order-num{font-size:38px;font-weight:900;color:#fff;letter-spacing:-1px;}
.order-date{font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;}
.status-chip{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;color:#fff;margin-top:12px;text-transform:uppercase;letter-spacing:0.5px;}
.body{padding:32px 40px 40px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;}
.info-box{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;}
.info-box-label{font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;}
.info-box-value{font-size:15px;font-weight:700;color:#111827;}
.info-box-sub{font-size:12px;color:#6B7280;margin-top:2px;}
.sec-title{font-size:11px;font-weight:800;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;}
.table-wrap{border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;}
thead tr{background:#F3F4F6;}
th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;}
th:nth-child(2){text-align:center;}th:nth-child(3),th:nth-child(4){text-align:right;}
tbody tr:not(:last-child) td{border-bottom:1px solid #F3F4F6;}
.total-section{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border:1px solid #BBF7D0;border-radius:14px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.total-label-group .tl{font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;}
.total-label-group .tv{font-size:11px;color:#9CA3AF;margin-top:3px;}
.total-amount{font-size:32px;font-weight:900;color:#059669;}
.footer{border-top:1px solid #E5E7EB;padding-top:20px;display:flex;justify-content:space-between;align-items:center;}
.footer-left{font-size:11px;color:#9CA3AF;}
.footer-right{font-size:11px;color:#9CA3AF;text-align:right;}
.powered{font-weight:700;color:#059669;}
</style></head>
<body><div class="page">
<div class="header">
  <div class="header-top">
    <div><div class="company">Tiendas Movil</div><div class="company-sub">Sistema de Ventas</div></div>
    <div class="doc-label">Nota de Venta</div>
  </div>
  <div class="header-id">
    <div class="order-num">#${pedidoId}</div>
    <div class="order-date">${fechaDoc}</div>
    <div class="status-chip">${estado}</div>
  </div>
</div>
<div class="body">
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-label">Cliente</div>
      <div class="info-box-value">${cliente}</div>
      ${codigoCli ? `<div class="info-box-sub">Código: ${codigoCli}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-box-label">Fecha de emisión</div>
      <div class="info-box-value">${fechaHoy}</div>
      <div class="info-box-sub">Generado automáticamente</div>
    </div>
  </div>
  <div class="sec-title">Detalle de productos</div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th style="width:42%;">Producto</th>
        <th style="width:13%;text-align:center;">Cant.</th>
        <th style="width:20%;text-align:right;">Precio unit.</th>
        <th style="width:25%;text-align:right;">Subtotal</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>
  <div class="total-section">
    <div class="total-label-group">
      <div class="tl">Total a pagar</div>
      <div class="tv">${detalles.length} producto${detalles.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="total-amount">Bs ${total}</div>
  </div>
  <div class="footer">
    <div class="footer-left">Documento generado el ${fechaHoy}<br/>Este documento no tiene validez fiscal.</div>
    <div class="footer-right"><span class="powered">Tiendas Movil</span><br/>Sistema de Ventas</div>
  </div>
</div></div></body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Pedido #${pedidoId}` });
      } else {
        await Print.printAsync({ uri });
      }
    } catch { Alert.alert('Error', 'No se pudo generar el PDF'); }
  };

  const activeRange = getActiveRange();
  const cardBg = isDark ? colors.cardBg : '#FFFFFF';
  const cardBorder = isDark ? colors.cardBorder : '#E2E8F0';
  const subtleBg = isDark ? '#1E293B' : '#F8FAFC';
  const chipActiveBg = '#FFFFFF';
  const chipActiveText = colors.brandGreen;
  const chipIdleText = 'rgba(255,255,255,0.85)';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <LinearGradient colors={isDark ? [colors.brandGreen, '#14532d'] : ['#00D15B', '#077E4F']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Mis Pedidos</Text>
              <Text style={styles.headerSubtitle}>{activeRange.label}</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.filterRow}>
            {(['hoy', 'semana'] as MainFilter[]).map(f => {
              const labels: Record<MainFilter, string> = { hoy: 'Hoy', semana: 'Semana' };
              const active = mainFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, active && { backgroundColor: chipActiveBg }]}
                  onPress={() => { setMainFilter(f); setSelectedDay(null); setSelectedWeekRef(null); }}
                >
                  <Text style={[styles.filterChipText, { color: active ? chipActiveText : chipIdleText }]}>
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.subFilterRow}>
            {mainFilter === 'semana' ? (
              <>
                <TouchableOpacity style={styles.navArrow} onPress={() => shiftWeek(-1)}>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateLabel} onPress={() => setPickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.dateLabelText}>{activeRange.label}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navArrow, startOfWeek(selectedWeekRef ?? new Date()) >= startOfWeek(new Date()) && styles.navArrowDisabled]}
                  onPress={() => shiftWeek(1)}
                  disabled={startOfWeek(selectedWeekRef ?? new Date()) >= startOfWeek(new Date())}
                >
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.navArrow} onPress={() => shiftDay(-1)}>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateLabel} onPress={() => setPickerVisible(true)}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.dateLabelText}>
                    {selectedDay ? formatDay(selectedDay) : mainFilter === 'hoy' ? 'Hoy' : 'Este mes'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navArrow, (!selectedDay || startOfDay(selectedDay) >= startOfDay(new Date())) && styles.navArrowDisabled]}
                  onPress={() => shiftDay(1)}
                  disabled={!selectedDay || startOfDay(selectedDay) >= startOfDay(new Date())}
                >
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── RESUMEN ── */}
      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: isDark ? 1 : 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.summaryIcon, { backgroundColor: isDark ? 'rgba(42,140,74,0.2)' : '#E8F5E9' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={26} color={colors.brandGreen} />
          </View>
          <View style={{ marginLeft: 14 }}>
            <Text style={[styles.summaryLabel, { color: colors.textSub }]}>
              {mainFilter === 'hoy' ? 'Total del día' : mainFilter === 'semana' ? 'Total de la semana' : 'Total del mes'}
            </Text>
            {loading ? <ActivityIndicator color={colors.brandGreen} style={{ marginTop: 4 }} /> : (
              <Text style={[styles.summaryAmount, { color: colors.textMain }]}>
                Bs {totalVentas.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#EDE9FE' }]}>
          <Text style={[styles.countNum, { color: '#7C3AED' }]}>{pedidos.length}</Text>
          <Text style={[styles.countLabel, { color: '#7C3AED' }]}>pedidos</Text>
        </View>
      </View>

      {/* ── LISTA ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={[styles.centerText, { color: colors.textSub }]}>Cargando pedidos...</Text>
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={[styles.centerText, { color: colors.textMain, fontWeight: '700', fontSize: 17, marginTop: 12 }]}>Sin pedidos</Text>
          <Text style={[styles.centerText, { color: colors.textSub, textAlign: 'center', paddingHorizontal: 40 }]}>
            No hay pedidos registrados en el periodo seleccionado.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {pedidos.map(pedido => {
            const cfg = getEstadoConfig(pedido.estado, isDark);
            const puedeEditar = esHoy(pedido.crated_at);
            return (
              <View
                key={pedido.id}
                style={[styles.pedidoCard, {
                  backgroundColor: cardBg,
                  borderColor: notes[pedido.id] ? '#7C3AED' : cardBorder,
                  borderWidth: notes[pedido.id] ? 2 : isDark ? 1 : 0,
                }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    {pedido.clients?.code && (
                      <Text style={[styles.clientCode, { color: colors.textSub }]}>Cod. {pedido.clients.code}</Text>
                    )}
                    <Text style={[styles.clientName, { color: colors.textMain }]} numberOfLines={1}>
                      {pedido.clients?.name || 'Cliente'}
                    </Text>

                    {/* ── SI ES ADMIN, MOSTRAMOS QUÉ EMPLEADO HIZO EL PEDIDO ── */}
                    {isAdmin && pedido.empleados?.full_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
                        <Ionicons name="person" size={11} color={colors.brandGreen} />
                        <Text style={{ fontSize: 11, color: colors.brandGreen, fontWeight: '600' }}>
                          Vendedor: {pedido.empleados.full_name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {notes[pedido.id] && (
                      <View style={[styles.noteIcon, { backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#EDE9FE' }]}>
                        <Ionicons name="document-text" size={13} color="#7C3AED" />
                      </View>
                    )}
                    <View style={[styles.estadoBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textSub} />
                    <Text style={[styles.fechaText, { color: colors.textSub }]}>{formatFecha(pedido.crated_at)}</Text>
                  </View>
                  <Text style={[styles.totalAmount, { color: colors.brandGreen }]}>
                    Bs {(pedido.total_venta || 0).toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.cardActions, { borderTopColor: cardBorder }]}>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
                    onPress={() => openModal(pedido, 'view')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={15} color={colors.textSub} />
                    <Text style={[styles.cardActionText, { color: colors.textSub }]}>Ver detalle</Text>
                  </TouchableOpacity>

                  {puedeEditar && (
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : '#EDE9FE' }]}
                      onPress={() => router.push(`/pedidos/EditarPedido?pedidoId=${pedido.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={15} color="#7C3AED" />
                      <Text style={[styles.cardActionText, { color: '#7C3AED', fontWeight: '700' }]}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={pickerDate}
        maximumDate={new Date()}
        locale="es_BO"
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
        onConfirm={onPickerConfirm}
        onCancel={() => setPickerVisible(false)}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>

            <View style={[styles.modalHeader, { borderBottomColor: cardBorder }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                  {modalMode === 'edit' ? 'Editar Pedido' : 'Detalle del Pedido'}
                </Text>
                {selectedPedido && (
                  <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
                    #{selectedPedido.id.slice(0, 8).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]} onPress={generarPDF} disabled={loadingDetalles}>
                  <Ionicons name="document-text-outline" size={16} color="#EF4444" />
                  <Text style={[styles.pdfBtnText, { color: '#EF4444' }]}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.1)' }]} onPress={closeModal}>
                  <Ionicons name="close" size={20} color={colors.textSub} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedPedido && (
                <View style={[styles.infoCard, { backgroundColor: subtleBg }]}>
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
                  <View style={[styles.infoDivider, { backgroundColor: cardBorder }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={colors.brandGreen} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.infoLabel, { color: colors.textSub }]}>Fecha</Text>
                      <Text style={[styles.infoValue, { color: colors.textMain }]}>{formatFecha(selectedPedido.crated_at)}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.prodSecHeader}>
                <Text style={[styles.secTitle, { color: colors.textSub, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>PRODUCTOS</Text>
                {modalMode === 'edit' && (
                  <TouchableOpacity style={[styles.addProdBtn, { backgroundColor: showAddPanel ? (isDark ? 'rgba(42,140,74,0.25)' : '#DCFCE7') : (isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9') }]} onPress={() => setShowAddPanel(p => !p)}>
                    <Ionicons name={showAddPanel ? 'close' : 'add'} size={15} color={showAddPanel ? colors.brandGreen : colors.textSub} />
                    <Text style={[styles.addProdBtnText, { color: showAddPanel ? colors.brandGreen : colors.textSub }]}>{showAddPanel ? 'Cerrar' : 'Agregar'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {modalMode === 'edit' && showAddPanel && (
                <View style={[styles.addPanel, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: cardBorder }]}>
                  <View style={[styles.searchBox, { backgroundColor: isDark ? colors.inputBg : '#FFF', borderColor: cardBorder }]}>
                    <Ionicons name="search-outline" size={16} color={colors.textSub} />
                    <TextInput style={[styles.searchInput, { color: colors.textMain }]} placeholder="Buscar por nombre o código..." placeholderTextColor={colors.textSub} value={searchProd} onChangeText={setSearchProd} />
                    {searchProd.length > 0 && <TouchableOpacity onPress={() => setSearchProd('')}><Ionicons name="close-circle" size={16} color={colors.textSub} /></TouchableOpacity>}
                  </View>
                  {allProducts.filter(p => {
                    const q = searchProd.toLowerCase();
                    const yaDetalle = detalles.some(d => d.producto_id === p.id && !toDelete.has(d.id));
                    const yaNuevo = !!newItems[p.id];
                    return !yaDetalle && !yaNuevo && (q === '' || p.nombre_producto.toLowerCase().includes(q) || p.codigo_producto.toLowerCase().includes(q));
                  }).slice(0, 8).map(prod => (
                    <TouchableOpacity key={prod.id} style={[styles.prodSearchRow, { borderBottomColor: cardBorder }]} onPress={() => { setNewItems(prev => ({ ...prev, [prod.id]: { producto: prod, qty: '1' } })); setSearchProd(''); }} activeOpacity={0.7}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prodName, { color: colors.textMain, marginBottom: 0 }]} numberOfLines={1}>{prod.nombre_producto}</Text>
                        <Text style={[styles.prodCode, { color: colors.textSub }]}>{prod.codigo_producto} · Bs {prod.precio_base_venta.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.addIconCircle, { backgroundColor: isDark ? 'rgba(42,140,74,0.2)' : '#DCFCE7' }]}><Ionicons name="add" size={18} color={colors.brandGreen} /></View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {loadingDetalles ? (
                <ActivityIndicator color={colors.brandGreen} style={{ marginVertical: 30 }} />
              ) : (detalles.length === 0 && Object.keys(newItems).length === 0) ? (
                <Text style={{ color: colors.textSub, textAlign: 'center', padding: 30 }}>No hay productos.</Text>
              ) : (
                <>
                  <View style={[styles.tableHead, { backgroundColor: subtleBg }]}>
                    <Text style={[styles.thText, { flex: 3 }]}>Producto</Text>
                    <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
                    <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Subtotal</Text>
                    {modalMode === 'edit' && <Text style={[styles.thText, { width: 32 }]}> </Text>}
                  </View>

                  {detalles.map((det, i) => {
                    const deleted = toDelete.has(det.id);
                    const qty = parseFloat(editedQtys[det.id] || '0') || 0;
                    const isLast = i === detalles.length - 1 && Object.keys(newItems).length === 0;
                    return (
                      <View key={det.id} style={[styles.tableRow, { borderBottomColor: cardBorder }, isLast && { borderBottomWidth: 0 }, deleted && { opacity: 0.35 }]}>
                        <View style={{ flex: 3 }}>
                          <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>{det.productos?.nombre_producto || 'Producto'}</Text>
                          <Text style={[styles.prodCode, { color: colors.textSub }]}>{det.productos?.codigo_producto || ''}</Text>
                          <Text style={[styles.prodPrice, { color: colors.textSub }]}>Bs {det.precio_unitario.toFixed(2)} c/u</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <TextInput style={[styles.qtyInput, { color: colors.textMain, backgroundColor: subtleBg, borderColor: deleted ? '#EF4444' : colors.brandGreen }]} value={editedQtys[det.id] ?? det.cantidad.toString()} onChangeText={v => setEditedQtys(p => ({ ...p, [det.id]: v }))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSub} editable={modalMode === 'edit' && !deleted} />
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          <Text style={[styles.subtotalText, { color: deleted ? colors.textSub : colors.textMain }]}>{deleted ? '—' : `Bs ${(qty * det.precio_unitario).toFixed(2)}`}</Text>
                        </View>
                        {modalMode === 'edit' && (
                          <TouchableOpacity style={{ width: 32, alignItems: 'center' }} onPress={() => setToDelete(prev => { const next = new Set(prev); if (next.has(det.id)) next.delete(det.id); else next.add(det.id); return next; })}>
                            <Ionicons name={deleted ? 'refresh-circle-outline' : 'trash-outline'} size={19} color={deleted ? colors.brandGreen : '#EF4444'} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {Object.entries(newItems).map(([prodId, { producto, qty }], i) => {
                    const isLast = i === Object.keys(newItems).length - 1;
                    const subtotal = (parseFloat(qty) || 0) * producto.precio_base_venta;
                    return (
                      <View key={prodId} style={[styles.tableRow, { borderBottomColor: cardBorder, backgroundColor: isDark ? 'rgba(42,140,74,0.07)' : '#F0FDF4' }, isLast && { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 3 }}>
                          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 3 }}>
                            <View style={[styles.newBadge, { backgroundColor: colors.brandGreen }]}><Text style={styles.newBadgeText}>NUEVO</Text></View>
                          </View>
                          <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>{producto.nombre_producto}</Text>
                          <Text style={[styles.prodCode, { color: colors.textSub }]}>{producto.codigo_producto}</Text>
                          <Text style={[styles.prodPrice, { color: colors.textSub }]}>Bs {producto.precio_base_venta.toFixed(2)} c/u</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <TextInput style={[styles.qtyInput, { color: colors.textMain, backgroundColor: subtleBg, borderColor: colors.brandGreen }]} value={qty} onChangeText={v => setNewItems(prev => ({ ...prev, [prodId]: { ...prev[prodId], qty: v } }))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSub} />
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          <Text style={[styles.subtotalText, { color: colors.textMain }]}>Bs {subtotal.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity style={{ width: 32, alignItems: 'center' }} onPress={() => setNewItems(prev => { const n = { ...prev }; delete n[prodId]; return n; })}>
                          <Ionicons name="trash-outline" size={19} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <View style={[styles.totalBar, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4', borderColor: isDark ? 'rgba(42,140,74,0.3)' : '#BBF7D0' }]}>
                    <Text style={[styles.totalBarLabel, { color: colors.textSub }]}>TOTAL</Text>
                    <Text style={[styles.totalBarAmt, { color: colors.brandGreen }]}>Bs {calcularTotalModal().toFixed(2)}</Text>
                  </View>

                  <View style={styles.notasSection}>
                    <Text style={[styles.secTitle, { color: colors.textSub, marginHorizontal: 0 }]}>NOTAS</Text>
                    <TextInput style={[styles.notasInput, { backgroundColor: subtleBg, color: colors.textMain, borderColor: modalNote.trim() ? '#7C3AED' : cardBorder }]} placeholder="Ej: A credito 30 dias, pago en efectivo..." placeholderTextColor={colors.textSub} value={modalNote} onChangeText={setModalNote} multiline numberOfLines={3} textAlignVertical="top" editable={modalMode === 'edit'} />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: cardBorder }]}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: cardBorder }]} onPress={closeModal}>
                <Text style={[styles.cancelText, { color: colors.textSub }]}>{modalMode === 'edit' ? 'Cancelar' : 'Cerrar'}</Text>
              </TouchableOpacity>
              {modalMode === 'edit' && (
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.brandGreen, opacity: saving ? 0.7 : 1 }]} onPress={guardarCambios} disabled={saving || loadingDetalles}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <><Ionicons name="checkmark-circle" size={17} color="#FFF" /><Text style={styles.saveText}>Guardar</Text></>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerInner: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { flex: 1, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  subFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  navArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  navArrowDisabled: { opacity: 0.3 },
  dateLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 7 },
  dateLabelText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  summaryCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, marginBottom: 16 },
  summaryIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  summaryAmount: { fontSize: 22, fontWeight: '900' },
  countBadge: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  countNum: { fontSize: 22, fontWeight: '900' },
  countLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  centerText: { fontSize: 14 },
  pedidoCard: { borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  clientCode: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: '700' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fechaText: { fontSize: 12 },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  noteIcon: { padding: 5, borderRadius: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pdfBtnText: { fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1, marginVertical: 12 },
  prodSecHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18, marginBottom: 8 },
  secTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  addProdBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addProdBtnText: { fontSize: 12, fontWeight: '700' },
  addPanel: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 42, marginBottom: 10, borderWidth: 1.5 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  prodSearchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  addIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  newBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  tableHead: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, borderRadius: 10, marginBottom: 4 },
  thText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, marginHorizontal: 4 },
  prodName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  prodCode: { fontSize: 11, marginBottom: 2 },
  prodPrice: { fontSize: 11 },
  qtyInput: { width: 52, height: 38, borderWidth: 2, borderRadius: 10, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  subtotalText: { fontSize: 14, fontWeight: '700' },
  totalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  totalBarLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  totalBarAmt: { fontSize: 22, fontWeight: '900' },
  notasSection: { marginHorizontal: 16, marginTop: 16 },
  notasInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 75 },
  modalFooter: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, elevation: 4 },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});