import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { clientService } from '../../services/ClienteService';
import { Client } from '../../types/Cliente.interface';

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type FilterStatus = 'Todos' | 'Vigente' | 'Inactivo';

interface ClientCardProps {
  item: Client;
  onPress: () => void;
  onEdit: () => void;
  onOrder: () => void;
  onDelete?: () => void;
  colors: any;
  isDark: boolean;
}

const ClientCard = ({ item, onPress, onEdit, onOrder, onDelete, colors, isDark }: ClientCardProps) => {
  const isVigente = item.status === 'Vigente';

  return (
    <View style={[styles.card, {
      backgroundColor: colors.cardBg,
      borderColor: isDark ? colors.cardBorder : 'transparent',
      borderWidth: isDark ? 1 : 0,
      shadowColor: colors.shadowColor,
    }]}>
      <View style={styles.cardMain}>
        <View style={styles.cardContent}>
          <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#E8F5E9' }]}>
            <MaterialCommunityIcons name="storefront" size={22} color={colors.brandGreen} />
          </View>

          <View style={styles.infoContainer}>
            <Text style={[styles.nameText, { color: colors.textMain }]} numberOfLines={1}>{item.name}</Text>
            {item.code ? (
              <View style={[styles.codeChip, { backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4', alignSelf: 'flex-start', marginBottom: 3 }]}>
                <Text style={[styles.codeText, { color: colors.brandGreen }]}>#{item.code}</Text>
              </View>
            ) : null}
            <Text style={[styles.subText, { color: colors.textSub }]} numberOfLines={1}>{item.business_name || 'Sin Razon Social'}</Text>
            <View style={styles.tagsRow}>
              <View style={[styles.badge, { backgroundColor: isVigente ? (isDark ? 'rgba(46,125,50,0.2)' : '#E8F5E9') : (isDark ? 'rgba(198,40,40,0.2)' : '#FFEBEE') }]}>
                <Text style={[styles.badgeText, { color: isVigente ? '#2E7D32' : '#C62828' }]}>{item.status || 'Inactivo'}</Text>
              </View>
              {item.current_balance > 0 && (
                <Text style={[styles.balanceText, { color: '#EAB308' }]}>· Bs {item.current_balance.toFixed(2)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.iconBtns}>
          <TouchableOpacity onPress={onEdit} style={[styles.iconBtn, { backgroundColor: isDark ? colors.inputBg : '#F0F9FF' }]}>
            <Ionicons name="pencil" size={15} color="#0284C7" />
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: isDark ? colors.inputBg : '#FEF2F2', marginTop: 6 }]}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity onPress={onOrder} style={[styles.orderBtn, { backgroundColor: colors.brandGreen }]} activeOpacity={0.8}>
          <Ionicons name="cart-outline" size={13} color="#fff" />
          <Text style={styles.orderBtnText}>Pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ClientsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');

  const [searchNombre, setSearchNombre] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');

  const debouncedNombre = useDebounce(searchNombre, 350);
  const debouncedCodigo = useDebounce(searchCodigo, 350);

  const fetchClients = useCallback(async () => {
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchClients(); }, [fetchClients]));

  const filteredClients = useMemo(() => {
    const nombre = debouncedNombre.toLowerCase().trim();
    const codigo = debouncedCodigo.toLowerCase().trim();
    return clients.filter(c => {
      const statusOk = filterStatus === 'Todos' || (filterStatus === 'Vigente' && c.status === 'Vigente') || (filterStatus === 'Inactivo' && c.status !== 'Vigente');
      if (!statusOk) return false;
      const cumpleNombre = !nombre || c.name?.toLowerCase().includes(nombre) || c.business_name?.toLowerCase().includes(nombre);
      const cumpleCodigo = !codigo || c.code?.toLowerCase().startsWith(codigo) || c.tax_id?.toLowerCase().startsWith(codigo);
      return cumpleNombre && cumpleCodigo;
    });
  }, [clients, debouncedNombre, debouncedCodigo, filterStatus, isAdmin]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Suspender Cliente', `Suspender a "${name}"?\n\nSus datos se conservan pero quedara inactivo.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Suspender', style: 'destructive', onPress: async () => { await clientService.deleteClient(id); fetchClients(); } },
    ]);
  };

  const hayFiltros = searchNombre || searchCodigo;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgStart }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[colors.brandGreen, '#1e6b38']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Clientes</Text>
            <View style={{ width: 38 }} />
          </View>

          <Text style={styles.searchLabel}>Buscar por nombre</Text>
          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 8 }]}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput style={styles.searchInput} placeholder="Ej: Juan, Tienda del Norte..." placeholderTextColor="rgba(255,255,255,0.55)" value={searchNombre} onChangeText={setSearchNombre} returnKeyType="search" autoCorrect={false} autoCapitalize="words" />
            {searchNombre.length > 0 && <TouchableOpacity onPress={() => setSearchNombre('')}><Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" /></TouchableOpacity>}
          </View>

          <Text style={styles.searchLabel}>Buscar por codigo</Text>
          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 10 }]}>
            <Ionicons name="barcode-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput style={styles.searchInput} placeholder="Ej: 002-095, 078..." placeholderTextColor="rgba(255,255,255,0.55)" value={searchCodigo} onChangeText={setSearchCodigo} returnKeyType="search" autoCorrect={false} autoCapitalize="none" />
            {searchCodigo.length > 0 && <TouchableOpacity onPress={() => setSearchCodigo('')}><Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" /></TouchableOpacity>}
          </View>

          {hayFiltros && (
            <View style={styles.filterRow}>
              <Text style={styles.filterCount}>{filteredClients.length} resultado{filteredClients.length !== 1 ? 's' : ''}</Text>
              <TouchableOpacity onPress={() => { setSearchNombre(''); setSearchCodigo(''); }}>
                <Text style={styles.filterClear}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.tabsRow}>
            {(['Todos', 'Vigente', 'Inactivo'] as FilterStatus[]).map(s => (
              <TouchableOpacity key={s} onPress={() => setFilterStatus(s)} style={[styles.tabPill, filterStatus === s ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={[styles.tabText, { color: filterStatus === s ? colors.brandGreen : 'rgba(255,255,255,0.8)' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.countChip}><Text style={styles.countText}>{filteredClients.length}</Text></View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.bodyContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
            <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ClientCard
                item={item}
                onPress={() => router.push(`/clients/${item.id}` as any)}
                onEdit={() => router.push(`/clients/edit/${item.id}` as any)}
                //AQUÍ SE ARREGLÓ EL AUTO-INICIO: MANDA AL CLIENTE SIN PARÁMETROS RAROS
                onOrder={() => router.push(`/clients/${item.id}` as any)}
                onDelete={isAdmin ? () => handleDelete(item.id, item.name) : undefined}
                colors={colors}
                isDark={isDark}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClients(); }} tintColor={colors.brandGreen} />}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <FontAwesome5 name={hayFiltros ? 'search' : 'users-slash'} size={40} color={colors.iconGray} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>{hayFiltros ? 'Sin resultados' : 'No hay clientes'}</Text>
                <Text style={[styles.emptySubText, { color: colors.textSub }]}>{hayFiltros ? 'Intenta con otros terminos o limpia los filtros' : 'Agrega tu primer cliente'}</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerGradient: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, zIndex: 10 },
  headerContent: { paddingHorizontal: 20 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 14 },
  navBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: 0.5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 46, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', marginLeft: 8 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filterCount: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  filterClear: { color: '#fff', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  tabsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  tabPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },
  countChip: { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bodyContainer: { flex: 1, marginTop: -16, zIndex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  card: { borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  codeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  codeText: { fontSize: 11, fontWeight: '700' },
  subText: { fontSize: 12, marginTop: 2, marginBottom: 5 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  balanceText: { fontSize: 11, fontWeight: '600' },
  iconBtns: { alignItems: 'center', paddingLeft: 8 },
  iconBtn: { padding: 7, borderRadius: 9 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 },
  orderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  orderBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 15, fontSize: 14 },
  emptyView: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700' },
  emptySubText: { marginTop: 6, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});