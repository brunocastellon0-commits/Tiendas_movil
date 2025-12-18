import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function RegisterEmployeeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '', 
    phone: '',
    jobTitle: 'Preventista', // Por defecto Preventista
  });

  const handleRegister = async () => {
    // 1. Validaciones básicas locales
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Faltan datos', 'Por favor completa los campos obligatorios.');
      return;
    }

    setLoading(true);

    try {
      // 2. Llamada real a la Edge Function (Backend)
      // Usamos los mismos nombres de variables que definimos en el index.ts del servidor
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          job_title: formData.jobTitle,
          phone: formData.phone
        }
      });

      // 3. Manejo de Errores del Backend
      if (error) {
        // Si el backend (Deno) devuelve error, lanzamos una excepción con ese mensaje
        throw new Error(error.message || 'Ocurrió un error desconocido en el servidor.');
      }

      // 4. Éxito
      Alert.alert(
        '¡Éxito!',
        `El empleado ${formData.fullName} ha sido registrado correctamente y puede iniciar sesión inmediatamente.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      // Muestra el error exacto que venga del Edge Function (ej: "Faltan datos", "Email duplicado")
      Alert.alert('Error de Registro', error.message || 'No se pudo crear el usuario.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <Stack.Screen 
        options={{
          title: 'Nuevo Colaborador',
          headerStyle: { backgroundColor: '#DC2626' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.headerIconContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="person-add" size={40} color="#DC2626" />
          </View>
          <Text style={styles.helperText}>
            Ingresa los datos para dar de alta un nuevo empleado en el sistema.
          </Text>
        </View>

        <View style={styles.form}>
          
          {/* Nombre Completo */}
          <Text style={styles.label}>Nombre Completo *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan Pérez"
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
            />
          </View>

          {/* Cargo */}
          <Text style={styles.label}>Cargo</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="work-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. Preventista"
              value={formData.jobTitle}
              onChangeText={(text) => setFormData({...formData, jobTitle: text})}
            />
          </View>

          {/* Teléfono */}
          <Text style={styles.label}>Teléfono / Celular</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+591 70000000"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
            />
          </View>

          {/* Selector de Cargo/Puesto */}
          <Text style={styles.label}>Cargo / Puesto *</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                formData.jobTitle === 'Preventista' && styles.roleButtonActive
              ]}
              onPress={() => setFormData({...formData, jobTitle: 'Preventista'})}
            >
              <Ionicons 
                name="person" 
                size={20} 
                color={formData.jobTitle === 'Preventista' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.jobTitle === 'Preventista' && styles.roleButtonTextActive
              ]}>
                Preventista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.roleButton, 
                formData.jobTitle === 'Administrador' && styles.roleButtonActive
              ]}
              onPress={() => setFormData({...formData, jobTitle: 'Administrador'})}
            >
              <Ionicons 
                name="shield-checkmark" 
                size={20} 
                color={formData.jobTitle === 'Administrador' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.jobTitle === 'Administrador' && styles.roleButtonTextActive
              ]}>
                Administrador
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Credenciales */}
          <Text style={styles.sectionTitle}>Credenciales de Acceso</Text>

          {/* Email */}
          <Text style={styles.label}>Correo Electrónico *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="empleado@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Contraseña Temporal *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
            />
          </View>

          {/* Botón */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitText}>Procesando...</Text>
            ) : (
              <Text style={styles.submitText}>Registrar Empleado</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  helperText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 15,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 15,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#EF5350',
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});