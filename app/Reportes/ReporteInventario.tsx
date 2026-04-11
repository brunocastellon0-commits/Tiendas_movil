import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator, FlatList, Modal, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA: ReporteInventario
// Ruta: app/inventario/ReporteInventario.tsx
//
// Muestra: stock actual por producto + indicador de nivel (crítico/bajo/ok)
// Tabla adicional recomendada para historial:
//   CREATE TABLE movimientos_stock (
//     id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     producto_id   uuid NOT NULL REFERENCES productos(id),
//     tipo          text NOT NULL,   -- 'entrada' | 'salida' | 'ajuste'
//     cantidad      decimal(12,2) NOT NULL,
//     motivo        text,
//     referencia_id uuid,            -- pedido_id si es salida por venta
//     created_at    timestamptz DEFAULT now(),
//     registrado_por uuid REFERENCES employees(id)
//   );
// ─────────────────────────────────────────────────────────────────────────────

interface Producto {
    id: string;
    nombre_producto: string;
    codigo_producto: string;
    stock_actual: number;
    precio_base_venta: number;
    unidad_base_venta: string;
    categorias?: { nombre_categoria: string } | null;
}

type FiltroStock = 'todos' | 'critico' | 'bajo' | 'ok';

const STOCK_CRITICO = 0;
const STOCK_BAJO = 15;

const getNivelStock = (stock: number) => {
    if (stock <= STOCK_CRITICO) return { label: 'Sin stock', color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle' as const };
    if (stock <= STOCK_BAJO) return { label: 'Stock bajo', color: '#F59E0B', bg: '#FFFBEB', icon: 'warning' as const };
    return { label: 'Stock suficiente', color: '#10B981', bg: '#DCFCE7', icon: 'checkmark-circle' as const };
};

export default function ReporteInventarioScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroStock, setFiltroStock] = useState<FiltroStock>('todos');

    // Modal detalle producto
    const [detailModal, setDetailModal] = useState(false);
    const [selectedProd, setSelectedProd] = useState<Producto | null>(null);

    useFocusEffect(useCallback(() => { cargarProductos(); }, []));

    const cargarProductos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('productos')
                .select('id, nombre_producto, codigo_producto, stock_actual, precio_base_venta, unidad_base_venta')
                .eq('activo', true)
                .order('stock_actual', { ascending: true }); // primero los críticos
            if (error) throw error;
            setProductos(data || []);
        } catch (e: any) {
            console.warn('Error cargando inventario:', e.message);
        } finally {
            setLoading(false);
        }
    };

    // Filtrado
    const filtrados = useMemo(() => {
        return productos.filter(p => {
            const q = search.toLowerCase();
            const matchSearch = !q || p.nombre_producto.toLowerCase().includes(q) || p.codigo_producto?.toLowerCase().includes(q);
            const nivel = getNivelStock(p.stock_actual);
            const matchFiltro =
                filtroStock === 'todos' ? true :
                    filtroStock === 'critico' ? p.stock_actual <= STOCK_CRITICO :
                        filtroStock === 'bajo' ? (p.stock_actual > STOCK_CRITICO && p.stock_actual <= STOCK_BAJO) :
                            p.stock_actual > STOCK_BAJO;
            return matchSearch && matchFiltro;
        });
    }, [productos, search, filtroStock]);

    // Resumen
    const resumen = useMemo(() => ({
        criticos: productos.filter(p => p.stock_actual <= STOCK_CRITICO).length,
        bajos: productos.filter(p => p.stock_actual > STOCK_CRITICO && p.stock_actual <= STOCK_BAJO).length,
        ok: productos.filter(p => p.stock_actual > STOCK_BAJO).length,
        total: productos.length,
    }), [productos]);

    const cardBg = isDark ? colors.cardBg : '#fff';

    const renderItem = ({ item }: { item: Producto }) => {
        const nivel = getNivelStock(item.stock_actual);
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0, borderLeftWidth: 4, borderLeftColor: nivel.color }]}
                onPress={() => { setSelectedProd(item); setDetailModal(true); }}
                activeOpacity={0.85}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={2}>
                        {item.nombre_producto}
                    </Text>
                    <Text style={[styles.prodCode, { color: colors.textSub }]}>
                        {item.codigo_producto}  ·  {item.unidad_base_venta || 'UNID'}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[styles.stockNum, { color: nivel.color }]}>
                        {item.stock_actual}
                    </Text>
                    <View style={[styles.nivelBadge, { backgroundColor: nivel.bg }]}>
                        <Ionicons name={nivel.icon} size={10} color={nivel.color} />
                        <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HEADER */}
            <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Reporte de Inventario</Text>
                        <TouchableOpacity style={styles.iconBtn} onPress={cargarProductos}>
                            <Ionicons name="refresh" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Buscador */}
                    <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar producto o código..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* LISTA */}
            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                    </View>
                ) : (
                    <FlatList
                        data={filtrados}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="package-variant-closed" size={60} color={colors.textSub} style={{ opacity: 0.3 }} />
                                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Sin resultados</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* MODAL DETALLE PRODUCTO */}
            <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: cardBg }]}>
                        {selectedProd && (() => {
                            const nivel = getNivelStock(selectedProd.stock_actual);
                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Text style={[styles.modalTitle, { color: colors.textMain }]} numberOfLines={2}>
                                            {selectedProd.nombre_producto}
                                        </Text>
                                        <TouchableOpacity onPress={() => setDetailModal(false)}>
                                            <Ionicons name="close" size={22} color={colors.textSub} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[styles.modalCode, { color: colors.textSub }]}>{selectedProd.codigo_producto}</Text>

                                    {/* Stock visual */}
                                    <View style={[styles.stockCard, { backgroundColor: nivel.bg }]}>
                                        <Text style={[styles.stockCardNum, { color: nivel.color }]}>{selectedProd.stock_actual}</Text>
                                        <Text style={[styles.stockCardLabel, { color: nivel.color }]}>
                                            {selectedProd.unidad_base_venta || 'UNID'} en stock
                                        </Text>
                                        <View style={[styles.nivelBadge, { backgroundColor: 'rgba(0,0,0,0.08)', alignSelf: 'center', marginTop: 4 }]}>
                                            <Ionicons name={nivel.icon} size={12} color={nivel.color} />
                                            <Text style={[styles.nivelText, { color: nivel.color }]}>{nivel.label}</Text>
                                        </View>
                                    </View>

                                    {/* Info adicional */}
                                    <View style={styles.infoGrid}>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoCellLabel, { color: colors.textSub }]}>Precio base</Text>
                                            <Text style={[styles.infoCellVal, { color: colors.textMain }]}>
                                                Bs {selectedProd.precio_base_venta.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={styles.infoCell}>
                                            <Text style={[styles.infoCellLabel, { color: colors.textSub }]}>Valor total</Text>
                                            <Text style={[styles.infoCellVal, { color: colors.brandGreen }]}>
                                                Bs {(selectedProd.stock_actual * selectedProd.precio_base_venta).toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Umbrales de referencia */}
                                    <View style={[styles.umbralNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                                        <Text style={[styles.umbralText, { color: colors.textSub }]}>
                                            Stock crítico: ≤ {STOCK_CRITICO}  ·  Stock bajo: ≤ {STOCK_BAJO}
                                        </Text>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 10 },
    headerContent: { paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 14 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },

    resumenRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    resumenChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    resumenVal: { fontSize: 20, fontWeight: '800' },
    resumenLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },

    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 44, paddingHorizontal: 12, gap: 8, marginBottom: 4 },
    searchInput: { flex: 1, fontSize: 14, color: '#fff' },

    body: { flex: 1, marginTop: -16, zIndex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 26, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    prodName: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 3 },
    prodCode: { fontSize: 11 },
    stockNum: { fontSize: 22, fontWeight: '800' },
    nivelBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    nivelText: { fontSize: 10, fontWeight: '700' },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '600' },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    modalTitle: { fontSize: 17, fontWeight: '700', flex: 1, lineHeight: 22 },
    modalCode: { fontSize: 12, marginBottom: 16 },
    stockCard: { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
    stockCardNum: { fontSize: 48, fontWeight: '800' },
    stockCardLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    infoCell: { flex: 1, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' },
    infoCellLabel: { fontSize: 11, marginBottom: 4 },
    infoCellVal: { fontSize: 16, fontWeight: '700' },
    umbralNote: { borderRadius: 8, padding: 10, alignItems: 'center' },
    umbralText: { fontSize: 11 },
});