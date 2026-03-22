import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
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
const ClientCard = ({ item, onPress, colors, isDark }: any) => {
  const isVigente = item.status === 'Vigente';

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.cardBg,
        borderColor: isDark ? colors.cardBorder : '#E2E8F0',
        borderWidth: 1,
        shadowColor: colors.shadowColor
      }]}
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
        {/* Mostrar código en lugar de razón social */}
        <Text style={[styles.subText, { color: colors.textSub }]} numberOfLines={1}>
          {item.code ? `Cód. ${item.code}` : 'Sin código'}
        </Text>

        <View style={styles.tagsRow}>
          <View style={[styles.badge, {
            backgroundColor: isVigente
              ? (isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9')
              : (isDark ? 'rgba(198, 40, 40, 0.2)' : '#FFEBEE'),
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: 1
          }]}>
            <Text style={[styles.badgeText, { color: isVigente ? '#2E7D32' : '#C62828' }]}>
              {item.status || 'Inactivo'}
            </Text>
          </View>
          {item.current_balance > 0 && (
            <Text style={[styles.balanceText, { color: '#EAB308' }]}>
              {' '}• Deuda: Bs {item.current_balance.toFixed(2)}
            </Text>
          )}
        </View>
      </View>

      {/* Solo ícono de flecha — sin editar/eliminar */}
      <Ionicons name="chevron-forward" size={20} color={colors.textSub} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function ClientsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Vigente' | 'Inactivo'>('Todos');

  const fetchClients = async () => {
    try {
      // Cargamos todos los clientes; el filtrado es local
      const data = await clientService.getClients('');
      setClients(data);
    } catch (error) {
      // silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchClients(); }, [])
  );

  // Normaliza acentos: "áré" → "are" para comparar sin importar tildes ni mayúsculas
  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Filtrado local tolerante: trim, lowercase, sin acentos, búsqueda parcial
  const filteredClients = useMemo(() => {
    const codeTerm = normalize(searchCode);
    const nameTerm = normalize(searchName);

    return clients.filter(c => {
      // Filtro de estado
      if (filterStatus === 'Vigente' && c.status !== 'Vigente') return false;
      if (filterStatus === 'Inactivo' && c.status === 'Vigente') return false;

      // Filtro por código (normalizado)
      if (codeTerm && !normalize(c.code || '').includes(codeTerm)) return false;

      // Filtro por nombre (normalizado)
      if (nameTerm && !normalize(c.name || '').includes(nameTerm)) return false;

      return true;
    });
  }, [clients, filterStatus, searchCode, searchName]);

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
            <View style={{ width: 40 }} />
          </View>

          {/* BUSCADORES DUALES */}
          <View style={styles.searchSection}>
            {/* Buscador por Código */}
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 8 }]}>
              <Ionicons name="barcode-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por código..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchCode}
                onChangeText={setSearchCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchCode.length > 0 && (
                <TouchableOpacity onPress={() => setSearchCode('')}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Buscador por Nombre */}
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchName}
                onChangeText={setSearchName}
                autoCorrect={false}
              />
              {searchName.length > 0 && (
                <TouchableOpacity onPress={() => setSearchName('')}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtros de Estado */}
          <View style={styles.tabsRow}>
            {(['Todos', 'Vigente', 'Inactivo'] as const).map(status => (
              <TouchableOpacity key={status} onPress={() => setFilterStatus(status)}
                style={[styles.tabPill, filterStatus === status ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={[styles.tabText, { color: filterStatus === status ? colors.brandGreen : 'rgba(255,255,255,0.8)' }]}>{status}</Text>
              </TouchableOpacity>
            ))}
            {/* Contador de resultados */}
            <View style={[styles.tabPill, { backgroundColor: 'rgba(0,0,0,0.3)', marginLeft: 'auto' }]}>
              <Text style={[styles.tabText, { color: 'rgba(255,255,255,0.7)' }]}>{filteredClients.length}</Text>
            </View>
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
                onPress={() => router.push(`/clients/${item.id}` as any)}
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
                <Text style={[styles.emptyText, { color: colors.textSub }]}>
                  {(searchCode || searchName) ? 'No se encontraron clientes con esos filtros' : 'No hay clientes disponibles'}
                </Text>
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
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
  headerContent: { paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 15 },
  iconBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchSection: { marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 46, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', marginLeft: 10 },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'center' },
  tabPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  tabText: { fontSize: 12, fontWeight: '600' },

  // BODY
  bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  shapeCircle: { position: 'absolute', borderRadius: 999 },

  // CARD
  card: { borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatarContainer: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subText: { fontSize: 12, marginBottom: 5 },
  tagsRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  balanceText: { fontSize: 11, fontWeight: '600' },

  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 15, fontSize: 14 },
  emptyView: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { marginTop: 10, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
});
