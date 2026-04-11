import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Zona } from '../../../types/Zonas.interface';
import { zonaService } from '../../../services/ZonaService';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListaZonas() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const datos = await zonaService.getZonas(busqueda);
            setZonas(datos || []);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => { cargarDatos(); }, [busqueda])
    );

    const handleEliminar = (id: string) => {
        Alert.alert('¿Eliminar Zona?', 'Esta acción no se puede deshacer.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => { await zonaService.deleteZona(id); cargarDatos(); }
            }
        ]);
    };

    const renderItem = ({ item }: { item: Zona }) => {
        const nombreVendedor = item.employees?.full_name || 'Sin Asignar';
        const isHabilitado = item.estado === 'Habilitado';

        return (
            <View style={[styles.card, {
                backgroundColor: colors.cardBg,
                borderColor: isDark ? colors.cardBorder : 'transparent',
                borderWidth: isDark ? 1 : 0,
                shadowColor: colors.shadowColor
            }]}>
                {/* Cabecera Tarjeta: Código y Estado */}
                <View style={styles.cardHeader}>
                    <View style={styles.codeBadge}>
                        <MaterialCommunityIcons name="map-marker-radius" size={16} color={colors.brandGreen} />
                        <Text style={[styles.codeText, { color: colors.textMain }]}>{item.codigo_zona}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isHabilitado ? (isDark ? 'rgba(46, 125, 50, 0.2)' : '#E8F5E9') : (isDark ? 'rgba(198, 40, 40, 0.2)' : '#FFEBEE') }
                    ]}>
                        <Text style={{
                            fontSize: 10, fontWeight: 'bold',
                            color: isHabilitado ? '#4CAF50' : '#EF5350'
                        }}>
                            {isHabilitado ? 'HABILITADO' : 'INACTIVO'}
                        </Text>
                    </View>
                </View>

                {/* Info Principal */}
                <View style={styles.contentRow}>
                    <View style={styles.infoBlock}>
                        <Text style={[styles.label, { color: colors.textSub }]}>TERRITORIO</Text>
                        <Text style={[styles.value, { color: colors.textMain }]}>{item.territorio}</Text>
                    </View>
                    <View style={styles.infoBlock}>
                        <Text style={[styles.label, { color: colors.textSub }]}>VENDEDOR</Text>
                        <Text style={[styles.value, { color: colors.textMain }]} numberOfLines={1}>
                            {nombreVendedor}
                        </Text>
                    </View>
                </View>

                {/* Descripción y Acciones */}
                <View style={[styles.footerRow, { borderTopColor: isDark ? colors.cardBorder : '#F1F5F9' }]}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color_marcador, marginRight: 8, borderWidth: 1, borderColor: '#ddd' }} />
                        <Text style={[styles.desc, { color: colors.textSub }]} numberOfLines={1}>
                            {item.descripcion || 'Sin descripción'}
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/admin/zonas/CrearZonas', params: { id: item.id } })}
                            style={[styles.actionBtn, { backgroundColor: isDark ? colors.inputBg : '#F8FAFC' }]}
                        >
                            <Ionicons name="pencil" size={18} color="#2196F3" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEliminar(item.id)}
                            style={[styles.actionBtn, { backgroundColor: isDark ? colors.inputBg : '#FEF2F2', marginLeft: 8 }]}
                        >
                            <Ionicons name="trash" size={18} color="#EF5350" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
                        <Text style={styles.headerTitle}>Zonas</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/admin/zonas/CrearZonas')}
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
                            placeholder="Buscar código, territorio..."
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
                {/* Fondo Decorativo */}
                <View style={styles.backgroundShapes}>
                    <View style={[styles.shapeCircle, {
                        top: 50, right: -50, width: 200, height: 200,
                        backgroundColor: colors.brandGreen,
                        opacity: colors.bubbleOpacity
                    }]} />
                </View>

                {loading ? (
                    <View style={styles.centerView}>
                        <ActivityIndicator size="large" color={colors.brandGreen} />
                        <Text style={{ marginTop: 10, color: colors.textSub }}>Cargando zonas...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={zonas}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        keyExtractor={i => i.id}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                <FontAwesome5 name="map-marked-alt" size={40} color={colors.iconGray} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: colors.textSub }]}>No hay zonas registradas</Text>
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

    // BODY
    bodyContainer: { flex: 1, marginTop: -20, zIndex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
    backgroundShapes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
    shapeCircle: { position: 'absolute', borderRadius: 999 },

    // TARJETAS
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    codeText: { fontSize: 16, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

    contentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    infoBlock: { flex: 1 },
    label: { fontSize: 10, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
    value: { fontSize: 14, fontWeight: '500' },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
    desc: { fontSize: 13, flex: 1, fontStyle: 'italic', marginRight: 10 },
    actions: { flexDirection: 'row' },
    actionBtn: { padding: 8, borderRadius: 8 },

    // ESTADOS
    centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyView: { alignItems: 'center', marginTop: 80, opacity: 0.7 },
    emptyText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
});
