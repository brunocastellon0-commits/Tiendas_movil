import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { productoService } from '../../../services/ProductoService';
import { Producto } from '../../../types/Producto.interface';

export default function ProductosListScreen() {
  const router = useRouter();
  //Memoria

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true); // primera carga
  const [searching, setSearching] = useState(false); // búsqueda en curso
  const [refreshing, setRefreshing] = useState(false); // refresca el listado cuando la lista se hace hacia abajo 
  const [search, setSearch] = useState('');

  //pedimos datos al servidor con esta funcion
  const fetchProductos = useCallback(async () => {
    try {
      const data = await productoService.getProductos(search);
      setProductos(data);

    } catch (error: any) {
      console.error('Error fetching productos:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
      setSearching(false);
      setRefreshing(false);
    }
  }, [search]);

  // useFocusEffect para que la lista se actualice cuando vuelves a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchProductos();
    }, [fetchProductos])
  );

  //Debounce para la busqueda
  React.useEffect(() => {
    if (loading) return; // No ejecutar si es la primera carga

    setSearching(true);
    const timer = setTimeout(() => {
      fetchProductos();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  //funcion de eliminar
  const handleDelete = (id: string, nombre: string) => {
    Alert.alert("Desactivar", `Quitar "${nombre}" del catalogo?`, [
      { text: "Cancelar", style: 'cancel' },
      {
        text: "Si, quitar", style: 'destructive', onPress: async () => {
          await productoService.deleteProducto(id);
          fetchProductos();//recarga la lista
        }
      }
    ]);
  };
  // Diseño de cada tarjeta
  const renderItem = ({ item }: { item: Producto }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.nombre_producto}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.nombre_producto)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#C62828" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardInfo}>
          <Ionicons name="barcode-outline" size={14} color="#666" /> {item.codigo_producto || 'Sin código'}
        </Text>
        <Text style={styles.cardInfo}>
          <MaterialIcons name="inventory" size={14} color="#666" /> Stock:
          {/* Si el stock es bajo (menor a 10), lo pintamos de rojo */}
          <Text style={{ color: (item.stock_actual || 0) < 10 ? '#C62828' : '#333', fontWeight: 'bold' }}> {item.stock_actual}</Text>
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.unitText}>{item.unidad_base_venta}</Text>
        <Text style={styles.priceValue}>Bs {item.precio_base_venta}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Verde */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catálogo Productos</Text>
        {/* Navegamos a la pantalla de crear */}
        <TouchableOpacity onPress={() => router.push('/admin/productos/NuevoProducto' as any)}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            value={search}
            onChangeText={setSearch}
          />
          {searching && <ActivityIndicator size="small" color="#2a8c4a" />}
        </View>

        {/* --- EXPLICACIÓN 4: FlatList ---
            Es mejor que ScrollView para listas largas.
            Solo dibuja los elementos que caben en la pantalla, ahorrando memoria. */}
        {loading ? (
          <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={productos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                fetchProductos();
              }} colors={['#2a8c4a']} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>No hay productos registrados.</Text>}
          />
        )}
      </View>
    </View>
  );
}

// Estilos limpios y consistentes
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2a8c4a', paddingTop: 50, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  body: { flex: 1, padding: 16 },
  searchContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  deleteBtn: { padding: 4, backgroundColor: '#FFEBEE', borderRadius: 4 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardInfo: { fontSize: 14, color: '#666' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: '#2a8c4a' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999' },
});
