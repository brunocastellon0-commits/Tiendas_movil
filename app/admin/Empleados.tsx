import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// 1. IMPORTACIONES DE ICONOS
// Importamos MaterialCommunityIcons para iconos específicos de roles (ej. shield-account)
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta a tu cliente
// Hook para acceder a los colores del tema (Dark/Light)
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

// --- 2. DEFINICIÓN DE TIPOS ---
// Estructura de datos que esperamos recibir de Supabase
interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'Administrador' | 'Preventista' | 'Auditor' | 'vendedor';
  job_title?: string;
  // El status ahora es estricto según tu CHECK constraint
  status: 'Habilitado' | 'Deshabilitado' | 'Vacaciones';
  created_at: string;
}


// --- 3. COMPONENTE TARJETA DE EMPLEADO ---
// Este componente renderiza cada fila de la lista.
// Recibe el objeto 'item' (empleado), la función 'onEdit' y los colores actuales.
const EmployeeCard = ({
  item,
  onEdit,
  colors,
  isDark
}: {
  item: Employee,
  onEdit: () => void,
  colors: any,
  isDark: boolean
}) => {

  // Lógica para elegir el icono según el rol:
  // - Administrador: Usamos un escudo ('shield-account')
  // - Otros: Usamos una persona con corbata ('account-tie')
  const roleIcon = item.role === 'Administrador' || item.job_title === 'Administrador'
    ? 'shield-account'
    : 'account-tie';

  return (
    // Contenedor principal de la tarjeta con estilos dinámicos según el tema
    <View style={[styles.card, {
      backgroundColor: colors.cardBg, // Color de fondo de tarjeta
      borderColor: isDark ? colors.cardBorder : 'transparent', // Borde solo en modo oscuro
      borderWidth: isDark ? 1 : 0,
      shadowColor: colors.shadowColor // Sombra adaptada
    }]}>

      {/* SECCIÓN IZQUIERDA: ICONO DE ROL */}
      <View style={[styles.avatarContainer, {
        backgroundColor: isDark ? 'rgba(42, 140, 74, 0.15)' : '#E8F5E9' // Fondo verde suave
      }]}>
        {/* Aquí usamos MaterialCommunityIcons para evitar el error de "icon not found" */}
        <MaterialCommunityIcons name={roleIcon} size={28} color={colors.brandGreen} />
      </View>

      {/* SECCIÓN CENTRAL: INFORMACIÓN TEXTUAL */}
      <View style={styles.infoContainer}>
        <Text style={[styles.nameText, { color: colors.textMain }]} numberOfLines={1}>
          {item.full_name}
        </Text>
        <Text style={[styles.emailText, { color: colors.textSub }]} numberOfLines={1}>
          {item.email}
        </Text>

        {/* Badge (Etiqueta) con el cargo */}
        <View style={styles.tagsRow}>
          <View style={[styles.badge, {
            backgroundColor: isDark ? colors.inputBg : '#F1F5F9',
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: 1
          }]}>
            <Text style={[styles.badgeText, { color: colors.textSub }]}>
              {item.job_title || (item.role === 'vendedor' ? 'Preventista' : item.role)}
            </Text>
          </View>
        </View>
      </View>

      {/* SECCIÓN DERECHA: BOTÓN EDITAR */}
      <TouchableOpacity
        onPress={onEdit}
        style={[styles.editBtn, { backgroundColor: isDark ? colors.inputBg : '#F8FAFC' }]}
      >
        <MaterialIcons name="edit" size={20} color={colors.brandGreen} />
      </TouchableOpacity>
    </View>
  );
};

// --- 4. PANTALLA PRINCIPAL (GESTIÓN DE EMPLEADOS) ---
export default function EmployeeManagementScreen() {
  const { colors, isDark } = useTheme(); // Obtenemos colores globales
  const router = useRouter(); // Para navegar

  // Estados locales
  const [employees, setEmployees] = useState<Employee[]>([]); // Lista completa
  const [loading, setLoading] = useState(true); // Indicador de carga
  const [refreshing, setRefreshing] = useState(false); // Estado de pull-to-refresh
  const [searchText, setSearchText] = useState(''); // Texto del buscador
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Preventista' | 'Administrador'>('Todos'); // Filtro activo
  const [refreshing, setRefreshing] = useState(false); // Estado de refresh

  // --- FUNCIÓN PARA CARGAR DATOS ---
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Consulta a Supabase: Trae todos los empleados ordenados por fecha
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role, job_title, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setEmployees(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // useFocusEffect recarga la lista cada vez que entramos a esta pantalla
  // (útil si volvemos de registrar un empleado nuevo)
  useFocusEffect(useCallback(() => { fetchEmployees(); }, []));

  // --- LÓGICA DE FILTRADO (MEMOIZADA) ---
  // Filtra la lista en tiempo real según el texto de búsqueda Y el tab seleccionado
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Filtro por texto (nombre o email)
      const matchesSearch = emp.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchText.toLowerCase());

      // 2. Filtro por Rol (Tab)
      // Normalizamos 'vendedor' a 'Preventista' para efectos visuales
      const displayRole = emp.job_title || (emp.role === 'vendedor' ? 'Preventista' : emp.role);
      const matchesRole = activeFilter === 'Todos' || displayRole === activeFilter;

      return matchesSearch && matchesRole;
    });
  }, [employees, searchText, activeFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* --- A. ENCABEZADO CURVO CON DEGRADADO --- */}
      <LinearGradient
        colors={[colors.brandGreen, '#166534']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>

          {/* Fila Superior: Botón Atrás, Título y Botones de Acción */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Equipo de Trabajo</Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Botón Ver Empleados en Línea */}
              <TouchableOpacity
                onPress={() => router.push('/admin/EmpleadosEnLinea' as any)}
                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Ionicons name="navigate" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Botón Agregar Empleado */}
              <TouchableOpacity
                onPress={() => router.push('/admin/RegistrarEmpleado' as any)}
                style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>


          {/* Buscador: Integrado visualmente dentro del área verde */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o correo..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchText}
                onChangeText={setSearchText}
              />
              {/* Botón 'X' para limpiar búsqueda */}
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtros (Tabs): Cápsulas seleccionables */}
          <View style={styles.tabsRow}>
            {(['Todos', 'Preventista', 'Administrador'] as const).map((tab) => {
              const isActive = activeFilter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabPill,
                    // Si está activo es blanco, si no es semitransparente
                    isActive ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.2)' }
                  ]}
                  onPress={() => setActiveFilter(tab)}
                >
                  <Text style={[
                    styles.tabText,
                    // Texto verde si está activo, blanco si no
                    isActive ? { color: colors.brandGreen } : { color: 'rgba(255,255,255,0.8)' }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </SafeAreaView>
      </LinearGradient>

      {/* --- B. CUERPO DE LA LISTA --- */}
      <View style={styles.bodyContainer}>
        {/* Fondo Decorativo (Bolitas) para dar continuidad */}
        <View style={styles.backgroundShapes}>
          <View style={[styles.shapeCircle, {
            top: 50, right: -50, width: 200, height: 200,
            backgroundColor: colors.brandGreen,
            opacity: colors.bubbleOpacity
          }]} />
        </View>

        {loading ? (
          // Estado de Carga
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={colors.brandGreen} />
            <Text style={[styles.loadingText, { color: colors.textSub }]}>Cargando equipo...</Text>
          </View>
        ) : (
          // Lista de Resultados
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            // Renderizamos cada tarjeta pasándole props de tema
            renderItem={({ item }) => (
              <EmployeeCard
                item={item}
                onEdit={() => router.push(`/admin/edit/${item.id}` as any)}
                colors={colors}
                isDark={isDark}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            // Estado Vacío (si no hay resultados)
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.inputBg : '#F1F5F9' }]}>
                  <FontAwesome5 name="users-slash" size={32} color={colors.iconGray} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Sin resultados</Text>
                <Text style={[styles.emptySub, { color: colors.textSub }]}>
                  No encontramos empleados con ese criterio.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

// --- 5. ESTILOS ---
const styles = StyleSheet.create({
  // HEADER
  headerGradient: {
    paddingBottom: 25,
    borderBottomLeftRadius: 30, // Curva inferior izquierda
    borderBottomRightRadius: 30, // Curva inferior derecha
    zIndex: 10, // Para que la sombra caiga sobre la lista
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Separa Atrás - Título - Agregar
    marginTop: 10,
    marginBottom: 20,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  // BUSCADOR
  searchSection: {
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },

  // FILTROS (TABS)
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // CUERPO & LISTA
  bodyContainer: {
    flex: 1,
    marginTop: -20, // Efecto "overlap": la lista empieza un poco encima de la curva
    zIndex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 30, // Espacio extra arriba por el overlap
    paddingBottom: 40,
  },

  // DECORACIÓN FONDO
  backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  shapeCircle: { position: 'absolute', borderRadius: 999 },

  // TARJETA EMPLEADO
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    // Sombras sutiles
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 48, height: 48,
    borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  editBtn: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 10,
  },

  // ESTADOS (LOADING / EMPTY)
  centerView: {
    flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50
  },
  loadingText: { marginTop: 15, fontSize: 14 },

  emptyView: {
    alignItems: 'center', marginTop: 60, opacity: 0.8
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15
  },
  emptyTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 5
  },
  emptySub: {
    fontSize: 14, textAlign: 'center'
  }
});
