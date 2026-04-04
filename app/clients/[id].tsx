import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useVisitTracker } from '../../hooks/hookVisita';
import { VisitToast } from '../../components/VisitToast';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

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

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    isVisiting,
    visitId,
    startVisit,
    endVisit,
    loading: visitLoading,
    checkActiveVisit // Usado para actualizar el estado silenciosamente al volver
  } = useVisitTracker();

  const [showEndVisitModal, setShowEndVisitModal] = useState(false);
  const [visitOutcome, setVisitOutcome] = useState<'sale' | 'no_sale' | 'closed'>('sale');
  const [visitNotes, setVisitNotes] = useState('');

  // Carga del cliente y revisión de visita silenciosa al enfocar la pantalla.
  // Pasamos el id del cliente para que solo detecte visitas de ESTE cliente.
  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchClientDetails();
        checkActiveVisit(id as string); // Solo visita activa de este cliente
      }
    }, [id])
  );

  const fetchClientDetails = async () => {
    const data = await clientService.getClientById(id as string);
    if (data) {
      setClient(data);
    } else {
      router.back();
    }
    setLoading(false);
  };

  const handleStartVisit = async () => {
    if (!client) return;
    await startVisit(client.id);
  };

  const handleEndVisit = async () => {
    await endVisit(visitOutcome, visitNotes);
    setShowEndVisitModal(false);
    setVisitNotes('');
    setVisitOutcome('sale');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
      </View>
    );
  }

  if (!client) return null;

  const isVigente = client.status === 'Vigente';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgStart }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <VisitToast />

      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.header}>
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

        <Text style={styles.headerTitle} numberOfLines={2}>{client.name}</Text>
        {client.code && (
          <Text style={styles.headerCode}>#{client.code}</Text>
        )}

        <View style={styles.headerBadgesRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isVigente ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.3)' }
          ]}>
            <Text style={styles.statusBadgeText}>{client.status}</Text>
          </View>

          {isVisiting && (
            <View style={styles.visitBadge}>
              <Ionicons name="radio-button-on" size={10} color="#4ade80" />
              <Text style={styles.visitBadgeText}>Visita activa</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SectionCard title="Información financiera" icon="wallet-outline" colors={colors} isDark={isDark}>
          <InfoRow label="Límite de crédito" value={`Bs. ${client.credit_limit?.toFixed(2) ?? '0.00'}`} isMoney colors={colors} />
          <InfoRow label="Días de plazo" value={`${client.credit_days ?? 0} días`} colors={colors} />
          <InfoRow label="Saldo actual" value={`Bs. ${client.current_balance?.toFixed(2) ?? '0.00'}`} isMoney highlight={client.current_balance > 0} colors={colors} />
          <InfoRow label="Saldo inicial" value={`Bs. ${client.initial_balance?.toFixed(2) ?? '0.00'}`} isMoney colors={colors} />
        </SectionCard>

        <SectionCard title="Contacto y dirección" icon="call-outline" colors={colors} isDark={isDark}>
          <InfoRow label="Razón social" value={client.business_name || client.name} colors={colors} />
          <InfoRow label="Dirección" value={client.address || 'No registrada'} colors={colors} />
          <InfoRow label="Teléfono" value={client.phones || 'S/N'} colors={colors} />
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FOOTER MANUAL ── */}
      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: isDark ? colors.cardBorder : '#E5E7EB' }]}>
        {!isVisiting ? (
          // SOLO 1 BOTÓN PARA INICIAR MANUALMENTE
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.brandGreen }]}
            onPress={handleStartVisit}
            disabled={visitLoading}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>
              {visitLoading ? 'Registrando ubicación...' : 'Iniciar Visita'}
            </Text>
          </TouchableOpacity>
        ) : (
          // VISITA ACTIVA: MUESTRA LOS DOS BOTONES
          <>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: '#166534' }]}
              onPress={() => router.push(`/pedidos/NuevoPedido?clientId=${client.id}&visitId=${visitId}` as any)}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.footerBtnText}>Nuevo Pedido</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.brandGreen }]}
              onPress={() => setShowEndVisitModal(true)}
              disabled={visitLoading}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.footerBtnText}>Finalizar visita</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── MODAL ORIGINAL FINALIZAR VISITA ── */}
      <Modal
        visible={showEndVisitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndVisitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textMain }]}>Finalizar visita</Text>
            <Text style={[styles.modalLabel, { color: colors.textSub }]}>Resultado</Text>

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
                    visitOutcome === opt.key && { backgroundColor: colors.brandGreen, borderColor: colors.brandGreen },
                  ]}
                  onPress={() => setVisitOutcome(opt.key)}
                >
                  <Ionicons name={opt.icon} size={22} color={visitOutcome === opt.key ? '#fff' : colors.textSub} />
                  <Text style={[styles.outcomeBtnText, { color: visitOutcome === opt.key ? '#fff' : colors.textSub }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSub }]}>Notas (opcional)</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: isDark ? colors.inputBg : '#F9FAFB' }]}
              placeholder="Ej: El dueño no estaba..."
              placeholderTextColor={colors.textSub}
              value={visitNotes}
              onChangeText={setVisitNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnsRow}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDark ? colors.inputBg : '#F3F4F6' }]} onPress={() => setShowEndVisitModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSub }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.brandGreen }]} onPress={handleEndVisit} disabled={visitLoading}>
                {visitLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerIconBtn: { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerCode: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  headerBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  visitBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  visitBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scrollContent: { padding: 16 },
  sectionCard: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  sectionIconBg: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, textAlign: 'right', flex: 1.2, marginLeft: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  footerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  outcomeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  outcomeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  outcomeBtnText: { fontSize: 11, fontWeight: '600' },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalBtnsRow: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
});