import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 1. Definición de Tipos ---
interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'Administrador' | 'Preventista' | 'vendedor'; // Agregado vendedor
  job_title?: string; // Opcional
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
  onToggleStatus?: () => void 
}) => {
  // En la tabla real no existe is_active, todos están activos
  const isActive = true;
  
  return (
    <View style={styles.card}>
      {/* Columna Izquierda: Avatar e Info */}
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={24} color="#666" />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.full_name}</Text>
          <Text style={styles.emailText}>{item.email}</Text>
          
          <View style={styles.tagsContainer}>
            {/* Tag de Rol */}
            <View style={[
              styles.roleTag, 
              (item.role === 'Administrador' || item.job_title === 'Administrador') 
                ? styles.bgDarkGreen 
                : styles.bgLightGray
            ]}>
              <Text style={[
                styles.tagText, 
                (item.role === 'Administrador' || item.job_title === 'Administrador') 
                  ? styles.textWhite 
                  : styles.textDark
              ]}>
                {item.job_title || (item.role === 'vendedor' ? 'Preventista' : item.role)}
              </Text>
            </View>
            
            {/* Tag de Estado */}
            <View style={[styles.statusTag, isActive ? styles.bgGreenLight : styles.bgRedLight]}>
              <Text style={[styles.statusText, isActive ? styles.textGreen : styles.textRed]}>
                {isActive ? 'Activo' : 'Inactivo'}
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
      </View>
    </View>
  );
};

// --- 3. Componente Principal ---
export default function EmployeeManagementScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Preventista' | 'Administrador'>('Todos');
  
  // Función para cargar empleados
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role, job_title, created_at')
        .order('created_at', { ascending: false });

      console.log('=== DEBUG EMPLEADOS ===');
      console.log('Error:', error);
      console.log('Data recibida:', data);
      console.log('Cantidad de empleados:', data?.length);

      if (error) {
        console.error('Error cargando empleados:', error);
        Alert.alert('Error', 'No se pudieron cargar los empleados: ' + error.message);
        return;
      }

      if (data) {
        console.log('Empleados cargados exitosamente:', data.length);
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los empleados');
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  // Lógica de filtrado optimizada
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.full_name.toLowerCase().includes(searchText.toLowerCase()) || 
                            emp.email.toLowerCase().includes(searchText.toLowerCase());
      
      // Mapear vendedor a Preventista para el filtro
      const displayRole = emp.job_title || (emp.role === 'vendedor' ? 'Preventista' : emp.role);
      const matchesRole = activeFilter === 'Todos' || displayRole === activeFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [employees, searchText, activeFilter]);

  const handleEdit = (id: string) => {
    // Navegar a pantalla de edición
    router.push(`/admin/edit/${id}` as any);
  };

  const handleToggleStatus = async (employee: Employee) => {
    // Función deshabilitada - no existe is_active en la tabla
    Alert.alert(
      'Función no disponible',
      'La funcionalidad de habilitar/deshabilitar empleados no está implementada en la base de datos actual.'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Empleados</Text>
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
            <Text style={styles.loadingText}>Cargando empleados...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EmployeeCard 
                item={item} 
                onEdit={() => handleEdit(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No se encontraron empleados</Text>
                <Text style={styles.emptySubtext}>
                  {searchText || activeFilter !== 'Todos' 
                    ? 'Intenta con otros filtros'
                    : 'Agrega empleados para comenzar'
                  }
                </Text>
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
  // Header
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
  // Body
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Search
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
  // Tabs
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
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  // List
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Card Styles
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
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
  textRed: { color: '#EF5350' },

  // Actions
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
  lockButton: {
    backgroundColor: '#FFF0F0',
  }
});
