import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Interfaces ---
interface Product {
  id: string;
  nombre_producto: string;
  codigo_producto: string;
  precio_base_venta: number;
  unidad_base_venta: string;
  stock_actual: number;
  activo: boolean;
}

interface CartItem extends Product {
  qty: number;
}

export default function NuevoPedido() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();
  const { clientId } = useLocalSearchParams();

  // Estados de Datos
  const [client, setClient] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados UI
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Ref para el ScrollView
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Campos del Formulario
  const [nroDocumento, setNroDocumento] = useState('00000');
  const [fecha, setFecha] = useState(new Date().toLocaleDateString());
  const [tipoDocumento, setTipoDocumento] = useState<'Factura' | 'Documento'>('Documento');
  const [tipoPago, setTipoPago] = useState<'Contado' | 'Crédito'>('Contado');
  const [observation, setObservation] = useState('');

  // NUEVOS: Descuento e Interés
  const [descuentoMonto, setDescuentoMonto] = useState('0');
  const [interesPorcentaje, setInteresPorcentaje] = useState('0');

  // 1. Carga Inicial
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

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (clientError) throw clientError;
      setClient(clientData);

      setNroDocumento(Math.floor(100000 + Math.random() * 900000).toString());

      const { data: prodData, error: prodError } = await supabase
        .from('productos')
        .select('id, nombre_producto, codigo_producto, precio_base_venta, unidad_base_venta, stock_actual, activo')
        .eq('activo', true)
        .order('nombre_producto', { ascending: true });

      if (prodError) throw prodError;
      setProducts(prodData || []);

    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoadingData(false);
    }
  };

  // 2. Lógica Carrito (MODIFICADO: cantidad inicial = 0)
  const addToCart = (product: Product) => {
    const existing = cart.find(p => p.id === product.id);
    if (existing) {
      // Si ya existe, no hacemos nada o podríamos enfocarnos en el campo
      Alert.alert('Producto ya agregado', 'Este producto ya está en el detalle del pedido.');
    } else {
      // Agregar con cantidad 0
      setCart([...cart, { ...product, qty: 0 }]);
    }
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty < 0) return; // No permitir negativos
    setCart(cart.map(p => p.id === id ? { ...p, qty: newQty } : p));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(p => p.id !== id));
  };

  // 3. Cálculos financieros
  const calculateSubtotal = () => cart.reduce((acc, item) => acc + (item.qty * item.precio_base_venta), 0);

  const getDescuentoMonto = () => {
    return parseFloat(descuentoMonto) || 0;
  };

  const getDescuentoPorcentaje = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;
    const monto = getDescuentoMonto();
    return (monto / subtotal) * 100;
  };

  const getInteresMonto = () => {
    const subtotal = calculateSubtotal();
    const porcentaje = parseFloat(interesPorcentaje) || 0;
    return (subtotal * porcentaje) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const descuento = getDescuentoMonto();
    const interes = getInteresMonto();
    return subtotal - descuento + interes;
  };

  // 4. Guardar Pedido
  const saveOrder = async () => {
    // Validar que haya productos con cantidad > 0
    const validItems = cart.filter(item => item.qty > 0);
    if (validItems.length === 0) {
      return Alert.alert('Atención', 'Debe agregar cantidades a los productos.');
    }

    setSaving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Se requiere ubicación para confirmar.');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const orderPayload = {
        numero_documento: nroDocumento,
        fecha_pedido: new Date().toISOString(),
        tipo_documento_pedido: tipoDocumento,
        tipo_pago: tipoPago,
        almacen: 'Central',
        sucursal: 'Principal',
        dias_plazo: tipoPago === 'Crédito' ? 30 : 0,
        total_venta: calculateTotal(),
        observacion: observation,
        estado: tipoPago === 'Contado' ? 'Pagado' : 'Pendiente',
        ubicacion_venta: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        clients_id: clientId,
        empleado_id: session?.user.id
      };

      const { data: orderData, error: orderError } = await supabase
        .from('pedidos')
        .insert(orderPayload)
        .select('id')
        .single();

      if (orderError) throw orderError;

      const detailsPayload = validItems.map(item => ({
        pedido_id: orderData.id,
        producto_id: item.id,
        unidad_seleccionada: item.unidad_base_venta || 'UNID',
        precio_unitario: item.precio_base_venta,
        cantidad: item.qty,
        subtotal: item.qty * item.precio_base_venta
      }));

      const { error: detailsError } = await supabase.from('detalle_pedido').insert(detailsPayload);
      if (detailsError) throw detailsError;

      Alert.alert('¡Éxito!', 'Pedido registrado correctamente', [{ text: 'OK', onPress: () => router.back() }]);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.nombre_producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo_producto?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HEADER HERO */}
      <LinearGradient colors={[colors.brandGreen, '#1e6b38']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={router.back} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nueva Venta</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: searchFocused ? 400 : 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* --- TARJETA DE CABECERA (Datos de la Venta) --- */}
          <View style={[styles.formSheet, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent' }]}>
            <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>DATOS DE LA VENTA</Text>

            {/* Fila 1: Doc y Fecha */}
            <View style={styles.rowBetween}>
              <View style={styles.dataBox}>
                <Text style={styles.labelSmall}>NRO. DOC</Text>
                <Text style={[styles.valueText, { color: colors.textMain }]}>{nroDocumento}</Text>
              </View>
              <View style={[styles.dataBox, { alignItems: 'flex-end' }]}>
                <Text style={styles.labelSmall}>FECHA</Text>
                <Text style={[styles.valueText, { color: colors.textMain }]}>{fecha}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#444' : '#E5E7EB' }]} />

            {/* Fila 2: Cliente */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.labelSmall}>CLIENTE</Text>
              <Text style={[styles.clientName, { color: colors.textMain }]}>{client?.code} - {client?.name}</Text>
              {client?.business_name && <Text style={[styles.clientSub, { color: colors.textSub }]}>{client.business_name}</Text>}
            </View>

            {/* Fila 3: NIT y Dirección */}
            <View style={[styles.rowBetween, { gap: 10 }]}>
              <View style={[styles.dataBox, { flex: 0.4 }]}>
                <Text style={styles.labelSmall}>NIT / CI</Text>
                <Text style={[styles.infoText, { color: colors.textMain }]}>{client?.tax_id || 'S/N'}</Text>
              </View>
              <View style={[styles.dataBox, { flex: 0.6 }]}>
                <Text style={styles.labelSmall}>DIRECCIÓN</Text>
                <Text style={[styles.infoText, { color: colors.textMain }]} numberOfLines={1}>{client?.address || 'Sin dirección'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Fila 4: Selectores */}
            <View style={styles.rowBetween}>

              {/* Selector Tipo Doc */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.labelSmall}>TIPO DOCUMENTO</Text>
                <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.cardBorder : '#F3F4F6' }]}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tipoDocumento === 'Factura' && [styles.toggleBtnActive, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }]]}
                    onPress={() => setTipoDocumento('Factura')}
                  >
                    <Text style={[styles.toggleText, { color: isDark && tipoDocumento !== 'Factura' ? colors.textSub : '#6B7280' }, tipoDocumento === 'Factura' && styles.toggleTextActive]}>Factura</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tipoDocumento === 'Documento' && [styles.toggleBtnActive, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }]]}
                    onPress={() => setTipoDocumento('Documento')}
                  >
                    <Text style={[styles.toggleText, { color: isDark && tipoDocumento !== 'Documento' ? colors.textSub : '#6B7280' }, tipoDocumento === 'Documento' && styles.toggleTextActive]}>Nota</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Selector Tipo Pago */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.labelSmall}>FORMA DE PAGO</Text>
                <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.cardBorder : '#F3F4F6' }]}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tipoPago === 'Contado' && [styles.toggleBtnActive, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }]]}
                    onPress={() => setTipoPago('Contado')}
                  >
                    <Ionicons name="cash" size={16} color={tipoPago === 'Contado' ? '#FFF' : '#6B7280'} style={{ marginRight: 4 }} />
                    <Text style={[styles.toggleText, { color: isDark && tipoPago !== 'Contado' ? colors.textSub : '#6B7280' }, tipoPago === 'Contado' && styles.toggleTextActive]}>Cont.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tipoPago === 'Crédito' && [styles.toggleBtnActive, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }]]}
                    onPress={() => setTipoPago('Crédito')}
                  >
                    <Ionicons name="calendar" size={16} color={tipoPago === 'Crédito' ? '#FFF' : '#6B7280'} style={{ marginRight: 4 }} />
                    <Text style={[styles.toggleText, { color: isDark && tipoPago !== 'Crédito' ? colors.textSub : '#6B7280' }, tipoPago === 'Crédito' && styles.toggleTextActive]}>Créd.</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </View>

          {/* --- DETALLE DEL PEDIDO (MEJORADO) --- */}
          {cart.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>DETALLE DEL PEDIDO ({cart.length})</Text>

              <View style={[styles.cartCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
                {cart.map((item, index) => (
                  <View key={item.id} style={[styles.cartItemRow, index !== cart.length - 1 && [styles.cartItemBorder, { borderBottomColor: isDark ? '#444' : '#F3F4F6' }]]}>

                    {/* Columna Info Producto */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, { color: colors.textMain }]}>{item.nombre_producto}</Text>
                      <Text style={styles.cartItemCode}>{item.codigo_producto}</Text>
                      <Text style={[styles.cartItemUnitPrice, { color: colors.textSub }]}>Bs {item.precio_base_venta.toFixed(2)} c/u</Text>
                    </View>

                    {/* Columna Cantidad (EDITABLE) */}
                    <View style={styles.qtyInputWrapper}>
                      <Text style={styles.qtyLabel}>CANT.</Text>
                      <TextInput
                        style={[styles.qtyInput, { color: colors.textMain, backgroundColor: isDark ? colors.cardBg : '#F9FAFB', borderColor: colors.brandGreen }]}
                        value={item.qty === 0 ? '' : item.qty.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          updateQty(item.id, num);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    {/* Columna Subtotal */}
                    <View style={styles.subtotalCol}>
                      <Text style={styles.subtotalLabel}>SUBTOTAL</Text>
                      <Text style={[styles.cartItemTotal, { color: colors.textMain }]}>
                        {(item.qty * item.precio_base_venta).toFixed(2)}
                      </Text>
                    </View>

                    {/* Botón Eliminar */}
                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* TOTALIZADOR */}
                <View style={[styles.totalsSection, { borderTopColor: isDark ? '#444' : '#E5E7EB' }]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSub }]}>SUBTOTAL</Text>
                    <Text style={[styles.totalValue, { color: colors.textMain }]}>{calculateSubtotal().toFixed(2)}</Text>
                  </View>

                  {/* DESCUENTO */}
                  <View style={styles.totalRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.totalLabel, { color: colors.textSub }]}>DESCUENTO</Text>
                      <View style={styles.percentDisplay}>
                        <Text style={styles.percentDisplayText}>
                          {getDescuentoPorcentaje().toFixed(2)} %
                        </Text>
                      </View>
                    </View>
                    <View style={styles.montoInputWrapper}>
                      <TextInput
                        style={[styles.montoInput, { color: '#DC2626' }]}
                        value={descuentoMonto === '0' ? '' : descuentoMonto}
                        onChangeText={setDescuentoMonto}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {/* INTERÉS (solo si es a crédito) */}
                  {tipoPago === 'Crédito' && (
                    <View style={styles.totalRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.totalLabel}>INTERÉS</Text>
                        <View style={styles.percentInputWrapper}>
                          <TextInput
                            style={styles.percentInput}
                            value={interesPorcentaje}
                            onChangeText={setInteresPorcentaje}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                          <Text style={styles.percentSymbol}>%</Text>
                        </View>
                      </View>
                      <Text style={[styles.totalValue, { color: '#F59E0B' }]}>
                        +{getInteresMonto().toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.divider, { backgroundColor: isDark ? '#444' : '#E5E7EB' }]} />

                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabelFinal, { color: colors.textMain }]}>TOTAL</Text>
                    <Text style={[styles.totalValueFinal, { color: colors.brandGreen }]}>{calculateTotal().toFixed(2)}</Text>
                  </View>
                </View>

                {/* Observaciones */}
                <TextInput
                  style={[styles.obsInput, { backgroundColor: isDark ? colors.cardBg : '#F9FAFB', color: colors.textMain, borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}
                  placeholder="Observaciones adicionales..."
                  placeholderTextColor={colors.textSub}
                  value={observation}
                  onChangeText={setObservation}
                  multiline
                />
              </View>
            </View>
          )}

          {/* --- CATÁLOGO DE PRODUCTOS --- */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>CATÁLOGO DE PRODUCTOS</Text>

            {/* Buscador */}
            <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Buscar producto..."
                placeholderTextColor={colors.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {
                  setSearchFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                onBlur={() => setSearchFocused(false)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* TABLA */}
            <View style={[styles.tableCard, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
              <View style={[styles.tableHeader, { backgroundColor: isDark ? colors.cardBorder : '#F9FAFB', borderBottomColor: isDark ? '#444' : '#E5E7EB' }]}>
                <Text style={[styles.th, { flex: 2 }]}>PRODUCTO</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>STOCK</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>PRECIO</Text>
                <View style={{ width: 36 }} />
              </View>

              {filteredProducts.slice(0, 50).map((p, index) => {
                const isInCart = cart.some(item => item.id === p.id);
                return (
                  <View key={p.id} style={[styles.tableRow, index % 2 !== 0 && [styles.tableRowAlt, { backgroundColor: isDark ? colors.cardBorder : '#F9FAFB' }], { backgroundColor: isDark && index % 2 === 0 ? colors.cardBg : '#FFF', borderBottomColor: isDark ? '#444' : '#F3F4F6' }]}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.cellName, { color: colors.textMain }]} numberOfLines={2}>{p.nombre_producto}</Text>
                      <Text style={styles.cellCode}>{p.codigo_producto}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={[styles.cellStock, { color: colors.textMain }]}>{p.stock_actual}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[styles.cellPrice, { color: colors.brandGreen }]}>{p.precio_base_venta.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => addToCart(p)}
                      style={[styles.addBtnSmall, { backgroundColor: isInCart ? '#9CA3AF' : colors.brandGreen }]}
                      disabled={isInCart}
                    >
                      <Ionicons
                        name={isInCart ? "checkmark" : "add"}
                        size={20}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- FOOTER FLOTANTE --- */}
      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>TOTAL A PAGAR</Text>
            <Text style={[styles.footerAmount, { color: colors.textMain }]}>Bs {calculateTotal().toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }, saving && { opacity: 0.7 }]}
            onPress={saveOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>CONFIRMAR</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // HEADER
  headerGradient: {
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    position: 'absolute', top: 0, width: '100%', zIndex: 0
  },
  headerContent: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  // SCROLL Y FORM SHEET
  scrollView: { flex: 1, marginTop: 80 },
  formSheet: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginBottom: 20
  },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#2a8c4a', letterSpacing: 1, marginBottom: 12 },

  // INFO CARD
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dataBox: { justifyContent: 'center' },
  labelSmall: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  valueText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  clientSub: { fontSize: 13, color: '#6B7280' },
  infoText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },

  // TOGGLES
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 3 },
  toggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#2a8c4a', shadowColor: '#2a8c4a', shadowOpacity: 0.3, shadowRadius: 3, elevation: 2 },
  toggleText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  toggleTextActive: { color: '#FFF', fontWeight: '800' },

  // SEARCH
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 15,
    borderWidth: 1, borderColor: '#E5E7EB'
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },

  // TABLE
  tableCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  cellName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  cellCode: { fontSize: 11, color: '#9CA3AF' },
  cellStock: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
  cellPrice: { fontSize: 13, fontWeight: 'bold', color: '#2a8c4a' },
  addBtnSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2a8c4a', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  addBtnDisabled: { backgroundColor: '#9CA3AF' },

  // CART MEJORADO
  cartCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  cartItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cartItemName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cartItemCode: { fontSize: 11, color: '#9CA3AF', marginBottom: 3 },
  cartItemUnitPrice: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Input de Cantidad
  qtyInputWrapper: { marginHorizontal: 8 },
  qtyLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '700', marginBottom: 3, textAlign: 'center' },
  qtyInput: {
    width: 60,
    height: 40,
    borderWidth: 2,
    borderColor: '#2a8c4a',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    backgroundColor: '#F9FAFB'
  },

  // Columna Subtotal
  subtotalCol: { marginLeft: 10 },
  subtotalLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '700', marginBottom: 3, textAlign: 'right' },
  cartItemTotal: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', textAlign: 'right' },

  // Botón eliminar
  deleteBtn: { marginLeft: 10, padding: 6 },

  // TOTALIZADOR
  totalsSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#E5E7EB' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#374151' },

  // Input de porcentaje
  percentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  percentInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  percentSymbol: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 2 },

  // Display de porcentaje (solo lectura)
  percentDisplay: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  percentDisplayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E'
  },

  // Input de monto de descuento
  montoInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  montoInput: {
    width: 80,
    height: 36,
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    textAlign: 'right',
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
    backgroundColor: '#FEF2F2'
  },

  totalLabelFinal: { fontSize: 14, fontWeight: '900', color: '#111827', letterSpacing: 0.5 },
  totalValueFinal: { fontSize: 20, fontWeight: 'bold', color: '#2a8c4a' },

  // Observaciones
  obsInput: {
    backgroundColor: '#F9FAFB',
    marginTop: 16,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    height: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },

  // FOOTER
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 15, paddingBottom: 25,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, elevation: 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20
  },
  footerTotal: { flex: 1 },
  footerLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  footerAmount: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  confirmBtn: {
    backgroundColor: '#2a8c4a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#2a8c4a', shadowOpacity: 0.3, shadowRadius: 5, elevation: 4
  },
  confirmBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
});