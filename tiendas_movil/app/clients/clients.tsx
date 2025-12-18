import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

export default function ClientsListScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Cargar datos
  const fetchClients = async () => {
    try {
      const data = await clientService.getClients(search);
      setClients(data);
    } catch (error) {
      console.error(error); // O mostrar un Toast
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🧠 Tech Lead Tip: useFocusEffect hace que la lista se recargue
  // automáticamente cuando regresas de la pantalla "Nuevo Cliente".
  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, []) // Removido 'search' para evitar loops - la búsqueda se maneja con un botón o debounce
  );

  // Efecto para búsqueda con debounce (500ms después de que el usuario deja de escribir)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchClients();
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Función para eliminar cliente (borrado lógico)
  const handleDelete = async (clientId: string, clientName: string) => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro de suspender a "${clientName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Suspender",
          style: "destructive",
          onPress: async () => {
            try {
              await clientService.deleteClient(clientId);
              Alert.alert("Éxito", "Cliente suspendido correctamente");
              fetchClients(); // Recargar la lista
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  // Renderizado de cada item (Tarjeta de Cliente)
  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/clients/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'Vigente' ? '#E8F5E9' : '#FFEBEE' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'Vigente' ? '#2E7D32' : '#C62828' }
            ]}>{item.status}</Text>
          </View>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation(); // Evitar navegar al detalle
              handleDelete(item.id, item.name);
            }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardInfo}>
          <Ionicons name="barcode-outline" size={14} color="#666" /> {item.code}
        </Text>
        <Text style={styles.cardInfo} numberOfLines={1}>
          <Ionicons name="location-outline" size={14} color="#666" /> {item.address || 'Sin dirección'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
         <Text style={styles.balanceLabel}>Saldo:</Text>
         <Text style={[
           styles.balanceValue, 
           { color: item.current_balance > 0 ? '#D32F2F' : '#388E3C' }
         ]}>
           Bs {item.current_balance?.toFixed(2) || '0.00'}
         </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Personalizado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cartera de Clientes</Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#D32F2F" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={clients}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchClients();
            }} colors={['#D32F2F']} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron clientes.</Text>
          }
        />
      )}

      {/* FAB - Botón Flotante para Crear */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/clients/NuevoCliente')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#D32F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  listContent: { padding: 16, paddingBottom: 80 }, // Padding bottom extra para el FAB
  
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#FFEBEE',
  },
  
  cardBody: { marginBottom: 12 },
  cardInfo: { fontSize: 14, color: '#666', marginBottom: 4 },
  
  cardFooter: { 
    borderTopWidth: 1, 
    borderTopColor: '#EEE', 
    paddingTop: 8, 
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  balanceLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  balanceValue: { fontSize: 16, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', marginTop: 40, color: '#999' },

  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#D32F2F',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: {width:0, height:3}
  },
});