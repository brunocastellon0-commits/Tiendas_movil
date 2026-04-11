import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre_producto: string;
  codigo_producto: string;
  precio_base_venta: number;
  stock_actual: number;
  activo: boolean;
  categoria_id: string | null;
  categorias: { nombre: string } | null;
  descripcion?: string;
  unidad_medida?: string;
}

interface CatalogoPDF {
  id: string;
  titulo: string;
  archivo_url: string;
  storage_path: string;
  activo: boolean;
  created_at: string;
}

type VistaTab = 'productos' | 'pdf';

// ─────────────────────────────────────────────────────────────────────────────
// Función debounce
// ─────────────────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color aleatorio pero consistente por id de producto
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = [
  '#EA580C', '#2a8c4a', '#7C3AED', '#0D9488',
  '#2563EB', '#DC2626', '#D97706', '#0891B2',
];
const getColor = (id: string) => PALETTE[id.charCodeAt(0) % PALETTE.length];

// ─────────────────────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────────────────────
const ProductCard = ({
  item,
  colors,
  isDark,
  onPress,
}: {
  item: Producto;
  colors: any;
  isDark: boolean;
  onPress: () => void;
}) => {
  const accent = getColor(item.id);
  const stockBajo = item.stock_actual <= 5 && item.stock_actual > 0;
  const sinStock = item.stock_actual <= 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.productCard,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      {/* Imagen placeholder con inicial */}
      <View style={[styles.productImageBg, { backgroundColor: `${accent}18` }]}>
        <Text style={[styles.productInitial, { color: accent }]}>
          {item.nombre_producto.charAt(0).toUpperCase()}
        </Text>
        {/* Badge de stock */}
        {sinStock ? (
          <View style={[styles.stockBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.stockBadgeText, { color: '#DC2626' }]}>Agotado</Text>
          </View>
        ) : stockBajo ? (
          <View style={[styles.stockBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.stockBadgeText, { color: '#D97706' }]}>Poco stock</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        {item.categorias?.nombre ? (
          <Text style={[styles.productCategory, { color: accent }]} numberOfLines={1}>
            {item.categorias.nombre}
          </Text>
        ) : null}
        <Text style={[styles.productName, { color: colors.textMain }]} numberOfLines={2}>
          {item.nombre_producto}
        </Text>
        <Text style={[styles.productCode, { color: colors.textSub }]}>
          #{item.codigo_producto}
        </Text>
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, { color: accent }]}>
            Bs {item.precio_base_venta.toFixed(2)}
          </Text>
          <View style={[styles.stockChip, { backgroundColor: sinStock ? '#FEE2E2' : isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4' }]}>
            <Text style={[styles.stockChipText, { color: sinStock ? '#DC2626' : '#2a8c4a' }]}>
              {item.stock_actual} uds
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────────────────────
export default function CatalogoScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();

  const [vistaTab, setVistaTab] = useState<VistaTab>('pdf');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [soloActivos, setSoloActivos] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  // ── Estados PDF ─────────────────────────────────────────────────────────
  const [catalogosPDF, setCatalogosPDF] = useState<CatalogoPDF[]>([]);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfVisorVisible, setPdfVisorVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfTitulo, setPdfTitulo] = useState('');
  // Animación de página
  const pageAnim = useRef(new Animated.Value(0)).current;

  const debouncedSearch = useDebounce(search, 300);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre_producto, codigo_producto, precio_base_venta, stock_actual, activo, categoria_id, categorias:categoria_id (nombre), descripcion, unidad_medida')
          .order('nombre_producto', { ascending: true }),
        supabase
          .from('categorias')
          .select('id, nombre')
          .order('nombre', { ascending: true }),
      ]);

      if (prodRes.data) {
        const mapped = prodRes.data.map((p: any) => ({
          ...p,
          categorias: Array.isArray(p.categorias) ? p.categorias[0] : p.categorias,
        })) as Producto[];
        setProductos(mapped);
      }
      if (catRes.data) setCategorias(catRes.data as Categoria[]);
    } catch (e) {
      console.error('Error cargando catálogo:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData();
    fetchCatalogosPDF();
  }, [fetchData]));

  // ── Funciones PDF ──────────────────────────────────────────────────────────
  const fetchCatalogosPDF = async () => {
    try {
      setLoadingPDF(true);
      // Admin ve todos (activos e inactivos), vendedor solo activos
      const query = supabase
        .from('catalogo_pdf')
        .select('id, titulo, archivo_url, storage_path, activo, created_at')
        .order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setCatalogosPDF((data || []) as CatalogoPDF[]);
    } catch (e: any) {
      console.warn('Error cargando PDFs:', e.message);
    } finally {
      setLoadingPDF(false);
    }
  };

  const subirPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const nombre = asset.name || `catalogo_${Date.now()}.pdf`;
      const storagePath = `catalogos/${Date.now()}_${nombre}`;

      setUploading(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from('catalogos')
        .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('catalogos')
        .getPublicUrl(storagePath);

      const { error: dbErr } = await supabase.from('catalogo_pdf').insert({
        titulo: nombre.replace('.pdf', '').replace(/_/g, ' '),
        archivo_url: urlData.publicUrl,
        storage_path: storagePath,
        activo: true,
      });
      if (dbErr) throw dbErr;

      Alert.alert('✅ Subido', 'El catálogo PDF se subió correctamente.');
      fetchCatalogosPDF();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActivoPDF = async (catalogo: CatalogoPDF) => {
    const { error } = await supabase
      .from('catalogo_pdf')
      .update({ activo: !catalogo.activo })
      .eq('id', catalogo.id);
    if (!error) fetchCatalogosPDF();
  };

  const eliminarPDF = (catalogo: CatalogoPDF) => {
    Alert.alert('¿Eliminar catálogo?', `"${catalogo.titulo}" se eliminará permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.storage.from('catalogos').remove([catalogo.storage_path]);
          await supabase.from('catalogo_pdf').delete().eq('id', catalogo.id);
          fetchCatalogosPDF();
        },
      },
    ]);
  };

  const abrirPDF = (catalogo: CatalogoPDF) => {
    setPdfUrl(catalogo.archivo_url);
    setPdfTitulo(catalogo.titulo);
    // Animación de entrada tipo página
    pageAnim.setValue(1);
    Animated.spring(pageAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
    setPdfVisorVisible(true);
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return productos.filter(p => {
      if (soloActivos && !p.activo) return false;
      if (catFilter && p.categoria_id !== catFilter) return false;
      if (q) {
        return (
          p.nombre_producto.toLowerCase().includes(q) ||
          p.codigo_producto.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [productos, debouncedSearch, catFilter, soloActivos]);

  const totalValue = useMemo(
    () => filtered.reduce((s, p) => s + p.precio_base_venta * p.stock_actual, 0),
    [filtered]
  );

  const headerColors = (isDark
    ? [colors.brandGreen, '#14532d']
    : ['#EA580C', '#C2410C']) as [string, string];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <LinearGradient colors={headerColors} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Catálogo</Text>
              <Text style={styles.headerSubtitle}>
                {`${catalogosPDF.length} catálogos PDF`}
              </Text>
            </View>
            {isAdmin ? (
              <TouchableOpacity
                style={[styles.filterToggle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={subirPDF}
                disabled={uploading}
              >
                {uploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}
          </View>

          {/* Banner subir — solo admin */}
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

      {/* ── CONTENIDO SEGÚN TAB ── */}
      {true ? (

        /* ── TAB PDF ── */
        <View style={{ flex: 1 }}>
          {loadingPDF ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#EA580C" />
            </View>
          ) : catalogosPDF.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="file-pdf-box" size={64} color={isDark ? '#334155' : '#CBD5E1'} />
              <Text style={[styles.centerText, { color: colors.textMain, fontWeight: '700', fontSize: 17, marginTop: 12 }]}>
                Sin catálogos PDF
              </Text>
              <Text style={[styles.centerText, { color: colors.textSub, textAlign: 'center', paddingHorizontal: 40 }]}>
                {isAdmin ? 'Usa el botón de arriba para subir el primer catálogo.' : 'Aún no hay catálogos disponibles.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={isAdmin ? catalogosPDF : catalogosPDF.filter(c => c.activo)}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const fecha = new Date(item.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
                return (
                  <TouchableOpacity
                    style={[styles.pdfCard, { backgroundColor: isDark ? colors.cardBg : '#fff', borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}
                    onPress={() => abrirPDF(item)}
                    activeOpacity={0.85}
                  >
                    {/* Ícono libro animado */}
                    <View style={[styles.pdfIconWrap, { backgroundColor: item.activo ? '#FEF2F2' : (isDark ? '#1e1e1e' : '#F3F4F6') }]}>
                      <MaterialCommunityIcons
                        name={item.activo ? 'book-open-variant' : 'book-off-outline'}
                        size={38}
                        color={item.activo ? '#EF4444' : colors.textSub}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pdfTitle, { color: colors.textMain }]} numberOfLines={2}>
                        {item.titulo}
                      </Text>
                      <Text style={[styles.pdfDate, { color: colors.textSub }]}>{fecha}</Text>
                      {isAdmin && (
                        <View style={[styles.pdfActivoBadge, { backgroundColor: item.activo ? '#DCFCE7' : '#F3F4F6' }]}>
                          <Text style={[styles.pdfActivoText, { color: item.activo ? '#16a34a' : colors.textSub }]}>
                            {item.activo ? 'Visible a vendedores' : 'Oculto'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ gap: 8, alignItems: 'flex-end' }}>
                      {/* Ver */}
                      <TouchableOpacity
                        style={[styles.pdfActionBtn, { backgroundColor: '#EA580C15' }]}
                        onPress={() => abrirPDF(item)}
                      >
                        <Ionicons name="book-outline" size={16} color="#EA580C" />
                        <Text style={[styles.pdfActionText, { color: '#EA580C' }]}>Ver</Text>
                      </TouchableOpacity>
                      {/* Admin: toggle activo + eliminar */}
                      {isAdmin && (
                        <>
                          <TouchableOpacity
                            style={[styles.pdfActionBtn, { backgroundColor: item.activo ? '#FEF9C3' : '#F0FDF4' }]}
                            onPress={() => toggleActivoPDF(item)}
                          >
                            <Ionicons name={item.activo ? 'eye-off-outline' : 'eye-outline'} size={14} color={item.activo ? '#D97706' : '#16a34a'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.pdfActionBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={() => eliminarPDF(item)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

      ) : (

        /* ── TAB PRODUCTOS ── */
        <>
          {/* Filtros de categoría */}
          <View style={{ backgroundColor: colors.cardBg, paddingBottom: 8 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScrollContent}
            >
              <TouchableOpacity
                style={[styles.catChip, !catFilter && { backgroundColor: '#EA580C' }, catFilter && { backgroundColor: isDark ? colors.inputBg : '#F1F5F9' }]}
                onPress={() => setCatFilter(null)}
              >
                <Text style={[styles.catChipText, { color: !catFilter ? '#fff' : colors.textSub }]}>Todos</Text>
              </TouchableOpacity>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, catFilter === cat.id && { backgroundColor: '#EA580C' }, catFilter !== cat.id && { backgroundColor: isDark ? colors.inputBg : '#F1F5F9' }]}
                  onPress={() => setCatFilter(cat.id === catFilter ? null : cat.id)}
                >
                  <Text style={[styles.catChipText, { color: catFilter === cat.id ? '#fff' : colors.textSub }]}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Resumen */}
          <View style={[styles.summaryBar, { backgroundColor: colors.cardBg, borderBottomColor: isDark ? colors.cardBorder : '#E2E8F0', borderBottomWidth: 1 }]}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="package-variant" size={16} color={colors.brandGreen} />
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>{filtered.length} productos</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: isDark ? colors.cardBorder : '#E2E8F0' }]} />
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="cash-multiple" size={16} color="#EA580C" />
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>
                Valor: Bs {totalValue.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          {/* Lista productos */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#EA580C" />
              <Text style={[styles.centerText, { color: colors.textSub }]}>Cargando catálogo...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={60} color={isDark ? '#334155' : '#CBD5E1'} />
              <Text style={[styles.centerText, { color: colors.textMain, fontWeight: '700', fontSize: 17, marginTop: 12 }]}>Sin productos</Text>
              <Text style={[styles.centerText, { color: colors.textSub, textAlign: 'center', paddingHorizontal: 40 }]}>
                No hay productos que coincidan con tu búsqueda.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ProductCard item={item} colors={colors} isDark={isDark} onPress={() => setSelectedProduct(item)} />
              )}
            />
          )}
        </>
      )}

      {/* ── MODAL DETALLE PRODUCTO ── */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            {selectedProduct && (() => {
              const accent = getColor(selectedProduct.id);
              const sinStock = selectedProduct.stock_actual <= 0;
              return (
                <>
                  {/* Encabezado del modal */}
                  <View style={[styles.modalHeader, { backgroundColor: `${accent}12` }]}>
                    <View style={[styles.modalIconBg, { backgroundColor: `${accent}22` }]}>
                      <Text style={[styles.modalInitial, { color: accent }]}>
                        {selectedProduct.nombre_producto.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedProduct(null)}
                    >
                      <Ionicons name="close" size={20} color={colors.textSub} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
                    {selectedProduct.categorias?.nombre && (
                      <Text style={[styles.modalCategory, { color: accent }]}>
                        {selectedProduct.categorias.nombre}
                      </Text>
                    )}
                    <Text style={[styles.modalName, { color: colors.textMain }]}>
                      {selectedProduct.nombre_producto}
                    </Text>
                    <Text style={[styles.modalCode, { color: colors.textSub }]}>
                      Código: #{selectedProduct.codigo_producto}
                    </Text>

                    {selectedProduct.descripcion ? (
                      <Text style={[styles.modalDesc, { color: colors.textSub }]}>
                        {selectedProduct.descripcion}
                      </Text>
                    ) : null}

                    {/* Detalles */}
                    <View style={[styles.modalDetailCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]}>
                      <ModalRow label="Precio de venta" value={`Bs ${selectedProduct.precio_base_venta.toFixed(2)}`} valueColor={accent} colors={colors} />
                      <ModalRow label="Stock disponible" value={`${selectedProduct.stock_actual} unidades`} valueColor={sinStock ? '#DC2626' : colors.textMain} colors={colors} />
                      {selectedProduct.unidad_medida && (
                        <ModalRow label="Unidad de medida" value={selectedProduct.unidad_medida} colors={colors} />
                      )}
                      <ModalRow label="Estado" value={selectedProduct.activo ? 'Activo' : 'Inactivo'} valueColor={selectedProduct.activo ? '#2a8c4a' : '#DC2626'} colors={colors} isLast />
                    </View>

                    {/* Precio total si compras X */}
                    <View style={[styles.calcCard, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}>
                      <MaterialCommunityIcons name="calculator" size={18} color={accent} />
                      <Text style={[styles.calcText, { color: accent }]}>
                        Precio sugerido base: Bs {selectedProduct.precio_base_venta.toFixed(2)} / unidad
                      </Text>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── VISOR PDF con animación de libro ── */}
      <Modal
        visible={pdfVisorVisible}
        animationType="none"
        onRequestClose={() => setPdfVisorVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: '#111' }}>
            <View style={styles.pdfViewerHeader}>
              <TouchableOpacity onPress={() => setPdfVisorVisible(false)} style={styles.pdfViewerBack}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.pdfViewerTitle} numberOfLines={1}>{pdfTitulo}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>Desliza para pasar páginas</Text>
              </View>
              <View style={{ width: 38 }} />
            </View>
          </SafeAreaView>

          <Animated.View style={{ flex: 1, transform: [{ rotateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
            {pdfUrl ? (
              <View style={{ flex: 1, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <MaterialCommunityIcons name="file-pdf-box" size={80} color="#EF4444" />
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>{pdfTitulo}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 20, backgroundColor: '#EF4444', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
                  onPress={() => { const { Linking } = require('react-native'); Linking.openURL(pdfUrl); }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Abrir PDF</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalRow helper
// ─────────────────────────────────────────────────────────────────────────────
const ModalRow = ({
  label,
  value,
  valueColor,
  colors,
  isLast,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
  isLast?: boolean;
}) => (
  <View style={[styles.modalRow, !isLast && { borderBottomColor: `${colors.cardBorder}60`, borderBottomWidth: 1 }]}>
    <Text style={[styles.modalRowLabel, { color: colors.textSub }]}>{label}</Text>
    <Text style={[styles.modalRowValue, { color: valueColor ?? colors.textMain }]}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerInner: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  filterToggle: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterToggleActive: { backgroundColor: 'rgba(255,255,255,0.3)' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 46, paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },

  // Categorías
  catScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  catChipText: { fontSize: 13, fontWeight: '600' },

  // Resumen
  summaryBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryDivider: { width: 1, height: 20, marginHorizontal: 12 },

  // Lista
  listContent: { padding: 16, paddingBottom: 80 },
  row: { justifyContent: 'space-between', marginBottom: 12 },

  // Tarjeta producto
  productCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  productImageBg: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productInitial: { fontSize: 40, fontWeight: '900' },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stockBadgeText: { fontSize: 9, fontWeight: '700' },
  productInfo: { padding: 12 },
  productCategory: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  productName: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 2 },
  productCode: { fontSize: 11, marginBottom: 8 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 14, fontWeight: '800' },
  stockChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  stockChipText: { fontSize: 10, fontWeight: '700' },

  // Estado vacío / cargando
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { marginTop: 8, fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' },
  modalHeader: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  modalIconBg: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  modalInitial: { fontSize: 32, fontWeight: '900' },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalCategory: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  modalName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalCode: { fontSize: 13, marginBottom: 12 },
  modalDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalDetailCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  modalRowLabel: { fontSize: 13 },
  modalRowValue: { fontSize: 13, fontWeight: '700' },
  calcCard: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  calcText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Tabs PDF/Productos
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 4 },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  tabPillActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabPillText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  // Banner subir PDF
  uploadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  uploadBannerText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },

  // Tarjeta PDF
  pdfCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 12, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  pdfIconWrap: { width: 60, height: 60, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pdfTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  pdfDate: { fontSize: 11, marginBottom: 6 },
  pdfActivoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pdfActivoText: { fontSize: 10, fontWeight: '700' },
  pdfActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  pdfActionText: { fontSize: 12, fontWeight: '700' },

  // Visor PDF
  pdfViewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  pdfViewerBack: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  pdfViewerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
});