import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming, } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext'; //importamos el hook de temas
import { supabase } from '../../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Login() {
  // 1. HOOKS DE TEMA
  const { colors, toggleTheme, isDark } = useTheme();

  //LOGICA
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // 3. ANIMACIÓN DEL CAMIÓN 
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedTruckStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const handleNavigation = () => {
    router.replace('/(tabs)');
  };

  const startTruckAnimation = () => {
    // 1. Efecto de arranque (motor)
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    // 2. Aceleración y salida
    translateX.value = withSequence(
      withTiming(-20, { duration: 200, easing: Easing.out(Easing.cubic) }), // Retroceso
      withTiming(
        SCREEN_WIDTH + 200, // Salida
        { duration: 800, easing: Easing.in(Easing.exp) },
        (finished) => {
          if (finished) {
            runOnJS(handleNavigation)();
          }
        }
      )
    );
  };

  // 4. FUNCIÓN DE LOGIN 
  async function signInWithEmail() {
    if (loading) return;
    setLoading(true);
    Keyboard.dismiss(); // Ocultar teclado al iniciar

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error de acceso', error.message);
      setLoading(false);
    } else {
      // Login exitoso: Disparamos la animación
      startTruckAnimation();
    }
  }

  // 5. RENDERIZADO CON TEMAS
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgEnd }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Fondo Gradiente Dinámico */}
      <LinearGradient
        colors={[colors.bgStart, colors.bgEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Burbujas Dinámicas */}
      <View style={[styles.bubble, {
        width: 320, height: 320, borderRadius: 160, top: -100, left: -90,
        backgroundColor: colors.brandGreen,
        opacity: colors.bubbleOpacity
      }]} />

      <View style={[styles.bubble, {
        width: 300, height: 300, borderRadius: 150, bottom: -70, right: -70,
        backgroundColor: colors.brandGreen,
        opacity: isDark ? 0.2 : 0.15
      }]} />

      {/* Botón Flotante para cambiar tema (Pruébalo y luego bórralo si quieres) */}
      <TouchableOpacity
        onPress={toggleTheme}
        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
      >
        <Ionicons name={isDark ? "sunny" : "moon"} size={24} color={colors.textMain} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1, zIndex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          centerContent={true}
        >

          {/* Tarjeta de Login */}
          <View style={[styles.card, {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            shadowColor: colors.shadowColor
          }]}>

            <View style={styles.headerInsideCard}>
              <Animated.Image
                source={require('../../assets/images/logoTiendasMovil.png')}
                style={[styles.logo, animatedTruckStyle]}
                resizeMode="contain"
              />
              <Text style={[styles.welcomeText, { color: colors.textMain }]}>Bienvenido</Text>
              <Text style={[styles.subText, { color: colors.textSub }]}>Accede a tu cuenta</Text>
            </View>

            {/* Input Email */}
            <View style={[styles.inputContainer, {
              backgroundColor: colors.inputBg,
              borderColor: isDark ? colors.cardBorder : '#E2E8F0'
            }]}>
              <Ionicons name="mail" size={20} color={colors.iconGray} style={{ marginRight: 12 }} />
              <TextInput
                onChangeText={setEmail}
                value={email}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textSub} // Color del placeholder dinámico
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, fontSize: 16, color: colors.textMain, height: '100%' }} // Color texto dinámico
                editable={!loading}
              />
            </View>

            {/* Input Password */}
            <View style={[styles.inputContainer, {
              backgroundColor: colors.inputBg,
              borderColor: isDark ? colors.cardBorder : '#E2E8F0'
            }]}>
              <Ionicons name="lock-closed" size={20} color={colors.iconGray} style={{ marginRight: 12 }} />
              <TextInput
                onChangeText={setPassword}
                value={password}
                placeholder="Contraseña"
                placeholderTextColor={colors.textSub}
                secureTextEntry={!showPassword}
                style={{ flex: 1, fontSize: 16, color: colors.textMain, height: '100%' }}
                editable={!loading}
                onSubmitEditing={signInWithEmail}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color={colors.iconGray} />
              </TouchableOpacity>
            </View>

            {/* Botón INGRESAR (Con funcionalidad) */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.brandGreen, shadowColor: colors.brandGreen }]}
              onPress={signInWithEmail}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>INICIAR SESION</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={{ color: colors.textSub, textDecorationLine: 'underline' }}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Estilos de Layout (No cambian dinámicamente)
const styles = StyleSheet.create({
  bubble: { position: 'absolute', zIndex: 0 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    borderRadius: 24, paddingVertical: 40, paddingHorizontal: 24, width: '100%',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, borderWidth: 1
  },
  headerInsideCard: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 180, height: 120, marginBottom: 10 },
  welcomeText: { fontSize: 26, fontWeight: '800', marginBottom: 5 },
  subText: { fontSize: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 56, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1 },
  loginButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  forgotPassword: { alignSelf: 'center', marginTop: 20 },
  footerLink: { marginTop: 30, alignItems: 'center', marginBottom: 20 },
});