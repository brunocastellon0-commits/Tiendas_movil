import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  nombre_producto: string;
  codigo_producto: string;
  precio_base_venta: number;
  unidad_base_venta: string;
  stock_actual: number;
  activo: boolean;
}
interface CartItem extends Product { qty: number; }

// ─────────────────────────────────────────────────────────────────────────────
// MAPEO TEXTO → BD
//   tipo_documento: Nota=0
//   tipo_pago:      'Contado' | 'Credito' (texto directo)
// ─────────────────────────────────────────────────────────────────────────────
const TIPO_DOCUMENTO_NOTA = 0;

// ─────────────────────────────────────────────────────────────────────────────
// NuevoPedido
//
// Flujo simplificado para el vendedor:
//   1. Ver datos del cliente (Nota / Contado fijos — no configurables)
//   2. Buscar productos por nombre y agregarlos al carrito
//   3. Confirmar → toast 5 s → vuelve al detalle del cliente
// ─────────────────────────────────────────────────────────────────────────────
export default function NuevoPedido() {
  const router = useRouter();
  const { session } = useAuth();
  const { colors, isDark } = useTheme();
  const { clientId } = useLocalSearchParams();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [searchNombre, setSearchNombre] = useState('');
  const [nroDocumento, setNroDocumento] = useState('00000');
  const [fecha] = useState(new Date().toLocaleDateString('es-BO'));
  const [observation, setObservation] = useState('');
  const [descuentoMonto, setDescuentoMonto] = useState('0');
  const [tipoPago, setTipoPago] = useState<'Contado' | 'Credito'>('Contado');

  // ── Modal de éxito ───────────────────────────────────────────────────────────
  const [successModal, setSuccessModal] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccessModal = () => {
    setSuccessModal(true);

    navTimerRef.current = setTimeout(() => {
      setSuccessModal(false);
      router.back();
    }, 3000);
  };

  useEffect(() => () => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  }, []);

  // ── Modal stock insuficiente ─────────────────────────────────────────────────
  const [stockModal, setStockModal] = useState({
    visible: false, productName: '', stockDisponible: 0, cantidadPedida: 0,
  });

  // ── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) { Alert.alert('Error', 'Falta el ID del cliente'); router.back(); return; }
    loadInitialData();
  }, [clientId]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients').select('*').eq('id', clientId).single();
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

    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoadingData(false);
    }
  };

  // ── Carrito ─────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (cart.some(p => p.id === product.id)) {
      Alert.alert('Ya agregado', 'Este producto ya esta en el detalle del pedido.');
      return;
    }
    setCart(prev => [...prev, { ...product, qty: 0 }]);
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty < 0) return;
    const product = cart.find(p => p.id === id);
    if (!product) return;

    if (newQty > product.stock_actual) {
      setStockModal({
        visible: true,
        productName: product.nombre_producto,
        stockDisponible: product.stock_actual,
        cantidadPedida: newQty,
      });
      setCart(prev => prev.map(p => p.id === id ? { ...p, qty: product.stock_actual } : p));
      return;
    }
    setCart(prev => prev.map(p => p.id === id ? { ...p, qty: newQty } : p));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(p => p.id !== id));

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const subtotal = () => cart.reduce((acc, i) => acc + i.qty * i.precio_base_venta, 0);
  const descuentoValor = () => parseFloat(descuentoMonto) || 0;
  const descuentoPct = () => { const s = subtotal(); return s === 0 ? 0 : (descuentoValor() / s) * 100; };
  const totalFinal = () => subtotal() - descuentoValor();

  // ── Guardar pedido ──────────────────────────────────────────────────────────
  const saveOrder = async () => {
    const validItems = cart.filter(i => i.qty > 0);
    if (validItems.length === 0) {
      Alert.alert('Sin productos', 'Asigna cantidad a al menos un producto.');
      return;
    }
    setSaving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Se requiere permiso de ubicacion para confirmar el pedido.');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // ── Verificar sesión activa ─────────────────────────────────────────────
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('Sesión expirada. Por favor cierra sesión y vuelve a ingresar.');

      const orderPayload = {
        numero_documento: nroDocumento,
        fecha_pedido: new Date().toISOString(),
        tipo_documento: TIPO_DOCUMENTO_NOTA,
        tipo_pago: tipoPago,
        almacen: 'Central',
        sucursal: 'Principal',
        dias_plazo: 0,
        total_venta: totalFinal(),
        descuento_monto: descuentoValor(),
        descuento_porcentaje: descuentoPct(),
        observacion: observation,
        estado: 'Pendiente',
        ubicacion_venta: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        clients_id: clientId,
        empleado_id: session?.user.id,
      };

      console.log('[NuevoPedido] Creando cabecera del pedido...');
      const { data: orderData, error: orderError } = await supabase
        .from('pedidos').insert(orderPayload).select('id').single();
      if (orderError) {
        console.error('[NuevoPedido] Error al crear pedido:', JSON.stringify(orderError));
        throw orderError;
      }
      console.log('[NuevoPedido] Pedido creado con id:', orderData.id);

      const detailsPayload = validItems.map(item => ({
        pedido_id: orderData.id,
        producto_id: item.id,
        unidad_seleccionada: item.unidad_base_venta || 'UNID',
        precio_unitario: item.precio_base_venta,
        cantidad: item.qty,
        subtotal: item.qty * item.precio_base_venta,
      }));

      console.log('[NuevoPedido] Insertando', detailsPayload.length, 'líneas en detalle_pedido...');
      console.log('[NuevoPedido] Primer detalle:', JSON.stringify(detailsPayload[0]));

      const { data: detailsData, error: detailsError } = await supabase
        .from('detalle_pedido')
        .insert(detailsPayload)
        .select('id');

      if (detailsError) {
        console.error('[NuevoPedido] Error RLS/DB en detalle_pedido:', JSON.stringify(detailsError));
        // Eliminar el pedido huérfano si el detalle falló
        await supabase.from('pedidos').delete().eq('id', orderData.id);
        throw new Error(`Error al guardar productos: ${detailsError.message} (código: ${detailsError.code})`);
      }

      // Verificar fallo silencioso de RLS (insert bloqueado sin error)
      if (!detailsData || detailsData.length === 0) {
        console.error('[NuevoPedido] INSERT a detalle_pedido bloqueado silenciosamente por RLS (devolvió 0 filas)');
        await supabase.from('pedidos').delete().eq('id', orderData.id);
        throw new Error(
          'Sin permiso para guardar los productos del pedido.\n\n' +
          'Posible causa: tu cuenta no tiene el rol "Vendedor" asignado.\n' +
          'Contacta al administrador.'
        );
      }

      console.log('[NuevoPedido] Detalles guardados exitosamente:', detailsData.length, 'filas');

      // Mostrar modal de éxito con countdown de 5 segundos
      showSuccessModal();

    } catch (error: any) {
      console.error('[NuevoPedido] Error general en saveOrder:', error);
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrado por nombre ─────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const q = searchNombre.toLowerCase().trim();
    if (!q) return true;
    return p.nombre_producto.toLowerCase().includes(q);
  });

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
        <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando datos...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient colors={[colors.brandGreen, '#1e6b38']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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

          {/* ── DATOS DE LA VENTA ── */}
          <View style={[styles.formSheet, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>DATOS DE LA VENTA</Text>

            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>NRO. DOC</Text>
                <Text style={[styles.fieldValue, { color: colors.textMain }]}>{nroDocumento}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>FECHA</Text>
                <Text style={[styles.fieldValue, { color: colors.textMain }]}>{fecha}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />

            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.fieldCaption, { color: colors.textSub }]}>CLIENTE</Text>
              <Text style={[styles.clientName, { color: colors.textMain }]}>
                {client?.code} - {client?.name}
              </Text>
              {client?.business_name && (
                <Text style={[styles.clientSub, { color: colors.textSub }]}>{client.business_name}</Text>
              )}
            </View>

            <View style={[styles.rowBetween, { gap: 10, marginBottom: 12 }]}>
              <View style={{ flex: 0.4 }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>NIT / CI</Text>
                <Text style={[styles.fieldValue, { color: colors.textMain }]}>{client?.tax_id || 'S/N'}</Text>
              </View>
              <View style={{ flex: 0.6 }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>DIRECCION</Text>
                <Text style={[styles.fieldValue, { color: colors.textMain }]} numberOfLines={1}>
                  {client?.address || 'Sin direccion'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />

            {/* Tipo de documento y pago */}
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>TIPO DE DOCUMENTO</Text>
                <View style={[styles.staticBadge, {
                  backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4',
                }]}>
                  <Text style={[styles.staticBadgeText, { color: colors.brandGreen }]}>Nota</Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.fieldCaption, { color: colors.textSub }]}>TIPO DE PAGO</Text>
                <View style={[styles.payToggleRow, { marginTop: 6 }]}>
                  <TouchableOpacity
                    style={[
                      styles.payToggleBtn,
                      tipoPago === 'Contado' && { backgroundColor: colors.brandGreen },
                      tipoPago !== 'Contado' && { backgroundColor: isDark ? 'rgba(42,140,74,0.12)' : '#F0FDF4', borderColor: colors.brandGreen, borderWidth: 1 },
                    ]}
                    onPress={() => setTipoPago('Contado')}
                  >
                    <Text style={[
                      styles.payToggleText,
                      { color: tipoPago === 'Contado' ? '#FFF' : colors.brandGreen },
                    ]}>Contado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.payToggleBtn,
                      tipoPago === 'Credito' && { backgroundColor: '#2563EB' },
                      tipoPago !== 'Credito' && { backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', borderColor: '#2563EB', borderWidth: 1 },
                    ]}
                    onPress={() => setTipoPago('Credito')}
                  >
                    <Text style={[
                      styles.payToggleText,
                      { color: tipoPago === 'Credito' ? '#FFF' : '#2563EB' },
                    ]}>Crédito</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* ── DETALLE DEL PEDIDO ── */}
          {cart.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>
                DETALLE DEL PEDIDO ({cart.length})
              </Text>

              <View style={[styles.cartCard, {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? colors.cardBorder : '#E5E7EB',
              }]}>
                {cart.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.cartRow,
                      index !== cart.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, { color: colors.textMain }]}>
                        {item.nombre_producto}
                      </Text>
                      <Text style={[styles.cartItemCode, { color: colors.textSub }]}>
                        {item.codigo_producto}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: colors.textSub }]}>
                        Bs {item.precio_base_venta.toFixed(2)} c/u
                      </Text>
                    </View>

                    <View style={styles.qtyWrapper}>
                      <Text style={[styles.qtyLabel, { color: colors.textSub }]}>CANT.</Text>
                      <TextInput
                        style={[styles.qtyInput, {
                          color: colors.textMain,
                          backgroundColor: isDark ? colors.inputBg : '#F9FAFB',
                          borderColor: colors.brandGreen,
                        }]}
                        value={item.qty === 0 ? '' : item.qty.toString()}
                        onChangeText={text => updateQty(item.id, parseInt(text) || 0)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textSub}
                      />
                    </View>

                    <View style={styles.subtotalCol}>
                      <Text style={[styles.subtotalLabel, { color: colors.textSub }]}>SUBTOTAL</Text>
                      <Text style={[styles.subtotalValue, { color: colors.textMain }]}>
                        {(item.qty * item.precio_base_venta).toFixed(2)}
                      </Text>
                    </View>

                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Totalizador */}
                <View style={[styles.totalsSection, { borderTopColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSub }]}>SUBTOTAL</Text>
                    <Text style={[styles.totalValue, { color: colors.textMain }]}>
                      Bs {subtotal().toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.totalLabel, { color: colors.textSub }]}>DESCUENTO</Text>
                      <View style={[styles.pctBadge, { backgroundColor: isDark ? '#3a2800' : '#FEF3C7' }]}>
                        <Text style={[styles.pctBadgeText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                          {descuentoPct().toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.montoInput, {
                        color: '#DC2626',
                        backgroundColor: isDark ? '#2a0a0a' : '#FEF2F2',
                        borderColor: '#EF4444',
                      }]}
                      value={descuentoMonto === '0' ? '' : descuentoMonto}
                      onChangeText={setDescuentoMonto}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSub}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />

                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabelFinal, { color: colors.textMain }]}>TOTAL</Text>
                    <Text style={[styles.totalValueFinal, { color: colors.brandGreen }]}>
                      Bs {totalFinal().toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.obsInput, {
                    color: colors.textMain,
                    backgroundColor: isDark ? colors.inputBg : '#F9FAFB',
                    borderColor: isDark ? colors.cardBorder : '#E5E7EB',
                  }]}
                  placeholder="Observaciones adicionales..."
                  placeholderTextColor={colors.textSub}
                  value={observation}
                  onChangeText={setObservation}
                  multiline
                />
              </View>
            </View>
          )}

          {/* ── CATALOGO DE PRODUCTOS ── */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[styles.sectionLabel, { color: colors.brandGreen }]}>CATALOGO DE PRODUCTOS</Text>

            <View style={[styles.searchBox, {
              backgroundColor: colors.cardBg,
              borderColor: searchNombre ? colors.brandGreen : (isDark ? colors.cardBorder : '#E5E7EB'),
            }]}>
              <Ionicons name="search" size={18} color={searchNombre ? colors.brandGreen : colors.textSub} />
              <TextInput
                style={[styles.searchInput, { color: colors.textMain }]}
                placeholder="Buscar por nombre del producto..."
                placeholderTextColor={colors.textSub}
                value={searchNombre}
                onChangeText={setSearchNombre}
                onFocus={() => {
                  setSearchFocused(true);
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                }}
                onBlur={() => setSearchFocused(false)}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchNombre.length > 0 && (
                <TouchableOpacity onPress={() => setSearchNombre('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSub} />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.tableCard, {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? colors.cardBorder : '#E5E7EB',
            }]}>
              <View style={[styles.tableHeader, {
                backgroundColor: isDark ? colors.cardBorder : '#F9FAFB',
                borderBottomColor: isDark ? '#444' : '#E5E7EB',
              }]}>
                <Text style={[styles.th, { flex: 2, color: colors.textSub }]}>PRODUCTO</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center', color: colors.textSub }]}>STOCK</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right', color: colors.textSub }]}>PRECIO</Text>
                <View style={{ width: 36 }} />
              </View>

              {filteredProducts.length === 0 ? (
                <View style={styles.emptySearch}>
                  <Ionicons name="search-outline" size={32} color={colors.textSub} style={{ opacity: 0.4 }} />
                  <Text style={[styles.emptySearchText, { color: colors.textSub }]}>
                    {searchNombre ? `Sin resultados para "${searchNombre}"` : 'No hay productos disponibles'}
                  </Text>
                </View>
              ) : (
                filteredProducts.slice(0, 50).map((p, index) => {
                  const isInCart = cart.some(item => item.id === p.id);
                  const sinStock = p.stock_actual <= 0;
                  const altRow = index % 2 !== 0;
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.tableRow,
                        { borderBottomColor: isDark ? '#333' : '#F3F4F6' },
                        altRow ? { backgroundColor: isDark ? colors.cardBorder : '#F9FAFB' }
                          : { backgroundColor: colors.cardBg },
                      ]}
                    >
                      <View style={{ flex: 2 }}>
                        <Text style={[styles.cellName, { color: colors.textMain }]} numberOfLines={2}>
                          {p.nombre_producto}
                        </Text>
                        <Text style={[styles.cellCode, { color: colors.textSub }]}>
                          {p.codigo_producto}
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.cellStock, { color: sinStock ? '#EF4444' : colors.textMain }]}>
                          {p.stock_actual}
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.cellPrice, { color: colors.brandGreen }]}>
                          {p.precio_base_venta.toFixed(2)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => addToCart(p)}
                        style={[styles.addBtn, { backgroundColor: isInCart ? colors.textSub : colors.brandGreen }]}
                        disabled={isInCart}
                      >
                        <Ionicons name={isInCart ? 'checkmark' : 'add'} size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer flotante */}
      {cart.length > 0 && (
        <View style={[styles.footer, {
          backgroundColor: colors.cardBg,
          borderTopColor: isDark ? colors.cardBorder : '#E5E7EB',
        }]}>
          <View style={styles.footerTotal}>
            <Text style={[styles.footerLabel, { color: colors.textSub }]}>TOTAL A PAGAR</Text>
            <Text style={[styles.footerAmount, { color: colors.textMain }]}>
              Bs {totalFinal().toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.brandGreen, opacity: saving ? 0.7 : 1 }]}
            onPress={saveOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>CONFIRMAR</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal de éxito con countdown ── */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalIconBg, { backgroundColor: isDark ? 'rgba(22,163,74,0.2)' : '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.brandGreen} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>
              Pedido enviado exitosamente
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal: stock insuficiente */}
      <Modal
        visible={stockModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModal(p => ({ ...p, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
            <View style={[styles.modalIconBg, { backgroundColor: isDark ? '#3a1a00' : '#FEF3C7' }]}>
              <Ionicons name="warning-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>Stock insuficiente</Text>
            <Text style={[styles.modalBody, { color: colors.textSub }]}>{stockModal.productName}</Text>
            <View style={[styles.modalStockRow, { backgroundColor: isDark ? colors.inputBg : '#F9FAFB' }]}>
              <View style={styles.modalStockCell}>
                <Text style={[styles.modalStockLabel, { color: colors.textSub }]}>Pediste</Text>
                <Text style={[styles.modalStockValue, { color: '#EF4444' }]}>{stockModal.cantidadPedida}</Text>
              </View>
              <View style={[styles.modalStockDivider, { backgroundColor: isDark ? colors.cardBorder : '#E5E7EB' }]} />
              <View style={styles.modalStockCell}>
                <Text style={[styles.modalStockLabel, { color: colors.textSub }]}>Disponible</Text>
                <Text style={[styles.modalStockValue, { color: colors.brandGreen }]}>{stockModal.stockDisponible}</Text>
              </View>
            </View>
            <Text style={[styles.modalNote, { color: colors.textSub }]}>
              Se ajusto la cantidad al maximo disponible.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.brandGreen }]}
              onPress={() => setStockModal(p => ({ ...p, visible: false }))}
            >
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  container: { flex: 1 },

  headerGradient: { height: 110, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, position: 'absolute', top: 0, width: '100%', zIndex: 0 },
  headerContent: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  scrollView: { flex: 1, marginTop: 80 },

  formSheet: { marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldCaption: { fontSize: 10, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' },
  fieldValue: { fontSize: 14, fontWeight: '700' },
  clientName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  clientSub: { fontSize: 12 },
  divider: { height: 1, marginVertical: 12 },

  // Badges estáticos (Nota) y selector de pago
  staticBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 6 },
  staticBadgeText: { fontSize: 13, fontWeight: '700' },
  payToggleRow: { flexDirection: 'row', gap: 6 },
  payToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payToggleText: { fontSize: 12, fontWeight: '700' },

  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12, borderWidth: 1.5 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },

  tableCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, elevation: 1, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1 },
  th: { fontSize: 10, fontWeight: '800' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1 },
  cellName: { fontSize: 13, fontWeight: '600' },
  cellCode: { fontSize: 10, marginTop: 1 },
  cellStock: { fontSize: 13, fontWeight: '600' },
  cellPrice: { fontSize: 13, fontWeight: '700' },
  addBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  emptySearch: { padding: 40, alignItems: 'center', gap: 8 },
  emptySearchText: { fontSize: 13, textAlign: 'center' },

  cartCard: { borderRadius: 14, padding: 14, borderWidth: 1, elevation: 1 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  cartItemName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cartItemCode: { fontSize: 10, marginBottom: 2 },
  cartItemPrice: { fontSize: 11, fontWeight: '600' },
  qtyWrapper: { marginHorizontal: 8 },
  qtyLabel: { fontSize: 9, fontWeight: '700', marginBottom: 3, textAlign: 'center' },
  qtyInput: { width: 58, height: 38, borderWidth: 2, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  subtotalCol: { marginLeft: 6 },
  subtotalLabel: { fontSize: 9, fontWeight: '700', marginBottom: 2, textAlign: 'right' },
  subtotalValue: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  deleteBtn: { marginLeft: 8, padding: 5 },

  totalsSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1.5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 12, fontWeight: '700' },
  totalValue: { fontSize: 14, fontWeight: '700' },
  totalLabelFinal: { fontSize: 14, fontWeight: '900' },
  totalValueFinal: { fontSize: 20, fontWeight: '800' },
  pctBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pctBadgeText: { fontSize: 11, fontWeight: '700' },
  montoInput: { width: 80, height: 34, borderWidth: 1.5, borderRadius: 8, textAlign: 'right', paddingHorizontal: 8, fontSize: 14, fontWeight: '700' },
  obsInput: { borderRadius: 10, padding: 12, fontSize: 13, height: 70, textAlignVertical: 'top', borderWidth: 1, marginTop: 12 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 16 },
  footerTotal: { flex: 1 },
  footerLabel: { fontSize: 10, fontWeight: '700' },
  footerAmount: { fontSize: 22, fontWeight: '800' },
  confirmBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },


  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center', elevation: 10 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  modalBody: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalStockRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginBottom: 14, width: '100%' },
  modalStockCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  modalStockDivider: { width: 1 },
  modalStockLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  modalStockValue: { fontSize: 28, fontWeight: '800' },
  modalNote: { fontSize: 12, textAlign: 'center', marginBottom: 20 },
  modalBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});