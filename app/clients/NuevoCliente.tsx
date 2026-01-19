import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

// Servicios
import { supabase } from '../../lib/supabase';
import { clientService } from '../../services/ClienteService';
import { zonaService } from '../../services/ZonaService';
import { Zona } from '../../types/Zonas.interface';

// ✅ COMPONENTE INPUT MEJORADO
const FormInput = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  keyboard = 'default',
  colors,
  isDark,
  multiline = false,
  onPress,
  readonly = false,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  required = false
}: any) => (
  <View style={styles.inputGroup}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={[styles.label, { color: colors.textMain }]}>
        {label}
      </Text>
      {required && <Text style={{ color: '#EF4444', marginLeft: 4, fontSize: 16 }}>*</Text>}
    </View>

    {onPress ? (
      // MODO SELECTOR
      <TouchableOpacity
        style={[styles.inputWrapper, {
          backgroundColor: colors.inputBg,
          borderColor: isDark ? colors.cardBorder : '#E5E7EB',
          borderWidth: 1,
        }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={20} color={colors.brandGreen} style={{ marginRight: 12 }} />
        <Text style={{ flex: 1, color: value ? colors.textMain : colors.textSub, fontSize: 15 }}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSub} />
      </TouchableOpacity>
    ) : (
      // MODO TEXTO
      <View style={[styles.inputWrapper, {
        backgroundColor: readonly ? (isDark ? '#1F1F1F' : '#F9FAFB') : colors.inputBg,
        borderColor: isDark ? colors.cardBorder : '#E5E7EB',
        borderWidth: 1,
        height: multiline ? 100 : 52,
        alignItems: multiline ? 'flex-start' : 'center',
        paddingVertical: multiline ? 12 : 0
      }]}>
        <Ionicons name={icon} size={20} color={colors.brandGreen} style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }} />
        <TextInput
          ref={inputRef}
          style={[styles.input, {
            color: readonly ? colors.textSub : colors.textMain,
            height: '100%',
            textAlignVertical: multiline ? 'top' : 'center'
          }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSub}
          keyboardType={keyboard}
          multiline={multiline}
          editable={!readonly}
          autoCapitalize="none"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={!multiline}
        />
      </View>
    )}
  </View>
);

export default function RegisterClientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Estados Modales
  const [zonasDisponibles, setZonasDisponibles] = useState<Zona[]>([]);
  const [modalDocType, setModalDocType] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalZona, setModalZona] = useState(false);
  const [modalPayment, setModalPayment] = useState(false);

  // Referencias
  const codeRef = React.useRef<TextInput>(null);
  const nameRef = React.useRef<TextInput>(null);
  const businessRef = React.useRef<TextInput>(null);
  const taxIdRef = React.useRef<TextInput>(null);
  const branchRef = React.useRef<TextInput>(null);
  const addressRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const creditLimitRef = React.useRef<TextInput>(null);
  const balanceRef = React.useRef<TextInput>(null);
  const guaranteeRef = React.useRef<TextInput>(null);
  const notesRef = React.useRef<TextInput>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    business_name: '',
    doc_type: 'NIT',
    tax_id: '',
    address: '',
    phones: '',
    fax: '',
    email: '',
    city: 'Cochabamba',
    branch_name: '',
    zone_name: '',
    vendor_id: '',
    salesman_name: '',
    payment_method: 'Efectivo',
    payment_term: 'Contado',
    credit_days: '0',
    credit_limit: '',
    balance_initial: '',
    guarantee: '',
    status: 'Vigente',
    regime: 'General',
    accounting_account: '',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    cargarZonas();
    if (id && id !== 'NuevoCliente') {
      loadClientData(id.toString());
    }
  }, [id]);

  const cargarZonas = async () => {
    try {
      const data = await zonaService.getZonas('');
      setZonasDisponibles(data || []);
    } catch (error) {

    }
  };

  const loadClientData = async (clientId: string) => {
    setLoading(true);
    try {
      const data = await clientService.getClientById(clientId);
      if (data) {
        setForm({
          code: data.code || '',
          name: data.name || '',
          business_name: data.business_name || '',
          doc_type: data.doc_type || 'NIT',
          tax_id: data.tax_id || '',
          address: data.address || '',
          phones: data.phones || '',
          fax: data.fax || '',
          email: data.email || '',
          city: data.city || 'Cochabamba',
          branch_name: data.branch_name || '',
          zone_name: data.zone_name || '',
          vendor_id: data.vendor_id || '',
          salesman_name: data.vendor?.full_name || '',
          payment_method: data.payment_method || 'Efectivo',
          payment_term: data.payment_term || 'Contado',
          credit_days: data.credit_days?.toString() || '0',
          credit_limit: data.credit_limit?.toString() || '',
          balance_initial: data.initial_balance?.toString() || '',
          guarantee: data.guarantee || '',
          status: data.status || 'Vigente',
          regime: data.regime || 'General',
          accounting_account: data.accounting_account || '',
          notes: data.notes || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        });
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar el cliente");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Habilita el GPS en configuración.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setForm(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
      Alert.alert('✓ Ubicación capturada', 'GPS registrado correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    } finally {
      setLocLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSelectZona = (zona: Zona) => {
    const vendedorNombre = zona.employees?.full_name || '';
    const vendedorId = zona.vendedor_id || '';
    setForm(prev => ({
      ...prev,
      zone_name: zona.territorio || zona.descripcion || '',
      vendor_id: vendedorId,
      salesman_name: vendedorNombre
    }));
    setModalZona(false);
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!form.name || !form.code) {
      Alert.alert('Campos requeridos', 'Complete el código y nombre del cliente.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalVendorId = form.vendor_id || user?.id;

      if (!finalVendorId) throw new Error("No se pudo asignar un vendedor.");

      const payload: any = {
        ...form,
        credit_limit: parseFloat(form.credit_limit || '0'),
        initial_balance: parseFloat(form.balance_initial || '0'),
        vendor_id: finalVendorId,
      };
      delete payload.salesman_name;

      if (id && id !== 'NuevoCliente') {
        await clientService.updateClient(id.toString(), payload);
        Alert.alert("✓ Actualizado", "Cliente editado correctamente.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        await clientService.createClient(payload);
        Alert.alert("✓ Éxito", "Cliente registrado correctamente.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER FIJO */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {id && id !== 'NuevoCliente' ? 'Editar Cliente' : 'Nuevo Cliente'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* CONTENIDO */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* CARD INFO PRINCIPAL */}
            <View style={[styles.infoCard, {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? colors.cardBorder : '#E5E7EB',
            }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.brandGreen}15` }]}>
                  <Ionicons name="business" size={24} color={colors.brandGreen} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cardTitle, { color: colors.textMain }]}>
                    {form.name || 'Información del Cliente'}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSub }]}>
                    {form.business_name || 'Complete los datos requeridos'}
                  </Text>
                </View>
              </View>
            </View>

            {/* FORMULARIO */}
            <View style={[styles.formSheet, {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? colors.cardBorder : '#E5E7EB',
            }]}>

              {/* SECCIÓN 1 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}15` }]}>
                    <Ionicons name="information-circle" size={18} color={colors.brandGreen} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Datos Generales
                  </Text>
                </View>

                <FormInput
                  label="Código"
                  icon="key-outline"
                  value={form.code}
                  onChange={(t: string) => handleChange('code', t)}
                  placeholder="Ingrese código único"
                  colors={colors}
                  isDark={isDark}
                  inputRef={codeRef}
                  required
                  returnKeyType="next"
                  onSubmitEditing={() => nameRef.current?.focus()}
                />

                <FormInput
                  label="Nombre del Negocio"
                  icon="storefront-outline"
                  value={form.name}
                  onChange={(t: string) => handleChange('name', t)}
                  placeholder="Nombre comercial"
                  colors={colors}
                  isDark={isDark}
                  inputRef={nameRef}
                  required
                  returnKeyType="next"
                  onSubmitEditing={() => businessRef.current?.focus()}
                />

                <FormInput
                  label="Razón Social"
                  icon="document-text-outline"
                  value={form.business_name}
                  onChange={(t: string) => handleChange('business_name', t)}
                  placeholder="Razón social legal"
                  colors={colors}
                  isDark={isDark}
                  inputRef={businessRef}
                  returnKeyType="next"
                  onSubmitEditing={() => setModalDocType(true)}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Tipo Documento"
                      icon="card-outline"
                      value={form.doc_type}
                      placeholder="Seleccionar"
                      colors={colors}
                      isDark={isDark}
                      onPress={() => setModalDocType(true)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <FormInput
                      label="Número"
                      icon="keypad-outline"
                      value={form.tax_id}
                      onChange={(t: string) => handleChange('tax_id', t)}
                      placeholder="Número de documento"
                      keyboard="numeric"
                      colors={colors}
                      isDark={isDark}
                      inputRef={taxIdRef}
                      returnKeyType="next"
                      onSubmitEditing={() => branchRef.current?.focus()}
                    />
                  </View>
                </View>
              </View>

              {/* SECCIÓN 2 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}15` }]}>
                    <Ionicons name="location" size={18} color={colors.brandGreen} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Ubicación
                  </Text>
                </View>

                <FormInput
                  label="Sucursal"
                  icon="business-outline"
                  value={form.branch_name}
                  onChange={(t: string) => handleChange('branch_name', t)}
                  placeholder="Nombre de sucursal"
                  colors={colors}
                  isDark={isDark}
                  inputRef={branchRef}
                  returnKeyType="next"
                  onSubmitEditing={() => addressRef.current?.focus()}
                />

                <FormInput
                  label="Dirección"
                  icon="map-outline"
                  value={form.address}
                  onChange={(t: string) => handleChange('address', t)}
                  placeholder="Dirección completa"
                  colors={colors}
                  isDark={isDark}
                  inputRef={addressRef}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    setTimeout(() => phoneRef.current?.focus(), 100);
                  }}
                />

                <FormInput
                  label="Zona de Venta"
                  icon="navigate-outline"
                  value={form.zone_name}
                  placeholder="Seleccionar zona"
                  colors={colors}
                  isDark={isDark}
                  onPress={() => setModalZona(true)}
                />

                {form.salesman_name ? (
                  <View style={[styles.vendorCard, {
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4',
                    borderColor: '#22C55E'
                  }]}>
                    <Ionicons name="person-circle" size={20} color="#22C55E" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 12, color: colors.textSub, marginBottom: 2 }}>
                        Vendedor Asignado
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMain }}>
                        {form.salesman_name}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* GPS MEJORADO */}
                <View style={[styles.gpsCard, {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
                  borderColor: '#3B82F6'
                }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="navigate-circle" size={18} color="#3B82F6" />
                      <Text style={[styles.gpsTitle, { color: '#3B82F6', marginLeft: 6 }]}>
                        Coordenadas GPS
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSub, fontSize: 13 }}>
                      {form.latitude && form.longitude
                        ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                        : 'Sin ubicación registrada'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={getCurrentLocation}
                    style={[styles.gpsBtn, { opacity: locLoading ? 0.6 : 1 }]}
                    disabled={locLoading}
                    activeOpacity={0.8}
                  >
                    {locLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="navigate" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECCIÓN 3 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}15` }]}>
                    <Ionicons name="call" size={18} color={colors.brandGreen} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Contacto
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Teléfono"
                      icon="call-outline"
                      value={form.phones}
                      onChange={(t: string) => handleChange('phones', t)}
                      placeholder="Número de contacto"
                      keyboard="phone-pad"
                      colors={colors}
                      isDark={isDark}
                      inputRef={phoneRef}
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        Keyboard.dismiss();
                        setTimeout(() => emailRef.current?.focus(), 100);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Email"
                      icon="mail-outline"
                      value={form.email}
                      onChange={(t: string) => handleChange('email', t)}
                      placeholder="Correo electrónico"
                      keyboard="email-address"
                      colors={colors}
                      isDark={isDark}
                      inputRef={emailRef}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                </View>
              </View>

              {/* SECCIÓN 4 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}15` }]}>
                    <Ionicons name="wallet" size={18} color={colors.brandGreen} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Información Financiera
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Tipo de Pago"
                      icon="card-outline"
                      value={form.payment_term}
                      placeholder="Seleccionar"
                      colors={colors}
                      isDark={isDark}
                      onPress={() => setModalPayment(true)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Estado"
                      icon="toggle-outline"
                      value={form.status}
                      placeholder="Seleccionar"
                      colors={colors}
                      isDark={isDark}
                      onPress={() => setModalStatus(true)}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Límite Crédito (Bs)"
                      icon="cash-outline"
                      value={form.credit_limit}
                      onChange={(t: string) => handleChange('credit_limit', t)}
                      placeholder="0.00"
                      keyboard="numeric"
                      colors={colors}
                      isDark={isDark}
                      inputRef={creditLimitRef}
                      returnKeyType="next"
                      onSubmitEditing={() => balanceRef.current?.focus()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput
                      label="Saldo Inicial (Bs)"
                      icon="wallet-outline"
                      value={form.balance_initial}
                      onChange={(t: string) => handleChange('balance_initial', t)}
                      placeholder="0.00"
                      keyboard="numeric"
                      colors={colors}
                      isDark={isDark}
                      inputRef={balanceRef}
                      returnKeyType="next"
                      onSubmitEditing={() => guaranteeRef.current?.focus()}
                    />
                  </View>
                </View>

                <FormInput
                  label="Garantía"
                  icon="shield-checkmark-outline"
                  value={form.guarantee}
                  onChange={(t: string) => handleChange('guarantee', t)}
                  placeholder="Descripción de garantía"
                  colors={colors}
                  isDark={isDark}
                  inputRef={guaranteeRef}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* SECCIÓN 5 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}15` }]}>
                    <Ionicons name="document-text" size={18} color={colors.brandGreen} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                    Notas Adicionales
                  </Text>
                </View>

                <FormInput
                  label="Observaciones"
                  icon="create-outline"
                  value={form.notes}
                  onChange={(t: string) => handleChange('notes', t)}
                  placeholder="Información adicional del cliente..."
                  multiline
                  colors={colors}
                  isDark={isDark}
                  inputRef={notesRef}
                />
              </View>

              {/* BOTÓN GUARDAR */}
              <TouchableOpacity
                style={[styles.submitBtn, {
                  backgroundColor: colors.brandGreen,
                  shadowColor: colors.brandGreen
                }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>GUARDAR CLIENTE</Text>
                  </>
                )}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* MODALES */}

      {/* Modal Tipo Documento */}
      <Modal visible={modalDocType} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalDocType(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Tipo de Documento</Text>
                {['NIT', 'CI', 'PASAPORTE'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.modalItem, { borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6' }]}
                    onPress={() => {
                      handleChange('doc_type', opt);
                      setModalDocType(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '500' }}>{opt}</Text>
                    {form.doc_type === opt && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.brandGreen} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setModalDocType(false)} style={styles.modalClose}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Estado */}
      <Modal visible={modalStatus} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalStatus(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Estado del Cliente</Text>
                {['Vigente', 'No Vigente', 'Suspendido'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.modalItem, { borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6' }]}
                    onPress={() => {
                      handleChange('status', opt);
                      setModalStatus(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '500' }}>{opt}</Text>
                    {form.status === opt && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.brandGreen} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setModalStatus(false)} style={styles.modalClose}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Tipo Pago */}
      <Modal visible={modalPayment} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalPayment(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Tipo de Pago</Text>
                {['Contado', 'Crédito'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.modalItem, { borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6' }]}
                    onPress={() => {
                      handleChange('payment_term', opt);
                      setModalPayment(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '500' }}>{opt}</Text>
                    {form.payment_term === opt && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.brandGreen} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setModalPayment(false)} style={styles.modalClose}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Zonas */}
      <Modal visible={modalZona} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setModalZona(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, {
                backgroundColor: colors.cardBg,
                height: '70%',
                maxHeight: 600
              }]}>
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>Seleccionar Zona</Text>
                <FlatList
                  data={zonasDisponibles}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: isDark ? colors.cardBorder : '#F3F4F6' }]}
                      onPress={() => handleSelectZona(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                          {item.territorio || item.descripcion || item.codigo_zona}
                        </Text>
                        {item.employees?.full_name && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="person-outline" size={14} color={colors.textSub} />
                            <Text style={{ color: colors.textSub, fontSize: 13, marginLeft: 4 }}>
                              {item.employees.full_name}
                            </Text>
                          </View>
                        )}
                      </View>
                      {form.zone_name === (item.territorio || item.descripcion) && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.brandGreen} />
                      )}
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Ionicons name="map-outline" size={48} color={colors.textSub} style={{ marginBottom: 12 }} />
                      <Text style={{ textAlign: 'center', color: colors.textSub, fontSize: 15 }}>
                        No hay zonas disponibles
                      </Text>
                    </View>
                  }
                />
                <TouchableOpacity onPress={() => setModalZona(false)} style={styles.modalClose}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  // HEADER
  headerGradient: {
    height: 100,
    paddingHorizontal: 20,
  },
  headerSafe: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // SCROLL
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // INFO CARD
  infoCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },

  // FORM SHEET
  formSheet: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // SECTIONS
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // INPUTS
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // VENDOR CARD
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },

  // GPS
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  gpsTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // SUBMIT
  submitBtn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // MODALS
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
