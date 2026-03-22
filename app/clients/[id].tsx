import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      Alert.alert('Error', 'No se encontró el cliente');
      router.back();
    }
    setLoading(false);
  };

  const handleCreateOrder = () => {
    if (!client) return;
    router.push(`/pedidos/NuevoPedido?clientId=${client.id}`);
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

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.headerTitle}>{client.name}</Text>

          {client.code ? (
            <View style={styles.codeBadge}>
              <Ionicons name="barcode-outline" size={13} color="#166534" />
              <Text style={styles.codeBadgeText}>{client.code}</Text>
            </View>
          ) : null}

          <View style={[styles.badge, { backgroundColor: client.status === 'Vigente' ? '#E8F5E9' : '#FEE2E2' }]}>
            <Text style={[styles.badgeText, { color: client.status === 'Vigente' ? '#2E7D32' : '#991B1B' }]}>
              {client.status}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Información de Contacto (simplificada) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Información del Cliente</Text>

          <InfoRow label="Nombre" value={client.name} />
          <InfoRow label="Código" value={client.code || 'Sin código'} />
          <InfoRow label="Dirección" value={client.address || 'No registrada'} />
          {client.phones ? <InfoRow label="Teléfono" value={client.phones} /> : null}
        </View>

      </ScrollView>

      {/* Footer: solo Crear Pedido */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnGreen]}
          onPress={handleCreateOrder}
        >
          <Ionicons name="cart" size={22} color="#fff" />
          <Text style={styles.btnText}>Crear Pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Componente auxiliar para filas de info
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#2a8c4a',
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  codeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8,
  },
  codeBadgeText: { color: '#166534', fontWeight: '700', fontSize: 13 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },

  scrollContent: { padding: 16, paddingBottom: 110 },

  sectionCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  label: { color: '#888', fontSize: 14, flex: 0.45 },
  value: { color: '#1F2937', fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 0.55 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#EEE',
    paddingBottom: 28,
  },
  actionBtn: {
    padding: 16, borderRadius: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  btnGreen: { backgroundColor: '#2a8c4a' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 17 },
});
