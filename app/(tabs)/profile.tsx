import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Estado para Datos Personales
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Solo lectura
  const [role, setRole] = useState('');   // Solo lectura

  // Estado para Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 1. Cargar datos del usuario actual
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login' as any);
        return;
      }

      setEmail(user.email || '');

      // Traer datos de la tabla employees
      const { data, error } = await supabase
        .from('employees')
        .select('full_name, phone, role, job_title')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        // Mostrar job_title si existe, sino el role
        setRole(data.job_title || data.role || 'Empleado');
      }
    } catch (error: any) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil: ' + error.message);
    } finally {
      setFetching(false);
    }
  };

  // 2. Actualizar Información (Nombre y Teléfono)
  const handleUpdateInfo = async () => {
    if (!fullName.trim()) return Alert.alert('Error', 'El nombre es obligatorio');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      // Actualizar tabla employees
      const { error } = await supabase
        .from('employees')
        .update({ 
          full_name: fullName, 
          phone: phone 
        })
        .eq('id', user.id);

      if (error) throw error;

      // Opcional: Actualizar metadata de Auth para mantener consistencia
      await supabase.auth.updateUser({
        data: { full_name: fullName, phone: phone }
      });

      Alert.alert('¡Éxito!', 'Tu información ha sido actualizada.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Actualizar Contraseña
  const handleUpdatePassword = async () => {
    if (!newPassword) return Alert.alert('Error', 'Escribe una contraseña nueva');
    if (newPassword.length < 6) return Alert.alert('Error', 'Mínimo 6 caracteres');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Las contraseñas no coinciden');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert('Seguridad', 'Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login' as any);
          }
        }
      ]
    );
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#2a8c4a" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header con Avatar */}
          <View style={styles.headerProfile}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.headerName}>{fullName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
            <Text style={styles.headerEmail}>{email}</Text>
          </View>

          {/* Tarjeta 1: Información Personal */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#2a8c4a" />
              <Text style={styles.cardTitle}>Mis Datos</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre completo"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono / Celular</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej: 77712345"
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.buttonDisabled]} 
              onPress={handleUpdateInfo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#FFF" style={{marginRight: 8}} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Tarjeta 2: Seguridad */}
          <View style={[styles.card, { marginTop: 20 }]}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="security" size={24} color="#D32F2F" />
              <Text style={styles.cardTitle}>Cambiar Contraseña</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nueva Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, styles.securityButton, loading && styles.buttonDisabled]} 
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>Actualizar Contraseña</Text>
            </TouchableOpacity>
          </View>

          {/* Botón Salir */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{marginRight: 8}} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#2a8c4a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Header Profile
  headerProfile: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a8c4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  headerEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    color: '#2a8c4a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Card Styles
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  // Form Styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  // Buttons
  saveButton: {
    backgroundColor: '#2a8c4a',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  securityButton: {
    backgroundColor: '#455A64',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 30,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
  }
});
