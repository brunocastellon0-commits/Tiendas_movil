import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
// Importamos los iconos correctos
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
// Hook de tema global
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: 'Administrador' | 'Preventista';
  phone?: string;
}

export default function EditEmployeeScreen() {
  // 1. Configuración de Hooks y Tema
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados de carga y formulario
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Estado para guardar el email original y detectar cambios
  const [initialEmail, setInitialEmail] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'Preventista' as 'Administrador' | 'Preventista',
  });

  // 2. Cargar Datos al Iniciar
  useEffect(() => {
    if (id) loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email, role, phone')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setInitialEmail(data.email || ''); // Guardamos email original
        setFormData({
          fullName: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'Preventista',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar la información del empleado.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // 3. Guardar Cambios
  const handleUpdate = async () => {
    if (!formData.fullName) {
      Alert.alert('Faltan datos', 'El nombre es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      // 3. Actualizar en la tabla employees
      // 3. Actualizar en la tabla employees
      const { data: updateData, error: updateError } = await supabase
        .from('employees')
        .update({
          full_name: formData.fullName,
          phone: formData.phone || null,
          role: formData.role,
          job_title: formData.role, // Sincronizar job_title con role
        })
        .eq('id', id)
        .select(); // <--- IMPORTANTE: .select() necesario para devolver datos y evitar error 'never'

      if (updateError) {
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        throw new Error('No se actualizó ningún registro. Verifica las políticas RLS en Supabase.');
      }



      // 4. Si cambió el email, actualizar en auth.users mediante Edge Function
      if (formData.email !== initialEmail) {
        const { error: emailError } = await supabase.functions.invoke('update-user-email', {
          body: {
            user_id: id,
            new_email: formData.email,
          }
        });

        if (emailError) {
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
      Alert.alert('Error', error.message || 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Eliminar Empleado
  const handleDelete = () => {
    Alert.alert(
      '¿Eliminar Empleado?',
      `Estás a punto de eliminar a ${formData.fullName}. Esta acción es permanente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // Aquí podrías llamar a una Edge Function si necesitas borrarlo de Auth también
              // Por ahora borramos de la tabla pública
              const { error } = await supabase.from('employees').delete().eq('id', id);
              if (error) throw error;

              Alert.alert(
                'Empleado eliminado',
                'El empleado ha sido eliminado del sistema.',
                [{ text: 'OK', onPress: () => router.replace('/admin/Empleados' as any) }]
              );
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar: ' + error.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // --- UI Components ---

  // Input Reutilizable con Estilo
  const FormInput = ({ label, icon, value, onChange, placeholder, isReadOnly = false, keyboard = 'default' }: any) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
      <View style={[styles.inputWrapper, {
        backgroundColor: isReadOnly ? (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9') : colors.inputBg,
        borderColor: isDark ? colors.cardBorder : 'transparent',
        borderWidth: isDark ? 1 : 0,
        opacity: isReadOnly ? 0.8 : 1
      }]}>
        <Ionicons
          name={icon}
          size={20}
          color={isReadOnly ? colors.iconGray : colors.brandGreen}
          style={{ marginRight: 12 }}
        />
        <TextInput
          style={[styles.input, { color: isReadOnly ? colors.textSub : colors.textMain }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSub}
          editable={!isReadOnly}
          keyboardType={keyboard}
        />
        {isReadOnly && <Ionicons name="lock-closed" size={16} color={colors.textSub} />}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerView, { backgroundColor: colors.bgStart }]}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
        <Text style={{ marginTop: 10, color: colors.textSub }}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* --- A. HEADER CURVO --- */}
      <LinearGradient
        colors={[colors.brandGreen, '#166534']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          {/* Barra de Navegación */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            {/* Espacio vacío para equilibrar el header */}
            <View style={{ width: 40 }} />
          </View>

          {/* Icono e Info Principal */}
          <View style={styles.headerIconRow}>
            <View style={styles.iconBigCircle}>
              <FontAwesome5 name="user-edit" size={32} color={colors.brandGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {formData.fullName || 'Empleado'}
              </Text>
              <Text style={styles.headerDescription}>
                {formData.role}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* --- B. FORMULARIO FLOTANTE --- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta contenedora */}
          <View style={[styles.formSheet, {
            backgroundColor: colors.cardBg,
            shadowColor: colors.shadowColor,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0
          }]}>

            <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>INFORMACIÓN GENERAL</Text>

            <FormInput
              label="Nombre Completo"
              icon="person-outline"
              value={formData.fullName}
              onChange={(t: string) => setFormData({ ...formData, fullName: t })}
            />

            <FormInput
              label="Teléfono"
              icon="call-outline"
              value={formData.phone}
              onChange={(t: string) => setFormData({ ...formData, phone: t })}
              keyboard="phone-pad"
            />

            {/* Email (Solo Lectura) */}
            <FormInput
              label="Correo Electrónico"
              icon="mail-outline"
              value={formData.email}
              isReadOnly={true}
            />
            <Text style={[styles.helperText, { color: colors.textSub }]}>
              * El correo no se puede modificar directamente.
            </Text>

            <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#F1F5F9' }]} />

            <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>PERMISOS Y ROL</Text>

            {/* Selector de Rol Moderno */}
            <View style={styles.roleContainer}>
              {['Preventista', 'Administrador'].map((role) => {
                const isActive = formData.role === role;
                // Iconos específicos
                const roleIcon = role === 'Administrador' ? 'shield-account' : 'account-tie';

                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleCard, {
                      backgroundColor: isActive ? colors.brandGreen : colors.inputBg,
                      borderColor: isActive ? colors.brandGreen : (isDark ? colors.cardBorder : 'transparent'),
                      borderWidth: 1
                    }]}
                    onPress={() => setFormData({ ...formData, role: role as any })}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={roleIcon}
                      size={24}
                      color={isActive ? '#fff' : colors.textSub}
                    />
                    <Text style={[styles.roleText, { color: isActive ? '#fff' : colors.textSub }]}>
                      {role}
                    </Text>
                    {isActive && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botón Principal: Guardar */}
            <TouchableOpacity
              style={[styles.submitBtn, {
                backgroundColor: colors.brandGreen,
                shadowColor: colors.brandGreen,
                opacity: saving ? 0.7 : 1
              }]}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.submitBtnText}>GUARDAR CAMBIOS</Text>
              )}
            </TouchableOpacity>

            {/* Botón Secundario: Eliminar */}
            <TouchableOpacity
              style={[styles.deleteBtn, {
                borderColor: '#EF4444',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2'
              }]}
              onPress={handleDelete}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.deleteBtnText}>Eliminar Empleado</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // HEADER
  headerGradient: {
    height: 240,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0, width: '100%', zIndex: 0
  },
  headerContent: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingHorizontal: 10,
  },
  iconBigCircle: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  headerSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  headerDescription: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // BODY
  scrollView: { flex: 1, marginTop: 170 },
  formSheet: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 30,
  },

  // INPUTS
  sectionHeader: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 15, marginTop: 5 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  helperText: { fontSize: 12, marginTop: -10, marginBottom: 15, marginLeft: 5, fontStyle: 'italic' },

  // ROLES
  roleContainer: { flexDirection: 'row', gap: 12, marginTop: 5 },
  roleCard: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 14,
    gap: 8,
    position: 'relative',
  },
  roleText: { fontSize: 14, fontWeight: 'bold' },
  checkBadge: { position: 'absolute', top: 6, right: 6 },

  divider: { height: 1, marginVertical: 25, width: '100%' },

  // BOTONES
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  deleteBtn: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
  },
  deleteBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },

  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});