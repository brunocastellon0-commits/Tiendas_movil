import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { clientService } from '../../../services/ClienteService';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR: FormField
//
// Un campo de formulario reutilizable con etiqueta, ícono y TextInput.
// readonly: muestra el campo deshabilitado (ej: código legacy que no se edita)
// required: muestra un asterisco rojo junto a la etiqueta
// ─────────────────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChange?: (text: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  readonly?: boolean;
  required?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  colors: any;
  isDark: boolean;
}

const FormField = ({
  label, icon, value, onChange, placeholder,
  keyboard = 'default', multiline = false,
  readonly = false, required = false,
  inputRef, returnKeyType = 'next', onSubmitEditing,
  colors, isDark,
}: FormFieldProps) => (
  <View style={styles.fieldGroup}>
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: colors.textMain }]}>{label}</Text>
      {required && <Text style={styles.requiredMark}>*</Text>}
    </View>
    <View style={[
      styles.fieldWrapper,
      {
        backgroundColor: readonly
          ? (isDark ? '#1a1a1a' : '#F3F4F6')
          : colors.inputBg,
        borderColor: isDark ? colors.cardBorder : '#E5E7EB',
        height: multiline ? 90 : 50,
        alignItems: multiline ? 'flex-start' : 'center',
        paddingVertical: multiline ? 12 : 0,
      }
    ]}>
      <Ionicons
        name={icon}
        size={18}
        color={readonly ? colors.textSub : colors.brandGreen}
        style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }}
      />
      <TextInput
        ref={inputRef}
        style={[styles.fieldInput, {
          color: readonly ? colors.textSub : colors.textMain,
          textAlignVertical: multiline ? 'top' : 'center',
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
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR: SectionHeader
//
// Encabezado de sección dentro del formulario.
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader = ({
  title, icon, colors,
}: { title: string; icon: keyof typeof Ionicons.glyphMap; colors: any }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}18` }]}>
      <Ionicons name={icon} size={16} color={colors.brandGreen} />
    </View>
    <Text style={[styles.sectionTitle, { color: colors.textMain }]}>{title}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA: Editar Cliente
//
// Qué edita esta pantalla vs NuevoCliente:
//   - Esta pantalla edita los campos más comunes que un vendedor necesita
//     actualizar en campo: nombre, dirección, teléfono, NIT, crédito y GPS.
//   - NuevoCliente.tsx tiene todos los campos incluyendo zona, vendedor, etc.
//     que normalmente solo el admin configura al crear el cliente.
//
// Si necesitas exponer más campos aquí, simplemente agrega un FormField
//   y añade el campo al estado 'form' y al payload de clientService.updateClient.
// ─────────────────────────────────────────────────────────────────────────────
export default function EditClientScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // El id viene de la URL: /clients/edit/[id]
  const params = useLocalSearchParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    business_name: '',
    tax_id: '',
    address: '',
    phones: '',
    credit_limit: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Referencias para mover el foco entre campos con el teclado
  const nameRef = useRef<TextInput>(null);
  const businessRef = useRef<TextInput>(null);
  const taxIdRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const phonesRef = useRef<TextInput>(null);
  const creditRef = useRef<TextInput>(null);

  // ── Carga del cliente ──────────────────────────────────────────────────────
  useEffect(() => {
    if (clientId) loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const client = await clientService.getClientById(clientId);
      if (client) {
        setForm({
          code: client.code ?? '',
          name: client.name ?? '',
          business_name: client.business_name ?? '',
          tax_id: client.tax_id ?? '',
          address: client.address ?? '',
          phones: client.phones ?? '',
          credit_limit: client.credit_limit?.toString() ?? '0',
          // Las coordenadas vienen como geometría PostGIS desde Supabase.
          // El campo 'location' es un string WKT como "POINT(-66.15 -17.39)".
          // Para mostrarlas necesitaríamos parsear ese string.
          // Por ahora dejamos null y el usuario puede actualizar con el botón GPS.
          latitude: null,
          longitude: null,
        });
      } else {
        Alert.alert('Error', 'No se encontró el cliente');
        router.back();
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos del cliente');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  // ── Obtener ubicación GPS ──────────────────────────────────────────────────
  // Usa precisión alta (GPS puro, ~10m) porque estamos marcando
  // la ubicación exacta de una tienda, no la posición aproximada del vendedor.
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Habilita el GPS en la configuración del dispositivo.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setForm(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Guardar cambios ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y el código son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await clientService.updateClient(clientId, {
        code: form.code.trim(),
        name: form.name.trim(),
        business_name: form.business_name.trim(),
        tax_id: form.tax_id.trim(),
        address: form.address.trim(),
        phones: form.phones.trim(),
        credit_limit: parseFloat(form.credit_limit || '0'),
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
      });
      Alert.alert('Guardado', 'Cliente actualizado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Estado: cargando ───────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>

      {/* HEADER */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Editar Cliente</Text>
              {form.name ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>{form.name}</Text>
              ) : null}
            </View>
            {/* Botón guardar en el header (acceso rápido) */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={styles.headerSaveBtn}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="checkmark" size={22} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* FORMULARIO */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Sección: Identificación ── */}
          <View style={[styles.formCard, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <SectionHeader title="Identificación" icon="storefront-outline" colors={colors} />

            {/* El código es readonly: viene del sistema legacy y no se debe cambiar
                desde el campo. Si necesitan cambiarlo, que lo haga el admin. */}
            <FormField
              label="Código"
              icon="key-outline"
              value={form.code}
              readonly
              placeholder="Código del sistema"
              colors={colors}
              isDark={isDark}
            />

            <FormField
              label="Nombre del negocio"
              icon="business-outline"
              value={form.name}
              onChange={t => setForm(p => ({ ...p, name: t }))}
              placeholder="Nombre comercial"
              required
              inputRef={nameRef}
              returnKeyType="next"
              onSubmitEditing={() => businessRef.current?.focus()}
              colors={colors}
              isDark={isDark}
            />

            <FormField
              label="Razón social"
              icon="document-text-outline"
              value={form.business_name}
              onChange={t => setForm(p => ({ ...p, business_name: t }))}
              placeholder="Nombre legal de la empresa"
              inputRef={businessRef}
              returnKeyType="next"
              onSubmitEditing={() => taxIdRef.current?.focus()}
              colors={colors}
              isDark={isDark}
            />

            <FormField
              label="NIT / CI"
              icon="card-outline"
              value={form.tax_id}
              onChange={t => setForm(p => ({ ...p, tax_id: t }))}
              placeholder="Número de documento fiscal"
              keyboard="numeric"
              inputRef={taxIdRef}
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
              colors={colors}
              isDark={isDark}
            />
          </View>

          {/* ── Sección: Contacto ── */}
          <View style={[styles.formCard, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <SectionHeader title="Contacto y dirección" icon="call-outline" colors={colors} />

            <FormField
              label="Dirección"
              icon="map-outline"
              value={form.address}
              onChange={t => setForm(p => ({ ...p, address: t }))}
              placeholder="Av. Principal #123"
              inputRef={addressRef}
              returnKeyType="next"
              onSubmitEditing={() => phonesRef.current?.focus()}
              colors={colors}
              isDark={isDark}
            />

            <FormField
              label="Teléfono"
              icon="call-outline"
              value={form.phones}
              onChange={t => setForm(p => ({ ...p, phones: t }))}
              placeholder="Número de contacto"
              keyboard="phone-pad"
              inputRef={phonesRef}
              returnKeyType="next"
              onSubmitEditing={() => creditRef.current?.focus()}
              colors={colors}
              isDark={isDark}
            />
          </View>

          {/* ── Sección: Ubicación GPS ── */}
          <View style={[styles.formCard, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <SectionHeader title="Ubicación GPS" icon="navigate-outline" colors={colors} />

            {/* Muestra las coordenadas actuales o un mensaje si no hay */}
            <View style={[styles.gpsPreview, {
              backgroundColor: isDark ? colors.inputBg : '#F0FDF4',
              borderColor: form.latitude ? colors.brandGreen : (isDark ? colors.cardBorder : '#E5E7EB'),
            }]}>
              <Ionicons
                name={form.latitude ? 'location' : 'location-outline'}
                size={18}
                color={form.latitude ? colors.brandGreen : colors.textSub}
              />
              <Text style={[styles.gpsText, {
                color: form.latitude ? colors.textMain : colors.textSub,
              }]}>
                {form.latitude && form.longitude
                  ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                  : 'Sin ubicación capturada'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.gpsBtn, { borderColor: colors.brandGreen }]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color={colors.brandGreen} size="small" />
              ) : (
                <>
                  <Ionicons name="navigate" size={16} color={colors.brandGreen} />
                  <Text style={[styles.gpsBtnText, { color: colors.brandGreen }]}>
                    Capturar ubicación actual
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Sección: Financiero ── */}
          <View style={[styles.formCard, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }]}>
            <SectionHeader title="Financiero" icon="wallet-outline" colors={colors} />

            <FormField
              label="Límite de crédito (Bs)"
              icon="cash-outline"
              value={form.credit_limit}
              onChange={t => setForm(p => ({ ...p, credit_limit: t }))}
              placeholder="0.00"
              keyboard="numeric"
              inputRef={creditRef}
              returnKeyType="done"
              colors={colors}
              isDark={isDark}
            />
          </View>

          {/* ── Botón guardar principal ── */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.brandGreen }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS — solo medidas, sin colores fijos
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // HEADER
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerSafe: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTextCol: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  headerSaveBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // SCROLL
  scrollContent: { padding: 16, paddingBottom: 40 },

  // FORM CARD
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  // FORM FIELD
  fieldGroup: { marginBottom: 14 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  requiredMark: { color: '#EF4444', fontSize: 15, marginLeft: 4 },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  fieldInput: { flex: 1, fontSize: 14, height: '100%' },

  // GPS
  gpsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  gpsText: { fontSize: 13, flex: 1 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  gpsBtnText: { fontSize: 14, fontWeight: '600' },

  // BOTÓN GUARDAR
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});