import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { zonaService } from '../../../services/ZonaService';
import { NuevaZona, Vendedor } from '../../../types/Zonas.interface';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const TERRITORIOS = ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO', 'PERIFERIA'];
const COLORES = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500', '#800080', '#000000', '#FFFFFF'];

export default function FormZona() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    const [loading, setLoading] = useState(false);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);

    // Modales
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
                const vendedorActual = vends.find(v => v.id === data.vendedor_id);
                if (vendedorActual) setTxtVendedor(vendedorActual.full_name);
            }
        } catch (e) {

        } finally {
            setLoading(false);
        }
    };

    const handleGuardar = async () => {
        if (!form.codigo_zona || !form.vendedor_id) {
            Alert.alert("Atención", "El código y el vendedor son obligatorios.");
            return;
        }
        try {
            setLoading(true);
            if (id) {
                await zonaService.updateZona(id.toString(), form);
                Alert.alert("¡Éxito!", "Zona actualizada correctamente.");
            } else {
                await zonaService.createZona(form);
                Alert.alert("¡Éxito!", "Zona creada correctamente.");
            }
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    // Componente Input Reutilizable (Local)
    const InputField = ({ label, icon, value, onChangeText, placeholder, onPress, isReadOnly }: any) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
            {onPress ? (
                <TouchableOpacity
                    style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}
                    onPress={onPress}
                >
                    <Ionicons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 10 }} />
                    <Text style={{ color: value ? colors.textMain : colors.textSub, flex: 1, fontSize: 16 }}>
                        {value || placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSub} />
                </TouchableOpacity>
            ) : (
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Ionicons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.input, { color: colors.textMain }]}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textSub}
                        editable={!isReadOnly}
                    />
                </View>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* --- HEADER --- */}
            <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{id ? 'Editar Zona' : 'Nueva Zona'}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.headerIconRow}>
                        <View style={styles.iconBigCircle}>
                            <FontAwesome5 name="map-marked-alt" size={32} color={colors.brandGreen} />
                        </View>
                        <Text style={styles.headerSubtitle}>
                            {id ? `Zona ${form.codigo_zona}` : 'Crear Nueva Zona'}
                        </Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* --- FORMULARIO --- */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    <View style={[styles.formSheet, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>

                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>DATOS GENERALES</Text>

                        <InputField
                            label="Código de Zona" icon="barcode-outline"
                            value={form.codigo_zona} onChangeText={(t: string) => setForm({ ...form, codigo_zona: t })}
                            placeholder="Ej: Z-001"
                        />

                        <InputField
                            label="Descripción" icon="document-text-outline"
                            value={form.descripcion} onChangeText={(t: string) => setForm({ ...form, descripcion: t })}
                            placeholder="Ej: Zona Norte - Mercado"
                        />

                        <InputField
                            label="Vendedor Asignado" icon="person-outline"
                            value={form.vendedor_id ? txtVendedor : ''} placeholder="Seleccionar Vendedor"
                            onPress={() => setModalVend(true)}
                        />

                        <View style={styles.divider} />

                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>CONFIGURACIÓN</Text>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    label="Territorio" icon="map-outline"
                                    value={form.territorio} onPress={() => setModalTerr(true)}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textMain }]}>Color Marcador</Text>
                                <TouchableOpacity
                                    style={[styles.inputWrapper, { backgroundColor: colors.inputBg, justifyContent: 'space-between' }]}
                                    onPress={() => setModalColor(true)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: form.color_marcador, borderWidth: 1, borderColor: '#ccc', marginRight: 10 }} />
                                        <Text style={{ color: colors.textSub }}>Color</Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={18} color={colors.textSub} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={[styles.label, { color: colors.textMain, marginTop: 10 }]}>Estado</Text>
                        <View style={styles.statusRow}>
                            {['Habilitado', 'Deshabilitado'].map((estado) => {
                                const isActive = form.estado === estado;
                                return (
                                    <TouchableOpacity
                                        key={estado}
                                        style={[styles.statusOption, {
                                            backgroundColor: isActive ? (estado === 'Habilitado' ? colors.brandGreen : '#EF5350') : colors.inputBg,
                                            borderColor: isActive ? 'transparent' : colors.cardBorder,
                                            borderWidth: 1
                                        }]}
                                        onPress={() => setForm({ ...form, estado: estado as any })}
                                    >
                                        <Text style={{ color: isActive ? '#fff' : colors.textSub, fontWeight: '600' }}>{estado}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleGuardar}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>GUARDAR ZONA</Text>}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* --- MODALES (Estilizados) --- */}

            {/* Modal Vendedor */}
            <Modal visible={modalVend} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Vendedor</Text>
                        <FlatList
                            data={vendedores}
                            keyExtractor={i => i.id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                                    onPress={() => { setForm({ ...form, vendedor_id: item.id }); setTxtVendedor(item.full_name); setModalVend(false); }}>
                                    <Text style={{ color: colors.textMain, fontSize: 16 }}>{item.full_name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={() => setModalVend(false)} style={styles.modalCloseBtn}><Text style={{ color: '#EF5350' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Territorio */}
            <Modal visible={modalTerr} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Territorio</Text>
                        {TERRITORIOS.map(t => (
                            <TouchableOpacity key={t} style={[styles.modalItem, { borderBottomColor: isDark ? '#333' : '#eee' }]}
                                onPress={() => { setForm({ ...form, territorio: t }); setModalTerr(false); }}>
                                <Text style={{ color: colors.textMain, fontSize: 16 }}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setModalTerr(false)} style={styles.modalCloseBtn}><Text style={{ color: '#EF5350' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal Color */}
            <Modal visible={modalColor} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Color</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' }}>
                            {COLORES.map(c => (
                                <TouchableOpacity key={c} onPress={() => { setForm({ ...form, color_marcador: c }); setModalColor(false); }}>
                                    <View style={{ width: 40, height: 40, backgroundColor: c, borderRadius: 20, borderWidth: 2, borderColor: isDark ? '#555' : '#ddd' }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setModalColor(false)} style={styles.modalCloseBtn}><Text style={{ color: '#EF5350' }}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    // HEADER
    headerGradient: { height: 240, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: 20, position: 'absolute', top: 0, width: '100%', zIndex: 0 },
    headerContent: { flex: 1 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    iconBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerIconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, justifyContent: 'center' },
    iconBigCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 5 },
    headerSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    // BODY
    scrollView: { flex: 1, marginTop: 170 },
    formSheet: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 30 },
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginTop: 5 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20, opacity: 0.5 },

    // INPUTS
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 52, paddingHorizontal: 14 },
    input: { flex: 1, fontSize: 16, height: '100%' },

    // STATUS
    statusRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
    statusOption: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    // BUTTON
    submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 20, padding: 25, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1 },
    modalCloseBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
});
