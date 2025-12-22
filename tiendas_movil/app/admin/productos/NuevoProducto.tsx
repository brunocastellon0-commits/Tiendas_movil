import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { productoService } from '../../../services/ProductoService';

export default function NuevoProductoScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // ESTADO: Inicializamos todos los campos
    // Usamos strings ('') para los inputs, incluso si son números en la BD
    const [form, setForm] = useState({
        codigo_producto: '',
        nombre_producto: '',
        estado: '',       // Ej: 'Nuevo', 'Oferta'
        tipo: '',         // Ej: 'Bebida', 'Snack'
        activo: true,     // Boolean (Switch)

        precio_base_venta: '',
        unidad_base_venta: '',
        comision: '',
        comision2: '',

        stock_actual: '',
        stock_min: '',
        stock_max: '',
        peso_bruto: '',

        observacion: '',
        extra_1: '',      // Campo libre
    });

    const handleSave = async () => {
        // 1. Validar SOLO los obligatorios (Not Null en DB)
        if (!form.nombre_producto || !form.precio_base_venta || !form.unidad_base_venta) {
            Alert.alert('Faltan datos', 'El Nombre, Precio Base y Unidad son obligatorios.');
            return;
        }

        setLoading(true);
        try {
            // 2. Preparar objeto para Supabase
            // TRUCO: Si el campo está vacío (''), mandamos null. Si tiene algo, lo convertimos.
            await productoService.createProducto({
                // Textos obligatorios
                nombre_producto: form.nombre_producto,
                unidad_base_venta: form.unidad_base_venta,

                // Textos opcionales (Si está vacío manda null, si no manda el texto)
                codigo_producto: form.codigo_producto,
                estado: form.estado,
                tipo: form.tipo,
                observacion: form.observacion || null,
                extra_1: form.extra_1 || null,

                // Números (Dinero -> Float)
                precio_base_venta: parseFloat(form.precio_base_venta),
                comision: form.comision ? parseFloat(form.comision) : null,
                comision2: form.comision2 ? parseFloat(form.comision2) : null,
                peso_bruto: form.peso_bruto ? parseFloat(form.peso_bruto) : null,

                // Números (Enteros -> Int)
                stock_actual: form.stock_actual ? parseInt(form.stock_actual) : 0, // Si no pone nada, asumimos 0
                stock_min: form.stock_min ? parseInt(form.stock_min) : 0,
                stock_max: form.stock_max ? parseInt(form.stock_max) : 0,

                // Booleanos y FKs
                activo: form.activo,
                categoria_id: null, // Pendiente para cuando tengas tabla categorías
                proveedor_id: null, // Pendiente para cuando tengas tabla proveedores
                precios_volumen: null // Pendiente (es complejo, lo vemos luego)
            });

            Alert.alert("¡Éxito!", "Producto registrado correctamente", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Hubo un problema al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* Header Personalizado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nuevo Producto</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- TARJETA 1: INFORMACIÓN PRINCIPAL --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="cube-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Información Principal</Text>
                    </View>

                    <Text style={styles.label}>Nombre del Producto *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Coca Cola 3L"
                        value={form.nombre_producto}
                        onChangeText={t => setForm({ ...form, nombre_producto: t })}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Código</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="PROD-001"
                                value={form.codigo_producto}
                                onChangeText={t => setForm({ ...form, codigo_producto: t })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Tipo</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Gaseosa"
                                value={form.tipo}
                                onChangeText={t => setForm({ ...form, tipo: t })}
                            />
                        </View>
                    </View>

                    {/* Switch de Activo */}
                    <View style={styles.switchRow}>
                        <Text style={styles.label}>¿Producto Activo?</Text>
                        <Switch
                            value={form.activo}
                            onValueChange={val => setForm({ ...form, activo: val })}
                            trackColor={{ false: "#767577", true: "#a5d6a7" }}
                            thumbColor={form.activo ? "#2a8c4a" : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* --- TARJETA 2: PRECIOS Y COMISIONES --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="pricetag-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Venta y Comisiones</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Precio Base (Bs) *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                value={form.precio_base_venta}
                                onChangeText={t => setForm({ ...form, precio_base_venta: t })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Unidad *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Unid, Caja"
                                value={form.unidad_base_venta}
                                onChangeText={t => setForm({ ...form, unidad_base_venta: t })}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Comisión 1 (Bs)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Opcional"
                                value={form.comision}
                                onChangeText={t => setForm({ ...form, comision: t })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Comisión 2 (Bs)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Opcional"
                                value={form.comision2}
                                onChangeText={t => setForm({ ...form, comision2: t })}
                            />
                        </View>
                    </View>
                </View>

                {/* --- TARJETA 3: INVENTARIO --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="inventory" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Control de Inventario</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Stock Actual</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0"
                                value={form.stock_actual}
                                onChangeText={t => setForm({ ...form, stock_actual: t })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Peso Bruto</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Kg/Gr"
                                value={form.peso_bruto}
                                onChangeText={t => setForm({ ...form, peso_bruto: t })}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Stock Mínimo</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Alerta bajo"
                                value={form.stock_min}
                                onChangeText={t => setForm({ ...form, stock_min: t })}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Stock Máximo</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="Tope"
                                value={form.stock_max}
                                onChangeText={t => setForm({ ...form, stock_max: t })}
                            />
                        </View>
                    </View>
                </View>

                {/* --- TARJETA 4: OTROS --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Información Adicional</Text>
                    </View>

                    <Text style={styles.label}>Estado (Etiqueta)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Oferta de verano"
                        value={form.estado}
                        onChangeText={t => setForm({ ...form, estado: t })}
                    />

                    <Text style={styles.label}>Observaciones</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Notas internas..."
                        multiline
                        numberOfLines={3}
                        value={form.observacion}
                        onChangeText={t => setForm({ ...form, observacion: t })}
                    />

                    <Text style={styles.label}>Extra / Atributo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Campo libre (extra_1)"
                        value={form.extra_1}
                        onChangeText={t => setForm({ ...form, extra_1: t })}
                    />
                </View>

                {/* BOTÓN GUARDAR */}
                <TouchableOpacity style={styles.btnGuardar} onPress={handleSave} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.btnText}>Guardar Producto</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ESTILOS (Mantenemos la línea visual de tu app)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: {
        backgroundColor: '#2a8c4a',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 16 },

    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2a8c4a', marginLeft: 8 },

    label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 5, fontWeight: '500' },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#333',
        marginBottom: 5
    },
    row: { flexDirection: 'row', marginBottom: 5 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },

    btnGuardar: {
        backgroundColor: '#2a8c4a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
        elevation: 4
    },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});