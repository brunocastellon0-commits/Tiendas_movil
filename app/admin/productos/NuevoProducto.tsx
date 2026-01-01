import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Modal, FlatList, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// Importamos tus servicios y tipos
import { productoService } from '../../../services/ProductoService';
import { obtenerCategoria } from '../../../services/CategoriaService';
import { proveedorService } from '../../../services/ProveedorServices';
import { Producto, Equivalencia } from '../../../types/Producto.interface';
import { Categorias } from '../../../types/Categorias.inteface';
import { Proveedor } from '../../../types/Proveedores.interface';

export default function NuevoProductoScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // --- 1. FORMULARIO COMPLETO (Todos los datos del escritorio) ---
    const [form, setForm] = useState<Producto>({
        id: '', // Se asignará al crear en el backend
        // Identificación
        codigo_producto: '',
        nombre_producto: '',
        estado: 'Vigente',
        tipo: 'Producto Comercial',

        // Precios
        precio_base_venta: 0,
        unidad_base_venta: 'UND',

        // Inventario
        stock_min: 5,
        stock_max: 1000,
        stock_actual: 0, // Stock Inicial

        // Pesos y Medidas
        peso_bruto: 0,
        kg_unidad: 0,

        // Comisiones
        comision: 0,
        comision2: 0,

        // Configuración (Switches)
        descuento_volumen: false,
        descuento_temporada: false,
        precios_volumen: false,

        // Extras
        observacion: '',
        extra_1: '',
        activo: true,

        // Relaciones (Foreign Keys)
        id_categoria: '',
        proveedor_id: ''
    });

    // --- 2. EQUIVALENCIAS (Dinámicas) ---
    const [listaEquivalencias, setListaEquivalencias] = useState<Equivalencia[]>([]);
    const [tempNombre, setTempNombre] = useState('');
    const [tempFactor, setTempFactor] = useState('');
    const [tempPrecio, setTempPrecio] = useState('');

    // --- 3. SELECTORES ---
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [modalCatVisible, setModalCatVisible] = useState(false);
    const [modalProvVisible, setModalProvVisible] = useState(false);
    const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
    const [txtCategoria, setTxtCategoria] = useState('Seleccione Categoría');
    const [txtProveedor, setTxtProveedor] = useState('Seleccione Proveedor');

    useEffect(() => {
        cargarListas();
    }, []);

    const cargarListas = async () => {
        try {
            const [c, p] = await Promise.all([
                obtenerCategoria(),
                proveedorService.getProveedores()
            ]);
            setCategorias(c || []);
            setProveedores(p || []);
        } catch (e) { console.error(e); }
    };

    const updateForm = (key: keyof Producto, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const agregarEquivalencia = () => {
        if (!tempNombre || !tempFactor || !tempPrecio) {
            Alert.alert("Faltan datos", "Llena nombre, factor y precio");
            return;
        }

        const nueva: Equivalencia = {
            id: '', // Se asignará en el backend
            nombre_unidad: tempNombre,
            conversion_factores: parseInt(tempFactor),
            precio_mayor: parseFloat(tempPrecio),
            id_producto: '' // Se asignará al guardar el producto
        };

        setListaEquivalencias([...listaEquivalencias, nueva]);
        setTempNombre(''); setTempFactor(''); setTempPrecio('');
    };

    const guardarProducto = async () => {
        // Validaciones básicas
        if (!form.codigo_producto || !form.nombre_producto || !form.id_categoria) {
            Alert.alert("Error", "Código, Nombre y Categoría son obligatorios");
            return;
        }

        setLoading(true);
        try {
            // Llamamos a la función correcta del servicio
            await productoService.createProducto(form, listaEquivalencias);

            Alert.alert("¡Éxito!", "Producto creado correctamente con todas sus opciones.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nuevo Producto</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- SECCIÓN 1: DATOS BÁSICOS --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="barcode" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Identificación</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Código *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: ARC-001"
                                value={form.codigo_producto}
                                onChangeText={t => updateForm('codigo_producto', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>Estado</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => setModalEstadoVisible(true)}>
                                <Text style={{ color: form.estado === 'Vigente' ? '#2a8c4a' : '#D32F2F', fontWeight: 'bold' }}>{form.estado}</Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.label}>Nombre Producto *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: NUCITA DOBLE SABOR..."
                        value={form.nombre_producto}
                        onChangeText={t => updateForm('nombre_producto', t)}
                    />

                    <Text style={styles.label}>Tipo</Text>
                    <TextInput
                        style={styles.input}
                        value={form.tipo}
                        onChangeText={t => updateForm('tipo', t)}
                    />
                </View>

                {/* --- SECCIÓN 2: PRECIOS Y UNIDADES --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="tag-multiple" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Precios y Unidades</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Precio Base (Bs) *</Text>
                            <TextInput
                                style={[styles.input, { fontWeight: 'bold', color: '#2a8c4a' }]}
                                placeholder="0.00"
                                keyboardType="numeric"
                                onChangeText={t => updateForm('precio_base_venta', parseFloat(t) || 0)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>Unidad Base *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="UND"
                                value={form.unidad_base_venta}
                                onChangeText={t => updateForm('unidad_base_venta', t)}
                            />
                        </View>
                    </View>

                    {/* Lista Dinámica de Equivalencias */}
                    <Text style={[styles.label, { marginTop: 10 }]}>Otras presentaciones (Cajas, Docenas):</Text>
                    {listaEquivalencias.map((eq, i) => (
                        <View key={i} style={styles.eqItem}>
                            <Text style={{ fontWeight: '600', color: '#333' }}>
                                {eq.nombre_unidad} (x{eq.conversion_factores})
                            </Text>
                            <Text style={{ color: '#2a8c4a', fontWeight: 'bold' }}>Bs {eq.precio_mayor}</Text>
                            <TouchableOpacity onPress={() => setListaEquivalencias(l => l.filter((_, idx) => idx !== i))}>
                                <Ionicons name="trash" size={20} color="#D32F2F" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={styles.addEqRow}>
                        <TextInput style={[styles.inputSmall, { flex: 2 }]} placeholder="Ej: CAJA" value={tempNombre} onChangeText={setTempNombre} />
                        <TextInput style={[styles.inputSmall, { flex: 1 }]} placeholder="Cant" keyboardType="numeric" value={tempFactor} onChangeText={setTempFactor} />
                        <TextInput style={[styles.inputSmall, { flex: 1.5 }]} placeholder="Precio" keyboardType="numeric" value={tempPrecio} onChangeText={setTempPrecio} />
                        <TouchableOpacity style={styles.btnAdd} onPress={agregarEquivalencia}>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>AGREGAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- SECCIÓN 3: CLASIFICACIÓN --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="shape" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Clasificación</Text>
                    </View>

                    <Text style={styles.label}>Categoría *</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalCatVisible(true)}>
                        <Text style={{ color: '#333' }}>{txtCategoria}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <Text style={styles.label}>Proveedor</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalProvVisible(true)}>
                        <Text style={{ color: '#333' }}>{txtProveedor}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* --- SECCIÓN 4: INVENTARIO, PESOS Y COMISIONES (Lo que faltaba) --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <FontAwesome5 name="cogs" size={18} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Configuración Avanzada</Text>
                    </View>

                    {/* Inventario */}
                    <Text style={styles.label}>Stock Inicial (Físico Actual)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        onChangeText={t => updateForm('stock_actual', parseInt(t) || 0)}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Stock Min</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={form.stock_min.toString()} onChangeText={t => updateForm('stock_min', parseInt(t) || 0)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>Stock Max</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={form.stock_max.toString()} onChangeText={t => updateForm('stock_max', parseInt(t) || 0)} />
                        </View>
                    </View>

                    {/* Pesos */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Kg x Unidad</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" onChangeText={t => updateForm('kg_unidad', parseFloat(t) || 0)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>Peso Bruto</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" onChangeText={t => updateForm('peso_bruto', parseFloat(t) || 0)} />
                        </View>
                    </View>

                    {/* Comisiones */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>% Comisión 1</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" onChangeText={t => updateForm('comision', parseFloat(t) || 0)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>% Comisión 2</Text>
                            <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" onChangeText={t => updateForm('comision2', parseFloat(t) || 0)} />
                        </View>
                    </View>

                    {/* Switches (Descuentos) */}
                    <View style={styles.switchRow}>
                        <Text style={styles.labelSwitch}>Descuento por Volumen</Text>
                        <Switch
                            value={form.descuento_volumen}
                            onValueChange={v => updateForm('descuento_volumen', v)}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={form.descuento_volumen ? "#2a8c4a" : "#f4f3f4"}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.labelSwitch}>Descuento Temporada</Text>
                        <Switch
                            value={form.descuento_temporada}
                            onValueChange={v => updateForm('descuento_temporada', v)}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={form.descuento_temporada ? "#2a8c4a" : "#f4f3f4"}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.labelSwitch}>Precios por Volumen</Text>
                        <Switch
                            value={form.precios_volumen}
                            onValueChange={v => updateForm('precios_volumen', v)}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={form.precios_volumen ? "#2a8c4a" : "#f4f3f4"}
                        />
                    </View>

                    {/* Extras */}
                    <Text style={styles.label}>Observaciones</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Notas adicionales..."
                        value={form.observacion}
                        onChangeText={t => updateForm('observacion', t)}
                    />
                    <Text style={styles.label}>Extra 1</Text>
                    <TextInput
                        style={styles.input}
                        value={form.extra_1}
                        onChangeText={t => updateForm('extra_1', t)}
                    />
                </View>

                {/* BOTÓN FINAL */}
                <TouchableOpacity style={styles.btnSave} onPress={guardarProducto} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>GUARDAR PRODUCTO</Text>}
                </TouchableOpacity>

            </ScrollView>

            {/* MODALES (Igual que antes) */}
            <Modal visible={modalCatVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
                        <FlatList data={categorias} keyExtractor={i => i.id} renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => {
                                updateForm('id_categoria', item.id);
                                setTxtCategoria(`${item.nombre_categoria} - ${item.marca}`);
                                setModalCatVisible(false);
                            }}>
                                <Text style={{ fontWeight: 'bold' }}>{item.nombre_categoria}</Text>
                                <Text style={{ fontSize: 12, color: '#666' }}>{item.empresa} • {item.linea}</Text>
                            </TouchableOpacity>
                        )} />
                        <TouchableOpacity onPress={() => setModalCatVisible(false)} style={styles.modalClose}><Text style={{ color: 'red' }}>Cerrar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalProvVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccionar Proveedor</Text>
                        <FlatList data={proveedores} keyExtractor={i => i.id || '0'} renderItem={({ item }) => (
                            <TouchableOpacity style={styles.modalItem} onPress={() => {
                                updateForm('proveedor_id', item.id);
                                setTxtProveedor(item.nombre);
                                setModalProvVisible(false);
                            }}>
                                <Text>{item.nombre}</Text>
                            </TouchableOpacity>
                        )} />
                        <TouchableOpacity onPress={() => setModalProvVisible(false)} style={styles.modalClose}><Text style={{ color: 'red' }}>Cerrar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Estado */}
            <Modal visible={modalEstadoVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Seleccionar Estado</Text>

                        <TouchableOpacity
                            style={[styles.modalItem, { backgroundColor: form.estado === 'Vigente' ? '#E8F5E9' : 'white' }]}
                            onPress={() => {
                                updateForm('estado', 'Vigente');
                                setModalEstadoVisible(false);
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="#2a8c4a" />
                            <Text style={{ fontWeight: 'bold', color: '#2a8c4a', marginLeft: 10 }}>Vigente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalItem, { backgroundColor: form.estado === 'No Vigente' ? '#FFEBEE' : 'white' }]}
                            onPress={() => {
                                updateForm('estado', 'No Vigente');
                                setModalEstadoVisible(false);
                            }}
                        >
                            <Ionicons name="close-circle" size={24} color="#D32F2F" />
                            <Text style={{ fontWeight: 'bold', color: '#D32F2F', marginLeft: 10 }}>No Vigente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalEstadoVisible(false)} style={styles.modalClose}>
                            <Text style={{ color: '#666' }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { backgroundColor: '#2a8c4a', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 15 },

    // Cards
    card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2a8c4a', marginLeft: 8 },

    label: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, color: '#333' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },

    // Equivalencias
    eqItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2a8c4a' },
    addEqRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    inputSmall: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8, height: 40, marginRight: 5, fontSize: 13 },
    btnAdd: { backgroundColor: '#2a8c4a', padding: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center', height: 40 },

    // Selectors
    selector: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },

    // Switches
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', paddingBottom: 5 },
    labelSwitch: { fontSize: 14, color: '#333' },

    // Botones y Modales
    btnSave: { backgroundColor: '#1F2937', padding: 16, borderRadius: 10, alignItems: 'center', marginVertical: 20 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalClose: { marginTop: 15, padding: 10, alignItems: 'center' }
});