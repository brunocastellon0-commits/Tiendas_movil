import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Opciones del modal de resultado de visita
//
// El modal aparece al pulsar "Finalizar visita".
// El cronómetro se detuvo cuando se creó el pedido (o si no hubo pedido,
// se detiene al finalizar aquí).
// ─────────────────────────────────────────────────────────────────────────────
type VisitOutcome = 'sale' | 'no_sale' | 'closed';

interface OutcomeOption {
  value: VisitOutcome;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
  bgDark: string;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    value: 'sale',
    label: 'Venta realizada',
    sublabel: 'Se concretó el pedido',
    icon: 'checkmark-circle',
    color: '#16A34A',
    bgLight: '#F0FDF4',
    bgDark: '#052e16',
  },
  {
    value: 'no_sale',
    label: 'Sin venta',
    sublabel: 'El cliente no compró',
    icon: 'close-circle',
    color: '#DC2626',
    bgLight: '#FEF2F2',
    bgDark: '#2d0a0a',
  },
  {
    value: 'closed',
    label: 'Tienda cerrada',
    sublabel: 'No habia nadie',
    icon: 'lock-closed',
    color: '#D97706',
    bgLight: '#FFFBEB',
    bgDark: '#2d1a00',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const { id, autoStartVisit } = useLocalSearchParams<{ id: string; autoStartVisit?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { session } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOutcome, setSavingOutcome] = useState(false);

  // ── Cronómetro (invisible para el usuario) ──────────────────────────────────
  // startTimeRef guarda el momento en que se abrió esta vista.
  // Se usa al finalizar la visita para calcular la duración total.
  const startTimeRef = useRef<Date>(new Date());
  const visitIdRef = useRef<number | null>(null);

  // ── Modal de resultado ──────────────────────────────────────────────────────
  const [outcomeModal, setOutcomeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | null>(null);

  // ── Carga del cliente ───────────────────────────────────────────────────────
  useEffect(() => {
    if (id) loadClient();
  }, [id]);

  const loadClient = async () => {
    const data = await clientService.getClientById(id);
    if (data) {
      setClient(data);
      // Si viene de "Botón Pedido" → registrar el inicio de visita en Supabase
      if (autoStartVisit === 'true' && session?.user) {
        await registerVisitStart();
      }
    } else {
      Alert.alert('Error', 'No se encontró el cliente');
      router.back();
    }
    setLoading(false);
  };

  // Registra el inicio de visita en la tabla visits (outcome: pending)
  const registerVisitStart = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .insert({
          seller_id: session!.user.id,
          client_id: id,
          start_time: startTimeRef.current.toISOString(),
          outcome: 'pending',
        })
        .select('id')
        .single();

      if (!error && data) {
        visitIdRef.current = data.id;
      }
    } catch {
      // No interrumpir la navegación si falla el registro
    }
  };

  // ── Ir a crear pedido ───────────────────────────────────────────────────────
  const handleCreateOrder = () => {
    if (!client) return;
    router.push(`/pedidos/NuevoPedido?clientId=${client.id}` as any);
  };

  // ── Finalizar visita ────────────────────────────────────────────────────────
  // 1. Abre el modal de resultado
  // 2. Al confirmar → calcula duración, guarda en visits, vuelve al inicio
  const handleFinishVisit = () => {
    setSelectedOutcome(null);
    setOutcomeModal(true);
  };

  const handleOutcomeConfirm = async () => {
    if (!selectedOutcome) {
      Alert.alert('Selecciona un resultado', 'Indica que ocurrio en la visita.');
      return;
    }

    setOutcomeModal(false);
    setSavingOutcome(true);

    try {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 1000);

      if (visitIdRef.current) {
        // Actualizar el registro de visita existente
        await supabase
          .from('visits')
          .update({
            end_time: endTime.toISOString(),
            duration_seconds: duration,
            outcome: selectedOutcome,
          })
          .eq('id', visitIdRef.current);
      } else if (session?.user) {
        // Si no se registró inicio (vino por tarjeta, no por botón), insertar completo
        await supabase.from('visits').insert({
          seller_id: session.user.id,
          client_id: id,
          start_time: startTimeRef.current.toISOString(),
          end_time: endTime.toISOString(),
          duration_seconds: duration,
          outcome: selectedOutcome,
        });
      }

      // Volver al inicio
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el resultado de la visita.');
    } finally {
      setSavingOutcome(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bgStart }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.brandGreen} />
        <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando cliente...</Text>
      </View>
    );
  }

  if (!client) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={[colors.brandGreen, '#1e6b38']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          {/* Nombre del cliente */}
          <Text style={styles.headerName} numberOfLines={2}>
            {client.name || 'Sin nombre'}
          </Text>

          {/* Badge de código */}
          {client.code ? (
            <View style={styles.codeBadge}>
              <Ionicons name="barcode-outline" size={12} color="#166534" />
              <Text style={styles.codeBadgeText}>{client.code}</Text>
            </View>
          ) : null}

          {/* Badge de estado */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: client.status === 'Vigente' ? '#E8F5E9' : '#FEE2E2' },
          ]}>
            <Text style={[
              styles.statusText,
              { color: client.status === 'Vigente' ? '#2E7D32' : '#991B1B' },
            ]}>
              {client.status}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Contenido */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Tarjeta de información */}
        <View style={[styles.card, {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? colors.cardBorder : 'transparent',
          borderWidth: isDark ? 1 : 0,
        }]}>
          <Text style={[styles.cardTitle, { color: colors.brandGreen }]}>
            INFORMACION DEL CLIENTE
          </Text>

          <InfoRow
            label="Nombre"
            value={client.name || 'Sin nombre'}
            icon="person-outline"
            colors={colors}
          />
          <InfoRow
            label="Codigo"
            value={client.code || 'Sin codigo'}
            icon="barcode-outline"
            colors={colors}
          />
          <InfoRow
            label="Direccion"
            value={client.address || 'No registrada'}
            icon="location-outline"
            colors={colors}
          />
          {client.tax_id ? (
            <InfoRow
              label="NIT / CI"
              value={client.tax_id}
              icon="document-text-outline"
              colors={colors}
            />
          ) : null}
          {client.phones ? (
            <InfoRow
              label="Telefono"
              value={client.phones}
              icon="call-outline"
              colors={colors}
            />
          ) : null}
          {client.business_name ? (
            <InfoRow
              label="Razon Social"
              value={client.business_name}
              icon="business-outline"
              colors={colors}
            />
          ) : null}
        </View>

        {/* Saldo pendiente */}
        {client.current_balance > 0 && (
          <View style={[styles.balanceCard, {
            backgroundColor: isDark ? '#2d1a00' : '#FFFBEB',
            borderColor: isDark ? '#78350f' : '#FDE68A',
          }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#D97706" />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.balanceLabel, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                Saldo pendiente
              </Text>
              <Text style={[styles.balanceAmount, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                Bs {client.current_balance.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Footer con acciones */}
      <View style={[styles.footer, {
        backgroundColor: colors.cardBg,
        borderTopColor: isDark ? colors.cardBorder : '#E5E7EB',
      }]}>
        {savingOutcome ? (
          <ActivityIndicator color={colors.brandGreen} style={{ paddingVertical: 16 }} />
        ) : (
          <View style={styles.footerRow}>
            {/* Crear pedido */}
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: colors.brandGreen }]}
              onPress={handleCreateOrder}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.footerBtnText}>Crear Pedido</Text>
            </TouchableOpacity>

            {/* Finalizar visita */}
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnSecondary, {
                borderColor: isDark ? colors.cardBorder : '#D1D5DB',
              }]}
              onPress={handleFinishVisit}
              activeOpacity={0.85}
            >
              <Ionicons name="flag-outline" size={20} color={colors.textSub} />
              <Text style={[styles.footerBtnTextSecondary, { color: colors.textSub }]}>
                Finalizar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal de resultado de visita */}
      <Modal
        visible={outcomeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setOutcomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>

            {/* Encabezado */}
            <View style={styles.modalHeader}>
              <Ionicons name="clipboard-outline" size={22} color={colors.brandGreen} />
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                Resultado de la visita
              </Text>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSub }]}>
              Indica que ocurrio antes de cerrar la visita.
            </Text>

            {/* Opciones */}
            {OUTCOME_OPTIONS.map(opt => {
              const isSelected = selectedOutcome === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.outcomeOption, {
                    backgroundColor: isSelected
                      ? (isDark ? opt.bgDark : opt.bgLight)
                      : (isDark ? colors.inputBg : '#F9FAFB'),
                    borderColor: isSelected ? opt.color : (isDark ? colors.cardBorder : '#E5E7EB'),
                  }]}
                  onPress={() => setSelectedOutcome(opt.value)}
                >
                  <View style={[styles.outcomeIcon, {
                    backgroundColor: isSelected ? opt.color : (colors.textSub + '33'),
                  }]}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? '#fff' : colors.textSub}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.outcomeLabel, {
                      color: isSelected ? opt.color : colors.textMain,
                    }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.outcomeSub, { color: colors.textSub }]}>
                      {opt.sublabel}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Botones */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, {
                  borderColor: isDark ? colors.cardBorder : '#D1D5DB',
                }]}
                onPress={() => setOutcomeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSub }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, {
                  backgroundColor: selectedOutcome ? colors.brandGreen : colors.textSub + '55',
                }]}
                onPress={handleOutcomeConfirm}
                disabled={!selectedOutcome}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoRow — fila de información del cliente
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow = ({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={16} color={colors.textSub} style={{ marginRight: 6 }} />
      <Text style={[styles.infoLabel, { color: colors.textSub }]}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: colors.textMain }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Header
  header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, lineHeight: 28 },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
  codeBadgeText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // Card info
  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', flex: 0.4 },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 0.58 },

  // Balance
  balanceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  balanceLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  balanceAmount: { fontSize: 18, fontWeight: '800' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  footerBtnPrimary: {},
  footerBtnSecondary: { borderWidth: 1.5, backgroundColor: 'transparent' },
  footerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerBtnTextSecondary: { fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', padding: 16 },
  modalBox: { borderRadius: 24, padding: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  outcomeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2 },
  outcomeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  outcomeLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  outcomeSub: { fontSize: 12 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});