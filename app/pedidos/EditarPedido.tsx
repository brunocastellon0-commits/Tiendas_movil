import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
    Platform, ScrollView, StatusBar, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA: EditarPedido
// Ruta: app/pedidos/EditarPedido.tsx
//
// Recibe por URL:
//   pedidoId → UUID del pedido a editar
//
// Al guardar:
//   1. Actualiza cantidades / agrega / elimina en detalle_pedido
//   2. Actualiza total_venta en pedidos
//   3. Cambia estado → 'Editado' para que el Cerebro Híbrido lo reprocese
//      (el WebSocket escucha UPDATE en pedidos y re-sincroniza con SQL Server)
// ─────────────────────────────────────────────────────────────────────────────

interface Producto {
    id: string;
    nombre_producto: string;
    codigo_producto: string;
    precio_base_venta: number;
    unidad_base_venta: string;
    stock_actual: number;
}

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
    numero_documento: string;
    total_venta: number;
    estado: string;
    crated_at: string;
    tipo_pago: string;
    observacion: string | null;
    clients: { name: string; code?: string } | null;
}

export default function EditarPedido() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { pedidoId } = useLocalSearchParams<{ pedidoId: string }>();

    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);

    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [detalles, setDetalles] = useState<DetalleItem[]>([]);
    const [allProducts, setAllProducts] = useState<Producto[]>([]);

    // Cantidades editadas (key: detalle.id, value: string)
    const [editedQtys, setEditedQtys] = useState<Record<string, string>>({});
    // IDs de detalles marcados para eliminar
    const [toDelete, setToDelete] = useState<Set<string>>(new Set());
    // Nuevos productos agregados (key: producto.id)
    const [newItems, setNewItems] = useState<Record<string, { producto: Producto; qty: string }>>({});

    // Panel y búsqueda de productos para agregar
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchAdd, setSearchAdd] = useState('');

    // Observación
    const [observacion, setObservacion] = useState('');

    // Modal de éxito
    const [successModal, setSuccessModal] = useState(false);
    const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!pedidoId) { Alert.alert('Error', 'Falta el ID del pedido'); router.back(); return; }
        loadData();
        return () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); };
    }, [pedidoId]);

    const loadData = async () => {
        try {
            setLoadingData(true);

            // Cargar pedido
            const { data: ped, error: pedErr } = await supabase
                .from('pedidos')
                .select('id, numero_documento, total_venta, estado, crated_at, tipo_pago, observacion, clients:clients_id(name, code)')
                .eq('id', pedidoId)
                .single();
            if (pedErr) throw pedErr;
            setPedido(ped as any);
            setObservacion((ped as any).observacion || '');

            // Cargar detalles
            const { data: dets, error: detErr } = await supabase
                .from('detalle_pedido')
                .select('id, producto_id, cantidad, precio_unitario, subtotal, productos:producto_id(nombre_producto, codigo_producto)')
                .eq('pedido_id', pedidoId);
            if (detErr) throw detErr;
            // Normalizar: cantidad/precio siempre number, productos como objeto
            const normalizados = (dets || []).map((d: any) => ({
                ...d,
                cantidad: Number(d.cantidad) || 0,
                precio_unitario: Number(d.precio_unitario) || 0,
                subtotal: Number(d.subtotal) || 0,
                productos: Array.isArray(d.productos) ? (d.productos[0] ?? null) : (d.productos ?? null),
            }));
            setDetalles(normalizados);

            // Inicializar cantidades
            const qtys: Record<string, string> = {};
            normalizados.forEach((d: DetalleItem) => { qtys[d.id] = String(d.cantidad); });
            setEditedQtys(qtys);

            // Cargar todos los productos para el buscador
            const { data: prods } = await supabase
                .from('productos')
                .select('id, nombre_producto, codigo_producto, precio_base_venta, unidad_base_venta, stock_actual')
                .eq('activo', true)
                .order('nombre_producto');
            setAllProducts(prods || []);

        } catch (e: any) {
            Alert.alert('Error', 'No se pudieron cargar los datos: ' + e.message);
            router.back();
        } finally {
            setLoadingData(false);
        }
    };

    // ── Cálculo del total ───────────────────────────────────────────────────────
    const calcTotal = (): number => {
        const existentes = detalles
            .filter(d => !toDelete.has(d.id))
            .reduce((s, d) => s + (parseFloat(editedQtys[d.id] || '0') || 0) * d.precio_unitario, 0);
        const nuevos = Object.values(newItems)
            .reduce((s, { producto, qty }) => s + (parseFloat(qty) || 0) * producto.precio_base_venta, 0);
        return existentes + nuevos;
    };

    // ── Guardar cambios ─────────────────────────────────────────────────────────
    const guardarCambios = async () => {
        if (!pedido) return;

        const newEntries = Object.values(newItems);
        if (newEntries.some(({ qty }) => !(parseFloat(qty) > 0))) {
            Alert.alert('Cantidad inválida', 'Todos los productos nuevos deben tener cantidad mayor a 0.');
            return;
        }

        setSaving(true);
        try {
            // 1. Actualizar cantidades existentes
            for (const det of detalles.filter(d => !toDelete.has(d.id))) {
                const qty = parseFloat(editedQtys[det.id] || '0') || 0;
                const { error } = await supabase.from('detalle_pedido')
                    .update({ cantidad: qty, subtotal: qty * det.precio_unitario })
                    .eq('id', det.id);
                if (error) throw error;
            }

            // 2. Eliminar marcados
            if (toDelete.size > 0) {
                const { error } = await supabase.from('detalle_pedido')
                    .delete().in('id', Array.from(toDelete));
                if (error) throw error;
            }

            // 3. Insertar nuevos
            for (const { producto, qty } of newEntries) {
                const cantidad = parseFloat(qty) || 0;
                const { error } = await supabase.from('detalle_pedido').insert({
                    pedido_id: pedido.id,
                    producto_id: producto.id,
                    cantidad,
                    precio_unitario: producto.precio_base_venta,
                    subtotal: cantidad * producto.precio_base_venta,
                    unidad_seleccionada: producto.unidad_base_venta || 'UNID',
                });
                if (error) throw error;
            }

            // 4. Actualizar pedido — IMPORTANTE: estado = 'Editado' para que el
            //    Cerebro Híbrido (WebSocket UPDATE) lo reprocese en SQL Server
            const nuevoTotal = calcTotal();
            const { error: pedErr } = await supabase.from('pedidos').update({
                total_venta: nuevoTotal,
                observacion,
                estado: 'Editado',  // ← despierta al Cerebro Híbrido
            }).eq('id', pedido.id);
            if (pedErr) throw pedErr;

            // Mostrar modal de éxito y volver después de 3 segundos
            setSuccessModal(true);
            navTimerRef.current = setTimeout(() => {
                setSuccessModal(false);
                router.back();
            }, 3000);

        } catch (e: any) {
            Alert.alert('Error', e.message || 'No se pudo guardar el pedido');
        } finally {
            setSaving(false);
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const toggleDelete = (id: string) => {
        setToDelete(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const addNewProduct = (producto: Producto) => {
        setNewItems(prev => ({ ...prev, [producto.id]: { producto, qty: '1' } }));
        setShowAddPanel(false);
        setSearchAdd('');
    };

    const removeNewItem = (prodId: string) => {
        setNewItems(prev => { const n = { ...prev }; delete n[prodId]; return n; });
    };

    const productosFiltrados = allProducts.filter(p => {
        const q = searchAdd.toLowerCase();
        if (!q) return true;
        return p.nombre_producto.toLowerCase().includes(q) || p.codigo_producto?.toLowerCase().startsWith(q);
    }).filter(p => {
        const yaDetalle = detalles.some(d => d.producto_id === p.id && !toDelete.has(d.id));
        const yaNuevo = !!newItems[p.id];
        return !yaDetalle && !yaNuevo;
    });

    // ── Colores del tema ─────────────────────────────────────────────────────────
    const cardBg = isDark ? colors.cardBg : '#FFFFFF';
    const subtleBg = isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB';

    if (loadingData) {
        return (
            <View style={[styles.center, { backgroundColor: colors.bgStart }]}>
                <ActivityIndicator size="large" color={colors.brandGreen} />
                <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando pedido...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ── HEADER ── */}
            <LinearGradient colors={[colors.brandGreen, '#1e6b38']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.headerTitle}>Editar Pedido</Text>
                            {pedido?.numero_documento && (
                                <Text style={styles.headerSub}>#{pedido.numero_documento}</Text>
                            )}
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Info del cliente */}
                    {pedido?.clients && (
                        <View style={styles.clientChip}>
                            <Ionicons name="person-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.clientChipText} numberOfLines={1}>
                                {pedido.clients.name}
                                {pedido.clients.code ? `  ·  #${pedido.clients.code}` : ''}
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </LinearGradient>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ── PRODUCTOS ── */}
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>

                        {/* Cabecera sección + botón Agregar */}
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.textMain }]}>PRODUCTOS</Text>
                            <TouchableOpacity
                                style={[styles.addBtn, { backgroundColor: showAddPanel ? `${colors.brandGreen}20` : subtleBg, borderColor: showAddPanel ? colors.brandGreen : colors.cardBorder }]}
                                onPress={() => { setShowAddPanel(v => !v); setSearchAdd(''); }}
                            >
                                <Ionicons name={showAddPanel ? 'close' : 'add'} size={16} color={showAddPanel ? colors.brandGreen : colors.textSub} />
                                <Text style={[styles.addBtnText, { color: showAddPanel ? colors.brandGreen : colors.textSub }]}>
                                    {showAddPanel ? 'Cerrar' : 'Agregar'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Panel buscador de productos */}
                        {showAddPanel && (
                            <View style={[styles.addPanel, { backgroundColor: subtleBg, borderColor: colors.cardBorder }]}>
                                <View style={[styles.searchRow, { backgroundColor: isDark ? colors.inputBg : '#fff', borderColor: colors.cardBorder }]}>
                                    <Ionicons name="search" size={16} color={colors.textSub} />
                                    <TextInput
                                        style={[styles.searchInput, { color: colors.textMain }]}
                                        placeholder="Buscar por nombre o código..."
                                        placeholderTextColor={colors.textSub}
                                        value={searchAdd}
                                        onChangeText={setSearchAdd}
                                        autoFocus
                                    />
                                    {searchAdd.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchAdd('')}>
                                            <Ionicons name="close-circle" size={16} color={colors.textSub} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {productosFiltrados.slice(0, 8).map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.searchResultItem, { borderBottomColor: colors.cardBorder }]}
                                        onPress={() => addNewProduct(p)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.searchResultName, { color: colors.textMain }]} numberOfLines={1}>
                                                {p.nombre_producto}
                                            </Text>
                                            <Text style={[styles.searchResultSub, { color: colors.textSub }]}>
                                                {p.codigo_producto}  ·  Bs {p.precio_base_venta.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={[styles.addItemBtn, { backgroundColor: `${colors.brandGreen}15` }]}>
                                            <Ionicons name="add" size={18} color={colors.brandGreen} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {productosFiltrados.length === 0 && (
                                    <Text style={[styles.noResults, { color: colors.textSub }]}>Sin resultados</Text>
                                )}
                            </View>
                        )}

                        {/* Tabla de cabecera */}
                        <View style={[styles.tableHeader, { borderBottomColor: colors.cardBorder }]}>
                            <Text style={[styles.thText, { flex: 1, color: colors.textSub }]}>Producto</Text>
                            <Text style={[styles.thText, { width: 70, textAlign: 'center', color: colors.textSub }]}>Cant.</Text>
                            <Text style={[styles.thText, { width: 80, textAlign: 'right', color: colors.textSub }]}>Subtotal</Text>
                            <View style={{ width: 36 }} />
                        </View>

                        {/* Detalles existentes */}
                        {detalles.map((det, i) => {
                            const deleted = toDelete.has(det.id);
                            const qty = parseFloat(editedQtys[det.id] || '0') || 0;
                            const isLast = i === detalles.length - 1 && Object.keys(newItems).length === 0;
                            return (
                                <View
                                    key={det.id}
                                    style={[
                                        styles.detailRow,
                                        { borderBottomColor: colors.cardBorder, borderBottomWidth: isLast ? 0 : 1, opacity: deleted ? 0.45 : 1 },
                                    ]}
                                >
                                    <View style={{ flex: 1, paddingRight: 6 }}>
                                        <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>
                                            {det.productos?.nombre_producto || 'Producto'}
                                        </Text>
                                        <Text style={[styles.prodCode, { color: colors.textSub }]}>
                                            {det.productos?.codigo_producto || ''}  ·  Bs {det.precio_unitario.toFixed(2)}
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={[styles.qtyInput, {
                                            color: colors.textMain,
                                            backgroundColor: subtleBg,
                                            borderColor: deleted ? '#EF4444' : colors.brandGreen,
                                        }]}
                                        value={editedQtys[det.id] ?? det.cantidad.toString()}
                                        onChangeText={v => setEditedQtys(p => ({ ...p, [det.id]: v }))}
                                        keyboardType="numeric"
                                        editable={!deleted}
                                        placeholder="0"
                                        placeholderTextColor={colors.textSub}
                                    />
                                    <Text style={[styles.subtotalText, { color: deleted ? '#EF4444' : colors.textMain }]}>
                                        Bs {(qty * det.precio_unitario).toFixed(2)}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.deleteBtn, { backgroundColor: deleted ? '#FEF2F2' : subtleBg }]}
                                        onPress={() => toggleDelete(det.id)}
                                    >
                                        <Ionicons
                                            name={deleted ? 'arrow-undo' : 'trash-outline'}
                                            size={16}
                                            color={deleted ? '#EF4444' : colors.textSub}
                                        />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {/* Nuevos productos agregados */}
                        {Object.entries(newItems).map(([prodId, { producto, qty }], i) => {
                            const isLast = i === Object.keys(newItems).length - 1;
                            return (
                                <View
                                    key={prodId}
                                    style={[styles.detailRow, { borderBottomColor: colors.cardBorder, borderBottomWidth: isLast ? 0 : 1, borderLeftWidth: 3, borderLeftColor: colors.brandGreen }]}
                                >
                                    <View style={{ flex: 1, paddingRight: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <View style={[styles.newBadge, { backgroundColor: `${colors.brandGreen}20` }]}>
                                                <Text style={[styles.newBadgeText, { color: colors.brandGreen }]}>NUEVO</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>
                                            {producto.nombre_producto}
                                        </Text>
                                        <Text style={[styles.prodCode, { color: colors.textSub }]}>
                                            {producto.codigo_producto}  ·  Bs {producto.precio_base_venta.toFixed(2)}
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={[styles.qtyInput, { color: colors.textMain, backgroundColor: subtleBg, borderColor: colors.brandGreen }]}
                                        value={qty}
                                        onChangeText={v => setNewItems(p => ({ ...p, [prodId]: { ...p[prodId], qty: v } }))}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textSub}
                                    />
                                    <Text style={[styles.subtotalText, { color: colors.textMain }]}>
                                        Bs {((parseFloat(qty) || 0) * producto.precio_base_venta).toFixed(2)}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                                        onPress={() => removeNewItem(prodId)}
                                    >
                                        <Ionicons name="close" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {detalles.length === 0 && Object.keys(newItems).length === 0 && (
                            <View style={styles.emptyProducts}>
                                <Ionicons name="cart-outline" size={32} color={colors.textSub} />
                                <Text style={[styles.emptyText, { color: colors.textSub }]}>Sin productos. Usa "Agregar" para añadir.</Text>
                            </View>
                        )}
                    </View>

                    {/* ── OBSERVACIÓN ── */}
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textMain }]}>OBSERVACIÓN</Text>
                        <TextInput
                            style={[styles.obsInput, { backgroundColor: subtleBg, color: colors.textMain, borderColor: observacion.trim() ? colors.brandGreen : colors.cardBorder }]}
                            placeholder="Ej: Crédito 30 días, pago en efectivo..."
                            placeholderTextColor={colors.textSub}
                            value={observacion}
                            onChangeText={setObservacion}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* ── NOTA SINCRONIZACIÓN ── */}
                    <View style={[styles.syncNote, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', borderColor: '#93C5FD' }]}>
                        <Ionicons name="sync-outline" size={16} color="#3B82F6" />
                        <Text style={styles.syncNoteText}>
                            Al guardar, el pedido se re-sincronizará automáticamente con el sistema principal.
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── FOOTER ── */}
            <View style={[styles.footer, { backgroundColor: cardBg, borderTopColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
                <View style={styles.footerTotal}>
                    <Text style={[styles.footerLabel, { color: colors.textSub }]}>TOTAL ACTUALIZADO</Text>
                    <Text style={[styles.footerAmount, { color: colors.brandGreen }]}>
                        Bs {calcTotal().toFixed(2)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: saving ? colors.textSub : colors.brandGreen }]}
                    onPress={guardarCambios}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── MODAL ÉXITO ── */}
            <Modal visible={successModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: cardBg }]}>
                        <View style={[styles.modalIconBg, { backgroundColor: `${colors.brandGreen}20` }]}>
                            <Ionicons name="checkmark-circle" size={44} color={colors.brandGreen} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.textMain }]}>¡Pedido actualizado!</Text>
                        <Text style={[styles.modalBody, { color: colors.textSub }]}>
                            Los cambios se sincronizarán automáticamente.
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },

    // HEADER
    headerGradient: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerContent: { paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    clientChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 4 },
    clientChipText: { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: 260 },

    // SCROLL
    scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

    // SECCIÓN
    section: { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    // BOTÓN AGREGAR
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    addBtnText: { fontSize: 12, fontWeight: '700' },

    // PANEL AGREGAR
    addPanel: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 12 },
    searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, height: 40, gap: 8, marginBottom: 8 },
    searchInput: { flex: 1, fontSize: 14 },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
    searchResultName: { fontSize: 14, fontWeight: '600' },
    searchResultSub: { fontSize: 11, marginTop: 2 },
    addItemBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    noResults: { textAlign: 'center', paddingVertical: 12, fontSize: 13 },

    // TABLA
    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
    thText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // FILA DETALLE
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
    prodName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    prodCode: { fontSize: 11, marginTop: 2 },
    qtyInput: { width: 60, height: 36, borderRadius: 8, borderWidth: 1.5, textAlign: 'center', fontSize: 14, fontWeight: '700' },
    subtotalText: { width: 76, textAlign: 'right', fontSize: 13, fontWeight: '700' },
    deleteBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

    // BADGE NUEVO
    newBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    newBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    // VACÍO
    emptyProducts: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 13, textAlign: 'center' },

    // OBSERVACIÓN
    obsInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 72, marginTop: 8 },

    // NOTA SYNC
    syncNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
    syncNoteText: { flex: 1, fontSize: 12, color: '#3B82F6', lineHeight: 18 },

    // FOOTER
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 24, borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 16 },
    footerTotal: { flex: 1 },
    footerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    footerAmount: { fontSize: 22, fontWeight: '800' },
    saveButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, elevation: 4 },
    saveButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // MODAL ÉXITO
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 28, alignItems: 'center', elevation: 10 },
    modalIconBg: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
    modalBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});