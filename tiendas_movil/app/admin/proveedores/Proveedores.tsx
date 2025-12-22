import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { proveedorService } from '../../../services/ProveedorServices';
import { NuevoProveedor } from '../../../types/Proveedores.interface';

export default function CrearProveedorScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<NuevoProveedor>({
        codigo: '',
        nombre: '',
        razon_social: '',
        nit_ci: '',
        direccion: null,
        localidad: null,
        ciudad: 'COCHABAMBA',
        telefono: null,
        fax: null,
        email: null,
        persona_contacto: null,
        tipo: null,
        estado: 'Vigente',
        categoria_id: null,
        zonas: null,
        transportista: null,
        comentario: null,
        limite_credito: null,
        autorizacion: null,
        forma_pago: 'Contado',
        tipo_documento: 'Factura',
        saldo_inicial: 0,
        moneda: 'Bs',
        cuenta_contable: null,
        detalle_adicional: null
    });

    const handleChange = (campo: keyof NuevoProveedor, valor: string) => {
        setForm(prev => ({ ...prev, [campo]: valor }));
    };

    const handleNumberChange = (campo: keyof NuevoProveedor, valor: string) => {
        const numero = valor === '' ? 0 : parseFloat(valor);
        setForm(prev => ({ ...prev, [campo]: numero }));
    };

    const guardar = async () => {
        if (!form.nombre.trim() || !form.razon_social.trim() || !form.nit_ci.trim()) {
            Alert.alert('Falta información', 'Nombre, Razón Social y NIT son obligatorios.');
            return;
        }

        setLoading(true);
        try {
            await proveedorService.createProveedor(form);
            Alert.alert('¡Éxito!', 'Proveedor registrado correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
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
                <Text style={styles.headerTitle}>Nuevo Proveedor</Text>
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
                        placeholder="Ej: PROV-001"
                        value={form.codigo || ''}
                        onChangeText={t => handleChange('codigo', t)}
                    />

                    <Text style={styles.label}>Nombre Comercial *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Distribuidora ABC"
                        value={form.nombre}
                        onChangeText={t => handleChange('nombre', t)}
                    />

                    <Text style={styles.label}>Razón Social *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Razón Social Legal"
                        value={form.razon_social}
                        onChangeText={t => handleChange('razon_social', t)}
                    />

                    <Text style={styles.label}>NIT / CI *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="1234567"
                        keyboardType="numeric"
                        value={form.nit_ci}
                        onChangeText={t => handleChange('nit_ci', t)}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Tipo</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Proveedor"
                                value={form.tipo || ''}
                                onChangeText={t => handleChange('tipo', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Estado</Text>
                            <TextInput
                                style={styles.input}
                                value={form.estado}
                                onChangeText={t => handleChange('estado', t)}
                            />
                        </View>
                    </View>
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
                        placeholder="Av. Principal #123"
                        value={form.direccion || ''}
                        onChangeText={t => handleChange('direccion', t)}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Localidad</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Cercado"
                                value={form.localidad || ''}
                                onChangeText={t => handleChange('localidad', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Ciudad</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Cochabamba"
                                value={form.ciudad}
                                onChangeText={t => handleChange('ciudad', t)}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Teléfono</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="4-4567890"
                                keyboardType="phone-pad"
                                value={form.telefono || ''}
                                onChangeText={t => handleChange('telefono', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Fax</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Fax"
                                keyboardType="phone-pad"
                                value={form.fax || ''}
                                onChangeText={t => handleChange('fax', t)}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="contacto@proveedor.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email || ''}
                        onChangeText={t => handleChange('email', t)}
                    />

                    <Text style={styles.label}>Persona de Contacto</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del contacto"
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
                                placeholder="0.00"
                                value={form.saldo_inicial.toString()}
                                onChangeText={t => handleNumberChange('saldo_inicial', t)}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Moneda</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Bs"
                                value={form.moneda}
                                onChangeText={t => handleChange('moneda', t)}
                            />
                        </View>
                    </View>

                    {/* Selector Forma de Pago */}
                    <Text style={styles.label}>Forma de Pago *</Text>
                    <View style={styles.selectorContainer}>
                        <TouchableOpacity
                            style={[styles.selectorButton, form.forma_pago === 'Contado' && styles.selectorActive]}
                            onPress={() => handleChange('forma_pago', 'Contado')}
                        >
                            <Text style={[styles.selectorText, form.forma_pago === 'Contado' && styles.selectorTextActive]}>
                                Contado
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectorButton, form.forma_pago === 'Crédito' && styles.selectorActive]}
                            onPress={() => handleChange('forma_pago', 'Crédito')}
                        >
                            <Text style={[styles.selectorText, form.forma_pago === 'Crédito' && styles.selectorTextActive]}>
                                Crédito
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Selector Tipo de Documento */}
                    <Text style={styles.label}>Tipo de Documento *</Text>
                    <View style={styles.selectorContainer}>
                        <TouchableOpacity
                            style={[styles.selectorButton, form.tipo_documento === 'Factura' && styles.selectorActive]}
                            onPress={() => handleChange('tipo_documento', 'Factura')}
                        >
                            <Text style={[styles.selectorText, form.tipo_documento === 'Factura' && styles.selectorTextActive]}>
                                Factura
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectorButton, form.tipo_documento === 'Documento' && styles.selectorActive]}
                            onPress={() => handleChange('tipo_documento', 'Documento')}
                        >
                            <Text style={[styles.selectorText, form.tipo_documento === 'Documento' && styles.selectorTextActive]}>
                                Documento
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Límite de Crédito</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0.00"
                        value={form.limite_credito?.toString() || ''}
                        onChangeText={t => handleNumberChange('limite_credito', t)}
                    />

                    <Text style={styles.label}>Cuenta Contable</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Número de cuenta"
                        value={form.cuenta_contable || ''}
                        onChangeText={t => handleChange('cuenta_contable', t)}
                    />
                </View>

                {/* --- TARJETA 4: INFORMACIÓN ADICIONAL --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Información Adicional</Text>
                    </View>

                    <Text style={styles.label}>Zonas</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Zonas de cobertura"
                        value={form.zonas || ''}
                        onChangeText={t => handleChange('zonas', t)}
                    />

                    <Text style={styles.label}>Transportista</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del transportista"
                        value={form.transportista || ''}
                        onChangeText={t => handleChange('transportista', t)}
                    />

                    <Text style={styles.label}>Comentarios</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Notas o comentarios..."
                        multiline
                        numberOfLines={3}
                        value={form.comentario || ''}
                        onChangeText={t => handleChange('comentario', t)}
                    />

                    <Text style={styles.label}>Autorización</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Número de autorización"
                        value={form.autorizacion || ''}
                        onChangeText={t => handleChange('autorizacion', t)}
                    />

                    <Text style={styles.label}>Detalles Adicionales</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Información extra..."
                        multiline
                        numberOfLines={3}
                        value={form.detalle_adicional || ''}
                        onChangeText={t => handleChange('detalle_adicional', t)}
                    />
                </View>

                {/* BOTÓN GUARDAR */}
                <TouchableOpacity style={styles.btnGuardar} onPress={guardar} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.btnText}>Guardar Proveedor</Text>
                    )}
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

    // Selectores
    selectorContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 10
    },
    selectorButton: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center'
    },
    selectorActive: {
        backgroundColor: '#2a8c4a',
        borderColor: '#2a8c4a'
    },
    selectorText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666'
    },
    selectorTextActive: {
        color: 'white'
    },

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