import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl, StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

// Servicios
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

// --- COMPONENTE TARJETA ---
const ClientCard = ({ item, onPress, onEdit, onDelete, colors, isDark }: any) => {
  const isVigente = item.status === 'Vigente';

  return (
    <View style={[styles.card, {
      backgroundColor: colors.cardBg,
      borderColor: isDark ? colors.cardBorder : 'transparent',
      borderWidth: isDark ? 1 : 0,
      shadowColor: colors.shadowColor
    }]}>

      {/* Área Principal: Navega al Detalle */}
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarContainer, {
          backgroundColor: isDark ? 'rgba(42, 140, 74, 0.15)' : '#E8F5E9'
        }]}>
          <MaterialCommunityIcons name="storefront" size={24} color={colors.brandGreen} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.nameText, { color: colors.textMain }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.subText, { color: colors.textSub }]} numberOfLines={1}>
            {item.business_name || 'Sin Razón Social'}
          </Text>

          <View style={styles.tagsRow}>
            <View style={[styles.badge, {
              backgroundColor: isVigente ? (isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9') : (isDark ? 'rgba(198, 40, 40, 0.2)' : '#FFEBEE'),
              borderColor: isDark ? colors.cardBorder : 'transparent',
              borderWidth: 1
            }]}>
              <Text style={[styles.badgeText, { color: isVigente ? '#2E7D32' : '#C62828' }]}>
                {item.status || 'Inactivo'}
              </Text>
            </View>
            {item.current_balance > 0 && (
              <Text style={[styles.balanceText, { color: '#EAB308' }]}> • Deuda: Bs {item.current_balance.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Botones de Acción */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={onEdit}
          style={[styles.actionBtn, { backgroundColor: isDark ? colors.inputBg : '#F0F9FF' }]}
        >
          <Ionicons name="pencil" size={18} color="#0284C7" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={[styles.actionBtn, { backgroundColor: isDark ? colors.inputBg : '#FEF2F2', marginTop: 8 }]}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ClientsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Vigente' | 'Inactivo'>('Todos');

  const fetchClients = async () => {
    try {
      // La búsqueda por texto la manejamos en el servicio si es posible, o localmente
      const data = await clientService.getClients(search);
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchClients(); }, [search])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Eliminar Cliente", `¿Suspender a "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Suspender", style: "destructive", onPress: async () => {
          await clientService.deleteClient(id);
          fetchClients();
        }
      }
    ]);
  };

  // Filtrado local por Estado
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus === 'Todos') return true;
      if (filterStatus === 'Vigente') return c.status === 'Vigente';
      if (filterStatus === 'Inactivo') return c.status !== 'Vigente';
      return true;
    });
  }, [clients, filterStatus]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER HERO */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cartera de Clientes</Text>

            {/* Botón Nuevo: Redirige a NuevoCliente */}
            <TouchableOpacity
              onPress={() => router.push('/clients/NuevoCliente')}
              style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Ionicons name="person-add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Buscador */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente, NIT, código..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={search} onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtros (Tabs) */}
          <View style={styles.tabsRow}>
            {(['Todos', 'Vigente', 'Inactivo'] as const).map(status => (
              <TouchableOpacity key={status} onPress={() => setFilterStatus(status)}
                style={[styles.tabPill, filterStatus === status ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={[styles.tabText, { color: filterStatus === status ? colors.brandGreen : 'rgba(255,255,255,0.8)' }]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* LISTA */}
      <View style={styles.bodyContainer}>
        <View style={styles.backgroundShapes}>
          <View style={[styles.shapeCircle, { top: 50, right: -50, width: 200, height: 200, backgroundColor: colors.brandGreen, opacity: colors.bubbleOpacity }]} />
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
            <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando cartera...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ClientCard
                item={item}
                // IR A DETALLE
                onPress={() => router.push(`/clients/${item.id}` as any)}
                // IR A EDITAR (Archivo separado)
                onEdit={() => router.push({ pathname: '/clients/EditarCliente', params: { id: item.id } })}
                onDelete={() => handleDelete(item.id, item.name)}
                colors={colors}
                isDark={isDark}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClients(); }} tintColor={colors.brandGreen} />}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <FontAwesome5 name="users-slash" size={40} color={colors.iconGray} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyText, { color: colors.textSub }]}>No se encontraron clientes</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // HEADER
  headerGradient: { paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
  headerContent: { paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 15 },
  iconBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchSection: { marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 50, paddingHorizontal: 15 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff', marginLeft: 10 },
  tabsRow: { flexDirection: 'row', gap: 10 },
  tabPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },

  // BODY
  bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  shapeCircle: { position: 'absolute', borderRadius: 999 },

  // CARD
  card: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  subText: { fontSize: 13, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  balanceText: { fontSize: 11, marginLeft: 5, fontWeight: '600' },

  actionsContainer: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },
  actionBtn: { padding: 8, borderRadius: 10 },

  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 15, fontSize: 14 },
  emptyView: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
});