import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { catalogoService } from '../services/CatalogoService';
import { CatalogoPDF } from '../types/Catalogo.interface';

const { width, height } = Dimensions.get('window');

export default function CatalogoScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { isAdmin } = useAuth();

    // ── Estado de la lista ────────────────────────────────────────────────────
    const [catalogos, setCatalogos] = useState<CatalogoPDF[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // ── Estado del visor PDF ──────────────────────────────────────────────────
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfTitle, setPdfTitle] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);

    // ── Estado del modal "Agregar catálogo" ───────────────────────────────────
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addMode, setAddMode] = useState<'pdf' | 'link'>('pdf');
    const [nuevoTitulo, setNuevoTitulo] = useState('');
    const [nuevoLink, setNuevoLink] = useState('');

    // ── Carga de datos ────────────────────────────────────────────────────────
    const cargarCatalogos = useCallback(async () => {
        try {
            setLoading(true);
            const data = await catalogoService.listar(isAdmin);
            setCatalogos(data);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'No se pudieron cargar los catálogos.');
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useFocusEffect(useCallback(() => { cargarCatalogos(); }, [cargarCatalogos]));

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubirPDF = async () => {
        if (!nuevoTitulo.trim()) {
            Alert.alert('Aviso', 'Escribe un título para el catálogo antes de continuar.');
            return;
        }
        try {
            setUploading(true);
            setAddModalVisible(false);
            const subido = await catalogoService.subirPDF(nuevoTitulo);
            if (subido) {
                Alert.alert('✅ Subido', `"${nuevoTitulo.trim()}" se subió correctamente.`);
                resetForm();
                cargarCatalogos();
            }
        } catch (e: any) {
            Alert.alert('Error al subir', e.message || 'Ocurrió un error.');
        } finally {
            setUploading(false);
        }
    };

    const handleGuardarLink = async () => {
        if (!nuevoTitulo.trim()) {
            Alert.alert('Aviso', 'Escribe un título para el catálogo.');
            return;
        }
        if (!nuevoLink.trim().startsWith('http')) {
            Alert.alert('Aviso', 'Ingresa un link válido (debe empezar con http:// o https://).');
            return;
        }
        try {
            setUploading(true);
            setAddModalVisible(false);
            await catalogoService.guardarLink(nuevoTitulo, nuevoLink);
            Alert.alert('✅ Guardado', `"${nuevoTitulo.trim()}" se guardó correctamente.`);
            resetForm();
            cargarCatalogos();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'No se pudo guardar el link.');
        } finally {
            setUploading(false);
        }
    };

    const handleToggleActivo = async (catalogo: CatalogoPDF) => {
        try {
            setTogglingId(catalogo.id);
            await catalogoService.toggleActivo(catalogo.id, catalogo.activo);
            // Actualización optimista local
            setCatalogos(prev =>
                prev.map(c => c.id === catalogo.id ? { ...c, activo: !c.activo } : c)
            );
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setTogglingId(null);
        }
    };

    const handleEliminar = (catalogo: CatalogoPDF) => {
        Alert.alert(
            '¿Eliminar catálogo?',
            `Se eliminará "${catalogo.titulo}" permanentemente. Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive', onPress: async () => {
                        try {
                            await catalogoService.eliminar(catalogo);
                            setCatalogos(prev => prev.filter(c => c.id !== catalogo.id));
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const abrirVisor = (catalogo: CatalogoPDF) => {
        setPdfUrl(catalogo.archivo_url);
        setPdfTitle(catalogo.titulo);
        setPdfLoading(true);
        setPdfVisible(true);
    };

    const resetForm = () => {
        setNuevoTitulo('');
        setNuevoLink('');
        setAddMode('pdf');
    };

    const formatFecha = (iso: string) =>
        new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

    // ── Render item ───────────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: CatalogoPDF }) => {
        const isLink = !item.storage_path;

        return (
            <View style={[
                styles.card,
                {
                    backgroundColor: colors.cardBg,
                    borderColor: isDark ? colors.cardBorder : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                },
            ]}>
                {/* Ícono tipo (PDF ó Link) */}
                <View style={[styles.cardIcon, { backgroundColor: isLink ? '#EFF6FF' : '#FEF2F2' }]}>
                    <MaterialCommunityIcons
                        name={isLink ? 'link-variant' : 'file-pdf-box'}
                        size={36}
                        color={isLink ? '#3B82F6' : '#EF4444'}
                    />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={2}>
                        {item.titulo}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.textSub }]}>
                        {formatFecha(item.created_at)} · {isLink ? 'Link externo' : 'PDF'}
                    </Text>

                    {/* Badge activo/inactivo — solo visible para el admin */}
                    {isAdmin && (
                        <View style={[
                            styles.activoBadge,
                            { backgroundColor: item.activo ? '#DCFCE7' : '#F1F5F9' },
                        ]}>
                            <View style={[
                                styles.activoDot,
                                { backgroundColor: item.activo ? '#22C55E' : '#94A3B8' },
                            ]} />
                            <Text style={[
                                styles.activoText,
                                { color: item.activo ? '#15803D' : '#64748B' },
                            ]}>
                                {item.activo ? 'Activo' : 'Inactivo'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Acciones */}
                <View style={styles.cardActions}>
                    {/* Botón Ver */}
                    <TouchableOpacity
                        style={[styles.verBtn, { backgroundColor: `${colors.brandGreen}18` }]}
                        onPress={() => abrirVisor(item)}
                    >
                        <Ionicons name="book-outline" size={16} color={colors.brandGreen} />
                        <Text style={[styles.verBtnText, { color: colors.brandGreen }]}>Ver</Text>
                    </TouchableOpacity>

                    {/* Controles exclusivos del admin */}
                    {isAdmin && (
                        <View style={styles.adminActions}>
                            {togglingId === item.id ? (
                                <ActivityIndicator size="small" color={colors.brandGreen} />
                            ) : (
                                <Switch
                                    value={item.activo}
                                    onValueChange={() => handleToggleActivo(item)}
                                    trackColor={{ false: '#CBD5E1', true: `${colors.brandGreen}80` }}
                                    thumbColor={item.activo ? colors.brandGreen : '#94A3B8'}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                />
                            )}
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleEliminar(item)}
                            >
                                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── HEADER ── */}
            <LinearGradient colors={[colors.brandGreen, '#14532d']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.headerTitle}>Catálogo</Text>
                            <Text style={styles.headerSub}>
                                {isAdmin
                                    ? `${catalogos.length} catálogo(s) registrado(s)`
                                    : 'Catálogo de productos'}
                            </Text>
                        </View>
                        {isAdmin ? (
                            <TouchableOpacity
                                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                                onPress={() => setAddModalVisible(true)}
                                disabled={uploading}
                            >
                                {uploading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Ionicons name="add" size={26} color="#fff" />}
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 44 }} />
                        )}
                    </View>

                    {/* Banner de acción rápida para admin */}
                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.uploadBanner}
                            onPress={() => setAddModalVisible(true)}
                            disabled={uploading}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.uploadBannerText}>
                                {uploading ? 'Procesando...' : 'Subir nuevo catálogo (PDF o link)'}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </LinearGradient>

            {/* ── LISTA ── */}
            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                        <Text style={[styles.centerText, { color: colors.textSub }]}>Cargando catálogos...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={catalogos}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons
                                    name="book-open-page-variant-outline"
                                    size={72}
                                    color={colors.textSub}
                                    style={{ opacity: 0.35 }}
                                />
                                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                                    {isAdmin ? 'Sin catálogos' : 'Sin catálogo disponible'}
                                </Text>
                                <Text style={[styles.emptySub, { color: colors.textSub }]}>
                                    {isAdmin
                                        ? 'Toca el botón "+" para subir el primer catálogo.'
                                        : 'El administrador aún no ha publicado ningún catálogo.'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* ── MODAL AGREGAR CATÁLOGO (solo admin) ── */}
            <Modal
                visible={addModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => { setAddModalVisible(false); resetForm(); }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>

                        {/* Cabecera */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textMain }]}>Nuevo catálogo</Text>
                            <TouchableOpacity onPress={() => { setAddModalVisible(false); resetForm(); }}>
                                <Ionicons name="close" size={24} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>

                        {/* Título */}
                        <Text style={[styles.inputLabel, { color: colors.textSub }]}>Título del catálogo *</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                                color: colors.textMain,
                                borderColor: isDark ? colors.cardBorder : '#E2E8F0',
                            }]}
                            placeholder="Ej: Catálogo Invierno 2026"
                            placeholderTextColor={colors.textSub}
                            value={nuevoTitulo}
                            onChangeText={setNuevoTitulo}
                        />

                        {/* Selector PDF / Link */}
                        <View style={styles.modeSelector}>
                            <TouchableOpacity
                                style={[styles.modeBtn, addMode === 'pdf' && { backgroundColor: colors.brandGreen }]}
                                onPress={() => setAddMode('pdf')}
                            >
                                <MaterialCommunityIcons
                                    name="file-pdf-box"
                                    size={18}
                                    color={addMode === 'pdf' ? '#fff' : colors.textSub}
                                />
                                <Text style={[styles.modeBtnText, { color: addMode === 'pdf' ? '#fff' : colors.textSub }]}>
                                    Subir PDF
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeBtn, addMode === 'link' && { backgroundColor: '#3B82F6' }]}
                                onPress={() => setAddMode('link')}
                            >
                                <Ionicons
                                    name="link-outline"
                                    size={18}
                                    color={addMode === 'link' ? '#fff' : colors.textSub}
                                />
                                <Text style={[styles.modeBtnText, { color: addMode === 'link' ? '#fff' : colors.textSub }]}>
                                    Pegar link
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Contenido según modo */}
                        {addMode === 'pdf' ? (
                            <TouchableOpacity style={styles.pickFileBtn} onPress={handleSubirPDF}>
                                <Ionicons name="document-attach-outline" size={22} color={colors.brandGreen} />
                                <Text style={[styles.pickFileBtnText, { color: colors.brandGreen }]}>
                                    Seleccionar archivo PDF
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <Text style={[styles.inputLabel, { color: colors.textSub }]}>URL del PDF *</Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                                        color: colors.textMain,
                                        borderColor: isDark ? colors.cardBorder : '#E2E8F0',
                                    }]}
                                    placeholder="https://ejemplo.com/catalogo.pdf"
                                    placeholderTextColor={colors.textSub}
                                    value={nuevoLink}
                                    onChangeText={setNuevoLink}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: '#3B82F6' }]}
                                    onPress={handleGuardarLink}
                                >
                                    <Ionicons name="save-outline" size={18} color="#fff" />
                                    <Text style={styles.saveBtnText}>Guardar link</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <Text style={[styles.modalHint, { color: colors.textSub }]}>
                            El catálogo quedará activo automáticamente. Puedes desactivarlo con el switch.
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* ── VISOR PDF TIPO LIBRO (WebView) ── */}
            <Modal
                visible={pdfVisible}
                animationType="slide"
                onRequestClose={() => setPdfVisible(false)}
            >
                <View style={styles.viewerContainer}>
                    {/* Header */}
                    <LinearGradient colors={[colors.brandGreen, '#14532d']} style={styles.viewerHeader}>
                        <SafeAreaView edges={['top']}>
                            <View style={styles.viewerNav}>
                                <TouchableOpacity style={styles.viewerIconBtn} onPress={() => setPdfVisible(false)}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={styles.viewerTitle} numberOfLines={1}>{pdfTitle}</Text>
                                    <Text style={styles.viewerPageIndicator}>Desliza para navegar</Text>
                                </View>
                                <TouchableOpacity style={styles.viewerIconBtn} onPress={() => Linking.openURL(pdfUrl)}>
                                    <Ionicons name="open-outline" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </LinearGradient>

                    {/* Área WebView */}
                    <View style={styles.pdfWrapper}>
                        <View style={styles.bookSpineLeft} />
                        <View style={styles.bookSpineRight} />

                        {pdfUrl ? (
                            <WebView
                                source={{
                                    // Google Docs Viewer renderiza cualquier PDF/link de forma inline
                                    uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`,
                                }}
                                style={styles.pdf}
                                onLoadStart={() => setPdfLoading(true)}
                                onLoad={() => setPdfLoading(false)}
                                onError={() => {
                                    setPdfLoading(false);
                                    Alert.alert(
                                        'Error',
                                        'No se pudo cargar el catálogo.\n¿Quieres abrirlo en el navegador?',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            { text: 'Abrir', onPress: () => Linking.openURL(pdfUrl) },
                                        ]
                                    );
                                }}
                                startInLoadingState
                                renderLoading={() => (
                                    <View style={styles.pdfLoadingOverlay}>
                                        <MaterialCommunityIcons
                                            name="book-open-page-variant"
                                            size={52}
                                            color="#fff"
                                            style={{ opacity: 0.7 }}
                                        />
                                        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
                                        <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>
                                            Abriendo catálogo...
                                        </Text>
                                    </View>
                                )}
                            />
                        ) : null}

                        {/* Overlay de carga manual (por si acaso) */}
                        {pdfLoading && (
                            <View style={styles.pdfLoadingOverlay}>
                                <MaterialCommunityIcons
                                    name="book-open-page-variant"
                                    size={52}
                                    color="#fff"
                                    style={{ opacity: 0.7 }}
                                />
                                <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
                                <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>
                                    Abriendo catálogo...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Header
    headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerContent: { paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    uploadBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
    uploadBannerText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', flex: 1 },

    // Lista
    body: { flex: 1, marginTop: -12, zIndex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    centerText: { fontSize: 14, marginTop: 10 },

    // Card catálogo
    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 4 },
    cardIcon: { width: 58, height: 58, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3, lineHeight: 20 },
    cardDate: { fontSize: 11, marginBottom: 6 },
    activoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
    activoDot: { width: 7, height: 7, borderRadius: 4 },
    activoText: { fontSize: 11, fontWeight: '700' },
    cardActions: { alignItems: 'flex-end', gap: 8 },
    verBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
    verBtnText: { fontSize: 13, fontWeight: '700' },
    adminActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

    // Vacío
    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10, paddingHorizontal: 30 },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

    // Modal agregar
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 16 },
    modeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9' },
    modeBtnText: { fontSize: 14, fontWeight: '700' },
    pickFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14, borderWidth: 2, borderColor: '#2a8c4a', borderStyle: 'dashed', marginBottom: 16 },
    pickFileBtnText: { fontSize: 15, fontWeight: '700' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 16 },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    modalHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

    // Visor tipo libro
    viewerContainer: { flex: 1, backgroundColor: '#0F1117' },
    viewerHeader: { paddingHorizontal: 16, paddingBottom: 12 },
    viewerNav: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    viewerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    viewerTitle: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
    viewerPageIndicator: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    pdfWrapper: { flex: 1, backgroundColor: '#1C1F27', position: 'relative' },
    bookSpineLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1 },
    bookSpineRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1 },
    pdf: { flex: 1, width, height: height - 160 },
    pdfLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,17,23,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
});