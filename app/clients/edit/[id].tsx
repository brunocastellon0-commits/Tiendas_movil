import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { clientService } from '../../../services/ClienteService';

export default function EditClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
 const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    business_name: '',
    tax_id: '',
    address: '',
    phones: '',
    credit_limit: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Cargar datos del cliente al iniciar
  useEffect(() => {
    if (clientId) loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const client = await clientService.getClientById(clientId);
      if (client) {
        setForm({
          code: client.code,
          name: client.name,
          business_name: client.business_name || '',
          tax_id: client.tax_id || '',
          address: client.address || '',
          phones: client.phones || '',
          credit_limit: client.credit_limit?.toString() || '0',
          latitude: null, // PostGIS requiere parseo especial
          longitude: null,
        });
      } else {
        Alert.alert('Error', 'No se encontró el cliente');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar los datos del cliente');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para actualizar la ubicación.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setForm(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.name || !form.code) {
      Alert.alert('Faltan datos', 'El Nombre y el Código son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      await clientService.updateClient(clientId, {
        code: form.code,
        name: form.name,
        business_name: form.business_name,
        tax_id: form.tax_id,
        address: form.address,
        phones: form.phones,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        credit_limit: parseFloat(form.credit_limit || '0'),
      });

      Alert.alert("Éxito", "Cliente actualizado correctamente", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2a8c4a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Cliente</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 🗺️ Sección Ubicación */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={20} color="#2a8c4a" />
            <Text style={styles.cardTitle}>Ubicación</Text>
          </View>
          
          <View style={styles.locationPreview}>
            {form.latitude && form.longitude ? (
              <Text style={styles.locationText}>
                📍 Lat: {form.latitude.toFixed(6)}, Lon: {form.longitude.toFixed(6)}
              </Text>
            ) : (
              <Text style={{ color: '#999' }}>Sin ubicación capturada</Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#2a8c4a" />
            ) : (
              <Text style={styles.secondaryButtonText}>Actualizar Ubicación GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 📝 Información Principal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront-outline" size={20} color="#2a8c4a" />
            <Text style={styles.cardTitle}>Información Principal</Text>
          </View>

          <Text style={styles.label}>Código (Legacy)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: 0-00001" 
            value={form.code}
            onChangeText={t => setForm({...form, code: t})}
          />

          <Text style={styles.label}>Nombre de la Tienda *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Tienda El Progreso" 
            value={form.name}
            onChangeText={t => setForm({...form, name: t})}
          />

          <Text style={styles.label}>Razón Social</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ej: Juan Perez S.A." 
            value={form.business_name}
            onChangeText={t => setForm({...form, business_name: t})}
          />
        </View>

        {/* 📄 Documentación */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color="#2a8c4a" />
            <Text style={styles.cardTitle}>Documentación y Contacto</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>NIT / CI</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                value={form.tax_id}
                onChangeText={t => setForm({...form, tax_id: t})}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="phone-pad"
                value={form.phones}
                onChangeText={t => setForm({...form, phones: t})}
              />
            </View>
          </View>

          <Text style={styles.label}>Dirección</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Av. Principal #123"
            value={form.address}
            onChangeText={t => setForm({...form, address: t})}
          />
        </View>

        {/* 💰 Financiera */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={20} color="#2a8c4a" />
            <Text style={styles.cardTitle}>Financiera</Text>
          </View>
          
          <Text style={styles.label}>Límite de Crédito (Bs)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric"
            placeholder="0.00"
            value={form.credit_limit}
            onChangeText={t => setForm({...form, credit_limit: t})}
          />
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2a8c4a',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  row: { flexDirection: 'row' },

  primaryButton: {
    backgroundColor: '#2a8c4a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  secondaryButton: {
    borderColor: '#2a8c4a',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { color: '#2a8c4a', fontWeight: '600' },
  
  locationPreview: {
    height: 60,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
  }
});
