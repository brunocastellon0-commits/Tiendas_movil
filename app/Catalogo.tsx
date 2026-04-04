import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Pdf from 'react-native-pdf';           // npx expo install react-native-pdf
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA: Catálogo
// Ruta: app/catalogo/Catalogo.tsx
//
// Admin:   puede subir PDFs a Supabase Storage → tabla catalogo_archivos
// Vendedor: solo puede abrir/ver los PDFs (visor tipo librito nativo)
//
// Tabla necesaria en Supabase:
//   CREATE TABLE catalogo_archivos (
//     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     titulo      text NOT NULL,
//     url_pdf     text NOT NULL,
//     storage_path text NOT NULL,
//     subido_por  uuid REFERENCES employees(id),
//     created_at  timestamptz DEFAULT now()
//   );
//
//   -- Storage bucket público (o con policy de lectura autenticada):
//   -- bucket name: 'catalogos'
// ─────────────────────────────────────────────────────────────────────────────

interface Archivo {
    id: string;
    titulo: string;
    url_pdf: string;
    storage_path: string;
    created_at: string;
}

export default function CatalogoScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { isAdmin } = useAuth();

    const [archivos, setArchivos] = useState<Archivo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Visor PDF
    const [pdfVisible, setPdfVisible] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfTitle, setPdfTitle] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);

    useFocusEffect(useCallback(() => { cargarArchivos(); }, []));

    const cargarArchivos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('catalogo_archivos')
                .select('id, titulo, url_pdf, storage_path, created_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setArchivos(data || []);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Subir PDF (solo admin) ─────────────────────────────────────────────────
    const subirPDF = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            const fileName = asset.name || `catalogo_${Date.now()}.pdf`;
            const storagePath = `catalogos/${Date.now()}_${fileName}`;

            setUploading(true);

            // Leer el archivo como ArrayBuffer
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            // Subir a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('catalogos')
                .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('catalogos')
                .getPublicUrl(storagePath);

            const urlPublica = urlData.publicUrl;

            // Guardar en la tabla
            const { error: dbError } = await supabase.from('catalogo_archivos').insert({
                titulo: fileName.replace('.pdf', '').replace(/_/g, ' '),
                url_pdf: urlPublica,
                storage_path: storagePath,
            });

            if (dbError) throw dbError;

            Alert.alert('✅ Subido', 'El catálogo se subió correctamente.');
            cargarArchivos();

        } catch (e: any) {
            Alert.alert('Error al subir', e.message);
        } finally {
            setUploading(false);
        }
    };

    // ── Eliminar PDF (solo admin) ──────────────────────────────────────────────
    const eliminarArchivo = (archivo: Archivo) => {
        Alert.alert('¿Eliminar catálogo?', `Se eliminará "${archivo.titulo}" permanentemente.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try {
                        await supabase.storage.from('catalogos').remove([archivo.storage_path]);
                        await supabase.from('catalogo_archivos').delete().eq('id', archivo.id);
                        cargarArchivos();
                    } catch (e: any) {
                        Alert.alert('Error', e.message);
                    }
                },
            },
        ]);
    };

    // ── Abrir visor ────────────────────────────────────────────────────────────
    const abrirPDF = (archivo: Archivo) => {
        setPdfUrl(archivo.url_pdf);
        setPdfTitle(archivo.titulo);
        setPdfVisible(true);
    };

    const formatFecha = (iso: string) =>
        new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

    const renderItem = ({ item }: { item: Archivo }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}
            onPress={() => abrirPDF(item)}
            activeOpacity={0.85}
        >
            <View style={[styles.cardIcon, { backgroundColor: '#FEF2F2' }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={36} color="#EF4444" />
            </View>

            <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textMain }]} numberOfLines={2}>
                    {item.titulo}
                </Text>
                <Text style={[styles.cardDate, { color: colors.textSub }]}>
                    {formatFecha(item.created_at)}
                </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <TouchableOpacity
                    style={[styles.openBtn, { backgroundColor: `${colors.brandGreen}15` }]}
                    onPress={() => abrirPDF(item)}
                >
                    <Ionicons name="book-outline" size={16} color={colors.brandGreen} />
                    <Text style={[styles.openBtnText, { color: colors.brandGreen }]}>Ver</Text>
                </TouchableOpacity>

                {isAdmin && (
                    <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => eliminarArchivo(item)}
                    >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HEADER */}
            <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Catálogo de Productos</Text>
                        {isAdmin ? (
                            <TouchableOpacity
                                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                                onPress={subirPDF}
                                disabled={uploading}
                            >
                                {uploading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Ionicons name="cloud-upload-outline" size={22} color="#fff" />}
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 40 }} />
                        )}
                    </View>

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.uploadBanner}
                            onPress={subirPDF}
                            disabled={uploading}
                        >
                            <Ionicons name="add-circle-outline" size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.uploadBannerText}>
                                {uploading ? 'Subiendo...' : 'Subir nuevo catálogo PDF'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </LinearGradient>

            {/* LISTA */}
            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                    </View>
                ) : (
                    <FlatList
                        data={archivos}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="book-open-page-variant-outline" size={64} color={colors.textSub} style={{ opacity: 0.4 }} />
                                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Sin catálogos</Text>
                                <Text style={[styles.emptySub, { color: colors.textSub }]}>
                                    {isAdmin ? 'Sube el primer catálogo con el botón de arriba.' : 'Aún no hay catálogos disponibles.'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* ── VISOR PDF (tipo librito) ── */}
            <Modal visible={pdfVisible} animationType="slide" onRequestClose={() => setPdfVisible(false)}>
                <View style={styles.pdfContainer}>
                    {/* Header del visor */}
                    <SafeAreaView edges={['top']} style={[styles.pdfHeader, { backgroundColor: colors.brandGreen }]}>
                        <TouchableOpacity onPress={() => setPdfVisible(false)} style={styles.pdfBackBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.pdfTitle} numberOfLines={1}>{pdfTitle}</Text>
                        <View style={{ width: 40 }} />
                    </SafeAreaView>

                    {/* Visor nativo con efecto de página */}
                    {pdfUrl ? (
                        <Pdf
                            source={{ uri: pdfUrl, cache: true }}
                            style={styles.pdf}
                            onLoadBegin={() => setPdfLoading(true)}
                            onLoadComplete={() => setPdfLoading(false)}
                            onError={(e) => {
                                setPdfLoading(false);
                                Alert.alert('Error', 'No se pudo cargar el PDF: ' + e);
                            }}
                            enablePaging        // ← efecto de pasar páginas tipo librito
                            horizontal          // ← deslizar horizontal como un libro
                            fitPolicy={0}       // ajustar al ancho
                            renderActivityIndicator={() => (
                                <ActivityIndicator size="large" color={colors.brandGreen} />
                            )}
                        />
                    ) : null}

                    {pdfLoading && (
                        <View style={styles.pdfLoadingOverlay}>
                            <ActivityIndicator size="large" color={colors.brandGreen} />
                            <Text style={{ color: colors.textSub, marginTop: 10 }}>Cargando catálogo...</Text>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 10 },
    headerContent: { paddingHorizontal: 20 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },

    uploadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
    uploadBannerText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },

    body: { flex: 1, marginTop: -16, zIndex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
    cardIcon: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
    cardDate: { fontSize: 11 },

    openBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    openBtnText: { fontSize: 12, fontWeight: '700' },
    deleteBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

    emptyContainer: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },

    // VISOR PDF
    pdfContainer: { flex: 1, backgroundColor: '#1a1a1a' },
    pdfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    pdfBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    pdfTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
    pdf: { flex: 1, backgroundColor: '#1a1a1a' },
    pdfLoadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
});