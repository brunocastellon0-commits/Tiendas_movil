import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
    TextInput, RefreshControl, StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { proveedorService } from '../../../services/ProveedorServices';
import { Proveedor } from '../../../types/Proveedores.interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListaProveedoresScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // Estados
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // Estado para el filtro de pestañas
    const [activeFilter, setActiveFilter] = useState<'Todos' | 'Vigente' | 'Inactivo'>('Todos');

    const cargarDatos = async () => {
        try {
            // La búsqueda por texto la maneja el servicio/backend
            const data = await proveedorService.getProveedores(busqueda);
            setProveedores(data);
        } catch (error: any) {

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => { cargarDatos(); }, [busqueda])
    );

    const onRefresh = () => {
        setRefreshing(true);
        cargarDatos();
    };

    // --- LÓGICA DE FILTRADO (CLIENT-SIDE) ---
    const filteredProveedores = useMemo(() => {
        return proveedores.filter(p => {
            if (activeFilter === 'Todos') return true;
            if (activeFilter === 'Vigente') return p.estado === 'Vigente';
            if (activeFilter === 'Inactivo') return p.estado !== 'Vigente';
            return true;
        });
    }, [proveedores, activeFilter]);

    const renderItem = ({ item }: { item: Proveedor }) => {
        const isVigente = item.estado === 'Vigente';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.card, {
                    backgroundColor: colors.cardBg,
                    borderColor: isDark ? colors.cardBorder : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    shadowColor: colors.shadowColor
                }]}
                onPress={() => {
                    router.push({
                        pathname: '/admin/proveedores/EditProveedores',
                        params: { id: item.id }
                    });
                }}
            >
                {/* Cabecera: Nombre y Estado */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.nombre, { color: colors.textMain }]}>{item.nombre}</Text>
                        <Text style={[styles.codigo, { color: colors.brandGreen }]}>
                            {item.codigo || 'S/C'}
                        </Text>
                    </View>
                    <View style={[
                        styles.badge,
                        { backgroundColor: isVigente ? (isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9') : (isDark ? 'rgba(198, 40, 40, 0.2)' : '#FFEBEE') }
                    ]}>
                        <Text style={[
                            styles.badgeText,
                            { color: isVigente ? '#2E7D32' : '#C62828' }
                        ]}>
                            {item.estado || 'Inactivo'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? colors.cardBorder : '#F0F0F0' }]} />

                {/* Info */}
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="domain" size={16} color={colors.iconGray} style={styles.icon} />
                    <Text style={[styles.infoText, { color: colors.textSub }]} numberOfLines={1}>
                        {item.razon_social}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={16} color={colors.iconGray} style={styles.icon} />
                    <Text style={[styles.infoText, { color: colors.textSub }]}>
                        NIT: <Text style={{ color: colors.textMain, fontWeight: '600' }}>{item.nit_ci}</Text>
                    </Text>
                </View>

                {/* Footer */}
                <View style={[styles.footer, { borderTopColor: isDark ? colors.cardBorder : '#f9f9f9' }]}>
                    <View style={styles.phoneContainer}>
                        <Ionicons name="call-outline" size={14} color={colors.iconGray} />
                        <Text style={[styles.footerSmallText, { color: colors.textSub }]}> {item.telefono || 'S/N'}</Text>
                    </View>

                    <View style={styles.saldoContainer}>
                        <Text style={[styles.saldoLabel, { color: colors.textSub }]}>Saldo:</Text>
                        <Text style={[styles.saldoValue, { color: colors.textMain }]}>
                            {item.moneda} {item.saldo_inicial?.toFixed(2)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* --- HEADER CURVO --- */}
            <LinearGradient
                colors={[colors.brandGreen, '#166534']}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Proveedores</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/admin/proveedores/Proveedores')}
                            style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                        >
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Buscador */}
                    <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar proveedor, NIT..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={busqueda}
                            onChangeText={setBusqueda}
                            autoCapitalize="none"
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')}>
                                <Ionicons name="close-circle" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* --- FILTROS (TABS) --- */}
                    <View style={styles.tabsRow}>
                        {(['Todos', 'Vigente', 'Inactivo'] as const).map((tab) => {
                            const isActive = activeFilter === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[
                                        styles.tabPill,
                                        isActive ? { backgroundColor: '#fff' } : { backgroundColor: 'rgba(0,0,0,0.2)' }
                                    ]}
                                    onPress={() => setActiveFilter(tab)}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        isActive ? { color: colors.brandGreen } : { color: 'rgba(255,255,255,0.8)' }
                                    ]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </SafeAreaView>
            </LinearGradient>

            {/* --- LISTA --- */}
            <View style={styles.bodyContainer}>
                {/* Fondo Decorativo */}
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
                        <Text style={{ marginTop: 10, color: colors.textSub }}>Cargando proveedores...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredProveedores} // Usamos la lista filtrada
                        keyExtractor={(item) => item.id || Math.random().toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandGreen} />}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                <MaterialCommunityIcons name="truck-outline" size={50} color={colors.iconGray} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: colors.textSub }]}>No hay proveedores</Text>
                                <Text style={{ color: colors.textSub, fontSize: 12 }}>Intenta cambiar los filtros</Text>
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
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 10,
    },
    headerContent: { paddingHorizontal: 20 },
    navBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, marginBottom: 15,
    },
    iconBtn: { padding: 8, borderRadius: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

    // BUSCADOR
    searchBar: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16,
        height: 50, paddingHorizontal: 15, marginBottom: 15, // Margen para separar de los tabs
    },
    searchInput: { flex: 1, fontSize: 16, color: '#fff', marginLeft: 10 },

    // TABS (FILTROS)
    tabsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10, // Espacio antes de que termine el header
    },
    tabPill: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // BODY & LISTA
    bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
    backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
    shapeCircle: { position: 'absolute', borderRadius: 999 },

    // TARJETA
    card: {
        borderRadius: 16, padding: 16, marginBottom: 12,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    nombre: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    codigo: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },

    divider: { height: 1, marginVertical: 10 },

    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    icon: { marginRight: 8 },
    infoText: { fontSize: 14 },

    footer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 8, paddingTop: 8, borderTopWidth: 1
    },
    phoneContainer: { flexDirection: 'row', alignItems: 'center' },
    footerSmallText: { fontSize: 13 },
    saldoContainer: { flexDirection: 'row', alignItems: 'center' },
    saldoLabel: { fontSize: 12, marginRight: 5 },
    saldoValue: { fontSize: 14, fontWeight: 'bold' },

    // ESTADOS
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyView: { alignItems: 'center', marginTop: 80, opacity: 0.7 },
    emptyText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
});
