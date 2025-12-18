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
} from 'react-native';
import { useRouter } from 'expo-router';
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
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Animated.Image
          source={require('../../assets/images/logoTiendasMovil.png')} 
          style={[styles.logo, animatedTruckStyle]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            onChangeText={setEmail}
            value={email}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            onChangeText={setPassword}
            value={password}
            placeholder="Contraseña"
            secureTextEntry={true}
            style={styles.input}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={signInWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    height: 150,
    justifyContent: 'center',
    overflow: 'visible', // Importante para que se vea al salir
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
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#DC2626',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#EF5350',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});