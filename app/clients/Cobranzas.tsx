import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface Cobranza {
  id: string;
  fecha: string;
  tipo: string;
  numero: string;
  cliente: string;
  zona: string;
  vendedor: string;
  total: number;
  cobrado: number;
  saldo: number;
  estado: string;
}

export default function CobranzasScreen() {
  const router = useRouter();
  const { session, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();

  const [cobranzas, setCobranzas] = useState<Cobranza[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // Filtros solo para admin
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [showVendedorFilter, setShowVendedorFilter] = useState(false);

  // Totales
  const [totales, setTotales] = useState({
    total: 0,
    cobrado: 0,
    saldo: 0
  });

  // Cargar vendedores (solo para admin)
  useEffect(() => {
    if (isAdmin) {
      loadVendedores();
    }
  }, [isAdmin]);

  const loadVendedores = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name');
    
    if (data) {
      setVendedores(data);
    }
  };

  // Cargar cobranzas
  useEffect(() => {
    loadCobranzas();
  }, [selectedVendedor, fechaDesde, fechaHasta]);

  const loadCobranzas = async () => {
    try {
      setLoading(true);
      
      if (!session?.user) return;

      // Query de pedidos con saldo pendiente (solo créditos pendientes)
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          crated_at,
          total_venta,
          estado,
          tipo_pago,
          clients!clients_id (
            name
          ),
          employees!empleado_id (
            full_name
          )
        `)
        .eq('estado', 'Pendiente') // Solo pedidos pendientes de pago
        .order('crated_at', { ascending: false });

      // Filtrar por vendedor si NO es admin
      if (!isAdmin) {
        query = query.eq('empleado_id', session.user.id);
      } else if (selectedVendedor) {
        // Si es admin y seleccionó un vendedor
        query = query.eq('empleado_id', selectedVendedor);
      }

      // Filtros de fecha
      if (fechaDesde) {
        query = query.gte('crated_at', `${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        query = query.lte('crated_at', `${fechaHasta}T23:59:59`);
      }

      const { data, error } = await query;

      console.log('📊 Cobranzas cargadas:', {
        isAdmin,
        count: data?.length || 0,
        error: error?.message
      });

      if (error) {
        console.error('Error:', error);
        return;
      }

      if (data) {
        // Formatear datos
        const cobranzasFormateadas: Cobranza[] = data.map(pedido => {
          const cliente = Array.isArray(pedido.clients) ? pedido.clients[0] : pedido.clients;
          const empleado = Array.isArray(pedido.employees) ? pedido.employees[0] : pedido.employees;
          
          // Por ahora asumimos que todo está pendiente de cobro
          const total = pedido.total_venta || 0;
          const cobrado = 0; // TODO: Implementar lógica de pagos
          const saldo = total - cobrado;

          return {
            id: pedido.id,
            fecha: new Date(pedido.crated_at).toLocaleDateString('es-BO'),
            tipo: 'VD', // Venta Directa
            numero: pedido.id.slice(0, 8),
            cliente: cliente?.name || 'Sin nombre',
            zona: 'N/A', // TODO: Implementar zonas
            vendedor: empleado?.full_name || 'Desconocido',
            total,
            cobrado,
            saldo,
            estado: pedido.estado || 'pendiente'
          };
        });

        setCobranzas(cobranzasFormateadas);

        // Calcular totales
        const totals = cobranzasFormateadas.reduce(
          (acc, item) => ({
            total: acc.total + item.total,
            cobrado: acc.cobrado + item.cobrado,
            saldo: acc.saldo + item.saldo
          }),
          { total: 0, cobrado: 0, saldo: 0 }
        );
        setTotales(totals);
      }
    } catch (error) {
      console.error('Error cargando cobranzas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCobranza = ({ item }: { item: Cobranza }) => (
    <View style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
      <Text style={[styles.cell, styles.cellFecha, { color: colors.textMain }]}>
        {item.fecha}
      </Text>
      <Text style={[styles.cell, styles.cellTipo, { color: colors.textMain }]}>
        {item.tipo}
      </Text>
      <Text style={[styles.cell, styles.cellCliente, { color: colors.textMain }]} numberOfLines={1}>
        {item.cliente}
      </Text>
      <Text style={[styles.cell, styles.cellVendedor, { color: colors.textSub }]} numberOfLines={1}>
        {item.vendedor}
      </Text>
      <Text style={[styles.cell, styles.cellMonto, { color: colors.textMain }]}>
        Bs {item.total.toFixed(2)}
      </Text>
      <Text style={[styles.cell, styles.cellMonto, { color: '#10B981' }]}>
        Bs {item.cobrado.toFixed(2)}
      </Text>
      <Text style={[styles.cell, styles.cellMonto, { color: item.saldo > 0 ? '#EF4444' : '#10B981' }]}>
        Bs {item.saldo.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgStart }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.brandGreen }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reporte de Cobranzas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filtros */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.cardBg }]}>
        {/* Filtro de vendedor (solo admin) */}
        {isAdmin && vendedores.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textSub }]}>Vendedor:</Text>
            <TouchableOpacity
              style={[styles.filterButton, { borderColor: colors.cardBorder }]}
              onPress={() => setShowVendedorFilter(!showVendedorFilter)}
            >
              <Text style={[styles.filterButtonText, { color: colors.textMain }]}>
                {selectedVendedor
                  ? vendedores.find(v => v.id === selectedVendedor)?.full_name || 'Todos'
                  : 'Todos los vendedores'}
              </Text>
              <Ionicons
                name={showVendedorFilter ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSub}
              />
            </TouchableOpacity>

            {showVendedorFilter && (
              <View style={[styles.dropdown, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedVendedor(null);
                    setShowVendedorFilter(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: !selectedVendedor ? colors.brandGreen : colors.textMain }]}>
                    Todos los vendedores
                  </Text>
                </TouchableOpacity>
                {vendedores.map(vendedor => (
                  <TouchableOpacity
                    key={vendedor.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedVendedor(vendedor.id);
                      setShowVendedorFilter(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: selectedVendedor === vendedor.id ? colors.brandGreen : colors.textMain }]}>
                      {vendedor.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Botón Filtrar */}
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.brandGreen }]}
          onPress={loadCobranzas}
        >
          <Ionicons name="search" size={20} color="#FFF" />
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabla */}
      <View style={[styles.tableContainer, { backgroundColor: colors.cardBg }]}>
        {/* Header de tabla */}
        <View style={[styles.tableHeader, { backgroundColor: isDark ? colors.cardBorder : '#F3F4F6' }]}>
          <Text style={[styles.headerCell, styles.cellFecha, { color: colors.textMain }]}>Fecha</Text>
          <Text style={[styles.headerCell, styles.cellTipo, { color: colors.textMain }]}>Tipo</Text>
          <Text style={[styles.headerCell, styles.cellCliente, { color: colors.textMain }]}>Cliente</Text>
          <Text style={[styles.headerCell, styles.cellVendedor, { color: colors.textMain }]}>Vendedor</Text>
          <Text style={[styles.headerCell, styles.cellMonto, { color: colors.textMain }]}>Total</Text>
          <Text style={[styles.headerCell, styles.cellMonto, { color: colors.textMain }]}>Cobrado</Text>
          <Text style={[styles.headerCell, styles.cellMonto, { color: colors.textMain }]}>Saldo</Text>
        </View>

        {/* Contenido */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
          </View>
        ) : (
          <>
            <FlatList
              data={cobranzas}
              renderItem={renderCobranza}
              keyExtractor={item => item.id}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSub }]}>
                    No hay cobranzas para mostrar
                  </Text>
                </View>
              }
            />

            {/* Footer con totales */}
            {cobranzas.length > 0 && (
              <View style={[styles.totalRow, { backgroundColor: isDark ? colors.cardBorder : '#F9FAFB', borderTopColor: colors.cardBorder }]}>
                <Text style={[styles.totalLabel, { color: colors.textMain }]}>TOTAL</Text>
                <Text style={[styles.totalValue, { color: colors.textMain }]}>
                  Bs {totales.total.toFixed(2)}
                </Text>
                <Text style={[styles.totalValue, { color: '#10B981' }]}>
                  Bs {totales.cobrado.toFixed(2)}
                </Text>
                <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                  Bs {totales.saldo.toFixed(2)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  filtersContainer: {
    padding: 15,
    gap: 10,
  },
  filterGroup: {
    gap: 5,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  filterButtonText: {
    fontSize: 14,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownText: {
    fontSize: 14,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  cell: {
    fontSize: 11, // Reducido para que quepa mejor
  },
  cellFecha: {
    width: 65, // Más compacto
  },
  cellTipo: {
    width: 35,
  },
  cellCliente: {
    flex: 1, //toma el espacio restante
    paddingRight: 5,
  },
  cellVendedor: {
    width: 80, // Más compacto
  },
  cellMonto: {
    width: 70, // Más compacto
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 2,
    alignItems: 'center',
  },
  totalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    width: 70, // Igual que cellMonto
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});
