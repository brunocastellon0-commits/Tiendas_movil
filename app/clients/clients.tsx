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
  View
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ClientCard
//
// Tocar la tarjeta (área principal) → detalle del cliente [id].tsx
//   Desde ahí el usuario inicia visita y crea el pedido (flujo existente).
//
// Botón "Pedido" pequeño (esquina inferior derecha) → también al detalle,
//   pero con el parámetro autoStartVisit=true para que arranque la visita
//   automáticamente y el usuario llegue directo al flujo de pedido.
//
// Botón lápiz  → editar
// Botón basura → solo admin
// ─────────────────────────────────────────────────────────────────────────────
interface ClientCardProps {
  item: Client;
  onPress: () => void;       // toca la tarjeta → detalle
  onEdit: () => void;
  onOrder: () => void;       // botón pedido → detalle con autoStartVisit
  onDelete?: () => void;     // undefined = no se muestra (no admin)
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

      {/* ── Fila principal: ícono + info + botones ── */}
      <View style={styles.cardMain}>

        {/* Área tocable → detalle */}
        <TouchableOpacity style={styles.cardContent} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.avatar, {
            backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#E8F5E9'
          }]}>
            <MaterialCommunityIcons name="storefront" size={22} color={colors.brandGreen} />
          </View>

          <View style={styles.infoContainer}>
            {/* Nombre */}
            <Text style={[styles.nameText, { color: colors.textMain }]} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Código */}
            {item.code ? (
              <View style={[styles.codeChip, {
                backgroundColor: isDark ? 'rgba(42,140,74,0.15)' : '#F0FDF4',
                alignSelf: 'flex-start',
                marginBottom: 3,
              }]}>
                <Text style={[styles.codeText, { color: colors.brandGreen }]}>
                  #{item.code}
                </Text>
              </View>
            ) : null}

            {/* Razón social */}
            <Text style={[styles.subText, { color: colors.textSub }]} numberOfLines={1}>
              {item.business_name || 'Sin Razón Social'}
            </Text>

            {/* Badge + deuda */}
            <View style={styles.tagsRow}>
              <View style={[styles.badge, {
                backgroundColor: isVigente
                  ? (isDark ? 'rgba(46,125,50,0.2)' : '#E8F5E9')
                  : (isDark ? 'rgba(198,40,40,0.2)' : '#FFEBEE'),
              }]}>
                <Text style={[styles.badgeText, { color: isVigente ? '#2E7D32' : '#C62828' }]}>
                  {item.status || 'Inactivo'}
                </Text>
              </View>
              {item.current_balance > 0 && (
                <Text style={[styles.balanceText, { color: '#EAB308' }]}>
                  · Bs {item.current_balance.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Botones icónicos (columna derecha) */}
        <View style={styles.iconBtns}>
          <TouchableOpacity
            onPress={onEdit}
            style={[styles.iconBtn, { backgroundColor: isDark ? colors.inputBg : '#F0F9FF' }]}
          >
            <Ionicons name="pencil" size={15} color="#0284C7" />
          </TouchableOpacity>

          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={[styles.iconBtn, { backgroundColor: isDark ? colors.inputBg : '#FEF2F2', marginTop: 6 }]}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Botón Pedido: pequeño, esquina inferior derecha ── */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          onPress={onOrder}
          style={[styles.orderBtn, { backgroundColor: colors.brandGreen }]}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={13} color="#fff" />
          <Text style={styles.orderBtnText}>Pedido</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');

  const debouncedSearch = useDebounce(search, 350);

  const fetchClients = useCallback(async () => {
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchClients(); }, [fetchClients]));

  const filteredClients = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();

    return clients.filter(c => {
      // Empleado/prevendedor: siempre solo Vigente
      const statusOk = isAdmin
        ? (filterStatus === 'Todos' ||
          (filterStatus === 'Vigente' && c.status === 'Vigente') ||
          (filterStatus === 'Inactivo' && c.status !== 'Vigente'))
        : c.status === 'Vigente';

      if (!statusOk) return false;
      if (!q) return true;

      // Nombre / razón social: busca en cualquier posición
      const matchNombre =
        c.name?.toLowerCase().includes(q) ||
        c.business_name?.toLowerCase().includes(q);

      // Código / NIT: por prefijo (078 → 078-0001, 078-0002...)
      const matchCodigo = c.code?.toLowerCase().startsWith(q);
      const matchNit = c.tax_id?.toLowerCase().startsWith(q);

      return matchNombre || matchCodigo || matchNit;
    });
  }, [clients, debouncedSearch, filterStatus, isAdmin]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Suspender Cliente',
      `¿Suspender a "${name}"?\n\nSus datos se conservan pero quedará inactivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Suspender', style: 'destructive',
          onPress: async () => {
            await clientService.deleteClient(id);
            fetchClients();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <LinearGradient colors={[colors.brandGreen, '#166534']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>

          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cartera de Clientes</Text>
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push('/clients/NuevoCliente')}
                style={[styles.navBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Ionicons name="person-add" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Buscador unificado: nombre + código + NIT en un solo campo */}
          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 14 }]}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre, código o NIT..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs estado: solo admin */}
          {isAdmin && (
            <View style={styles.tabsRow}>
              {(['Todos', 'Vigente', 'Inactivo'] as FilterStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterStatus(s)}
                  style={[
                    styles.tabPill,
                    filterStatus === s
                      ? { backgroundColor: '#fff' }
                      : { backgroundColor: 'rgba(0,0,0,0.2)' }
                  ]}
                >
                  <Text style={[
                    styles.tabText,
                    { color: filterStatus === s ? colors.brandGreen : 'rgba(255,255,255,0.8)' }
                  ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.countChip}>
                <Text style={styles.countText}>{filteredClients.length}</Text>
              </View>
            </View>
          )}

        </SafeAreaView>
      </LinearGradient>

      {/* LISTA */}
      <View style={styles.bodyContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
            <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando cartera...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ClientCard
                item={item}
                // Tocar tarjeta → detalle normal
                onPress={() => router.push(`/clients/${item.id}` as any)}
                onEdit={() => router.push(`/clients/edit/${item.id}` as any)}
                // Botón pedido → detalle con autoStartVisit=true
                // Así llega directo al flujo de visita → pedido que ya existe en [id].tsx
                onOrder={() => router.push(`/clients/${item.id}?autoStartVisit=true` as any)}
                onDelete={isAdmin ? () => handleDelete(item.id, item.name) : undefined}
                colors={colors}
                isDark={isDark}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchClients(); }}
                tintColor={colors.brandGreen}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <FontAwesome5
                  name={search ? 'search' : 'users-slash'}
                  size={40}
                  color={colors.iconGray}
                  style={{ opacity: 0.5 }}
                />
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                  {search ? 'Sin resultados' : 'No hay clientes'}
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textSub }]}>
                  {search ? `No se encontró "${search}"` : 'Agrega tu primer cliente con el botón +'}
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
  headerGradient: {
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 10,
  },
  headerContent: { paddingHorizontal: 20 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 15,
  },
  navBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 15,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', marginLeft: 10 },

  tabsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tabPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },
  countChip: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // BODY
  bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 30, paddingBottom: 40 },

  // CARD
  card: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoContainer: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  codeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  codeText: { fontSize: 11, fontWeight: '700' },
  subText: { fontSize: 12, marginTop: 2, marginBottom: 5 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  balanceText: { fontSize: 11, fontWeight: '600' },

  // Botones icónicos (lápiz / basura)
  iconBtns: { alignItems: 'center', paddingLeft: 8 },
  iconBtn: { padding: 7, borderRadius: 9 },

  // Footer de la tarjeta: botón Pedido alineado a la derecha
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Vacío / carga
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 15, fontSize: 14 },
  emptyView: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '700' },
  emptySubText: { marginTop: 6, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});