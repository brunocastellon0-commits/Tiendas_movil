import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { crearCategoria } from '../../../services/CategoriaService';
import { NuevaCategoria } from '../../../types/Categorias.inteface';

export default function CrearCategorias() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<NuevaCategoria>({
        empresa: '',
        nombre_categoria: '',
        linea: '',
        marca: ''
    });

    const handleChange = (key: keyof NuevaCategoria, value: string) => {
        setForm({ ...form, [key]: value });
    };

    const handleGuardar = async () => {
        if (!form.empresa || !form.nombre_categoria || !form.linea || !form.marca) {
            Alert.alert('Faltan datos', 'Completa todos los campos obligatorios');
            return;
        }

        setLoading(true);
        try {
            await crearCategoria(form);
            Alert.alert('¡Éxito!', 'Categoría creada correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo crear la categoría');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* Header Personalizado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nueva Categoría</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- TARJETA: INFORMACIÓN DE CATEGORÍA --- */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="shape" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Información de Categoría</Text>
                    </View>

                    <Text style={styles.label}>Empresa *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: ARC"
                        value={form.empresa}
                        onChangeText={(text) => handleChange('empresa', text)}
                    />

                    <Text style={styles.label}>Nombre Categoría *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: GOLOSINAS"
                        value={form.nombre_categoria}
                        onChangeText={(text) => handleChange('nombre_categoria', text)}
                    />

                    <Text style={styles.label}>Línea *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: CHOCOLATES"
                        value={form.linea}
                        onChangeText={(text) => handleChange('linea', text)}
                    />

                    <Text style={styles.label}>Marca *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: NUCITA"
                        value={form.marca}
                        onChangeText={(text) => handleChange('marca', text)}
                    />
                </View>

                {/* BOTÓN GUARDAR */}
                <TouchableOpacity
                    style={styles.btnGuardar}
                    onPress={handleGuardar}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.btnText}>Crear Categoría</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
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
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2a8c4a', marginLeft: 8 },

    label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 5, fontWeight: '500' },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#333',
        marginBottom: 5
    },

    btnGuardar: {
        backgroundColor: '#2a8c4a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
        elevation: 4
    },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});