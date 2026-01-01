import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { productoService } from '../../../services/ProductoService';
import { Producto, Equivalencia } from '../../../types/Producto.interface';

export default function ProductoScreen() {
  const router = useRouter();

  // --- MEMORIA (Estados) ---
  const [search, setSearch] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para la Ventana Emergente (Modal)
  const [modalVisible, setModalVisible] = useState(false);
  const [prodSeleccionado, setProdSeleccionado] = useState<Producto | null>(null);
  const [equivalenciasProd, setEquivalenciasProd] = useState<Equivalencia[]>([]);

  // Estados para el Formulario de Entrada
  const [cantidadEntrante, setCantidadEntrante] = useState('');
  const [precioBaseEdit, setPrecioBaseEdit] = useState('');

  // Aquí guardamos si elegiste "UND" o "CAJA". Por defecto UND (Factor 1)
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<{ nombre: string, factor: number }>({
    nombre: 'UND',
    factor: 1
  });

  // Para mostrar/ocultar el menú desplegable
  const [showSelectorUnidad, setShowSelectorUnidad] = useState(false);

  // 1. BUSCADOR AUTOMÁTICO
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarProductos();
    }, 500); // Espera un poquito antes de buscar
    return () => clearTimeout(timer);
  }, [search]);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const data = await productoService.getProductos(search);
      setProductos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. ABRIR VENTANA DE INGRESO
  const abrirModalIngreso = async (prod: Producto) => {
    setProdSeleccionado(prod);
    setCantidadEntrante('');
    setPrecioBaseEdit(prod.precio_base_venta.toString());

    // Reiniciar a Unidad Base
    setUnidadSeleccionada({
      nombre: prod.unidad_base_venta || 'UND',
      factor: 1
    });
    setShowSelectorUnidad(false);

    // Buscar equivalencias (Cajas, Docenas)
    try {
      const eqs = await productoService.getEquivalenciaProducto(prod.id!);
      setEquivalenciasProd(eqs);
      setModalVisible(true);
    } catch (e) {
      Alert.alert("Error", "No se cargaron las equivalencias");
    }
  };

  // 3. GUARDAR (El momento de la verdad)
  const guardarEntrada = async () => {
    if (!prodSeleccionado || !cantidadEntrante) return;

    const cantidadNum = parseFloat(cantidadEntrante);
    const precioNum = parseFloat(precioBaseEdit);

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert("Atención", "Ingresa una cantidad válida mayor a 0");
      return;
    }

    try {
      // AQUÍ LLAMAMOS A LA FUNCIÓN QUE ARREGLAMOS EN EL SERVICIO
      await productoService.registroStock(
        prodSeleccionado.id!,
        cantidadNum,
        unidadSeleccionada.factor, // La magia: multiplica x12 si es caja
        precioNum
      );

      // Confirmación visual
      const totalSumado = cantidadNum * unidadSeleccionada.factor;
      Alert.alert("¡Éxito!", `Se sumaron ${totalSumado} unidades al inventario.`);

      setModalVisible(false);
      cargarProductos(); // Recargar lista para ver el stock nuevo
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // DISEÑO DE LA TARJETA
  const renderItem = ({ item }: { item: Producto }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="package-variant" size={24} color="#2a8c4a" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.prodName}>{item.nombre_producto}</Text>
        <Text style={styles.prodCode}>{item.codigo_producto}</Text>
        <Text style={styles.prodPrice}>Bs {item.precio_base_venta}</Text>
      </View>
      <View style={styles.cardStock}>
        <Text style={styles.stockLabel}>Stock</Text>
        {/* Rojo si hay poco, Verde si hay harto */}
        <Text style={[
          styles.stockValue,
          (item.stock_actual || 0) < (item.stock_min || 0) ? styles.textRed : styles.textGreen
        ]}>
          {item.stock_actual || 0}
        </Text>
        <Text style={styles.unitSmall}>{item.unidad_base_venta}</Text>
      </View>
      {/* Botón para añadir stock */}
      <TouchableOpacity
        style={styles.addStockBtn}
        onPress={() => abrirModalIngreso(item)}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addStockText}>Stock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Inventario</Text>
          <Text style={styles.headerDate}>Hoy: {new Date().toLocaleDateString()}</Text>
        </View>
        {/* Botón para crear nuevo producto */}
        <TouchableOpacity onPress={() => router.push('/admin/productos/NuevoProducto' as any)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchSection}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          value={search}
          onChangeText={setSearch}
        />
        {loading && <ActivityIndicator size="small" color="#2a8c4a" />}
      </View>

      {/* Lista */}
      <FlatList
        data={productos}
        keyExtractor={item => item.id!}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search ? "No encontrado" : "Busca un producto..."}
          </Text>
        }
      />

      {/* VENTANA EMERGENTE (MODAL) */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Ingreso</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {prodSeleccionado && (
              <View>
                <Text style={styles.selectedName}>{prodSeleccionado.nombre_producto}</Text>
                <Text style={styles.selectedStock}>
                  Stock Actual: {prodSeleccionado.stock_actual || 0} {prodSeleccionado.unidad_base_venta}s
                </Text>

                {/* INPUT CANTIDAD + SELECTOR UNIDAD */}
                <Text style={styles.labelInput}>Cantidad que ingresa:</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={cantidadEntrante}
                    onChangeText={setCantidadEntrante}
                    autoFocus
                  />

                  {/* Botón Selector */}
                  <TouchableOpacity
                    style={styles.unitSelector}
                    onPress={() => setShowSelectorUnidad(!showSelectorUnidad)}
                  >
                    <Text style={styles.unitText}>{unidadSeleccionada.nombre}</Text>
                    <Ionicons name="chevron-down" size={16} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* LISTA DESPLEGABLE (Cajas, etc) */}
                {showSelectorUnidad && (
                  <View style={styles.dropdown}>
                    {/* Opción Base */}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUnidadSeleccionada({
                          nombre: prodSeleccionado.unidad_base_venta,
                          factor: 1
                        });
                        setShowSelectorUnidad(false);
                      }}
                    >
                      <Text>{prodSeleccionado.unidad_base_venta} (x1)</Text>
                    </TouchableOpacity>

                    {/* Opciones Equivalencias */}
                    {equivalenciasProd.map((eq, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setUnidadSeleccionada({
                            nombre: eq.nombre_unidad,
                            factor: eq.conversion_factores
                          });
                          setShowSelectorUnidad(false);
                        }}
                      >
                        <Text style={{ fontWeight: 'bold' }}>{eq.nombre_unidad}</Text>
                        <Text style={{ fontSize: 12, color: '#666' }}> (x{eq.conversion_factores})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* CÁLCULO VISUAL */}
                {cantidadEntrante ? (
                  <Text style={styles.calcText}>
                    Total a sumar: <Text style={{ fontWeight: 'bold', color: '#2a8c4a' }}>
                      {parseFloat(cantidadEntrante) * unidadSeleccionada.factor}
                    </Text> unidades.
                  </Text>
                ) : null}

                {/* OPCIONAL: PRECIO */}
                <Text style={[styles.labelInput, { marginTop: 20 }]}>Nuevo Precio (Opcional)</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencyPrefix}>Bs</Text>
                  <TextInput
                    style={styles.inputPrice}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={precioBaseEdit}
                    onChangeText={setPrecioBaseEdit}
                  />
                </View>

                {/* BOTÓN CONFIRMAR */}
                <TouchableOpacity style={styles.btnConfirmar} onPress={guardarEntrada}>
                  <Text style={styles.btnText}>CONFIRMAR ENTRADA</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2' },
  header: { backgroundColor: '#2a8c4a', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerDate: { color: '#E8F5E9', fontSize: 12 },
  addButton: { padding: 4 },

  searchSection: { flexDirection: 'row', backgroundColor: 'white', margin: 15, padding: 12, borderRadius: 10, alignItems: 'center', elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  listContent: { paddingHorizontal: 15, paddingBottom: 50 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

  // Card
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, alignItems: 'center', elevation: 1 },
  cardIcon: { width: 45, height: 45, backgroundColor: '#E8F5E9', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  prodName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  prodCode: { fontSize: 13, color: '#666' },
  prodPrice: { fontSize: 14, fontWeight: 'bold', color: '#2a8c4a', marginTop: 4 },
  cardStock: { alignItems: 'flex-end', minWidth: 60, marginRight: 10 },
  stockLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase' },
  stockValue: { fontSize: 20, fontWeight: 'bold' },
  unitSmall: { fontSize: 10, color: '#666' },
  textGreen: { color: '#2a8c4a' },
  textRed: { color: '#C62828' },
  addStockBtn: { backgroundColor: '#2a8c4a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addStockText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2a8c4a' },
  selectedName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  selectedStock: { fontSize: 14, color: '#666', marginBottom: 25, backgroundColor: '#F5F5F5', padding: 8, borderRadius: 5, alignSelf: 'flex-start' },

  // Inputs Modal
  labelInput: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputGroup: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 15, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  unitSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#2a8c4a', minWidth: 110, justifyContent: 'space-between' },
  unitText: { fontWeight: 'bold', color: '#2a8c4a', marginRight: 5 },

  dropdown: { backgroundColor: 'white', position: 'absolute', top: 160, right: 25, left: 25, zIndex: 100, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, elevation: 10 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  calcText: { fontSize: 13, color: '#555', marginTop: 10, fontStyle: 'italic', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },

  priceContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, backgroundColor: '#F9F9F9', overflow: 'hidden' },
  currencyPrefix: { paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#EEE', color: '#555', fontWeight: 'bold' },
  inputPrice: { flex: 1, padding: 15, fontSize: 16 },

  btnConfirmar: { backgroundColor: '#2a8c4a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});