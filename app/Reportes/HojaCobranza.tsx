import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, StatusBar, FlatList, Alert, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Deuda } from '../../types/Cobranza.interface'; // Ajusta la ruta a tu interfaz
import { reporteService } from '../../services/ReporteCobranzas'; // Ajusta la ruta a tu servicio
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function HojaCobranzaScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [deudas, setDeudas] = useState<Deuda[]>([]);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [vendorName, setVendorName] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Obtener nombre del vendedor
            const { data: userData } = await supabase
                .from('employees')
                .select('full_name')
                .eq('id', user.id)
                .single();
            if (userData) setVendorName(userData.full_name);

            // Obtener Deudas
            const data = await reporteService.getHojaCobranza(user.id);
            setDeudas(data);

            // Calcular Total
            const sumaTotal = data.reduce((acc, item) => acc + item.saldo, 0);
            setTotalGeneral(sumaTotal);

        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE DESCARGA PDF ---
    const savePdf = async () => {
        if (deudas.length === 0) {
            Alert.alert("Vacío", "No hay datos para generar el reporte.");
            return;
        }

        try {
            const fechaReporte = new Date().toLocaleDateString('es-ES');
            const fileName = `Cobranza_${fechaReporte.replace(/\//g, '-')}.pdf`;

            // 1. Generar HTML
            const filasHTML = deudas.map(d => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">
                        <div style="font-weight: bold; font-size: 12px;">${d.cliente.nombre}</div>
                        <div style="font-size: 10px; color: #666;">${d.cliente.zona}</div>
                    </td>
                    <td style="padding: 10px; font-size: 11px;">${d.nro_doc}</td>
                    <td style="padding: 10px; font-size: 11px;">${d.fecha}</td>
                    <td style="padding: 10px; text-align: center; color: ${d.dias_mora > 30 ? 'red' : 'black'}; font-weight: bold; font-size: 11px;">
                        ${d.dias_mora}
                    </td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 12px;">
                        Bs ${d.saldo.toFixed(2)}
                    </td>
                </tr>
            `).join('');

            const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                      body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                      h1 { color: #166534; text-align: center; margin-bottom: 5px; }
                      .header { text-align: center; margin-bottom: 20px; color: #555; font-size: 12px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                      th { background-color: #f3f4f6; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-size: 11px; color: #166534; font-weight: bold; }
                      td { padding: 8px; font-size: 11px; }
                      .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 20px; color: #166534; border-top: 2px solid #166534; padding-top: 10px; }
                    </style>
                  </head>
                  <body>
                    <h1>HOJA DE COBRANZA</h1>
                    <div class="header">
                      <p>Vendedor: <strong>${vendorName}</strong> | Fecha: ${fechaReporte}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th width="35%">CLIENTE</th>
                          <th width="15%">DOC</th>
                          <th width="15%">FECHA</th>
                          <th width="10%" style="text-align: center">DIAS</th>
                          <th width="25%" style="text-align: right">SALDO</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filasHTML}
                      </tbody>
                    </table>
                    <div class="total">
                      TOTAL POR COBRAR: Bs ${totalGeneral.toFixed(2)}
                    </div>
                  </body>
                </html>
            `;

            // 2. Generar PDF
            const { uri } = await Print.printToFileAsync({ html });

            // 3. Compartir/Guardar PDF (funciona en Android e iOS)
            await Sharing.shareAsync(uri, {
                UTI: '.pdf',
                mimeType: 'application/pdf',
                dialogTitle: 'Guardar Hoja de Cobranza'
            });

        } catch (error) {
            Alert.alert("Error", "No se pudo generar el PDF");
            console.error(error);
        }
    };

    const handleLlamar = (telefono: string) => {
        if (telefono) Linking.openURL(`tel:${telefono}`);
        else Alert.alert("Aviso", "No hay teléfono registrado.");
    };

    const renderItem = ({ item }: { item: Deuda }) => (
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: isDark ? colors.cardBorder : 'transparent' }]}>

            {/* Cabecera */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.clientName, { color: colors.textMain }]}>{item.cliente.nombre}</Text>
                    <View style={styles.zoneBadge}>
                        <Ionicons name="map" size={10} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.zoneText}>{item.cliente.zona}</Text>
                    </View>
                </View>
                <View style={styles.amountBox}>
                    <Text style={styles.labelAmount}>SALDO</Text>
                    <Text style={styles.valueAmount}>Bs {item.saldo.toFixed(2)}</Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#444' : '#F3F4F6' }]} />

            {/* Detalles */}
            <View style={styles.detailsRow}>
                <View style={styles.detailBox}>
                    <Text style={styles.labelDetail}>DOC</Text>
                    <Text style={[styles.valueDetail, { color: colors.textMain }]}>{item.nro_doc}</Text>
                </View>
                <View style={styles.detailBoxCenter}>
                    <Text style={styles.labelDetail}>FECHA</Text>
                    <Text style={[styles.valueDetail, { color: colors.textMain }]}>{item.fecha}</Text>
                </View>
                <View style={styles.detailBoxRight}>
                    <Text style={styles.labelDetail}>MORA</Text>
                    <View style={[styles.moraBadge, { backgroundColor: item.dias_mora > 30 ? '#FEF2F2' : '#F0FDF4' }]}>
                        <Text style={[styles.moraText, { color: item.dias_mora > 30 ? '#DC2626' : '#166534' }]}>
                            {item.dias_mora} días
                        </Text>
                    </View>
                </View>
            </View>

            {/* Dirección */}
            <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSub} style={{ marginTop: 2 }} />
                <Text style={[styles.addressText, { color: colors.textSub }]}>{item.cliente.direccion}</Text>
            </View>

            {/* Botón */}
            <TouchableOpacity style={styles.callButton} onPress={() => handleLlamar(item.cliente.telefono)}>
                <Ionicons name="call" size={16} color="#4B5563" />
                <Text style={styles.callButtonText}>Contactar</Text>
            </TouchableOpacity>

        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgStart }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* HEADER */}
            <LinearGradient colors={[colors.brandGreen, '#14532d']} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.navBar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Hoja de Cobranza</Text>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={savePdf} style={styles.iconBtn}>
                                <FontAwesome5 name="file-download" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cargarDatos} style={styles.iconBtn}>
                                <Ionicons name="reload" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.totalFloatingCard}>
                        <View>
                            <Text style={styles.totalLabel}>TOTAL CARTERA</Text>
                            <Text style={styles.totalValue}>Bs {totalGeneral.toFixed(2)}</Text>
                        </View>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="finance" size={32} color={colors.brandGreen} />
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* LISTA */}
            <View style={styles.listWrapper}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.brandGreen} style={{ marginTop: 60 }} />
                ) : (
                    <FlatList
                        data={deudas}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 80, paddingHorizontal: 20 }}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="checkmark-circle-outline" size={80} color="#10B981" />
                                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>Sin Deudas</Text>
                                <Text style={{ color: colors.textSub }}>No hay cuentas pendientes.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerGradient: { height: 190, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingHorizontal: 20, position: 'absolute', top: 0, width: '100%', zIndex: 10 },
    headerContent: { flex: 1 },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

    totalFloatingCard: { position: 'absolute', bottom: -45, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
    totalLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '800', letterSpacing: 1 },
    totalValue: { fontSize: 26, fontWeight: '900', color: '#1F2937', marginTop: 4 },
    iconCircle: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },

    listWrapper: { flex: 1, marginTop: 140 },

    card: { borderRadius: 24, padding: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clientName: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
    zoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4B5563', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    zoneText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    amountBox: { alignItems: 'flex-end' },
    labelAmount: { fontSize: 10, color: '#EF4444', fontWeight: '800' },
    valueAmount: { fontSize: 18, fontWeight: '900', color: '#EF4444', marginTop: 2 },

    divider: { height: 1, marginVertical: 18 },

    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    detailBox: { flex: 1 },
    detailBoxCenter: { flex: 1, alignItems: 'center' },
    detailBoxRight: { flex: 1, alignItems: 'flex-end' },

    labelDetail: { fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: '700' },
    valueDetail: { fontSize: 14, fontWeight: '700' },
    moraBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    moraText: { fontSize: 12, fontWeight: '800' },

    addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    addressText: { fontSize: 13, marginLeft: 6, flex: 1, lineHeight: 18 },

    callButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 8 },
    callButtonText: { fontSize: 14, fontWeight: '700', color: '#374151' },

    emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15 },
});