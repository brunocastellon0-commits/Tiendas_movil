import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Modal, FlatList, Switch, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Servicios y Tipos
import { productoService } from '../../../services/ProductoService';
import { obtenerCategoria } from '../../../services/CategoriaService';
import { proveedorService } from '../../../services/ProveedorServices';
import { Producto, Equivalencia } from '../../../types/Producto.interface';
import { Categorias } from '../../../types/Categorias.inteface';
import { Proveedor } from '../../../types/Proveedores.interface';

export default function NuevoProductoScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    // --- FORMULARIO ---
    const [form, setForm] = useState<Producto>({
        id: '',
        codigo_producto: '', nombre_producto: '', estado: 'Vigente', tipo: 'Producto Comercial',
        precio_base_venta: 0, unidad_base_venta: 'UND',
        stock_min: 5, stock_max: 1000, stock_actual: 0,
        peso_bruto: 0, kg_unidad: 0,
        comision: 0, comision2: 0,
        descuento_volumen: false, descuento_temporada: false, precios_volumen: false,
        observacion: '', extra_1: '', activo: true,
        id_categoria: '', proveedor_id: ''
    });

    // Estados Auxiliares
    const [listaEquivalencias, setListaEquivalencias] = useState<Equivalencia[]>([]);
    const [tempNombre, setTempNombre] = useState('');
    const [tempFactor, setTempFactor] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');

    // Selectores y Modales
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);

    const [modalCatVisible, setModalCatVisible] = useState(false);
    const [modalProvVisible, setModalProvVisible] = useState(false);
    const [modalEstadoVisible, setModalEstadoVisible] = useState(false);

    const [txtCategoria, setTxtCategoria] = useState('Seleccione Categoría');
    const [txtProveedor, setTxtProveedor] = useState('Seleccione Proveedor');

    useEffect(() => {
        cargarListas();
        if (id) cargarProductoExistente();
    }, []);

    const cargarListas = async () => {
        try {
            const [c, p] = await Promise.all([obtenerCategoria(), proveedorService.getProveedores()]);
            setCategorias(c || []);
            setProveedores(p || []);
        } catch (e) { console.error(e); }
    };

    const cargarProductoExistente = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const prod = await productoService.getProductoById(id.toString());
            setForm(prod);

            // Cargar equivalencias
            const eqs = await productoService.getEquivalenciaProducto(id.toString());
            setListaEquivalencias(eqs);

            // Setear textos de selectores
            const cat = (await obtenerCategoria()).find(c => c.id === prod.id_categoria);
            if (cat) setTxtCategoria(`${cat.nombre_categoria}`);

            const prov = (await proveedorService.getProveedores()).find(p => p.id === prod.proveedor_id);
            if (prov) setTxtProveedor(prov.nombre);
        } catch (e: any) {
            Alert.alert("Error", e.message);
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (key: keyof Producto, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const agregarEquivalencia = () => {
        if (!tempNombre || !tempFactor || !tempPrecio) {
            Alert.alert("Atención", "Completa nombre, cantidad y precio para agregar.");
            return;
        }
        setListaEquivalencias([...listaEquivalencias, {
            id: '', nombre_unidad: tempNombre, conversion_factores: parseInt(tempFactor),
            precio_mayor: parseFloat(tempPrecio), id_producto: ''
        }]);
        setTempNombre(''); setTempFactor(''); setTempPrecio('');
    };

    const borrarEquivalencia = (index: number) => {
        setListaEquivalencias(l => l.filter((_, idx) => idx !== index));
    };

    const guardarProducto = async () => {
        if (!form.codigo_producto || !form.nombre_producto || !form.id_categoria) {
            Alert.alert("Campos incompletos", "Código, Nombre y Categoría son obligatorios.");
            return;
        }
        setLoading(true);
        try {
            if (id) {
                await productoService.updateProducto(id.toString(), form, listaEquivalencias);
                Alert.alert("¡Éxito!", "Producto actualizado correctamente.");
            } else {
                await productoService.createProducto(form, listaEquivalencias);
                Alert.alert("¡Éxito!", "Producto creado correctamente.");
            }
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- COMPONENTES UI REUTILIZABLES ---

    const InputField = ({ label, icon, value, onChange, placeholder, keyboard = 'default', multiline = false }: any) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
            <View style={[styles.inputWrapper, {
                backgroundColor: colors.inputBg,
                borderColor: isDark ? colors.cardBorder : 'transparent',
                borderWidth: isDark ? 1 : 0,
                height: multiline ? 80 : 52,
                alignItems: multiline ? 'flex-start' : 'center',
                paddingTop: multiline ? 12 : 0
            }]}>
                <MaterialCommunityIcons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }} />
                <TextInput
                    style={[styles.input, { color: colors.textMain, height: '100%', textAlignVertical: multiline ? 'top' : 'center' }]}
                    value={value?.toString()}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSub}
                    keyboardType={keyboard}
                    multiline={multiline}
                />
            </View>
        </View>
    );

    const SwitchRow = ({ label, value, onToggle }: any) => (
        <View style={[styles.switchContainer, { backgroundColor: isDark ? colors.inputBg : '#F9FAFB' }]}>
            <Text style={[styles.labelSwitch, { color: colors.textMain }]}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: "#D1D5DB", true: colors.brandGreen }}
                thumbColor={"#fff"}
            />
        </View>
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
                        {/* Botón Atrás: Grande y fácil de tocar */}
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>{id ? 'Editar Producto' : 'Nuevo Producto'}</Text>

                        {/* Espaciador para centrar título */}
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Icono Grande */}
                    <View style={styles.headerIconRow}>
                        <View style={styles.iconBigCircle}>
                            <FontAwesome5 name="box-open" size={32} color={colors.brandGreen} />
                        </View>
                        <Text style={styles.headerSubtitle}>Detalles del Item</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* --- FORMULARIO SCROLLABLE --- */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Tarjeta Contenedora Principal */}
                    <View style={[styles.formSheet, {
                        backgroundColor: colors.cardBg,
                        borderColor: isDark ? colors.cardBorder : 'transparent',
                        borderWidth: isDark ? 1 : 0
                    }]}>

                        {/* 1. IDENTIFICACIÓN */}
                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>IDENTIFICACIÓN</Text>

                        <InputField label="Código *" icon="barcode" value={form.codigo_producto} onChange={(t: string) => updateForm('codigo_producto', t)} placeholder="Ej: PROD-001" />
                        <InputField label="Nombre *" icon="tag-text-outline" value={form.nombre_producto} onChange={(t: string) => updateForm('nombre_producto', t)} placeholder="Ej: Galletas Oreo" />

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.label, { color: colors.textMain }]}>Estado</Text>
                                <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: colors.inputBg }]} onPress={() => setModalEstadoVisible(true)}>
                                    <Text style={{ color: form.estado === 'Vigente' ? colors.brandGreen : '#EF5350', fontWeight: 'bold' }}>{form.estado}</Text>
                                    <Ionicons name="chevron-down" size={18} color={colors.textSub} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Tipo" icon="shape-outline" value={form.tipo} onChange={(t: string) => updateForm('tipo', t)} />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* 2. PRECIOS Y UNIDADES */}
                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>PRECIOS Y UNIDADES</Text>

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Precio Base *" icon="cash" value={form.precio_base_venta} onChange={(t: string) => updateForm('precio_base_venta', parseFloat(t) || 0)} keyboard="numeric" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Unidad Base *" icon="scale" value={form.unidad_base_venta} onChange={(t: string) => updateForm('unidad_base_venta', t)} placeholder="UND" />
                            </View>
                        </View>

                        {/* Tabla de Equivalencias */}
                        <Text style={[styles.label, { color: colors.textMain, marginTop: 10 }]}>Presentaciones Adicionales</Text>
                        <View style={[styles.eqContainer, { borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
                            {listaEquivalencias.map((eq, i) => (
                                <View key={i} style={[styles.eqItem, { borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6' }]}>
                                    <Text style={{ flex: 1, color: colors.textMain, fontWeight: '600' }}>{eq.nombre_unidad} (x{eq.conversion_factores})</Text>
                                    <Text style={{ color: colors.brandGreen, marginRight: 15, fontWeight: 'bold' }}>Bs {eq.precio_mayor}</Text>
                                    <TouchableOpacity onPress={() => borrarEquivalencia(i)}>
                                        <Ionicons name="trash-outline" size={20} color="#EF5350" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Inputs para agregar nueva equivalencia */}
                            <View style={styles.addEqRow}>
                                <TextInput style={[styles.inputSmall, { flex: 2, backgroundColor: colors.inputBg, color: colors.textMain }]} placeholder="Unidad (Ej: Caja)" placeholderTextColor={colors.textSub} value={tempNombre} onChangeText={setTempNombre} />
                                <TextInput style={[styles.inputSmall, { flex: 1, backgroundColor: colors.inputBg, color: colors.textMain }]} placeholder="Cant" placeholderTextColor={colors.textSub} keyboardType="numeric" value={tempFactor} onChangeText={setTempFactor} />
                                <TextInput style={[styles.inputSmall, { flex: 1.5, backgroundColor: colors.inputBg, color: colors.textMain }]} placeholder="Precio" placeholderTextColor={colors.textSub} keyboardType="numeric" value={tempPrecio} onChangeText={setTempPrecio} />
                                <TouchableOpacity style={[styles.btnAddSmall, { backgroundColor: colors.brandGreen }]} onPress={agregarEquivalencia}>
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* 3. CLASIFICACIÓN */}
                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>CLASIFICACIÓN</Text>

                        <Text style={[styles.label, { color: colors.textMain }]}>Categoría</Text>
                        <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: colors.inputBg, marginBottom: 15 }]} onPress={() => setModalCatVisible(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="shape" size={20} color={colors.iconGray} style={{ marginRight: 10 }} />
                                <Text style={{ color: colors.textMain }}>{txtCategoria}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={colors.textSub} />
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: colors.textMain }]}>Proveedor</Text>
                        <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: colors.inputBg }]} onPress={() => setModalProvVisible(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="truck" size={20} color={colors.iconGray} style={{ marginRight: 10 }} />
                                <Text style={{ color: colors.textMain }}>{txtProveedor}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={colors.textSub} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* 4. CONFIGURACIÓN AVANZADA */}
                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>CONFIGURACIÓN AVANZADA</Text>

                        <InputField label="Stock Inicial (Físico)" icon="layers-outline" value={form.stock_actual} onChange={(t: string) => updateForm('stock_actual', parseInt(t) || 0)} keyboard="numeric" />

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Stock Mínimo" icon="arrow-down" value={form.stock_min} onChange={(t: string) => updateForm('stock_min', parseInt(t) || 0)} keyboard="numeric" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Stock Máximo" icon="arrow-up" value={form.stock_max} onChange={(t: string) => updateForm('stock_max', parseInt(t) || 0)} keyboard="numeric" />
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Peso Bruto" icon="weight" value={form.peso_bruto} onChange={(t: string) => updateForm('peso_bruto', parseFloat(t) || 0)} keyboard="numeric" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Kg x Unidad" icon="weight-kilogram" value={form.kg_unidad} onChange={(t: string) => updateForm('kg_unidad', parseFloat(t) || 0)} keyboard="numeric" />
                            </View>
                        </View>

                        {/* Switches */}
                        <View style={{ gap: 10, marginBottom: 15 }}>
                            <SwitchRow label="Descuento por Volumen" value={form.descuento_volumen} onToggle={(v: boolean) => updateForm('descuento_volumen', v)} />
                            <SwitchRow label="Descuento de Temporada" value={form.descuento_temporada} onToggle={(v: boolean) => updateForm('descuento_temporada', v)} />
                            <SwitchRow label="Precios Diferenciados" value={form.precios_volumen} onToggle={(v: boolean) => updateForm('precios_volumen', v)} />
                        </View>

                        <InputField label="Observaciones" icon="comment-text-outline" value={form.observacion} onChange={(t: string) => updateForm('observacion', t)} multiline />

                        {/* Botón Principal */}
                        <TouchableOpacity
                            style={[styles.submitBtn, {
                                backgroundColor: colors.brandGreen,
                                shadowColor: colors.brandGreen,
                                opacity: loading ? 0.7 : 1
                            }]}
                            onPress={guardarProducto}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>GUARDAR PRODUCTO</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* --- MODALES --- */}

            {/* Modal Categoría */}
            <Modal visible={modalCatVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
                    <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Categoría</Text>
                    <FlatList
                        data={categorias}
                        keyExtractor={i => i.id}
                        style={{ maxHeight: 300 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDark ? '#333' : '#eee' }]} onPress={() => { updateForm('id_categoria', item.id); setTxtCategoria(item.nombre_categoria); setModalCatVisible(false); }}>
                                <Text style={{ color: colors.textMain, fontSize: 16 }}>{item.nombre_categoria}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity onPress={() => setModalCatVisible(false)} style={styles.modalCloseBtn}><Text style={{ color: '#EF5350', fontWeight: 'bold' }}>Cancelar</Text></TouchableOpacity>
                </View></View>
            </Modal>

            {/* Modal Proveedor */}
            <Modal visible={modalProvVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
                    <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Proveedor</Text>
                    <FlatList
                        data={proveedores}
                        keyExtractor={i => i.id || '0'}
                        style={{ maxHeight: 300 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDark ? '#333' : '#eee' }]} onPress={() => { updateForm('proveedor_id', item.id); setTxtProveedor(item.nombre); setModalProvVisible(false); }}>
                                <Text style={{ color: colors.textMain, fontSize: 16 }}>{item.nombre}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <TouchableOpacity onPress={() => setModalProvVisible(false)} style={styles.modalCloseBtn}><Text style={{ color: '#EF5350', fontWeight: 'bold' }}>Cancelar</Text></TouchableOpacity>
                </View></View>
            </Modal>

            {/* Modal Estado */}
            <Modal visible={modalEstadoVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
                    <Text style={[styles.modalTitle, { color: colors.textMain }]}>Estado del Producto</Text>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDark ? '#333' : '#eee' }]} onPress={() => { updateForm('estado', 'Vigente'); setModalEstadoVisible(false); }}>
                        <Text style={{ color: colors.brandGreen, fontWeight: 'bold', fontSize: 16 }}>Vigente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: 'transparent' }]} onPress={() => { updateForm('estado', 'No Vigente'); setModalEstadoVisible(false); }}>
                        <Text style={{ color: '#EF5350', fontWeight: 'bold', fontSize: 16 }}>No Vigente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalEstadoVisible(false)} style={styles.modalCloseBtn}><Text style={{ color: colors.textSub }}>Cancelar</Text></TouchableOpacity>
                </View></View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    // HEADER
    headerGradient: { height: 240, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: 20, position: 'absolute', top: 0, width: '100%', zIndex: 0 },
    headerContent: { flex: 1 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    // Botón Atrás Mejorado
    backBtn: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, justifyContent: 'center' },
    iconBigCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 5 },
    headerSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    // BODY & FORM SHEET
    scrollView: { flex: 1, marginTop: 170 },
    formSheet: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 30 },

    // TYPOGRAPHY & SPACING
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginTop: 5 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20, opacity: 0.5 },

    // INPUTS
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 52, paddingHorizontal: 14 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    rowInputs: { flexDirection: 'row' },

    // SELECTORS
    selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderRadius: 14, paddingHorizontal: 14 },

    // EQUIVALENCIAS
    eqContainer: { borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 5 },
    eqItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    addEqRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    inputSmall: { flex: 1, height: 42, borderRadius: 10, paddingHorizontal: 10 },
    btnAddSmall: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // SWITCHES
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8 },
    labelSwitch: { fontSize: 14, fontWeight: '600' },

    // BUTTON MAIN
    submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

    // MODALS
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 20, padding: 25, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1 },
    modalCloseBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
});