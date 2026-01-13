import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
    ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { crearCategoria } from '../../../services/CategoriaService';
import { NuevaCategoria } from '../../../types/Categorias.inteface';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CrearCategorias() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<NuevaCategoria>({
        empresa: '',
        nombre_categoria: '',
        linea: '',
        marca: ''
    });

    const handleChange = (key: keyof NuevaCategoria, value: string) => {
        setForm({ ...form, [key]: value });
    };

    const handleGuardar = async () => {
        if (!form.empresa || !form.nombre_categoria || !form.linea || !form.marca) {
            Alert.alert('Atención', 'Todos los campos son obligatorios.');
            return;
        }

        setLoading(true);
        try {
            await crearCategoria(form);
            Alert.alert('¡Éxito!', 'Categoría creada correctamente.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo crear.');
        } finally {
            setLoading(false);
        }
    };

    // Componente Input Reutilizable
    const InputField = ({ label, icon, value, onChange, placeholder }: any) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
            <View style={[styles.inputWrapper, {
                backgroundColor: colors.inputBg,
                borderColor: isDark ? colors.cardBorder : 'transparent',
                borderWidth: isDark ? 1 : 0
            }]}>
                <MaterialCommunityIcons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 12 }} />
                <TextInput
                    style={[styles.input, { color: colors.textMain }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSub}
                    value={value}
                    onChangeText={onChange}
                />
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HEADER CURVO */}
            <LinearGradient
                colors={[colors.brandGreen, '#166534']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Categoría</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.headerIconRow}>
                        <View style={styles.iconBigCircle}>
                            <FontAwesome5 name="box-open" size={32} color={colors.brandGreen} />
                        </View>
                        <Text style={styles.headerSubtitle}>Registrar Categoria</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* FORMULARIO */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.formSheet, {
                        backgroundColor: colors.cardBg,
                        borderColor: isDark ? colors.cardBorder : 'transparent',
                        borderWidth: isDark ? 1 : 0
                    }]}>

                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>DETALLES GENERALES</Text>

                        <InputField
                            label="Empresa" icon="domain"
                            value={form.empresa} onChange={(t: string) => handleChange('empresa', t)}
                            placeholder="Ej: NESTLÉ"
                        />

                        <InputField
                            label="Nombre Categoría" icon="tag-text-outline"
                            value={form.nombre_categoria} onChange={(t: string) => handleChange('nombre_categoria', t)}
                            placeholder="Ej: LÁCTEOS"
                        />

                        <View style={styles.divider} />

                        <Text style={[styles.sectionTitle, { color: colors.brandGreen }]}>CLASIFICACIÓN</Text>

                        <InputField
                            label="Línea de Producto" icon="format-list-bulleted-type"
                            value={form.linea} onChange={(t: string) => handleChange('linea', t)}
                            placeholder="Ej: YOGURT"
                        />

                        <InputField
                            label="Marca Comercial" icon="watermark"
                            value={form.marca} onChange={(t: string) => handleChange('marca', t)}
                            placeholder="Ej: PIL"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, {
                                backgroundColor: colors.brandGreen,
                                shadowColor: colors.brandGreen,
                                opacity: loading ? 0.7 : 1
                            }]}
                            onPress={handleGuardar}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>CREAR CATEGORÍA</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    iconBigCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 5 },
    headerSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

    // BODY
    scrollView: { flex: 1, marginTop: 170 },
    formSheet: { marginHorizontal: 20, borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 30 },

    // INPUTS
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginTop: 5 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20, opacity: 0.5 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 52, paddingHorizontal: 14 },
    input: { flex: 1, fontSize: 16, height: '100%' },

    // BUTTON
    submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});