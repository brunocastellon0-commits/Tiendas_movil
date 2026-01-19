import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GPSBlockedScreenProps {
  trustScore: number;
  onContactSupport?: () => void;
}

export default function GPSBlockedScreen({ trustScore, onContactSupport }: GPSBlockedScreenProps) {
  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Número de WhatsApp del soporte (CAMBIAR POR EL TUYO)
      const phone = '59176543210'; // ← CAMBIAR AQUÍ
      const message = encodeURIComponent(
        `Hola, mi cuenta ha sido bloqueada por seguridad GPS. Mi puntaje es ${trustScore}. Necesito ayuda.`
      );
      Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icono de alerta */}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark-outline" size={100} color="#EF4444" />
        </View>

        {/* Título */}
        <Text style={styles.title}>Cuenta Bloqueada</Text>

        {/* Mensaje */}
        <Text style={styles.message}>
          Tu cuenta ha sido bloqueada temporalmente debido a actividad sospechosa en el sistema GPS.
        </Text>

        {/* Puntaje */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Puntaje de Confianza GPS</Text>
          <Text style={[styles.scoreValue, { color: trustScore < 40 ? '#EF4444' : '#F59E0B' }]}>
            {trustScore}/100
          </Text>
          <Text style={styles.scoreHint}>
            (Necesitas 60 o más para usar la app)
          </Text>
        </View>

        {/* Razones comunes */}
        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsTitle}>Posibles causas:</Text>
          <View style={styles.reasonItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.reasonText}>GPS falso o simulado detectado</Text>
          </View>
          <View style={styles.reasonItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.reasonText}>Dispositivo rooteado/modificado</Text>
          </View>
          <View style={styles.reasonItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.reasonText}>Modo desarrollador activo</Text>
          </View>
          <View style={styles.reasonItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.reasonText}>Movimientos imposibles detectados</Text>
          </View>
        </View>

        {/* Botón de contacto */}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactSupport}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          <Text style={styles.contactButtonText}>Contactar Soporte</Text>
        </TouchableOpacity>

        {/* Nota legal */}
        <Text style={styles.legalNote}>
          La manipulación del GPS está prohibida según los términos de uso.
          Contacta a tu supervisor para resolver este problema.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  scoreContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  reasonsContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: '100%',
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
    color: '#7F1D1D',
    marginLeft: 10,
    flex: 1,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a8c4a',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  legalNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});
