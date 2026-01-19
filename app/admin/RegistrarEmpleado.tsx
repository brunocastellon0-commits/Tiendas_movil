import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ Componente FormInput movido AFUERA para evitar re-renders
const FormInput = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  isPassword = false,
  keyboard = 'default',
  colors,
  isDark,
  onSubmitEditing,
  returnKeyType = 'next',
  inputRef
}: any) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: colors.textMain }]}>{label}</Text>
    <View style={[styles.inputWrapper, {
      backgroundColor: colors.inputBg,
      borderColor: isDark ? colors.cardBorder : 'transparent',
      borderWidth: isDark ? 1 : 0
    }]}>
      <Ionicons name={icon} size={20} color={colors.iconGray} style={{ marginRight: 12 }} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.textMain }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSub}
        secureTextEntry={isPassword}
        keyboardType={keyboard}
        autoCapitalize="none"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
      />
    </View>
  </View>
);

export default function RegisterEmployeeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ✅ Referencias para navegación entre inputs
  const fullNameRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    jobTitle: 'Preventista',
  });

  const handleRegister = async () => {
    // ✅ Cerrar teclado antes de validar
    Keyboard.dismiss();

    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Atención', 'Por favor completa los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          job_title: formData.jobTitle,
          phone: formData.phone
        }
      });
      if (error) throw new Error(error.message);
      Alert.alert('¡Listo!', `Colaborador registrado exitosamente.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* --- CABECERA CURVA --- */}
      <LinearGradient
        colors={[colors.brandGreen, '#166534']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Personal</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerIconRow}>
            <View style={styles.iconBigCircle}>
              <FontAwesome5 name="user-tie" size={40} color={colors.brandGreen} />
            </View>
            <View>
              <Text style={styles.headerSubtitle}>Registrar Personal</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* --- CONTENIDO CON KEYBOARD HANDLING PROFESIONAL --- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Tarjeta Formulario */}
            <View style={[styles.formSheet, {
              backgroundColor: colors.cardBg,
              shadowColor: colors.shadowColor,
              borderColor: isDark ? colors.cardBorder : 'transparent',
              borderWidth: isDark ? 1 : 0
            }]}>

              <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>INFORMACIÓN PERSONAL</Text>

              {/* ✅ Inputs con navegación mejorada */}
              <FormInput
                label="Nombre Completo"
                icon="person-outline"
                value={formData.fullName}
                onChange={(t: string) => setFormData({ ...formData, fullName: t })}
                placeholder="Ej. María Gonzales"
                colors={colors}
                isDark={isDark}
                inputRef={fullNameRef}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />

              <FormInput
                label="Teléfono"
                icon="call-outline"
                value={formData.phone}
                onChange={(t: string) => setFormData({ ...formData, phone: t })}
                placeholder="+591 ..."
                keyboard="phone-pad"
                colors={colors}
                isDark={isDark}
                inputRef={phoneRef}
                returnKeyType="next"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  // Pequeño delay para que el teclado se cierre antes de cambiar de tipo
                  setTimeout(() => emailRef.current?.focus(), 100);
                }}
              />

              <Text style={[styles.label, { color: colors.textMain, marginTop: 10 }]}>Rol Asignado</Text>
              <View style={styles.roleContainer}>
                {['Preventista', 'Administrador'].map((role) => {
                  const isActive = formData.jobTitle === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleCard, {
                        backgroundColor: isActive ? colors.brandGreen : colors.inputBg,
                        borderColor: isActive ? colors.brandGreen : (isDark ? colors.cardBorder : 'transparent'),
                        borderWidth: 1
                      }]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setFormData({ ...formData, jobTitle: role });
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={role === 'Administrador' ? "admin-panel-settings" : "shopping-bag"}
                        size={24}
                        color={isActive ? '#fff' : colors.textSub}
                      />
                      <Text style={[styles.roleText, { color: isActive ? '#fff' : colors.textSub }]}>{role}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#F1F5F9' }]} />

              <Text style={[styles.sectionHeader, { color: colors.brandGreen }]}>ACCESO AL SISTEMA</Text>

              <FormInput
                label="Correo Electrónico"
                icon="mail-outline"
                value={formData.email}
                onChange={(t: string) => setFormData({ ...formData, email: t })}
                placeholder="correo@ejemplo.com"
                keyboard="email-address"
                colors={colors}
                isDark={isDark}
                inputRef={emailRef}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <FormInput
                label="Contraseña"
                icon="lock-closed-outline"
                value={formData.password}
                onChange={(t: string) => setFormData({ ...formData, password: t })}
                placeholder="••••••••"
                isPassword
                colors={colors}
                isDark={isDark}
                inputRef={passwordRef}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity
                style={[styles.submitBtn, {
                  backgroundColor: colors.brandGreen,
                  shadowColor: colors.brandGreen
                }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.submitBtnText}>GUARDAR REGISTRO</Text>
                )}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
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
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingHorizontal: 10,
  },
  iconBigCircle: {
    width: 60, height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },

  // BODY
  scrollView: {
    flex: 1,
    marginTop: 170,
  },
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

  // FORM COMPONENTS
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 5,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },

  // SELECTOR ROLES
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
  },
  roleCard: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 14,
    gap: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    marginVertical: 25,
    width: '100%',
  },

  // BOTÓN
  submitBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
