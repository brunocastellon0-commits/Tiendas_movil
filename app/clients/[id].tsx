import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useVisitTracker } from '../../hooks/hookVisita';
import { VisitToast } from '../../components/VisitToast';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR: InfoRow
//
// Muestra una fila etiqueta → valor dentro de las secciones de detalle.
// isMoney: pone el valor en negrita.
// highlight: colorea el valor con el verde de la marca.
// ─────────────────────────────────────────────────────────────────────────────
interface InfoRowProps {
  label: string;
  value: string;
  isMoney?: boolean;
  highlight?: boolean;
  colors: any;
}

const InfoRow = ({ label, value, isMoney, highlight, colors }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, { color: colors.textSub }]}>{label}</Text>
    <Text style={[
      styles.infoValue,
      { color: highlight ? colors.brandGreen : colors.textMain },
      isMoney && { fontWeight: '700' },
    ]}>
      {value}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR: SectionCard
//
// Tarjeta contenedora para cada bloque de información.
// Recibe un título y sus hijos (filas InfoRow).
// ─────────────────────────────────────────────────────────────────────────────
interface SectionCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors: any;
  isDark: boolean;
}

const SectionCard = ({ title, icon, children, colors, isDark }: SectionCardProps) => (
  <View style={[styles.sectionCard, {
    backgroundColor: colors.cardBg,
    borderColor: isDark ? colors.cardBorder : 'transparent',
    borderWidth: isDark ? 1 : 0,
  }]}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: `${colors.brandGreen}18` }]}>
        <Ionicons name={icon} size={16} color={colors.brandGreen} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.textMain }]}>{title}</Text>
    </View>
    {children}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL: Detalle de Cliente
//
// Flujo de visita:
//   1. El vendedor llega a esta pantalla (desde la lista o desde el botón Pedido)
//   2. Pulsa "Iniciar Visita" → se registra la visita en la base de datos
//   3. Aparecen los botones "Crear Pedido" y "Finalizar"
//   4. Al finalizar, elige el resultado (Venta / Sin Venta / Cerrado) y opcionalmente notas
//
// Si viene con autoStartVisit=true (desde el botón Pedido de la lista),
// la visita arranca automáticamente sin que el vendedor tenga que pulsar nada.
//
// El cronómetro NO se muestra a vendedores/prevendedores.
// Solo los admins ven el tiempo transcurrido de la visita.
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const { id, autoStartVisit } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook que maneja el ciclo de vida de la visita (iniciar, finalizar, estado)
  const {
    isVisiting,
    visitId,
    startVisit,
    endVisit,
    loading: visitLoading,
    startTime,
  } = useVisitTracker();

  // Estado del modal para finalizar visita
  const [showEndVisitModal, setShowEndVisitModal] = useState(false);
  const [visitOutcome, setVisitOutcome] = useState<'sale' | 'no_sale' | 'closed'>('sale');
  const [visitNotes, setVisitNotes] = useState('');

  // ── Carga del cliente ──────────────────────────────────────────────────────
  useEffect(() => {
    if (id) fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    const data = await clientService.getClientById(id as string);
    if (data) {
      setClient(data);
    } else {
      Alert.alert('Error', 'No se encontró el cliente');
      router.back();
    }
    setLoading(false);
  };

  // ── Auto-iniciar visita ────────────────────────────────────────────────────
  // Se activa cuando el usuario llegó desde el botón "Pedido" de la lista.
  // El parámetro autoStartVisit=true viene en la URL.
  useEffect(() => {
    if (autoStartVisit === 'true' && client && !isVisiting) {
      handleStartVisit();
    }
  }, [client, autoStartVisit]);

  // ── Acciones de visita ─────────────────────────────────────────────────────
  const handleStartVisit = async () => {
    if (!client) return;
    await startVisit(client.id);
    // Nota: el hook startVisit ya guarda la visita en Supabase internamente.
    // No mostramos cronómetro al vendedor, solo un indicador simple de "en visita".
  };

  const handleEndVisit = async () => {
    await endVisit(visitOutcome, visitNotes);
    setShowEndVisitModal(false);
    setVisitNotes('');
    setVisitOutcome('sale');
  };

  const handleCreateOrder = () => {
    if (!client) return;

    if (!isVisiting) {
      // Si no hay visita activa, preguntamos si quiere iniciarla primero
      Alert.alert(
        'Sin visita activa',
        'Debes iniciar una visita antes de crear un pedido.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar visita',
            onPress: async () => {
              await handleStartVisit();
              // Esperamos un momento para que visitId esté disponible en el hook
              setTimeout(() => {
                router.push(`/pedidos/NuevoPedido?clientId=${client.id}&visitId=${visitId}` as any);
              }, 500);
            },
          },
        ]
      );
    } else {
      router.push(`/pedidos/NuevoPedido?clientId=${client.id}&visitId=${visitId}` as any);
    }
  };

  // ── Duración de visita (solo para admin) ───────────────────────────────────
  // Los vendedores NO ven el cronómetro. Solo el admin ve cuánto tiempo lleva
  // la visita, porque es información de supervisión, no operativa.
  const getVisitDuration = (): string => {
    if (!startTime) return '';
    const diffSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ── Estados de carga ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
      </View>
    );
  }

  if (!client) return null;

  const isVigente = client.status === 'Vigente';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Toast de visita — aparece 5 segundos y desaparece solo */}
      <VisitToast />

      {/* ── HEADER ── */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.header}>
        {/* Barra superior: volver + editar */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/clients/edit/${client.id}` as any)}
            style={styles.headerIconBtn}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Nombre y código */}
        <Text style={styles.headerTitle} numberOfLines={2}>{client.name}</Text>
        {client.code && (
          <Text style={styles.headerCode}>#{client.code}</Text>
        )}

        {/* Fila: estado + indicador de visita */}
        <View style={styles.headerBadgesRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isVigente ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.3)' }
          ]}>
            <Text style={styles.statusBadgeText}>{client.status}</Text>
          </View>

          {/* Indicador de visita activa:
              - Admin: muestra "Visita activa · 3:42" (con cronómetro)
              - Vendedor: muestra "Visita activa" (sin cronómetro) */}
          {isVisiting && (
            <View style={styles.visitBadge}>
              <Ionicons name="radio-button-on" size={10} color="#4ade80" />
              <Text style={styles.visitBadgeText}>
                {isAdmin
                  ? `Visita activa · ${getVisitDuration()}`
                  : 'Visita activa'}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── CONTENIDO ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Sección: Información financiera */}
        <SectionCard
          title="Información financiera"
          icon="wallet-outline"
          colors={colors}
          isDark={isDark}
        >
          <InfoRow
            label="Límite de crédito"
            value={`Bs. ${client.credit_limit?.toFixed(2) ?? '0.00'}`}
            isMoney
            colors={colors}
          />
          <InfoRow
            label="Días de plazo"
            value={`${client.credit_days ?? 0} días`}
            colors={colors}
          />
          <InfoRow
            label="Saldo actual"
            value={`Bs. ${client.current_balance?.toFixed(2) ?? '0.00'}`}
            isMoney
            highlight={client.current_balance > 0}
            colors={colors}
          />
          <InfoRow
            label="Saldo inicial"
            value={`Bs. ${client.initial_balance?.toFixed(2) ?? '0.00'}`}
            isMoney
            colors={colors}
          />
          {client.accounting_account && (
            <InfoRow label="Cuenta contable" value={client.accounting_account} colors={colors} />
          )}
        </SectionCard>

        {/* Sección: Contacto */}
        <SectionCard
          title="Contacto y dirección"
          icon="call-outline"
          colors={colors}
          isDark={isDark}
        >
          <InfoRow label="Razón social" value={client.business_name || client.name} colors={colors} />
          <InfoRow label="Dirección" value={client.address || 'No registrada'} colors={colors} />
          {client.address_ref_1 && <InfoRow label="Referencia 1" value={client.address_ref_1} colors={colors} />}
          {client.address_ref_2 && <InfoRow label="Referencia 2" value={client.address_ref_2} colors={colors} />}
          <InfoRow label="Teléfono" value={client.phones || 'S/N'} colors={colors} />
          {client.fax && <InfoRow label="Fax" value={client.fax} colors={colors} />}
        </SectionCard>

        {/* Sección: Fiscal */}
        <SectionCard
          title="Información fiscal"
          icon="document-text-outline"
          colors={colors}
          isDark={isDark}
        >
          <InfoRow label="NIT / CI" value={client.tax_id || 'S/N'} colors={colors} />
          {client.tax_id_complement && (
            <InfoRow label="Complemento" value={client.tax_id_complement} colors={colors} />
          )}
        </SectionCard>

        {/* Sección: Negocio */}
        <SectionCard
          title="Datos del negocio"
          icon="business-outline"
          colors={colors}
          isDark={isDark}
        >
          {client.zone_name && <InfoRow label="Zona" value={client.zone_name} colors={colors} />}
          {client.branch_name && <InfoRow label="Sucursal" value={client.branch_name} colors={colors} />}
          {client.category && <InfoRow label="Categoría" value={client.category} colors={colors} />}
          {client.city && <InfoRow label="Ciudad" value={client.city} colors={colors} />}
          {client.client_type && <InfoRow label="Tipo de cliente" value={client.client_type} colors={colors} />}
          {client.payment_method && <InfoRow label="Método de pago" value={client.payment_method} colors={colors} />}
        </SectionCard>

        {/* Espacio para que el footer no tape el último card */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FOOTER: botones de acción ── */}
      <View style={[styles.footer, {
        backgroundColor: colors.cardBg,
        borderTopColor: isDark ? colors.cardBorder : '#E5E7EB',
      }]}>
        {!isVisiting ? (
          // Estado: sin visita activa → solo mostrar "Iniciar visita"
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.brandGreen }]}
            onPress={handleStartVisit}
            disabled={visitLoading}
          >
            {visitLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play-circle-outline" size={20} color="#fff" />
                <Text style={styles.footerBtnText}>Iniciar visita</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          // Estado: visita activa → "Crear pedido" y "Finalizar"
          <>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: '#166534' }]}
              onPress={handleCreateOrder}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.footerBtnText}>Crear pedido</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.brandGreen }]}
              onPress={() => setShowEndVisitModal(true)}
              disabled={visitLoading}
            >
              {visitLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.footerBtnText}>Finalizar</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── MODAL: Finalizar visita ── */}
      <Modal
        visible={showEndVisitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndVisitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>
              Finalizar visita
            </Text>

            {/* Resultado de la visita */}
            <Text style={[styles.modalLabel, { color: colors.textSub }]}>
              Resultado
            </Text>
            <View style={styles.outcomeRow}>
              {(
                [
                  { key: 'sale', label: 'Venta', icon: 'checkmark-circle' },
                  { key: 'no_sale', label: 'Sin venta', icon: 'close-circle' },
                  { key: 'closed', label: 'Cerrado', icon: 'lock-closed' },
                ] as const
              ).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.outcomeBtn,
                    { borderColor: colors.cardBorder },
                    visitOutcome === opt.key && {
                      backgroundColor: colors.brandGreen,
                      borderColor: colors.brandGreen,
                    },
                  ]}
                  onPress={() => setVisitOutcome(opt.key)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={visitOutcome === opt.key ? '#fff' : colors.textSub}
                  />
                  <Text style={[
                    styles.outcomeBtnText,
                    { color: visitOutcome === opt.key ? '#fff' : colors.textSub },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notas opcionales */}
            <Text style={[styles.modalLabel, { color: colors.textSub }]}>
              Notas (opcional)
            </Text>
            <TextInput
              style={[styles.notesInput, {
                color: colors.textMain,
                borderColor: colors.cardBorder,
                backgroundColor: isDark ? colors.inputBg : '#F9FAFB',
              }]}
              placeholder="Ej: El dueño no estaba, pidió fiado..."
              placeholderTextColor={colors.textSub}
              value={visitNotes}
              onChangeText={setVisitNotes}
              multiline
              numberOfLines={3}
            />

            {/* Botones confirmar / cancelar */}
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? colors.inputBg : '#F3F4F6' }]}
                onPress={() => setShowEndVisitModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSub }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.brandGreen }]}
                onPress={handleEndVisit}
                disabled={visitLoading}
              >
                {visitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// Regla: medidas aquí, colores siempre inline con colors.xxx
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // HEADER
  header: {
    paddingTop: 52,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerCode: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  visitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // SCROLL
  scrollContent: {
    padding: 16,
  },

  // SECTION CARD
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  // INFO ROW
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    textAlign: 'right',
    flex: 1.2,
    marginLeft: 12,
  },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  footerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  outcomeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  outcomeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});