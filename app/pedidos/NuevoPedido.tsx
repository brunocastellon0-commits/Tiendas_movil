import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { Client } from '../../types/Cliente.interface';
import { useAuth } from '../../contexts/AuthContext';

// Estructura para los items que se guardarán en JSONB
interface OrderItem {
  name: string;      // Nombre del producto
  qty: number;       // Cantidad
  price: number;     // Precio unitario
}

// Producto con ID temporal para la UI
interface ProductWithId extends OrderItem {
  id: string;
}

// Productos disponibles (hardcoded mientras no hay tabla de productos)
const AVAILABLE_PRODUCTS: ProductWithId[] = [
  { id: '1', name: 'Coca Cola 2L', qty: 0, price: 10 },
  { id: '2', name: 'Coca Cola 1L', qty: 0, price: 6 },
  { id: '3', name: 'Pepsi 2L', qty: 0, price: 9 },
  { id: '4', name: 'Pepsi 1L', qty: 0, price: 5 },
  { id: '5', name: 'Agua Vital 2L', qty: 0, price: 5 },
  { id: '6', name: 'Agua Vital 500ml', qty: 0, price: 2 },
  { id: '7', name: 'Fanta Naranja 2L', qty: 0, price: 9 },
  { id: '8', name: 'Sprite 2L', qty: 0, price: 9 },
  { id: '9', name: 'Cerveza Paceña', qty: 0, price: 7 },
  { id: '10', name: 'Cerveza Huari', qty: 0, price: 6 },
  { id: '11', name: 'Jugo Del Valle Naranja 1L', qty: 0, price: 8 },
  { id: '12', name: 'Jugo Del Valle Durazno 1L', qty: 0, price: 8 },
];

export default function NuevoPedido() {
  const router = useRouter();
  const { session } = useAuth();
  const { clientId, visitId } = useLocalSearchParams();
  
  const [client, setClient] = useState<Client | null>(null);
  const [orderItems, setOrderItems] = useState<ProductWithId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');

  // Cargar información del cliente
  useEffect(() => {
    if (clientId) {
      loadClient();
    } else {
      Alert.alert('Error', 'No se especificó un cliente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar la información del cliente');
    } finally {
      setLoading(false);
    }
  };

  const addProductToOrder = (product: ProductWithId) => {
    const existingItem = orderItems.find(item => item.id === product.id);
    
    if (existingItem) {
      // Incrementar cantidad
      setOrderItems(orderItems.map(item =>
        item.id === product.id
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      // Agregar nuevo producto con cantidad 1
      setOrderItems([
        ...orderItems,
        { ...product, qty: 1 }
      ]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(item => item.id !== productId));
    } else {
      setOrderItems(orderItems.map(item =>
        item.id === productId
          ? { ...item, qty: newQuantity }
          : item
      ));
    }
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  };

  const saveOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Agrega al menos un producto al pedido');
      return;
    }

    if (!session?.user) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    setSaving(true);
    try {
      // A. Capturar ubicación GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permiso Requerido", 
          "La ubicación es necesaria para validar el pedido y mostrarlo en el mapa."
        );
        setSaving(false);
        return;
      }

      // Obtener coordenadas con alta precisión
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // B. Convertir los items al formato JSONB
      const itemsForDB: OrderItem[] = orderItems.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price
      }));

      // C. Preparar el payload
      const orderPayload: any = {
        client_id: clientId,
        seller_id: session.user.id,
        items: itemsForDB,
        total_amount: calculateTotal(),
        status: 'pending',
        order_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`
      };

      if (visitId) {
        orderPayload.visit_id = visitId;
      }

      if (deliveryDate) {
        orderPayload.delivery_date = deliveryDate;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('pedidos_auxiliares')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) throw orderError;

      Alert.alert(
        '✅ Pedido Creado',
        `Pedido #${orderData.id} registrado correctamente\n` +
        `Total: Bs. ${calculateTotal().toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('❌ Error', 'No se pudo guardar el pedido: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = AVAILABLE_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a8c4a" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con información del cliente */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Nuevo Pedido</Text>
          {client && (
            <View style={styles.clientInfoHeader}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientCode}>{client.code}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Sección de búsqueda de productos */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Agregar Productos</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Lista de productos disponibles */}
          <View style={styles.productsGrid}>
            {filteredProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addProductToOrder(product)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>Bs. {product.price.toFixed(2)}</Text>
                </View>
                <Ionicons name="add-circle" size={32} color="#2a8c4a" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Carrito / Items del pedido */}
        {orderItems.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionTitle}>Pedido Actual ({orderItems.length} productos)</Text>
            {orderItems.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>Bs. {item.price.toFixed(2)} c/u</Text>
                </View>
                
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.qty - 1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.qty}</Text>
                  
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.id, item.qty + 1)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cartItemTotal}>
                  <Text style={styles.subtotalText}>
                    Bs. {(item.qty * item.price).toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#2a8c4a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Campo de fecha de entrega (opcional) */}
            <View style={styles.deliverySection}>
              <Text style={styles.deliveryLabel}>Fecha de entrega (opcional):</Text>
              <TextInput
                style={styles.deliveryInput}
                placeholder="YYYY-MM-DD"
                value={deliveryDate}
                onChangeText={setDeliveryDate}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer con total y botón de confirmar */}
      {orderItems.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>Bs. {calculateTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
            onPress={saveOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.confirmText}>Confirmar Pedido</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2a8c4a',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  clientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientName: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  clientCode: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  productsGrid: {
    gap: 10,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a8c4a',
  },
  cartSection: {
    padding: 20,
    backgroundColor: '#fff',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  quantityButton: {
    backgroundColor: '#2a8c4a',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a8c4a',
    marginBottom: 5,
  },
  removeButton: {
    padding: 5,
  },
  deliverySection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  deliveryInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a8c4a',
  },
  confirmButton: {
    backgroundColor: '#2a8c4a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    gap: 10,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});