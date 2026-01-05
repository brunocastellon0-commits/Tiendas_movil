import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { zonaService } from '../../../services/ZonaService';
import { NuevaZona, Vendedor } from '../../../types/Zonas.interface';

const TERRITORIOS = ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO', 'PERIFERIA'];
const COLORES = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500', '#800080', '#000000', '#FFFFFF'];

export default function FormZona() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors } = useTheme();

    const [loading, setLoading] = useState(false);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);

    const [modalVend, setModalVend] = useState(false);
    const [modalTerr, setModalTerr] = useState(false);
    const [modalColor, setModalColor] = useState(false);

    const [form, setForm] = useState<NuevaZona>({
        codigo_zona: '',
        descripcion: '',
        territorio: 'CENTRO',
        estado: 'Habilitado',
        color_marcador: '#FF0000',
        vendedor_id: ''
    });

    const [txtVendedor, setTxtVendedor] = useState('Seleccionar Vendedor');

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        try {
            const vends = await zonaService.getVendedores();
            setVendedores(vends);

            if (id) {
                const data = await zonaService.getZonaById(id.toString());
                setForm({
                    codigo_zona: data.codigo_zona,
                    descripcion: data.descripcion,
                    territorio: data.territorio,
                    estado: data.estado,
                    color_marcador: data.color_marcador,
                    vendedor_id: data.vendedor_id
                });

                // Usamos 'full_name' para mostrar en el input
                const vendedorActual = vends.find(v => v.id === data.vendedor_id);
                if (vendedorActual) setTxtVendedor(vendedorActual.full_name);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGuardar = async () => {
        if (!form.codigo_zona || !form.vendedor_id) {
            Alert.alert("Faltan datos", "El código y el vendedor son obligatorios");
            return;
        }
        try {
            setLoading(true);
            if (id) {
                await zonaService.updateZona(id.toString(), form);
                Alert.alert("Éxito", "Zona actualizada");
            } else {
                await zonaService.createZona(form);
                Alert.alert("Éxito", "Zona creada");
            }
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bgEnd }]}>
            <View style={[styles.header, { backgroundColor: colors.brandGreen }]}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{id ? 'Modificar Zona' : 'Nueva Zona'}</Text>
                <TouchableOpacity onPress={handleGuardar}><Ionicons name="checkmark" size={24} color="white" /></TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.brandGreen} style={{ marginTop: 50 }} /> :
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

                        <Text style={[styles.label, { color: colors.textMain }]}>Código</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                            value={form.codigo_zona}
                            onChangeText={t => setForm({ ...form, codigo_zona: t })}
                            placeholder="Ej: 001"
                            placeholderTextColor="#999"
                        />

                        <Text style={[styles.label, { color: colors.textMain }]}>Vendedor</Text>
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center', backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                            onPress={() => setModalVend(true)}
                        >
                            <Text style={{ color: form.vendedor_id ? colors.textMain : '#999' }}>{txtVendedor}</Text>
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: colors.textMain }]}>Descripción</Text>
                        <TextInput
                            style={[styles.input, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                            value={form.descripcion}
                            onChangeText={t => setForm({ ...form, descripcion: t })}
                        />

                        <Text style={[styles.label, { color: colors.textMain }]}>Territorio</Text>
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center', backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                            onPress={() => setModalTerr(true)}
                        >
                            <Text style={{ color: colors.textMain }}>{form.territorio}</Text>
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: colors.textMain }]}>Estado</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.chip, form.estado === 'Habilitado' ? styles.chipActive : styles.chipInactive]}
                                onPress={() => setForm({ ...form, estado: 'Habilitado' })}
                            >
                                <Text style={form.estado === 'Habilitado' ? styles.textActive : styles.textInactive}>Habilitado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.chip, form.estado === 'Deshabilitado' ? { backgroundColor: '#FFEBEE', borderColor: '#D32F2F' } : styles.chipInactive]}
                                onPress={() => setForm({ ...form, estado: 'Deshabilitado' })}
                            >
                                <Text style={form.estado === 'Deshabilitado' ? { color: '#D32F2F', fontWeight: 'bold' } : styles.textInactive}>Deshabilitado</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: colors.textMain, marginTop: 15 }]}>Marcador Georef.</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <View style={{ width: 40, height: 40, backgroundColor: form.color_marcador, borderRadius: 5, borderWidth: 1, borderColor: '#ccc' }} />
                            <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalColor(true)}>
                                <Text>Seleccionar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            }

            {/* Modal Vendedores */}
            <Modal visible={modalVend} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar Vendedor</Text>
                        <FlatList
                            data={vendedores}
                            keyExtractor={i => i.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => {
                                    setForm({ ...form, vendedor_id: item.id });
                                    setTxtVendedor(item.full_name);
                                    setModalVend(false);
                                }}>
                                    <Text style={{ fontSize: 16 }}>{item.full_name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={() => setModalVend(false)} style={styles.btnClose}><Text style={{ color: 'red' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ... Resto de modales (Territorio, Color) son iguales a los anteriores ... */}
            <Modal visible={modalTerr} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Seleccionar Territorio</Text>
                        {TERRITORIOS.map(t => (
                            <TouchableOpacity key={t} style={styles.modalItem} onPress={() => {
                                setForm({ ...form, territorio: t });
                                setModalTerr(false);
                            }}>
                                <Text style={{ fontSize: 16 }}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setModalTerr(false)} style={styles.btnClose}><Text style={{ color: 'red' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalColor} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Color del Marcador</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                            {COLORES.map(c => (
                                <TouchableOpacity key={c} onPress={() => {
                                    setForm({ ...form, color_marcador: c });
                                    setModalColor(false);
                                }}>
                                    <View style={{ width: 50, height: 50, backgroundColor: c, borderRadius: 25, borderWidth: 1, borderColor: '#ddd' }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setModalColor(false)} style={styles.btnClose}><Text style={{ color: 'red' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    card: { padding: 20, borderRadius: 12, borderWidth: 1 },
    label: { fontSize: 13, marginBottom: 5, marginTop: 15, fontWeight: '600' },
    input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
    chipActive: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
    chipInactive: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
    textActive: { color: '#2E7D32', fontWeight: 'bold' },
    textInactive: { color: '#666' },
    btnSecondary: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#f9f9f9' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    btnClose: { marginTop: 15, alignItems: 'center', padding: 10 }
});