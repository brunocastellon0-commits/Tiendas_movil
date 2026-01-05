import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta a tu cliente
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 1. Definición de Tipos (Coincide con tu DB Real) ---
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

// --- 2. Componente de Tarjeta Individual ---
const EmployeeCard = ({ 
  item, 
  onEdit, 
  onToggleStatus 
}: { 
  item: Employee, 
  onEdit: () => void, 
  onToggleStatus: () => void 
}) => {
  const isEnabled = item.status === 'Habilitado';
  
  // Determinamos el rol a mostrar
  const displayRole = item.job_title || item.role;
  const isAdmin = item.role === 'Administrador' || displayRole === 'Administrador';

  return (
    <View style={[styles.card, !isEnabled && styles.cardDisabled]}>
      {/* Columna Izquierda: Avatar e Info */}
      <View style={styles.cardContent}>
        <View style={[styles.avatarContainer, !isEnabled && { backgroundColor: '#ddd' }]}>
          <Ionicons name="person" size={24} color={isEnabled ? "#666" : "#999"} />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={[styles.nameText, !isEnabled && { color: '#999' }]}>
            {item.full_name}
          </Text>
          <Text style={styles.emailText}>{item.email}</Text>
          
          <View style={styles.tagsContainer}>
            {/* Tag de Rol */}
            <View style={[
              styles.roleTag, 
              isAdmin ? styles.bgDarkGreen : styles.bgLightGray
            ]}>
              <Text style={[
                styles.tagText, 
                isAdmin ? styles.textWhite : styles.textDark
              ]}>
                {displayRole}
              </Text>
            </View>
            
            {/* Tag de Estado */}
            <View style={[
              styles.statusTag, 
              isEnabled ? styles.bgGreenLight : styles.bgRedLight
            ]}>
              <Text style={[
                styles.statusText, 
                isEnabled ? styles.textGreen : styles.textRed
              ]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Columna Derecha: Acciones */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <MaterialIcons name="edit" size={20} color="#555" />
        </TouchableOpacity>
        
        {/* Botón Candado (Toggle) */}
        <TouchableOpacity 
          onPress={onToggleStatus} 
          style={[styles.actionButton, isEnabled ? styles.bgRedLight : styles.bgGreenLight]}
        >
          <MaterialIcons 
            name={isEnabled ? "lock-open" : "lock"} 
            size={20} 
            color={isEnabled ? "#2a8c4a" : "#D32F2F"} // Verde si está abierto, Rojo si está cerrado
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- 3. Componente Principal ---
export default function EmployeeManagementScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Preventista' | 'Administrador'>('Todos');
  
  // --- A. Cargar Empleados (READ) ---
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role, job_title, status, created_at')
        .order('full_name', { ascending: true }); // Orden alfabético es mejor para listas largas

      if (error) throw error;

      if (data) {
        setEmployees(data as Employee[]);
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recargar al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  // --- B. Lógica de Habilitar/Deshabilitar (RPC) ---
  const handleToggleStatus = async (employee: Employee) => {
    // 1. Calcular lógica inversa
    const isCurrentlyEnabled = employee.status === 'Habilitado';
    const newStatus: 'Habilitado' | 'Deshabilitado' = isCurrentlyEnabled ? 'Deshabilitado' : 'Habilitado';
    const actionVerb = isCurrentlyEnabled ? 'DESHABILITAR' : 'HABILITAR';
    const confirmColor = isCurrentlyEnabled ? 'destructive' : 'default';

    // 2. Confirmación UI
    Alert.alert(
      `${actionVerb} ACCESO`,
      `¿Confirmas que deseas ${actionVerb.toLowerCase()} a ${employee.full_name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: `Sí, ${actionVerb.toLowerCase()}`,
          style: confirmColor,
          onPress: async () => {
            try {
              // 3. Llamada Segura a la Base de Datos (RPC)
              const { data, error } = await supabase.rpc('toggle_employee_status', {
                target_employee_id: employee.id,
                new_status: newStatus
              });

              if (error) {
                console.error('Error en toggle_employee_status:', error);
                throw error;
              }

              // 4. Actualización Optimista (Sin recargar toda la lista)
              setEmployees(prev => 
                prev.map(emp => 
                  emp.id === employee.id 
                    ? { ...emp, status: newStatus } 
                    : emp
                )
              );
              Alert.alert("Éxito", `El usuario ahora está ${newStatus}.`);

            } catch (err: any) {
              console.error('Error al cambiar estado:', err);
              Alert.alert("Error", err.message || "No se pudo cambiar el estado.");
            }
          }
        }
      ]
    );
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/edit/${id}` as any);
  };

  // --- C. Filtrado en Tiempo Real ---
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filtro de Texto
      const matchesSearch = 
        emp.full_name.toLowerCase().includes(searchText.toLowerCase()) || 
        emp.email.toLowerCase().includes(searchText.toLowerCase());
      
      // Filtro de Tabs (Role)
      // Normalizamos: Si el filtro es 'Todos', pasa. Si no, debe coincidir con role o job_title
      const roleToCheck = emp.job_title || emp.role;
      // Truco: Si el filtro es "Preventista", aceptamos "vendedor" también
      const effectiveRole = roleToCheck === 'vendedor' ? 'Preventista' : roleToCheck;
      
      const matchesRole = activeFilter === 'Todos' || effectiveRole === activeFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [employees, searchText, activeFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Equipo</Text>
        <TouchableOpacity onPress={() => router.push('/admin/RegistrarEmpleado' as any)}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o correo"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs de Filtro */}
        <View style={styles.tabsContainer}>
          {(['Todos', 'Preventista', 'Administrador'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeFilter === tab && styles.activeTab]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text style={[styles.tabText, activeFilter === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2a8c4a" />
            <Text style={styles.loadingText}>Cargando equipo...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EmployeeCard 
                item={item} 
                onEdit={() => handleEdit(item.id)}
                onToggleStatus={() => handleToggleStatus(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEmployees(); }} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No se encontraron resultados</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --- 4. Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2a8c4a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  activeTab: {
    backgroundColor: '#2a8c4a',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
  // --- Estilos de Tarjeta ---
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.7, // Efecto visual para deshabilitados
    backgroundColor: '#F9F9F9'
  },
  cardContent: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  bgDarkGreen: { backgroundColor: '#2a8c4a' },
  bgLightGray: { backgroundColor: '#F0F0F0' },
  bgGreenLight: { backgroundColor: '#E8F5E9' },
  bgRedLight: { backgroundColor: '#FFEBEE' },
  
  tagText: { fontSize: 11, fontWeight: 'bold' },
  textWhite: { color: '#FFF' },
  textDark: { color: '#333' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  textGreen: { color: '#2a8c4a' },
  textRed: { color: '#C62828' },

  // Acciones
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginLeft: 8,
  },
});