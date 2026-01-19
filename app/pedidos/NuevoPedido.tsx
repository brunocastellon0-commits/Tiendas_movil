import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// --- Interfaces basadas en tus Tablas Reales ---

// Tabla 'productos'
interface Product {
  id: string;
  nombre_producto: string;
  codigo_producto: string;
  precio_base_venta: number;
  unidad_base_venta: string;
  stock_actual: number;
  activo: boolean;
}

// Extensión para el manejo en el carrito local
interface CartItem extends Product {
  qty: number;
}

export default function NuevoPedido() {
  const router = useRouter();
  const { session } = useAuth();
  const { clientId } = useLocalSearchParams(); 
  
  // Estados
  const [client, setClient] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]); // Lista real de BD
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observation, setObservation] = useState('');
  const [tipoPago, setTipoPago] = useState<'Contado' | 'Crédito'>('Contado'); // Método de pago

  // 1. Carga Inicial (Cliente + Productos)
  useEffect(() => {
    if (!clientId) {
      Alert.alert('Error', 'Falta el ID del cliente');
      router.back();
      return;
    }
    loadInitialData();
  }, [clientId]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);

      // A. Cargar Cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (clientError) throw clientError;
      setClient(clientData);

      // B. Cargar Productos Activos (Tabla 'productos')
      const { data: prodData, error: prodError } = await supabase
        .from('productos')
        .select('id, nombre_producto, codigo_producto, precio_base_venta, unidad_base_venta, stock_actual, activo')
        .eq('activo', true) // Solo productos activos
        .order('nombre_producto', { ascending: true });
        
      if (prodError) throw prodError;
      setProducts(prodData || []);

    } catch (error: any) {

      Alert.alert('Error', 'No se pudieron cargar los datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  // 2. Lógica del Carrito
  const addToCart = (product: Product) => {
    const existing = cart.find(p => p.id === product.id);
    if (existing) {
      updateQty(product.id, existing.qty + 1);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter(p => p.id !== id));
    } else {
      setCart(cart.map(p => p.id === id ? { ...p, qty: newQty } : p));
    }
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.qty * item.precio_base_venta), 0);

  // 3. GUARDAR PEDIDO (Header + Detalle)
  const saveOrder = async () => {
    if (cart.length === 0) return Alert.alert('Carrito vacío', 'Agrega productos antes de guardar.');
    if (!session?.user) return Alert.alert('Error', 'Sesión inválida');

    setSaving(true);
    try {
      // A. Obtener GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permiso de ubicación denegado');
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // B. Insertar Cabecera (Tabla 'pedidos')
      const orderPayload = {
        numero_documento: Math.floor(Date.now() / 1000), // Generación temporal de Nro
        fecha_pedido: new Date().toISOString(),
        tipo_documento_pedido: 'Nota de Venta',
        tipo_pago: tipoPago,
        almacen: 'Central',   // Valor por defecto según tu negocio
        sucursal: 'Principal', // Valor por defecto
        dias_plazo: tipoPago === 'Crédito' ? 30 : 0, // Si es crédito, 30 días
        
        total_venta: calculateTotal(),
        descuento_porcentaje: 0,
        descuento_monto: 0,
        observacion: observation,
        estado: tipoPago === 'Contado' ? 'Pagado' : 'Pendiente', // Contado = Pagado, Crédito = Pendiente
        total_peso: 0,
        interes: '0',
        
        ubicacion_venta: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        clients_id: clientId,         // FK Cliente
        empleado_id: session.user.id  // FK Empleado
      };

      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .insert(orderPayload)
        .select('id') // Necesitamos el ID para los detalles
        .single();

      if (orderError) throw orderError;
      const newOrderId = orderData.id;

      // C. Insertar Detalles (Tabla 'detalle_pedido')
      const detailsPayload = cart.map(item => ({
        pedido_id: newOrderId,          // FK al pedido recién creado
        producto_id: item.id,           // FK al producto
        
        unidad_seleccionada: item.unidad_base_venta || 'UNID',
        factor_aplicado: 1,             // Por defecto 1 si no manejas conversiones complejas
        precio_unitario: item.precio_base_venta,
        cantidad: item.qty,
        subtotal: item.qty * item.precio_base_venta
      }));

      const { error: detailsError } = await supabase
        .from('detalle_pedido')
        .insert(detailsPayload);

      if (detailsError) {
        throw detailsError;
      }

      // D. DESCONTAR STOCK DE PRODUCTOS
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('productos')
          .update({ 
            stock_actual: item.stock_actual - item.qty 
          })
          .eq('id', item.id);

        if (stockError) {

          // Continuar con los demás productos aunque uno falle
        }
      }

      Alert.alert('¡Éxito!', 'Pedido registrado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error: any) {

      Alert.alert('Error', error.message || 'Ocurrió un error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado de productos en memoria
  const filteredProducts = products.filter(p => 
    p.nombre_producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo_producto?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2a8c4a" />
        <Text style={{marginTop: 10, color: '#666'}}>Cargando catálogo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{marginLeft: 15}}>
          <Text style={styles.headerTitle}>Nuevo Pedido</Text>
          <Text style={styles.headerSubtitle}>{client?.name || 'Cliente'}</Text>
        </View>
      </View>

      <View style={{flex: 1}}>
        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar producto por nombre o código..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.content}>
          
          {/* Grilla de Productos */}
          <Text style={styles.sectionTitle}>Catálogo</Text>
          <View style={styles.grid}>
            {filteredProducts.map(p => (
              <TouchableOpacity key={p.id} style={styles.prodCard} onPress={() => addToCart(p)}>
                <View>
                  <Text style={styles.prodName}>{p.nombre_producto}</Text>
                  <Text style={styles.prodCode}>{p.codigo_producto}</Text>
                </View>
                <View style={styles.prodFooter}>
                  <Text style={styles.prodPrice}>Bs {p.precio_base_venta}</Text>
                  <Ionicons name="add-circle" size={28} color="#2a8c4a" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Carrito */}
          {cart.length > 0 && (
            <View style={styles.cartContainer}>
              <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
              {cart.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cartName}>{item.nombre_producto}</Text>
                    <Text style={styles.cartPrice}>Bs {item.precio_base_venta} x {item.qty}</Text>
                  </View>
                  
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => updateQty(item.id, item.qty - 1)}>
                      <Ionicons name="remove-circle" size={26} color="#ccc" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.qty}</Text>
                    <TouchableOpacity onPress={() => updateQty(item.id, item.qty + 1)}>
                      <Ionicons name="add-circle" size={26} color="#2a8c4a" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.rowTotal}>
                    Bs {(item.qty * item.precio_base_venta).toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Método de Pago */}
              <View style={styles.obsBox}>
                <Text style={styles.label}>Método de Pago:</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.paymentButton, 
                      tipoPago === 'Contado' && styles.paymentButtonActive
                    ]}
                    onPress={() => setTipoPago('Contado')}
                  >
                    <Ionicons 
                      name="cash" 
                      size={24} 
                      color={tipoPago === 'Contado' ? '#2a8c4a' : '#666'} 
                    />
                    <Text style={[
                      styles.paymentText,
                      tipoPago === 'Contado' && styles.paymentTextActive
                    ]}>
                      Contado
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.paymentButton, 
                      tipoPago === 'Crédito' && styles.paymentButtonActive
                    ]}
                    onPress={() => setTipoPago('Crédito')}
                  >
                    <Ionicons 
                      name="card" 
                      size={24} 
                      color={tipoPago === 'Crédito' ? '#2a8c4a' : '#666'} 
                    />
                    <Text style={[
                      styles.paymentText,
                      tipoPago === 'Crédito' && styles.paymentTextActive
                    ]}>
                      Crédito
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.obsBox}>
                <Text style={styles.label}>Observaciones:</Text>
                <TextInput 
                  style={styles.inputObs}
                  placeholder="Notas adicionales..."
                  value={observation}
                  onChangeText={setObservation}
                  multiline
                />
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL A PAGAR:</Text>
                <Text style={styles.totalAmount}>Bs {calculateTotal().toFixed(2)}</Text>
              </View>
            </View>
          )}
          
          {/* Espacio extra al final para scroll */}
          <View style={{height: 100}} />
        </ScrollView>
      </View>

      {/* Footer Flotante */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveBtn, saving && styles.disabledBtn]} 
            onPress={saveOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
                <Text style={styles.saveBtnText}>Confirmar Pedido</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: '#2a8c4a',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#E8F5E9', fontSize: 14 },
  
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 15,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  
  content: { paddingHorizontal: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  prodCard: {
    backgroundColor: '#FFF',
    width: '48%',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    justifyContent: 'space-between',
    elevation: 2,
  },
  prodName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  prodCode: { fontSize: 12, color: '#999', marginBottom: 8 },
  prodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodPrice: { fontSize: 15, fontWeight: 'bold', color: '#2a8c4a' },
  
  cartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    elevation: 3,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cartName: { fontSize: 14, color: '#333', fontWeight: '500' },
  cartPrice: { fontSize: 12, color: '#666' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  qtyText: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 8, minWidth: 20, textAlign: 'center' },
  rowTotal: { fontSize: 14, fontWeight: 'bold', color: '#333', width: 70, textAlign: 'right' },
  
  obsBox: { marginTop: 15 },
  label: { fontSize: 12, color: '#666', marginBottom: 5 },
  inputObs: {
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#2a8c4a' },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    elevation: 10,
  },
  saveBtn: {
    backgroundColor: '#2a8c4a',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  // Estilos de método de pago
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    gap: 8,
  },
  paymentButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2a8c4a',
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  paymentTextActive: {
    color: '#2a8c4a',
  },
});
