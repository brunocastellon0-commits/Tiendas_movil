import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { obtenerCategoria } from '../../../services/CategoriaService';
import { Categorias } from '../../../types/Categorias.inteface';

export default function ListaCategorias() {
    const router = useRouter();
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [loading, setLoading] = useState(true);

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
                <View style={{ flex: 1 }}>
                    <Text style={styles.nombre}>{item.nombre_categoria}</Text>
                    <Text style={styles.empresa}>{item.empresa}</Text>
                </View>
                <MaterialCommunityIcons name="shape" size={24} color="#2a8c4a" />
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={16} color="#666" style={styles.icon} />
                <Text style={styles.infoText}>Línea: {item.linea}</Text>
            </View>

            <View style={styles.infoRow}>
                <Ionicons name="ribbon-outline" size={16} color="#666" style={styles.icon} />
                <Text style={styles.infoText}>Marca: {item.marca}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Personalizado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Categorías</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Lista */}
            {loading ? (
                <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={categorias}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.lista}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="shape-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No hay categorías registradas</Text>
                            <Text style={styles.emptySubtext}>Presiona + para agregar una nueva</Text>
                        </View>
                    }
                />
            )}

            {/* Botón Flotante (FAB) */}
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
    container: { flex: 1, backgroundColor: '#F5F5F5' },
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
    lista: { padding: 16, paddingBottom: 80 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    nombre: { fontSize: 17, fontWeight: '700', color: '#333' },
    empresa: { fontSize: 12, color: '#2a8c4a', fontWeight: '600', marginTop: 2 },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    icon: { marginRight: 8, width: 20 },
    infoText: { fontSize: 14, color: '#555', flex: 1 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { color: '#999', fontSize: 16, marginTop: 10, fontWeight: '600' },
    emptySubtext: { color: '#bbb', fontSize: 14, marginTop: 5 },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: '#2a8c4a',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#2a8c4a',
        shadowOpacity: 0.3,
        shadowRadius: 5
    }
});