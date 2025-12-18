import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

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

  const openMaps = () => {
    if (client?.location) {
      Alert.alert("Mapa", "Aquí abriremos el mapa con las coordenadas: " + client.location);
    } else {
      Alert.alert("Sin ubicación", "Este cliente no tiene coordenadas GPS registradas.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  if (!client) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Rojo tipo Figma */}
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 🗺️ Sección Mapa (Preview) */}
        <View style={styles.mapCard}>
           <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={40} color="#ccc" />
              <Text style={styles.mapText}>Vista previa del mapa</Text>
           </View>
           <View style={styles.mapActions}>
              <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
                <Ionicons name="navigate-circle-outline" size={20} color="#D32F2F" />
                <Text style={styles.mapBtnText}>Ver en mapa</Text>
              </TouchableOpacity>
              <View style={styles.dividerVertical} />
              <TouchableOpacity style={styles.mapBtn}>
                <Ionicons name="storefront-outline" size={20} color="#666" />
                <Text style={styles.mapBtnTextGray}>Clientes cerca</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* 💰 Información Financiera */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💲 Información Financiera</Text>
          
          <InfoRow label="Límite de Crédito" value={`Bs. ${client.credit_limit?.toFixed(2)}`} isMoney />
          <InfoRow label="Días de Plazo" value={`${client.credit_days || 0} días`} />
          <InfoRow label="Saldo Actual" value={`Bs. ${client.current_balance?.toFixed(2)}`} isMoney highlight />
          <InfoRow label="Cuenta Contable" value="110201-001" /> 
        </View>

        {/* 👤 Representante y Contacto */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Contacto</Text>
          <InfoRow label="Dirección" value={client.address || 'No registrada'} />
          <InfoRow label="Teléfono" value={client.phones || 'S/N'} />
          <InfoRow label="NIT/CI" value={client.tax_id || 'S/N'} />
        </View>

      </ScrollView>

      {/* Botones de Acción Fijos Abajo */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.actionBtn, styles.btnRed]}>
           <Text style={styles.btnText}>Crear pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.btnGreen]}>
           <Text style={styles.btnText}>Ver historial</Text>
        </TouchableOpacity>
      </View>
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
      highlight && { color: '#D32F2F' }
    ]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: '#D32F2F',
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

  scrollContent: { padding: 16, paddingBottom: 100 },

  // Map Card
  mapCard: {
    backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, elevation: 3
  },
  mapPlaceholder: { height: 120, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  mapText: { color: '#888', marginTop: 8 },
  mapActions: { flexDirection: 'row', padding: 12 },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapBtnText: { color: '#D32F2F', fontWeight: '600' },
  mapBtnTextGray: { color: '#666', fontWeight: '600' },
  dividerVertical: { width: 1, backgroundColor: '#EEE' },

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
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 6 },
  btnRed: { backgroundColor: '#D32F2F' },
  btnGreen: { backgroundColor: '#388E3C' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
