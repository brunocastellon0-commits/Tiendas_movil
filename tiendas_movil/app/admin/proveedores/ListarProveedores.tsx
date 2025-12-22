import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { proveedorService } from '../../../services/ProveedorServices';
import { Proveedor } from '../../../types/Proveedores.interface';

export default function ListaProveedoresScreen() {
    const router = useRouter();
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const cargarDatos = async () => {
        try {
            const data = await proveedorService.getProveedores(busqueda);
            setProveedores(data);
        } catch (error: any) {
            console.error('Error cargando proveedores:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [busqueda])
    );

    const onRefresh = () => {
        setRefreshing(true);
        cargarDatos();
    };

    const renderItem = ({ item }: { item: Proveedor }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                router.push({
                    pathname: '/admin/proveedores/EditProveedores',
                    params: { id: item.id }
                });
            }}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    {item.codigo ? <Text style={styles.codigo}>{item.codigo}</Text> : null}
                </View>
                <View style={[styles.badge, item.estado === 'Vigente' ? styles.badgeSuccess : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, item.estado === 'Vigente' ? styles.textSuccess : styles.textInactive]}>
                        {item.estado || 'Inactivo'}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={16} color="#666" style={styles.icon} />
                <Text style={styles.infoText} numberOfLines={1}>{item.razon_social}</Text>
            </View>

            <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={16} color="#666" style={styles.icon} />
                <Text style={styles.infoText}>NIT: {item.nit_ci}</Text>
            </View>

            {item.telefono ? (
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.telefono}</Text>
                </View>
            ) : null}

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Saldo: {item.moneda} {item.saldo_inicial?.toFixed(2)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Personalizado */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Proveedores</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Barra de Búsqueda */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar proveedor..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                />
                {busqueda.length > 0 && (
                    <TouchableOpacity onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista */}
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#2a8c4a" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={proveedores}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2a8c4a" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="truck-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No se encontraron proveedores</Text>
                            <Text style={styles.emptySubtext}>Presiona + para agregar uno nuevo</Text>
                        </View>
                    }
                />
            )}

            {/* Botón Flotante (FAB) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/admin/proveedores/Proveedores')}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 12,
        height: 50,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },

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
    codigo: { fontSize: 12, color: '#2a8c4a', fontWeight: '600', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeSuccess: { backgroundColor: '#E8F5E9' },
    badgeInactive: { backgroundColor: '#FFEBEE' },
    badgeText: { fontSize: 11, fontWeight: '700' },
    textSuccess: { color: '#2E7D32' },
    textInactive: { color: '#C62828' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    icon: { marginRight: 8, width: 20 },
    infoText: { fontSize: 14, color: '#555', flex: 1 },
    footer: { marginTop: 6, flexDirection: 'row', justifyContent: 'flex-end' },
    footerText: { fontSize: 13, fontWeight: '600', color: '#888' },

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