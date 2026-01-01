import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // --- Animación ---
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedTruckStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value }
      ],
    };
  });

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

  const handleNavigation = () => {
    router.replace('/(tabs)');
  };
  // -----------------

  async function signInWithEmail() {
    if (loading) return;
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    } else {
      // Login exitoso: Disparamos la animación
      startTruckAnimation();
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Animated.Image
            source={require('../../assets/images/logoTiendasMovil.png')} 
            style={[styles.logo, animatedTruckStyle]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          {/* Campo de Email */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                onChangeText={setEmail}
                value={email}
                placeholder="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
                returnKeyType="next"
              />
            </View>
          </View>
          
          {/* Campo de Contraseña */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                onChangeText={setPassword}
                value={password}
                placeholder="Contraseña"
                secureTextEntry={!showPassword}
                style={styles.input}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={signInWithEmail}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={22} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón de Iniciar Sesión */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Link de Ayuda (opcional) */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    height: 150,
    justifyContent: 'center',
    overflow: 'visible',
  },
  logo: {
    width: 200,
    height: 150,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 5,
  },
  button: {
    backgroundColor: '#2a8c4a',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    shadowColor: '#2a8c4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#64c27b',
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});