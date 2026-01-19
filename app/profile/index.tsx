import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
    ActivityIndicator, Alert, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [assignedZone, setAssignedZone] = useState<string | null>(null);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('id', user.id)
                .single();

            if (empError) throw empError;
            setProfile(employee);

            const { data: zona } = await supabase
                .from('zonas')
                .select('territorio, descripcion')
                .eq('vendedor_id', user.id)
                .maybeSingle();

            if (zona) {
                setAssignedZone(zona.territorio || zona.descripcion);
            } else {
                setAssignedZone(null);
            }

        } catch (error) {
            console.log('Error perfil', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Cerrar Sesión", "¿Deseas salir de la aplicación?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Salir",
                style: "destructive",
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.bgStart }]}>
                <ActivityIndicator size="large" color={colors.brandGreen} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* --- HEADER HERO --- */}
            <LinearGradient colors={[colors.brandGreen, '#064e3b']} style={styles.headerGradient}>

                {/* Decoración de Fondo (Círculos sutiles) */}
                <View style={styles.circleDecoration1} />
                <View style={styles.circleDecoration2} />

                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Mi Perfil</Text>
                        <TouchableOpacity style={styles.iconBtn} onPress={fetchProfileData}>
                            <Ionicons name="refresh" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
            >

                {/* --- TARJETA DE PERFIL FLOTANTE --- */}
                <View style={[styles.profileCard, {
                    backgroundColor: colors.cardBg,
                    shadowColor: "#000",
                    borderColor: isDark ? colors.cardBorder : 'transparent',
                    borderWidth: isDark ? 1 : 0
                }]}>

                    <View style={styles.profileHeader}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.avatarGradient}>
                                <Text style={[styles.avatarText, { color: colors.brandGreen }]}>
                                    {getInitials(profile?.full_name)}
                                </Text>
                            </LinearGradient>
                            {/* Badge Rol */}
                            <View style={[styles.roleBadge, { backgroundColor: colors.brandGreen }]}>
                                <Ionicons name="shield-checkmark" size={10} color="#fff" style={{ marginRight: 2 }} />
                                <Text style={styles.roleText}>{profile?.role || 'User'}</Text>
                            </View>
                        </View>

                        {/* Textos */}
                        <View style={{ marginTop: 12, alignItems: 'center' }}>
                            <Text style={[styles.userName, { color: colors.textMain }]}>
                                {profile?.full_name || 'Sin Nombre'}
                            </Text>
                            <Text style={[styles.userEmail, { color: colors.textSub }]}>
                                {profile?.email || 'usuario@sistema.com'}
                            </Text>
                        </View>
                    </View>

                    {/* Estadísticas */}
                    <View style={[styles.statsContainer, { borderTopColor: isDark ? '#333' : '#F3F4F6' }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.textMain }]}>{assignedZone ? '1' : '0'}</Text>
                            <Text style={styles.statLabel}>Rutas</Text>
                        </View>
                        <View style={[styles.verticalLine, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.brandGreen }]}>Activo</Text>
                            <Text style={styles.statLabel}>Estado</Text>
                        </View>
                    </View>
                </View>

                {/* --- SECCIONES DE MENÚ --- */}

                {/* 1. OPERACIONES */}
                <Text style={[styles.sectionTitle, { color: colors.textSub }]}>OPERATIVO</Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg }]}>

                    <View style={styles.menuItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                            <MaterialCommunityIcons name="map-marker-path" size={22} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuLabel, { color: colors.textMain }]}>Ruta Asignada</Text>
                            <Text style={[styles.menuValue, { color: assignedZone ? colors.brandGreen : '#EF4444' }]}>
                                {assignedZone || 'Sin asignación hoy'}
                            </Text>
                        </View>
                        {assignedZone && <Ionicons name="chevron-forward" size={18} color={colors.textSub} />}
                    </View>

                </View>

                {/* 2. SISTEMA */}
                <Text style={[styles.sectionTitle, { color: colors.textSub }]}>SISTEMA</Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.cardBg }]}>

                    {/* Dark Mode */}
                    <View style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#F3F4F6' }]}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#FFF7ED' }]}>
                            <Ionicons name="moon" size={22} color={isDark ? '#FFF' : '#F97316'} />
                        </View>
                        <Text style={[styles.menuLabel, { color: colors.textMain, flex: 1 }]}>Modo Oscuro</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#E5E7EB', true: colors.brandGreen }}
                            thumbColor={'#fff'}
                        />
                    </View>

                    {/* Seguridad / Versión */}
                    <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                            <Ionicons name="shield-checkmark" size={22} color="#4B5563" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuLabel, { color: colors.textMain }]}>Seguridad</Text>
                            <Text style={{ fontSize: 12, color: colors.textSub }}>v1.0.2 (Build 2026)</Text>
                        </View>
                    </TouchableOpacity>

                </View>

                {/* --- LOGOUT --- */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <Text style={styles.footerBrand}>Powered by TuEmpresa © 2026</Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    headerGradient: {
        height: 240, // Más alto para mejor efecto visual
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        position: 'absolute', top: 0, width: '100%', zIndex: 0,
        overflow: 'hidden'
    },
    // Decoración de fondo
    circleDecoration1: {
        position: 'absolute', top: -50, right: -50,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    circleDecoration2: {
        position: 'absolute', bottom: -20, left: -20,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)'
    },
    headerContent: { flex: 1 },
    navBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, marginTop: 10
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center'
    },

    // BODY
    scrollView: { flex: 1, marginTop: 120 },

    // PROFILE CARD
    profileCard: {
        marginHorizontal: 20,
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginBottom: 25,
        // Sombra premium
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    profileHeader: { alignItems: 'center', marginBottom: 20 },
    avatarContainer: { position: 'relative' },
    avatarGradient: {
        width: 96, height: 96, borderRadius: 48,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#fff',
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 4
    },
    avatarText: { fontSize: 36, fontWeight: '800' },
    roleBadge: {
        position: 'absolute', bottom: 0, right: -10,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2, borderColor: '#fff',
    },
    roleText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    userName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
    userEmail: { fontSize: 14 },

    // STATS
    statsContainer: {
        flexDirection: 'row', paddingTop: 20, borderTopWidth: 1,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600' },
    verticalLine: { width: 1, height: '80%', alignSelf: 'center' },

    // MENU SECTIONS
    sectionTitle: {
        marginLeft: 24, marginBottom: 10,
        fontSize: 12, fontWeight: '800', letterSpacing: 1, opacity: 0.8
    },
    menuGroup: {
        marginHorizontal: 20, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 4,
        marginBottom: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14,
    },
    iconBox: {
        width: 38, height: 38, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14,
    },
    menuLabel: { fontSize: 15, fontWeight: '600' },
    menuValue: { fontSize: 13, marginTop: 2, fontWeight: '500' },

    // LOGOUT
    logoutBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginHorizontal: 20, height: 52, borderRadius: 16,
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        marginTop: 10,
    },
    logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
    footerBrand: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 20, opacity: 0.6 },
});