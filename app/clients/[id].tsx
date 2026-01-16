import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useVisitTracker } from '../../hooks/hookVisita';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

export default function ClientDetailScreen() {
  const { id, autoStartVisit } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hook de visitas
  const { isVisiting, visitId, startVisit, endVisit, loading: visitLoading, startTime } = useVisitTracker();
  
  // Modal para finalizar visita
  const [showEndVisitModal, setShowEndVisitModal] = useState(false);
  const [visitOutcome, setVisitOutcome] = useState<'sale' | 'no_sale' | 'closed'>('sale');
  const [visitNotes, setVisitNotes] = useState('');

  useEffect(() => {
    if (id) fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    const data = await clientService.getClientById(id as string);
    if (data) {
      setClient(data);
    } else {
      Alert.alert("Error", "No se encontró el cliente");
      router.back();
    }
    setLoading(false);
  };

  // Auto-iniciar visita si viene del mapa
  useEffect(() => {
    if (autoStartVisit === 'true' && client && !isVisiting) {
      handleStartVisit();
    }
  }, [client, autoStartVisit]);

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

  const handleCreateOrder = () => {
    if (!client) return;
    
    if (!isVisiting) {
      Alert.alert(
        'Iniciar Visita',
        'Primero debes iniciar una visita antes de crear un pedido.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Iniciar Visita', 
            onPress: async () => {
              await handleStartVisit();
              // Pequeño delay para asegurar que visitId esté disponible
              setTimeout(() => {
                router.push(`/pedidos/NuevoPedido?clientId=${client.id}&visitId=${visitId}`);
              }, 500);
            }
          }
        ]
      );
    } else {
      router.push(`/pedidos/NuevoPedido?clientId=${client.id}&visitId=${visitId}`);
    }
  };

  const openMaps = () => {
    if (client?.location) {
      Alert.alert("Mapa", "Aquí abriremos el mapa con las coordenadas: " + client.location);
    } else {
      Alert.alert("Sin ubicación", "Este cliente no tiene coordenadas GPS registradas.");
    }
  };

  const getVisitDuration = () => {
    if (!startTime) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a8c4a" />
      </View>
    );
  }

  if (!client) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Rojo */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/clients/edit/${client.id}`)}>
            <Ionicons name="pencil" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerTitle}>{client.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{client.status}</Text>
        </View>

        {/* Indicador de visita activa */}
        {isVisiting && (
          <View style={styles.visitBadge}>
            <Ionicons name="time" size={16} color="#fff" />
            <Text style={styles.visitBadgeText}>
              Visita activa • {getVisitDuration()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 🗺️ Sección Mapa (Preview) */}
        <View style={styles.mapCard}>
           <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={40} color="#ccc" />
              <Text style={styles.mapText}>Vista previa del mapa</Text>
           </View>
           <TouchableOpacity style={styles.mapActionCenter} onPress={openMaps}>
             <Ionicons name="navigate-circle-outline" size={20} color="#2a8c4a" />
             <Text style={styles.mapBtnText}>Ver en mapa</Text>
           </TouchableOpacity>
        </View>

        {/* Información Financiera */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💲 Información Financiera</Text>
          
          <InfoRow label="Límite de Crédito" value={`Bs. ${client.credit_limit?.toFixed(2) || '0.00'}`} isMoney />
          <InfoRow label="Días de Plazo" value={`${client.credit_days || 0} días`} />
          <InfoRow label="Saldo Actual" value={`Bs. ${client.current_balance?.toFixed(2) || '0.00'}`} isMoney highlight />
          <InfoRow label="Saldo Inicial" value={`Bs. ${client.initial_balance?.toFixed(2) || '0.00'}`} isMoney />
          {client.accounting_account && <InfoRow label="Cuenta Contable" value={client.accounting_account} />}
        </View>

        {/* 👤 Información de Contacto */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Información de Contacto</Text>
          <InfoRow label="Código" value={client.code || 'S/C'} />
          <InfoRow label="Nombre del Negocio" value={client.business_name || client.name} />
          <InfoRow label="Dirección" value={client.address || 'No registrada'} />
          {client.address_ref_1 && <InfoRow label="Referencia 1" value={client.address_ref_1} />}
          {client.address_ref_2 && <InfoRow label="Referencia 2" value={client.address_ref_2} />}
          {client.address_ref_3 && <InfoRow label="Referencia 3" value={client.address_ref_3} />}
          <InfoRow label="Teléfono" value={client.phones || 'S/N'} />
          <InfoRow label="Fax" value={client.fax || 'S/N'} />
        </View>

        {/* 📋 Información Fiscal y Legal */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Información Fiscal</Text>
          <InfoRow label="NIT/CI" value={client.tax_id || 'S/N'} />
          {client.tax_id_complement && <InfoRow label="Complemento" value={client.tax_id_complement} />}
          {client.representative && <InfoRow label="Representante Legal" value={client.representative} />}
          {client.representative_ci && <InfoRow label="CI Representante" value={client.representative_ci} />}
        </View>

        {/* 🏢 Información del Negocio */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏢 Datos del Negocio</Text>
          {client.zone_name && <InfoRow label="Zona" value={client.zone_name} />}
          {client.branch_name && <InfoRow label="Sucursal" value={client.branch_name} />}
          {client.category && <InfoRow label="Categoría" value={client.category} />}
          {client.city && <InfoRow label="Ciudad" value={client.city} />}
          {client.client_type && <InfoRow label="Tipo de Cliente" value={client.client_type} />}
          {client.document_type && <InfoRow label="Tipo de Documento" value={client.document_type} />}
          {client.payment_method && <InfoRow label="Método de Pago" value={client.payment_method} />}
        </View>

      </ScrollView>

      {/* Botones de Acción Fijos Abajo */}
      <View style={styles.footer}>
        {!isVisiting ? (
          // MODO: Sin visita activa
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnBlue]} 
              onPress={handleStartVisit}
              disabled={visitLoading}
            >
              {visitLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.btnText}>Iniciar Visita</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          // MODO: Visita activa
          <>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnRed]} 
              onPress={handleCreateOrder}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.btnText}>Crear Pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnGreen]}
              onPress={() => setShowEndVisitModal(true)}
              disabled={visitLoading}
            >
              {visitLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.btnText}>Finalizar</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modal para finalizar visita */}
      <Modal
        visible={showEndVisitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndVisitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Visita</Text>
            
            <Text style={styles.modalLabel}>Resultado de la visita:</Text>
            <View style={styles.outcomeButtons}>
              <TouchableOpacity
                style={[styles.outcomeBtn, visitOutcome === 'sale' && styles.outcomeBtnActive]}
                onPress={() => setVisitOutcome('sale')}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={visitOutcome === 'sale' ? '#fff' : '#388E3C'} 
                />
                <Text style={[
                  styles.outcomeBtnText,
                  visitOutcome === 'sale' && styles.outcomeBtnTextActive
                ]}>Venta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, visitOutcome === 'no_sale' && styles.outcomeBtnActive]}
                onPress={() => setVisitOutcome('no_sale')}
              >
                <Ionicons 
                  name="close-circle" 
                  size={24} 
                  color={visitOutcome === 'no_sale' ? '#fff' : '#F59E0B'} 
                />
                <Text style={[
                  styles.outcomeBtnText,
                  visitOutcome === 'no_sale' && styles.outcomeBtnTextActive
                ]}>Sin Venta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outcomeBtn, visitOutcome === 'closed' && styles.outcomeBtnActive]}
                onPress={() => setVisitOutcome('closed')}
              >
                <Ionicons 
                  name="lock-closed" 
                  size={24} 
                  color={visitOutcome === 'closed' ? '#fff' : '#2a8c4a'} 
                />
                <Text style={[
                  styles.outcomeBtnText,
                  visitOutcome === 'closed' && styles.outcomeBtnTextActive
                ]}>Cerrado</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Notas (opcional):</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ej: El dueño no estaba, pidió fiado..."
              value={visitNotes}
              onChangeText={setVisitNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowEndVisitModal(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleEndVisit}
                disabled={visitLoading}
              >
                {visitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Componente auxiliar para filas de info
const InfoRow = ({ label, value, isMoney, highlight }: any) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={[
      styles.value, 
      isMoney && { fontWeight: 'bold' },
      highlight && { color: '#2a8c4a' }
    ]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: '#2a8c4a',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  visitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  scrollContent: { padding: 16, paddingBottom: 100 },

  // Map Card
  mapCard: {
    backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 3
  },
  mapPlaceholder: { height: 120, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  mapText: { color: '#888', marginTop: 8 },
  mapActionCenter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  mapBtnText: { color: '#2a8c4a', fontWeight: '600', fontSize: 15 },

  // Info Card
  sectionCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, elevation: 2
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#333', fontSize: 14, textAlign: 'right', flex: 1, marginLeft: 10 },

  // Footer Buttons
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#EEE'
  },
  actionBtn: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnRed: { backgroundColor: '#2a8c4a' },
  btnGreen: { backgroundColor: '#388E3C' },
  btnBlue: { backgroundColor: '#64c27b' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 10,
  },
  outcomeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  outcomeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  outcomeBtnActive: {
    backgroundColor: '#2a8c4a',
    borderColor: '#2a8c4a',
  },
  outcomeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  outcomeBtnTextActive: {
    color: '#fff',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnConfirm: {
    backgroundColor: '#2a8c4a',
  },
  modalBtnTextCancel: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
