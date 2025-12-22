import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { obtenerCategoria } from '../../../services/CategoriaService';
import { Categorias } from '../../../types/Categorias.inteface';
import { Ionicons } from '@expo/vector-icons';

export default function ListaCategorias() {
    const router = useRouter();
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [loading, setLoading] = useState(true);

    // useFocusEffect: Se ejecuta cada vez que la pantalla "vuelve a verse"
    // (Ideal para recargar la lista después de crear una nueva)
    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [])
    );

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const datos = await obtenerCategoria();
            setCategorias(datos || []);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudieron cargar las categorías');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Categorias }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.empresa}>{item.empresa}</Text>
                <Text style={styles.linea}>{item.linea}</Text>
            </View>
            <Text style={styles.nombre}>{item.nombre_categoria}</Text>
            <Text style={styles.marca}>Marca: {item.marca}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Cabecera */}
            <View style={styles.header}>
                <Text style={styles.titulo}>Categorías</Text>
            </View>

            {/* Lista */}
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={categorias}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.lista}
                    ListEmptyComponent={
                        <Text style={styles.vacio}>No hay categorías registradas aún.</Text>
                    }
                />
            )}

            {/* Botón Flotante (+) para crear */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/admin/categorias/NuevaCategoria')}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f4' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    titulo: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    lista: { padding: 15 },
    vacio: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },

    // Estilos de la Tarjeta (Card)
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2, // Sombra en Android
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 // Sombra en iOS
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    empresa: { fontSize: 12, fontWeight: 'bold', color: '#007AFF', backgroundColor: '#eef6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    linea: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    nombre: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    marca: { fontSize: 14, color: '#555', marginTop: 2 },

    // Botón Flotante (FAB)
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#007AFF',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4
    }
});