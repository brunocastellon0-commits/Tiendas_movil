import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, StatusBar, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Servicios
import { productoService } from '../../../services/ProductoService';
import { obtenerCategoria } from '../../../services/CategoriaService';
import { Producto, Equivalencia } from '../../../types/Producto.interface';
import { Categorias } from '../../../types/Categorias.inteface';

export default function ProductoScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // --- ESTADOS DE DATOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categorias[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE FILTROS ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Vigente' | 'Inactivo'>('Todos');
  const [filterCategory, setFilterCategory] = useState<string>('Todas'); // ID de categoría

  // --- ESTADOS MODAL STOCK ---
  const [modalVisible, setModalVisible] = useState(false);
  const [prodSeleccionado, setProdSeleccionado] = useState<Producto | null>(null);
  const [cantidadEntrante, setCantidadEntrante] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<{ nombre: string, factor: number }>({ nombre: '', factor: 1 });
  const [equivalencias, setEquivalencias] = useState<Equivalencia[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  // Cargar Datos
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productoService.getProductos(''),
        obtenerCategoria('')
      ]);
      setProductos(prods || []);
      setCategorias(cats || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRADO MAESTRA ---
  const filteredProducts = useMemo(() => {
    return productos.filter(p => {
      // 1. Filtro Texto (Nombre o Código)
      const searchText = search.toLowerCase();
      const matchesSearch = p.nombre_producto.toLowerCase().includes(searchText) ||
        p.codigo_producto.toLowerCase().includes(searchText);

      // 2. Filtro Estado
      // Asumimos que en BD el estado es 'Vigente' o cualquier otra cosa para inactivo
      let matchesStatus = true;
      if (filterStatus === 'Vigente') matchesStatus = p.estado === 'Vigente';
      if (filterStatus === 'Inactivo') matchesStatus = p.estado !== 'Vigente';

      // 3. Filtro Categoría
      const matchesCategory = filterCategory === 'Todas' || p.id_categoria === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [productos, search, filterStatus, filterCategory]);

  // --- FUNCIONES MODAL ---
  const abrirModalStock = async (prod: Producto) => {
    setProdSeleccionado(prod);
    setCantidadEntrante('');
    setUnidadSeleccionada({ nombre: prod.unidad_base_venta || 'UND', factor: 1 });
    setShowSelector(false);

    try {
      const eqs = await productoService.getEquivalenciaProducto(prod.id!);
      setEquivalencias(eqs);
      setModalVisible(true);
    } catch (e) { setModalVisible(true); }
  };

  const guardarStock = async () => {
    if (!prodSeleccionado || !cantidadEntrante) return;
    const qty = parseFloat(cantidadEntrante);
    if (isNaN(qty) || qty <= 0) { Alert.alert("Error", "Cantidad inválida"); return; }

    try {
      await productoService.registroStock(prodSeleccionado.id!, qty, unidadSeleccionada.factor, prodSeleccionado.precio_base_venta);
      setModalVisible(false);
      cargarDatos();
      Alert.alert("Stock Actualizado", `Se agregaron ${qty * unidadSeleccionada.factor} unidades.`);
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  // Renderizado de Tarjeta
  const renderItem = ({ item }: { item: Producto }) => {
    const stockBajo = (item.stock_actual || 0) <= (item.stock_min || 0);
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => router.push(`/admin/productos/NuevoProducto?id=${item.id}` as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.15)' : '#E8F5E9' }]}>
            <MaterialCommunityIcons name="cube-outline" size={24} color={colors.brandGreen} />
          </View>
          <View style={styles.infoBox}>
            <Text style={[styles.prodName, { color: colors.textMain }]} numberOfLines={1}>{item.nombre_producto}</Text>
            <Text style={[styles.prodCode, { color: colors.textSub }]}>{item.codigo_producto}</Text>
            <View style={[styles.priceBadge, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.2)' : '#E3F2FD' }]}>
              <Text style={[styles.priceText, { color: isDark ? '#64B5F6' : '#1976D2' }]}>Bs {item.precio_base_venta.toFixed(2)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.stockBox}>
          <Text style={[styles.lblStock, { color: colors.textSub }]}>STOCK</Text>
          <Text style={[styles.valStock, { color: stockBajo ? '#EF5350' : colors.brandGreen }]}>{item.stock_actual || 0}</Text>
          <TouchableOpacity style={[styles.btnAdd, { backgroundColor: colors.brandGreen }]} onPress={() => abrirModalStock(item)}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* --- HEADER CON FILTROS --- */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>

          {/* 1. Top Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Inventario</Text>
            <TouchableOpacity onPress={() => router.push('/admin/productos/NuevoProducto' as any)} style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 2. Buscador */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* 3. Filtros */}
          <View style={styles.filterSection}>
            {/* A. Tabs de Estado */}
            <View style={styles.tabsRow}>
              {(['Todos', 'Vigente', 'Inactivo'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.tabItem, filterStatus === status && styles.tabActive]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[styles.tabText, filterStatus === status ? { color: colors.brandGreen } : { color: 'rgba(255,255,255,0.8)' }]}>{status}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* B. Categorías (Scroll Horizontal) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <TouchableOpacity
                style={[styles.catChip, filterCategory === 'Todas' ? styles.catActive : styles.catInactive]}
                onPress={() => setFilterCategory('Todas')}
              >
                <Text style={[styles.catText, filterCategory === 'Todas' ? { color: colors.brandGreen } : { color: '#fff' }]}>Todas</Text>
              </TouchableOpacity>

              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, filterCategory === cat.id ? styles.catActive : styles.catInactive]}
                  onPress={() => setFilterCategory(cat.id)}
                >
                  <Text style={[styles.catText, filterCategory === cat.id ? { color: colors.brandGreen } : { color: '#fff' }]}>
                    {cat.nombre_categoria}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

        </SafeAreaView>
      </LinearGradient>

      {/* --- LISTA --- */}
      <View style={styles.listContainer}>
        <View style={styles.bgDecoration}>
          <View style={[styles.circle, { backgroundColor: colors.brandGreen, opacity: colors.bubbleOpacity }]} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
            <Text style={{ marginTop: 10, color: colors.textSub }}>Cargando...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={i => i.id!}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="package-variant" size={40} color={colors.iconGray} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.textSub, marginTop: 10 }}>No se encontraron productos</Text>
              </View>
            }
          />
        )}
      </View>

      {/* --- MODAL CARGA RÁPIDA --- */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>Cargar Stock</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            {prodSeleccionado && (
              <>
                <Text style={[styles.mProdName, { color: colors.brandGreen }]}>{prodSeleccionado.nombre_producto}</Text>
                <Text style={{ color: colors.textSub, marginBottom: 15 }}>
                  Actual: <Text style={{ fontWeight: 'bold', color: colors.textMain }}>{prodSeleccionado.stock_actual}</Text>
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.inputQty, { color: colors.textMain, backgroundColor: colors.inputBg, borderColor: isDark ? colors.cardBorder : '#ddd' }]}
                    placeholder="0" placeholderTextColor={colors.textSub} keyboardType="numeric" value={cantidadEntrante} onChangeText={setCantidadEntrante} autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.unitBtn, { backgroundColor: isDark ? 'rgba(42,140,74,0.2)' : '#E8F5E9', borderColor: colors.brandGreen }]}
                    onPress={() => setShowSelector(!showSelector)}
                  >
                    <Text style={{ color: colors.brandGreen, fontWeight: 'bold' }}>{unidadSeleccionada.nombre}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.brandGreen} />
                  </TouchableOpacity>
                </View>

                {showSelector && (
                  <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <TouchableOpacity style={styles.dropItem} onPress={() => { setUnidadSeleccionada({ nombre: prodSeleccionado.unidad_base_venta, factor: 1 }); setShowSelector(false); }}>
                      <Text style={{ color: colors.textMain }}>{prodSeleccionado.unidad_base_venta} (x1)</Text>
                    </TouchableOpacity>
                    {equivalencias.map((eq, i) => (
                      <TouchableOpacity key={i} style={styles.dropItem} onPress={() => { setUnidadSeleccionada({ nombre: eq.nombre_unidad, factor: eq.conversion_factores }); setShowSelector(false); }}>
                        <Text style={{ color: colors.textMain }}>{eq.nombre_unidad} (x{eq.conversion_factores})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: colors.brandGreen }]} onPress={guardarStock}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>CONFIRMAR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  headerGradient: { paddingBottom: 15, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
  headerContent: { paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  iconBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, height: 45, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', marginLeft: 10 },

  // Filtros
  filterSection: { marginTop: 15 },
  tabsRow: { flexDirection: 'row', marginBottom: 10, gap: 10 },
  tabItem: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.2)' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '700' },

  catScroll: { marginBottom: 5 },
  catChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginRight: 8 },
  catActive: { backgroundColor: '#fff' },
  catInactive: { backgroundColor: 'rgba(0,0,0,0.2)' },
  catText: { fontSize: 12, fontWeight: '600' },

  // Body
  listContainer: { flex: 1, marginTop: 5 },
  bgDecoration: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  circle: { position: 'absolute', top: 50, right: -50, width: 200, height: 200, borderRadius: 999 },

  // Card
  card: { flexDirection: 'row', borderRadius: 16, padding: 12, marginBottom: 12, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoBox: { flex: 1 },
  prodName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  prodCode: { fontSize: 12, marginBottom: 4 },
  priceBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priceText: { fontSize: 12, fontWeight: 'bold' },

  stockBox: { alignItems: 'center', minWidth: 50, borderLeftWidth: 1, borderLeftColor: '#f0f0f0', paddingLeft: 10 },
  lblStock: { fontSize: 9, fontWeight: '700' },
  valStock: { fontSize: 16, fontWeight: 'bold' },
  btnAdd: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  mProdName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', zIndex: 20 },
  inputQty: { flex: 1, height: 45, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  unitBtn: { height: 45, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 5 },
  dropdown: { position: 'absolute', top: 125, right: 0, width: 150, borderWidth: 1, borderRadius: 10, zIndex: 100, padding: 5 },
  dropItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  btnConfirm: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  empty: { alignItems: 'center', marginTop: 80, opacity: 0.7 },
});
