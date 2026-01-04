import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoriaId, updateCategoria } from '../../../services/CategoriaService';
import { Categorias } from '../../../types/Categorias.inteface';

export default function EditCategoria() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // Recibimos el ID
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<Categorias | null>(null);

    useEffect(() => {
        if (id) cargarDatos(id.toString());
    }, [id]);

    const cargarDatos = async (idCat: string) => {
        try {
            const data = await getCategoriaId(idCat);
            setForm(data);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la categoría');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: keyof Categorias, value: string) => {
        if (form) setForm({ ...form, [key]: value });
    };

    const handleActualizar = async () => {
        if (!form?.empresa || !form?.nombre_categoria || !form?.linea || !form?.marca) {
            Alert.alert('Atención', 'Todos los campos son obligatorios');
            return;
        }

        setSaving(true);
        try {
            // Extraemos solo los campos editables
            const { id, created_at, ...datosEditables } = form;
            await updateCategoria(id, datosEditables);

            Alert.alert('¡Éxito!', 'Categoría actualizada correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo actualizar');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !form) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2a8c4a" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar Categoría</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="pencil" size={20} color="#2a8c4a" />
                        <Text style={styles.cardTitle}>Datos de la Categoría</Text>
                    </View>

                    <Text style={styles.label}>Empresa</Text>
                    <TextInput
                        style={styles.input}
                        value={form.empresa}
                        onChangeText={(text) => handleChange('empresa', text)}
                    />

                    <Text style={styles.label}>Nombre Categoría</Text>
                    <TextInput
                        style={styles.input}
                        value={form.nombre_categoria}
                        onChangeText={(text) => handleChange('nombre_categoria', text)}
                    />

                    <Text style={styles.label}>Línea</Text>
                    <TextInput
                        style={styles.input}
                        value={form.linea}
                        onChangeText={(text) => handleChange('linea', text)}
                    />

                    <Text style={styles.label}>Marca</Text>
                    <TextInput
                        style={styles.input}
                        value={form.marca}
                        onChangeText={(text) => handleChange('marca', text)}
                    />
                </View>

                <TouchableOpacity style={styles.btnGuardar} onPress={handleActualizar} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Guardar Cambios</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2a8c4a', marginLeft: 8 },
    label: { fontSize: 14, color: '#666', marginBottom: 6, fontWeight: '500' },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#333',
        marginBottom: 12
    },
    btnGuardar: {
        backgroundColor: '#2a8c4a',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 4
    },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});