import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { crearCategoria } from '../../../services/CategoriaService';
import { NuevaCategoria } from '../../../types/Categorias.inteface';

export default function CrearCategorias() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Estados locales del formulario
    const [form, setForm] = useState<NuevaCategoria>({
        empresa: '',
        nombre_categoria: '',
        linea: '',
        marca: ''
    });

    // Función genérica para actualizar los campos
    const handleChange = (key: keyof NuevaCategoria, value: string) => {
        setForm({ ...form, [key]: value });
    };

    const handleGuardar = async () => {
        // Validar
        if (!form.empresa || !form.nombre_categoria || !form.linea || !form.marca) {
            Alert.alert('Faltan datos', 'Completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            // LLAMAMOS AL SERVICIO 
            await crearCategoria(form);
            Alert.alert('¡Éxito!', 'Categoría creada correctamente');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo crear la categoría');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.titulo}>Nueva Categoría</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Empresa</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: ARC"
                    value={form.empresa}
                    onChangeText={(text) => handleChange('empresa', text)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Categoría</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: GOLOSINAS"
                    value={form.nombre_categoria}
                    onChangeText={(text) => handleChange('nombre_categoria', text)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Línea</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: CHOCOLATES"
                    value={form.linea}
                    onChangeText={(text) => handleChange('linea', text)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Marca</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: NUCITA"
                    value={form.marca}
                    onChangeText={(text) => handleChange('marca', text)}
                />
            </View>

            <TouchableOpacity
                style={[styles.boton, loading && styles.botonDesactivado]}
                onPress={handleGuardar}
                disabled={loading}
            >
                <Text style={styles.textoBoton}>
                    {loading ? "Guardando..." : "Crear Categoría"}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
    titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#444' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#f9f9f9' },
    boton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    botonDesactivado: { backgroundColor: '#ccc' },
    textoBoton: { color: '#fff', fontWeight: 'bold' }
});