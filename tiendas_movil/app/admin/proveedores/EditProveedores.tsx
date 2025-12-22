import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView,
    TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { proveedorService } from '../../../services/ProveedorServices';
import { Proveedor } from '../../../types/Proveedores.interface';

export default function EditarProveedorScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Proveedor | null>(null);

    useEffect(() => {
        if (id) cargarDatos(id.toString());
    }, [id]);

    const cargarDatos = async (idProveedor: string) => {
        try {
            const data = await proveedorService.getProveedorById(idProveedor);
            setForm(data);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo cargar el proveedor');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (campo: keyof Proveedor, valor: string) => {
        if (form) setForm({ ...form, [campo]: valor });
    };

    const handleNumberChange = (campo: keyof Proveedor, valor: string) => {
        if (form) {
            const numero = valor === '' ? 0 : parseFloat(valor);
            setForm({ ...form, [campo]: numero });
        }
    };

    const actualizar = async () => {
        if (!form || !form.nombre.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }

        setSaving(true);
        try {
            const { id, created_at, ...datosEditables } = form;
            await proveedorService.updateProveedor(id!.toString(), datosEditables);

            Alert.alert('Éxito', 'Proveedor actualizado correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmarEliminar = () => {
        Alert.alert('Confirmar', '¿Inhabilitar este proveedor?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => {
                    try {
                        if (form?.id) await proveedorService.deleteProveedor(form.id);
                        Alert.alert('Éxito', 'Proveedor inhabilitado');
                        router.back();
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                }
            }
        ]);
    };

    if (loading || !form) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
                <ActivityIndicator size="large" color="#2a8c4a" />
                <Text style={{ marginTop: 10, color: '#666' }}>Cargando proveedor...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* Header Personalizado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar Proveedor</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- TARJETA 1: INFORMACIÓN PRINCIPAL --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="domain" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Información Principal</Text>
                    </View>

                    <Text style={styles.label}>Código</Text>
                    <TextInput
                        style={styles.input}
                        value={form.codigo}
                        onChangeText={t => handleChange('codigo', t)}
                    />

                    <Text style={styles.label}>Nombre Comercial *</Text>
                    <TextInput
                        style={styles.input}
                        value={form.nombre}
                        onChangeText={t => handleChange('nombre', t)}
                    />

                    <Text style={styles.label}>Razón Social *</Text>
                    <TextInput
                        style={styles.input}
                        value={form.razon_social}
                        onChangeText={t => handleChange('razon_social', t)}
                    />

                    <Text style={styles.label}>NIT / CI *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={form.nit_ci}
                        onChangeText={t => handleChange('nit_ci', t)}
                    />
                </View>

                {/* --- TARJETA 2: CONTACTO --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="call-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Datos de Contacto</Text>
                    </View>

                    <Text style={styles.label}>Dirección</Text>
                    <TextInput
                        style={styles.input}
                        value={form.direccion || ''}
                        onChangeText={t => handleChange('direccion', t)}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Ciudad</Text>
                            <TextInput
                                style={styles.input}
                                value={form.ciudad}
                                onChangeText={t => handleChange('ciudad', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Teléfono</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="phone-pad"
                                value={form.telefono || ''}
                                onChangeText={t => handleChange('telefono', t)}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email || ''}
                        onChangeText={t => handleChange('email', t)}
                    />

                    <Text style={styles.label}>Persona de Contacto</Text>
                    <TextInput
                        style={styles.input}
                        value={form.persona_contacto || ''}
                        onChangeText={t => handleChange('persona_contacto', t)}
                    />
                </View>

                {/* --- TARJETA 3: DATOS FINANCIEROS --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cash-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Datos Financieros</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Saldo Inicial</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={form.saldo_inicial?.toString() || '0'}
                                onChangeText={t => handleNumberChange('saldo_inicial', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Moneda</Text>
                            <TextInput
                                style={styles.input}
                                value={form.moneda}
                                onChangeText={t => handleChange('moneda', t)}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Forma de Pago</Text>
                            <TextInput
                                style={styles.input}
                                value={form.forma_pago}
                                onChangeText={t => handleChange('forma_pago', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Límite Crédito</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={form.limite_credito?.toString() || '0'}
                                onChangeText={t => handleNumberChange('limite_credito', t)}
                            />
                        </View>
                    </View>
                </View>

                {/* BOTÓN GUARDAR */}
                <TouchableOpacity style={styles.btnGuardar} onPress={actualizar} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Actualizar Proveedor</Text>}
                </TouchableOpacity>

                {/* BOTÓN ELIMINAR */}
                <TouchableOpacity style={styles.btnEliminar} onPress={confirmarEliminar} disabled={saving}>
                    <Text style={styles.btnText}>Inhabilitar Proveedor</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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

    btnGuardar: {
        backgroundColor: '#2a8c4a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
        elevation: 4
    },
    btnEliminar: {
        backgroundColor: '#dc3545',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
        elevation: 4
    },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});