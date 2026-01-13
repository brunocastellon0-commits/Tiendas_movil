import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { proveedorService } from '../../../services/ProveedorServices';
import { NuevoProveedor } from '../../../types/Proveedores.interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CrearProveedorScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    // Estado Formulario con TODOS los campos
    const [form, setForm] = useState<NuevoProveedor>({
        codigo: '', nombre: '', razon_social: '', nit_ci: '',
        direccion: null, localidad: null, ciudad: 'COCHABAMBA',
        telefono: null, fax: null, email: null, persona_contacto: null,
        tipo: null, estado: 'Vigente', categoria_id: null, zonas: null,
        transportista: null, comentario: null, limite_credito: null,
        autorizacion: null, forma_pago: 'Contado', tipo_documento: 'Factura',
        saldo_inicial: 0, moneda: 'Bs', cuenta_contable: null, detalle_adicional: null
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

    // Input Reutilizable
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
                <MaterialCommunityIcons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 12, marginTop: multiline ? 2 : 0 }} />
                <TextInput
                    style={[styles.input, { color: colors.textMain, height: '100%', textAlignVertical: multiline ? 'top' : 'center' }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSub}
                    value={value?.toString()}
                    onChangeText={onChange}
                    keyboardType={keyboard}
                    multiline={multiline}
                />
            </View>
        </View>
    );

    // Selector Reutilizable (Botones)
    const SelectorGroup = ({ label, options, selected, onSelect }: any) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
            <View style={styles.selectorContainer}>
                {options.map((opt: string) => {
                    const isActive = selected === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.selectorBtn, {
                                backgroundColor: isActive ? colors.brandGreen : colors.inputBg,
                                borderColor: isActive ? colors.brandGreen : (isDark ? colors.cardBorder : 'transparent'),
                                borderWidth: 1
                            }]}
                            onPress={() => onSelect(opt)}
                        >
                            <Text style={[styles.selectorText, { color: isActive ? '#fff' : colors.textSub }]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HEADER */}
            <LinearGradient
                colors={[colors.brandGreen, '#166534']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Proveedor</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.headerIconRow}>
                        <View style={styles.iconBigCircle}>
                            <FontAwesome5 name="truck-loading" size={32} color={colors.brandGreen} />
                        </View>
                        <Text style={styles.headerSubtitle}>Registrar Proveedor</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* FORMULARIO */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* SECCIÓN 1: DATOS PRINCIPALES */}
                    <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="domain" size={20} color={colors.brandGreen} />
                            <Text style={[styles.cardTitle, { color: colors.textMain }]}>DATOS PRINCIPALES</Text>
                        </View>

                        <InputField label="Código" icon="barcode" value={form.codigo} onChange={(t: string) => handleChange('codigo', t)} placeholder="Ej: PROV-001" />
                        <InputField label="Nombre Comercial *" icon="store" value={form.nombre} onChange={(t: string) => handleChange('nombre', t)} placeholder="Ej: Distribuidora ABC" />
                        <InputField label="Razón Social *" icon="file-document-outline" value={form.razon_social} onChange={(t: string) => handleChange('razon_social', t)} placeholder="Razón Social Legal" />
                        <InputField label="NIT / CI *" icon="card-account-details-outline" value={form.nit_ci} onChange={(t: string) => handleChange('nit_ci', t)} placeholder="1234567" keyboard="numeric" />

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Tipo" icon="tag-outline" value={form.tipo} onChange={(t: string) => handleChange('tipo', t)} placeholder="Proveedor" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Estado" icon="toggle-switch-outline" value={form.estado} onChange={(t: string) => handleChange('estado', t)} />
                            </View>
                        </View>
                    </View>

                    {/* SECCIÓN 2: CONTACTO */}
                    <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="call-outline" size={20} color={colors.brandGreen} />
                            <Text style={[styles.cardTitle, { color: colors.textMain }]}>CONTACTO</Text>
                        </View>

                        <InputField label="Dirección" icon="map-marker-outline" value={form.direccion} onChange={(t: string) => handleChange('direccion', t)} placeholder="Av. Principal #123" />

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Localidad" icon="map-outline" value={form.localidad} onChange={(t: string) => handleChange('localidad', t)} placeholder="Cercado" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Ciudad" icon="city" value={form.ciudad} onChange={(t: string) => handleChange('ciudad', t)} placeholder="Cochabamba" />
                            </View>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Teléfono" icon="phone" value={form.telefono} onChange={(t: string) => handleChange('telefono', t)} placeholder="4456789" keyboard="phone-pad" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Fax" icon="fax" value={form.fax} onChange={(t: string) => handleChange('fax', t)} placeholder="Fax" keyboard="phone-pad" />
                            </View>
                        </View>

                        <InputField label="Email" icon="email-outline" value={form.email} onChange={(t: string) => handleChange('email', t)} placeholder="contacto@empresa.com" keyboard="email-address" />
                        <InputField label="Persona de Contacto" icon="account-tie-outline" value={form.persona_contacto} onChange={(t: string) => handleChange('persona_contacto', t)} placeholder="Nombre del contacto" />
                    </View>

                    {/* SECCIÓN 3: FINANCIERO */}
                    <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="cash-outline" size={20} color={colors.brandGreen} />
                            <Text style={[styles.cardTitle, { color: colors.textMain }]}>FINANCIERO</Text>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <InputField label="Saldo Inicial" icon="wallet-outline" value={form.saldo_inicial} onChange={(t: string) => handleNumberChange('saldo_inicial', t)} placeholder="0.00" keyboard="numeric" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <InputField label="Moneda" icon="currency-usd" value={form.moneda} onChange={(t: string) => handleChange('moneda', t)} placeholder="Bs" />
                            </View>
                        </View>

                        <SelectorGroup
                            label="Forma de Pago *"
                            options={['Contado', 'Crédito']}
                            selected={form.forma_pago}
                            onSelect={(val: string) => handleChange('forma_pago', val)}
                        />

                        <SelectorGroup
                            label="Tipo de Documento *"
                            options={['Factura', 'Documento']}
                            selected={form.tipo_documento}
                            onSelect={(val: string) => handleChange('tipo_documento', val)}
                        />

                        <InputField label="Límite de Crédito" icon="credit-card-outline" value={form.limite_credito} onChange={(t: string) => handleNumberChange('limite_credito', t)} placeholder="0.00" keyboard="numeric" />
                        <InputField label="Cuenta Contable" icon="bank-outline" value={form.cuenta_contable} onChange={(t: string) => handleChange('cuenta_contable', t)} placeholder="Número de cuenta" />
                    </View>

                    {/* SECCIÓN 4: ADICIONAL */}
                    <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="document-text-outline" size={20} color={colors.brandGreen} />
                            <Text style={[styles.cardTitle, { color: colors.textMain }]}>ADICIONAL</Text>
                        </View>

                        <InputField label="Zonas" icon="map-marker-path" value={form.zonas} onChange={(t: string) => handleChange('zonas', t)} placeholder="Zonas de cobertura" />
                        <InputField label="Transportista" icon="truck-delivery-outline" value={form.transportista} onChange={(t: string) => handleChange('transportista', t)} placeholder="Nombre transportista" />
                        <InputField label="Autorización" icon="file-certificate-outline" value={form.autorizacion} onChange={(t: string) => handleChange('autorizacion', t)} placeholder="Nro Autorización" />

                        <InputField label="Comentarios" icon="comment-text-outline" value={form.comentario} onChange={(t: string) => handleChange('comentario', t)} placeholder="Notas..." multiline />
                        <InputField label="Detalles" icon="information-outline" value={form.detalle_adicional} onChange={(t: string) => handleChange('detalle_adicional', t)} placeholder="Info extra..." multiline />
                    </View>

                    {/* BOTÓN GUARDAR */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen, opacity: loading ? 0.7 : 1 }]}
                        onPress={guardar}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>GUARDAR PROVEEDOR</Text>}
                    </TouchableOpacity>

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
    formCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    cardTitle: { fontSize: 14, fontWeight: '800', marginLeft: 10, letterSpacing: 0.5 },

    // INPUTS
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14 },
    input: { flex: 1, fontSize: 16 },
    rowInputs: { flexDirection: 'row' },

    // SELECTORS
    selectorContainer: { flexDirection: 'row', gap: 10 },
    selectorBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    selectorText: { fontWeight: '600', fontSize: 14 },

    // BUTTON
    submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, elevation: 6 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});