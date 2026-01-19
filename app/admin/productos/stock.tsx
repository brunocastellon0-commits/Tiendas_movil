import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
    Alert, ActivityIndicator, TextInput, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Servicios
import { productoService } from '../../../services/ProductoService';
import { Producto, Equivalencia } from '../../../types/Producto.interface';

export default function EntradaMercaderiaScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // Estados
    const [search, setSearch] = useState('');
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [prodSeleccionado, setProdSeleccionado] = useState<Producto | null>(null);
    const [equivalencias, setEquivalencias] = useState<Equivalencia[]>([]);

    // Formulario Ingreso
    const [cantidadEntrante, setCantidadEntrante] = useState('');
    const [unidadSeleccionada, setUnidadSeleccionada] = useState<{ nombre: string, factor: number }>({ nombre: '', factor: 1 });
    const [showSelector, setShowSelector] = useState(false);
    const [precioBaseEdit, setPrecioBaseEdit] = useState('');

    // Búsqueda con Debounce (espera a que termines de escribir)
    useEffect(() => {
        const timer = setTimeout(() => {
            cargarProductos();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const cargarProductos = async () => {
        setLoading(true);
        try {
            // Reutilizamos el servicio de búsqueda
            const data = await productoService.getProductos(search);
            setProductos(data || []);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA MODAL ---
    const abrirModal = async (prod: Producto) => {
        setProdSeleccionado(prod);
        setCantidadEntrante('');
        setPrecioBaseEdit(prod.precio_base_venta.toString());
        setUnidadSeleccionada({ nombre: prod.unidad_base_venta || 'UND', factor: 1 });
        setShowSelector(false);

        try {
            const eqs = await productoService.getEquivalenciaProducto(prod.id!);
            setEquivalencias(eqs);
            setModalVisible(true);
        } catch (e) {
            setModalVisible(true);
        }
    };

    const confirmarEntrada = async () => {
        if (!prodSeleccionado || !cantidadEntrante) return;

        const cantidad = parseFloat(cantidadEntrante);
        const precio = parseFloat(precioBaseEdit);

        if (isNaN(cantidad) || cantidad <= 0) {
            Alert.alert("Error", "La cantidad debe ser mayor a 0.");
            return;
        }

        try {
            await productoService.registroStock(
                prodSeleccionado.id!,
                cantidad,
                unidadSeleccionada.factor,
                precio
            );

            const total = cantidad * unidadSeleccionada.factor;
            Alert.alert("Entrada Registrada", `Se ingresaron ${total} unidades correctamente.`);

            setModalVisible(false);
            cargarProductos(); // Actualizar lista
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    // Render Item
    const renderItem = ({ item }: { item: Producto }) => (
        <TouchableOpacity
            style={[styles.card, {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? colors.cardBorder : 'transparent',
                borderWidth: isDark ? 1 : 0
            }]}
            onPress={() => abrirModal(item)}
            activeOpacity={0.8}
        >
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.15)' : '#E8F5E9' }]}>
                <MaterialCommunityIcons name="cube-send" size={24} color={colors.brandGreen} />
            </View>

            <View style={styles.infoBox}>
                <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={1}>
                    {item.nombre_producto}
                </Text>
                <Text style={[styles.prodCode, { color: colors.textSub }]}>
                    {item.codigo_producto}
                </Text>
            </View>

            <View style={styles.stockBox}>
                <Text style={[styles.stockLabel, { color: colors.textSub }]}>ACTUAL</Text>
                <Text style={[styles.stockValue, { color: colors.brandGreen }]}>{item.stock_actual}</Text>
                <Text style={[styles.unitText, { color: colors.textSub }]}>{item.unidad_base_venta}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* --- HEADER CURVO --- */}
            <LinearGradient
                colors={[colors.brandGreen, '#166534']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Entrada de Stock</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Buscador */}
                    <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar producto para ingresar..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* --- LISTA DE PRODUCTOS --- */}
            <View style={styles.bodyContainer}>
                {/* Fondo Bolitas */}
                <View style={styles.backgroundShapes}>
                    <View style={[styles.shapeCircle, {
                        top: 50, right: -50, width: 200, height: 200,
                        backgroundColor: colors.brandGreen,
                        opacity: colors.bubbleOpacity
                    }]} />
                </View>

                {loading ? (
                    <View style={styles.centerView}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                        <Text style={{ marginTop: 10, color: colors.textSub }}>Buscando...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={productos}
                        keyExtractor={item => item.id!}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                <FontAwesome5 name="search" size={40} color={colors.iconGray} style={{ opacity: 0.5 }} />
                                <Text style={{ color: colors.textSub, marginTop: 10 }}>Busca un producto para empezar</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* --- MODAL DE INGRESO --- */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>

                        {/* Cabecera Modal */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textMain }]}>Registrar Ingreso</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>

                        {prodSeleccionado && (
                            <View>
                                {/* Info Producto */}
                                <Text style={[styles.mProdName, { color: colors.brandGreen }]}>{prodSeleccionado.nombre_producto}</Text>
                                <Text style={{ color: colors.textSub, marginBottom: 20 }}>
                                    Stock Actual: <Text style={{ fontWeight: 'bold', color: colors.textMain }}>{prodSeleccionado.stock_actual} {prodSeleccionado.unidad_base_venta}</Text>
                                </Text>

                                {/* Cantidad y Unidad */}
                                <Text style={[styles.labelInput, { color: colors.textMain }]}>Cantidad a Ingresar</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.inputQty, { flex: 1, color: colors.textMain, backgroundColor: colors.inputBg, borderColor: isDark ? colors.cardBorder : '#DDD' }]}
                                        placeholder="0" placeholderTextColor={colors.textSub} keyboardType="numeric"
                                        value={cantidadEntrante} onChangeText={setCantidadEntrante} autoFocus
                                    />

                                    <TouchableOpacity
                                        style={[styles.unitBtn, { backgroundColor: isDark ? 'rgba(42,140,74,0.2)' : '#E8F5E9', borderColor: colors.brandGreen }]}
                                        onPress={() => setShowSelector(!showSelector)}
                                    >
                                        <Text style={{ color: colors.brandGreen, fontWeight: 'bold' }}>{unidadSeleccionada.nombre}</Text>
                                        <Ionicons name="chevron-down" size={14} color={colors.brandGreen} />
                                    </TouchableOpacity>
                                </View>

                                {/* Dropdown Equivalencias */}
                                {showSelector && (
                                    <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                                        <TouchableOpacity style={styles.dropItem} onPress={() => { setUnidadSeleccionada({ nombre: prodSeleccionado.unidad_base_venta, factor: 1 }); setShowSelector(false); }}>
                                            <Text style={{ color: colors.textMain }}>{prodSeleccionado.unidad_base_venta} (x1)</Text>
                                        </TouchableOpacity>
                                        {equivalencias.map((eq, i) => (
                                            <TouchableOpacity key={i} style={styles.dropItem} onPress={() => { setUnidadSeleccionada({ nombre: eq.nombre_unidad, factor: eq.conversion_factores }); setShowSelector(false); }}>
                                                <Text style={{ color: colors.textMain }}>{eq.nombre_unidad} (x{eq.conversion_factores})</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Cálculo Total */}
                                {cantidadEntrante ? (
                                    <View style={[styles.calcBox, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.1)' : '#F0FDF4' }]}>
                                        <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center' }}>
                                            Total a sumar: <Text style={{ fontWeight: 'bold', color: colors.brandGreen }}>
                                                {parseFloat(cantidadEntrante) * unidadSeleccionada.factor}
                                            </Text> {prodSeleccionado.unidad_base_venta}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Precio (Opcional) */}
                                <Text style={[styles.labelInput, { color: colors.textMain, marginTop: 15 }]}>Actualizar Precio Base (Opcional)</Text>
                                <TextInput
                                    style={[styles.inputQty, { width: '100%', color: colors.textMain, backgroundColor: colors.inputBg, borderColor: isDark ? colors.cardBorder : '#DDD' }]}
                                    placeholder="0.00" placeholderTextColor={colors.textSub} keyboardType="numeric" value={precioBaseEdit} onChangeText={setPrecioBaseEdit}
                                />

                                <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: colors.brandGreen }]} onPress={confirmarEntrada}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CONFIRMAR</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    // Header
    headerGradient: { paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
    headerContent: { paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
    backBtn: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 45, paddingHorizontal: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#fff' },

    // Body
    bodyContainer: { flex: 1, marginTop: -15 },
    listContent: { padding: 20 },
    backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
    shapeCircle: { position: 'absolute', borderRadius: 999 },

    // Card
    card: { flexDirection: 'row', borderRadius: 16, padding: 15, marginBottom: 12, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    infoBox: { flex: 1 },
    prodName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    prodCode: { fontSize: 13 },

    stockBox: { alignItems: 'flex-end', paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
    stockLabel: { fontSize: 9, fontWeight: '700' },
    stockValue: { fontSize: 18, fontWeight: 'bold' },
    unitText: { fontSize: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 24, padding: 25, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    mProdName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },

    labelInput: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', zIndex: 20 },
    inputQty: { height: 50, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
    unitBtn: { height: 50, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 5, minWidth: 100 },

    dropdown: { position: 'absolute', top: 130, right: 0, width: 150, borderWidth: 1, borderRadius: 12, zIndex: 100, padding: 5, elevation: 5 },
    dropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },

    calcBox: { marginTop: 10, padding: 10, borderRadius: 10, alignItems: 'center' },
    btnConfirm: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 25 },

    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyView: { alignItems: 'center', marginTop: 80, opacity: 0.7 },
});
