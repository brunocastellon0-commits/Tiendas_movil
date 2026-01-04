import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { obtenerCategoria, deleteCategoria } from '../../../services/CategoriaService';
import { Categorias } from '../../../types/Categorias.inteface';

export default function ListaCategorias() {
    const router = useRouter();
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const cargarDatos = async () => {
        try {
            // Ahora le pasamos la búsqueda al servicio
            const datos = await obtenerCategoria(busqueda);
            setCategorias(datos || []);
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Recargar cuando cambia la búsqueda o al volver a la pantalla
    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [busqueda])
    );

    const onRefresh = () => {
        setRefreshing(true);
        cargarDatos();
    };

    const handleEliminar = (id: string) => {
        Alert.alert(
            'Eliminar Categoría',
            '¿Estás seguro? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategoria(id);
                            cargarDatos(); // Recargar lista
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar. Puede que esté en uso.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Categorias }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.nombre}>{item.nombre_categoria}</Text>
                    <Text style={styles.empresa}>{item.empresa}</Text>
                </View>
                {/* Ícono decorativo */}
                <View style={styles.iconBg}>
                    <MaterialCommunityIcons name="shape" size={20} color="#2a8c4a" />
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowInfo}>
                <View style={styles.infoCol}>
                    <Text style={styles.label}>Línea</Text>
                    <Text style={styles.infoText}>{item.linea}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={styles.label}>Marca</Text>
                    <Text style={styles.infoText}>{item.marca}</Text>
                </View>
            </View>

            {/* Acciones (Editar / Eliminar) */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({ pathname: '/admin/categorias/EditarCategoria', params: { id: item.id } })}
                >
                    <Ionicons name="pencil" size={18} color="#666" />
                    <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { marginLeft: 15 }]}
                    onPress={() => handleEliminar(item.id)}
                >
                    <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                    <Text style={[styles.actionText, { color: '#D32F2F' }]}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header con Botón de Crear Arriba */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Categorías</Text>
                <TouchableOpacity onPress={() => router.push('/admin/categorias/NuevaCategoria')}>
                    <Ionicons name="add-circle-outline" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* Buscador */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre, marca..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                />
                {busqueda.length > 0 && (
                    <TouchableOpacity onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista */}
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={categorias}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.lista}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2a8c4a" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="shape-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No se encontraron categorías</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },

    // Header
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

    // Buscador
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },

    lista: { padding: 16, paddingBottom: 40 },

    // Tarjeta
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    nombre: { fontSize: 17, fontWeight: 'bold', color: '#333' },
    empresa: { fontSize: 12, color: '#2a8c4a', fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
    iconBg: { backgroundColor: '#E8F5E9', padding: 6, borderRadius: 8 },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

    rowInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    infoCol: { flex: 1 },
    label: { fontSize: 11, color: '#999', textTransform: 'uppercase' },
    infoText: { fontSize: 14, color: '#444', fontWeight: '500' },

    // Botones de Acción
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#f9f9f9', paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontSize: 13, fontWeight: '600', color: '#666', marginLeft: 4 },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { color: '#999', fontSize: 16, marginTop: 10, fontWeight: '600' },
});