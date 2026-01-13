import React, { useCallback, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
    TextInput, RefreshControl, StatusBar, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
// Importamos iconos modernos (MaterialCommunityIcons es clave para iconos variados)
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
// Servicios y Tipos (asegúrate de que las rutas sean correctas en tu proyecto)
import { obtenerCategoria, deleteCategoria } from '../../../services/CategoriaService';
import { Categorias } from '../../../types/Categorias.inteface'; // Corregí 'inteface' a 'interface' si fue un typo tuyo
import { LinearGradient } from 'expo-linear-gradient';
// Hook de tema para modo oscuro
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListaCategorias() {
    // 1. CONFIGURACIÓN
    const router = useRouter();
    const { colors, isDark } = useTheme(); // Colores globales

    // Estados
    const [categorias, setCategorias] = useState<Categorias[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // 2. CARGA DE DATOS
    const cargarDatos = async () => {
        try {
            // Pasamos el término de búsqueda al servicio
            const datos = await obtenerCategoria(busqueda);
            setCategorias(datos || []);
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Recargar al enfocar la pantalla o cambiar el texto de búsqueda
    useFocusEffect(
        useCallback(() => { cargarDatos(); }, [busqueda])
    );

    const onRefresh = () => {
        setRefreshing(true);
        cargarDatos();
    };

    // 3. LÓGICA DE ELIMINACIÓN
    const handleEliminar = (id: string) => {
        Alert.alert(
            '¿Eliminar Categoría?',
            'Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategoria(id);
                            cargarDatos(); // Recargar lista tras eliminar
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar. Puede estar en uso.');
                        }
                    }
                }
            ]
        );
    };

    // 4. RENDERIZADO DE TARJETA
    const renderItem = ({ item }: { item: Categorias }) => (
        <View style={[styles.card, {
            backgroundColor: colors.cardBg,
            borderColor: isDark ? colors.cardBorder : 'transparent',
            borderWidth: isDark ? 1 : 0,
            shadowColor: colors.shadowColor
        }]}>

            {/* Cabecera de la Tarjeta: Empresa y Nombre */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.empresa, { color: colors.brandGreen }]}>{item.empresa}</Text>
                    <Text style={[styles.nombre, { color: colors.textMain }]}>{item.nombre_categoria}</Text>
                </View>
                {/* Icono decorativo */}
                <View style={[styles.iconBg, { backgroundColor: isDark ? 'rgba(42, 140, 74, 0.2)' : '#E8F5E9' }]}>
                    <MaterialCommunityIcons name="shape" size={20} color={colors.brandGreen} />
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#F0F0F0' }]} />

            {/* Información Detallada (Línea y Marca) */}
            <View style={styles.rowInfo}>
                <View style={styles.infoCol}>
                    <Text style={[styles.label, { color: colors.textSub }]}>LÍNEA</Text>
                    <Text style={[styles.infoText, { color: colors.textMain }]} numberOfLines={1}>{item.linea}</Text>
                </View>
                <View style={styles.infoCol}>
                    <Text style={[styles.label, { color: colors.textSub }]}>MARCA</Text>
                    <Text style={[styles.infoText, { color: colors.textMain }]} numberOfLines={1}>{item.marca}</Text>
                </View>
            </View>

            {/* Botones de Acción (Editar / Eliminar) */}
            <View style={[styles.actionsRow, { borderTopColor: isDark ? colors.cardBorder : '#f9f9f9' }]}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? colors.inputBg : '#F8FAFC' }]}
                    onPress={() => router.push({ pathname: '/admin/categorias/EditarCategoria', params: { id: item.id } })}
                >
                    <Ionicons name="pencil" size={16} color="#2196F3" />
                    <Text style={[styles.actionText, { color: '#2196F3' }]}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', marginLeft: 10 }]}
                    onPress={() => handleEliminar(item.id)}
                >
                    <Ionicons name="trash-outline" size={16} color="#EF5350" />
                    <Text style={[styles.actionText, { color: '#EF5350' }]}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* --- HEADER CURVO VERDE --- */}
            <LinearGradient
                colors={[colors.brandGreen, '#166534']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>

                    {/* Barra Superior */}
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Categorías</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/admin/categorias/NuevaCategoria')}
                            style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                        >
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Buscador Integrado */}
                    <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar categoría, marca..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')}>
                                <Ionicons name="close-circle" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* --- LISTA --- */}
            <View style={styles.bodyContainer}>
                {/* Fondo Decorativo (Bolitas) */}
                <View style={styles.backgroundShapes}>
                    <View style={[styles.shapeCircle, {
                        top: 50, right: -50, width: 200, height: 200,
                        backgroundColor: colors.brandGreen,
                        opacity: colors.bubbleOpacity
                    }]} />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centerView}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                        <Text style={{ marginTop: 10, color: colors.textSub }}>Cargando...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={categorias}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandGreen} />}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                <MaterialCommunityIcons name="shape-outline" size={50} color={colors.iconGray} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: colors.textSub }]}>No hay categorías registradas</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // HEADER
    headerGradient: {
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10,
    },
    headerContent: { paddingHorizontal: 20 },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 15,
    },
    iconBtn: { padding: 8, borderRadius: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

    // BUSCADOR
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        height: 50,
        paddingHorizontal: 15,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#fff', marginLeft: 10 },

    // BODY & LISTA
    bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
    backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
    shapeCircle: { position: 'absolute', borderRadius: 999 },

    // TARJETA
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    nombre: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
    empresa: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    iconBg: { padding: 8, borderRadius: 10 },

    divider: { height: 1, marginVertical: 12 },

    rowInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    infoCol: { flex: 1 },
    label: { fontSize: 10, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
    infoText: { fontSize: 14, fontWeight: '500' },

    // ACCIONES
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10, borderTopWidth: 1 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    actionText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },

    // ESTADOS
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyView: { alignItems: 'center', marginTop: 80, opacity: 0.7 },
    emptyText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
});