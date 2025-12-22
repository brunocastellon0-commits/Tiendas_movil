import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'Administrador' | 'Preventista';
  phone?: string;
}

export default function EditEmployeeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'Preventista' as 'Administrador' | 'Preventista',
  });

  // Cargar datos del empleado
  useEffect(() => {
    if (id) {
      loadEmployee();
    }
  }, [id]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role, phone')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error cargando empleado:', error);
        Alert.alert('Error', 'No se pudo cargar la información del empleado', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      if (data) {
        setEmployee(data);
        setFormData({
          fullName: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'Preventista',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    // 1. Validaciones básicas
    if (!formData.fullName || !formData.email) {
      Alert.alert('Faltan datos', 'El nombre y email son obligatorios.');
      return;
    }

    // 2. Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Email inválido', 'Por favor ingresa un email válido.');
      return;
    }

    setSaving(true);

    try {
      // 3. Actualizar en la tabla employees
      console.log('Intentando actualizar empleado:', id);
      console.log('Datos a actualizar:', {
        full_name: formData.fullName,
        phone: formData.phone || null,
        role: formData.role,
        job_title: formData.role,
      });

      const { data: updateData, error: updateError, count } = await supabase
        .from('employees')
        .update({
          full_name: formData.fullName,
          phone: formData.phone || null,
          role: formData.role,
          job_title: formData.role, // Sincronizar job_title con role
        })
        .eq('id', id)
        .select();

      console.log('Resultado update:', { 
        error: updateError, 
        rowsAffected: updateData?.length,
        data: updateData 
      });

      if (updateError) {
        console.error('Error completo:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        throw new Error('No se actualizó ningún registro. Verifica las políticas RLS en Supabase.');
      }

      console.log('✅ Empleado actualizado exitosamente en la tabla employees');

      // 4. Si cambió el email, actualizar en auth.users mediante Edge Function
      if (formData.email !== employee?.email) {
        const { error: emailError } = await supabase.functions.invoke('update-user-email', {
          body: {
            user_id: id,
            new_email: formData.email,
          }
        });

        if (emailError) {
          // El empleado se actualizó pero el email no
          Alert.alert(
            'Actualización parcial',
            'Se actualizó la información del empleado, pero no se pudo cambiar el email. Por favor contacta al administrador.',
            [{ text: 'OK', onPress: () => router.replace('/admin/Empleados' as any) }]
          );
          return;
        }
      }

      // 5. Éxito total
      Alert.alert(
        '¡Éxito!',
        `Los datos de ${formData.fullName} han sido actualizados correctamente.`,
        [{ text: 'OK', onPress: () => router.replace('/admin/Empleados' as any) }]
      );

    } catch (error: any) {
      console.error('Error actualizando empleado:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el empleado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Empleado',
      `¿Estás seguro de que deseas eliminar a ${formData.fullName}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              
              // Nota: En producción, considera usar un "soft delete" o desactivar en lugar de eliminar
              const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert(
                'Empleado eliminado',
                'El empleado ha sido eliminado del sistema.',
                [{ text: 'OK', onPress: () => router.replace('/admin/Empleados' as any) }]
              );
            } catch (error: any) {
              console.error('Error eliminando empleado:', error);
              Alert.alert('Error', 'No se pudo eliminar el empleado: ' + error.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <ActivityIndicator size="large" color="#2a8c4a" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <Stack.Screen 
        options={{
          title: 'Editar Empleado',
          headerStyle: { backgroundColor: '#2a8c4a' },
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
            <MaterialIcons name="edit" size={40} color="#2a8c4a" />
          </View>
          <Text style={styles.helperText}>
            Actualiza los datos del empleado según sea necesario.
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
              editable={!saving}
            />
          </View>

          {/* Email (Solo lectura o advertencia) */}
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
              editable={false} // Deshabilitar cambio de email por seguridad
            />
          </View>
          <Text style={styles.infoText}>
            ⓘ El email no se puede modificar por seguridad. Contacta soporte si necesitas cambiarlo.
          </Text>

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
              editable={!saving}
            />
          </View>

          {/* Selector de Rol */}
          <Text style={styles.label}>Cargo / Puesto *</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                formData.role === 'Preventista' && styles.roleButtonActive
              ]}
              onPress={() => setFormData({...formData, role: 'Preventista'})}
              disabled={saving}
            >
              <Ionicons 
                name="person" 
                size={20} 
                color={formData.role === 'Preventista' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.role === 'Preventista' && styles.roleButtonTextActive
              ]}>
                Preventista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.roleButton, 
                formData.role === 'Administrador' && styles.roleButtonActive
              ]}
              onPress={() => setFormData({...formData, role: 'Administrador'})}
              disabled={saving}
            >
              <Ionicons 
                name="shield-checkmark" 
                size={20} 
                color={formData.role === 'Administrador' ? '#fff' : '#6B7280'} 
              />
              <Text style={[
                styles.roleButtonText,
                formData.role === 'Administrador' && styles.roleButtonTextActive
              ]}>
                Administrador
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Botones de Acción */}
          <TouchableOpacity 
            style={[styles.updateButton, saving && styles.buttonDisabled]} 
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.updateText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteButton, saving && styles.buttonDisabled]} 
            onPress={handleDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={20} color="#EF5350" style={{ marginRight: 8 }} />
            <Text style={styles.deleteText}>Eliminar Empleado</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d0fdd7',
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
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: -10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
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
    backgroundColor: '#2a8c4a',
    borderColor: '#2a8c4a',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  updateButton: {
    backgroundColor: '#2a8c4a',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2a8c4a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  updateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#EF5350',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  deleteText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
