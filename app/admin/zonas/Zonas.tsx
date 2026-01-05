import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Zona } from '../../../types/Zonas.interface';
import { zonaService } from '../../../services/ZonaService';

export default function ListaZonas() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const cargarDatos = async () => {
        try {
            const datos = await zonaService.getZonas(busqueda);
            setZonas(datos || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => { cargarDatos(); }, [busqueda])
    );

    const handleEliminar = (id: string) => {
        Alert.alert('Eliminar Zona', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive',
                onPress: async () => { await zonaService.deleteZona(id); cargarDatos(); }
            }
        ]);
    };

    const renderItem = ({ item }: { item: Zona }) => {
        // AQUÍ USAMOS TU CAMPO REAL 'full_name'
        const nombreVendedor = item.employees?.full_name || 'Sin Asignar';

        return (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {/* Cabecera */}
                <View style={styles.cardHeader}>
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>ZONA</Text>
                        <Text style={[styles.codeText, { color: colors.brandGreen }]}>{item.codigo_zona}</Text>
                    </View>
                    <View style={[
                        styles.badge,
                        { backgroundColor: item.estado === 'Habilitado' ? '#E8F5E9' : '#FFEBEE' }
                    ]}>
                        <Text style={{
                            fontSize: 10, fontWeight: 'bold',
                            color: item.estado === 'Habilitado' ? '#2E7D32' : '#C62828'
                        }}>
                            {item.estado === 'Habilitado' ? 'HABILITADO' : 'DESHABIL.'}
                        </Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.infoRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: colors.textSub }]}>Territorio</Text>
                        <Text style={[styles.value, { color: colors.textMain }]}>{item.territorio}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: colors.textSub }]}>Vendedor</Text>
                        <Text style={[styles.value, { color: colors.textMain }]} numberOfLines={1}>
                            {nombreVendedor}
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={[styles.footerRow, { borderTopColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Text style={[styles.desc, { color: colors.textSub }]} numberOfLines={1}>
                        {item.descripcion || 'Sin descripción'}
                    </Text>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/admin/zonas/CrearZonas', params: { id: item.id } })} style={styles.actionBtn}>
                            <Ionicons name="pencil" size={18} color="#2196F3" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEliminar(item.id)} style={[styles.actionBtn, { marginLeft: 10 }]}>
                            <Ionicons name="trash" size={18} color="#D32F2F" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bgEnd }]}>
            <View style={[styles.header, { backgroundColor: colors.brandGreen }]}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Zonas</Text>
                <TouchableOpacity onPress={() => router.push('/admin/zonas/CrearZonas')}><Ionicons name="add-circle" size={28} color="white" /></TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    style={[styles.inputSearch, { color: colors.textMain }]}
                    placeholder="Buscar zona..."
                    placeholderTextColor="#999"
                    value={busqueda} onChangeText={setBusqueda}
                />
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.brandGreen} style={{ marginTop: 20 }} /> :
                <FlatList
                    data={zonas}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15 }}
                    keyExtractor={i => i.id}
                />
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    searchBox: { flexDirection: 'row', alignItems: 'center', margin: 15, padding: 10, borderRadius: 10, elevation: 2 },
    inputSearch: { flex: 1, marginLeft: 10, fontSize: 16 },
    card: { borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    codeContainer: { flexDirection: 'row', alignItems: 'center' },
    codeLabel: { fontSize: 12, color: '#999', marginRight: 5, fontWeight: 'bold' },
    codeText: { fontSize: 16, fontWeight: 'bold' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { fontSize: 11, textTransform: 'uppercase', marginBottom: 2 },
    value: { fontSize: 14, fontWeight: '600' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
    desc: { fontSize: 13, flex: 1, fontStyle: 'italic' },
    actions: { flexDirection: 'row' },
    actionBtn: { padding: 5 }
});