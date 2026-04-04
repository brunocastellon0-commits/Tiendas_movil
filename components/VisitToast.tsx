import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, useColorScheme, View } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// VisitToast — modal visual que se cierra solo en 5 segundos
//
// Se controla con showVisitToast() desde cualquier archivo.
// Respeta el tema del dispositivo (dark / light) automáticamente.
//
// Uso:
//   1. Monta <VisitToast /> en la pantalla donde quieras que aparezca
//   2. Llama showVisitToast({ title, subtitle, type }) desde el hook o pantalla
//
// Tipos:
//   'success' → verde  (visita iniciada, venta realizada, pedido guardado)
//   'info'    → azul   (visita finalizada)
// ─────────────────────────────────────────────────────────────────────────────

export type VisitToastType = 'success' | 'info' | 'error';

interface ToastConfig {
    visible: boolean;
    title: string;
    subtitle: string;
    type: VisitToastType;
}

const INITIAL: ToastConfig = { visible: false, title: '', subtitle: '', type: 'success' };

// Colores por tipo y tema
const COLORS = {
    success: {
        light: { icon: 'checkmark-circle-outline' as const, iconColor: '#2a8c4a', iconBg: '#F0FDF4', titleColor: '#166534' },
        dark: { icon: 'checkmark-circle-outline' as const, iconColor: '#4ade80', iconBg: '#052e16', titleColor: '#4ade80' },
    },
    info: {
        light: { icon: 'flag-outline' as const, iconColor: '#3B82F6', iconBg: '#EFF6FF', titleColor: '#1E40AF' },
        dark: { icon: 'flag-outline' as const, iconColor: '#60a5fa', iconBg: '#0c1a2e', titleColor: '#60a5fa' },
    },
    error: {
        light: { icon: 'lock-closed-outline' as const, iconColor: '#DC2626', iconBg: '#FEF2F2', titleColor: '#991B1B' },
        dark: { icon: 'lock-closed-outline' as const, iconColor: '#f87171', iconBg: '#2d0a0a', titleColor: '#f87171' },
    },
};

// Setter global
let _trigger: ((cfg: Omit<ToastConfig, 'visible'>) => void) | null = null;

export const showVisitToast = (cfg: Omit<ToastConfig, 'visible'>) => {
    _trigger?.(cfg);
};

export const VisitToast = () => {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const [config, setConfig] = useState<ToastConfig>(INITIAL);
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        _trigger = (cfg) => setConfig({ ...cfg, visible: true });
        return () => { _trigger = null; };
    }, []);

    useEffect(() => {
        if (!config.visible) return;

        // Entrada
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        // Cierre automático a los 5 segundos
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 0.85, duration: 250, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => {
                setConfig(INITIAL);
                scaleAnim.setValue(0.85);
                opacityAnim.setValue(0);
            });
        }, 5000);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [config.visible, config.title]);

    if (!config.visible) return null;

    const c = COLORS[config.type][isDark ? 'dark' : 'light'];
    const cardBg = isDark ? '#1c1c1e' : '#ffffff';
    const subtitleColor = isDark ? '#9ca3af' : '#6B7280';

    return (
        <Modal visible={config.visible} transparent animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.card,
                    { backgroundColor: cardBg, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
                ]}>
                    {/* Ícono */}
                    <View style={[styles.iconBg, { backgroundColor: c.iconBg }]}>
                        <Ionicons name={c.icon} size={36} color={c.iconColor} />
                    </View>

                    {/* Texto */}
                    <Text style={[styles.title, { color: c.titleColor }]}>{config.title}</Text>
                    {config.subtitle ? (
                        <Text style={[styles.subtitle, { color: subtitleColor }]}>{config.subtitle}</Text>
                    ) : null}

                    {/* Barra de progreso que se consume en 5 segundos */}
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                        <ProgressBar color={c.iconColor} />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// Barra que se consume de izquierda a derecha en 5 segundos
const ProgressBar = ({ color }: { color: string }) => {
    const widthAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(widthAnim, { toValue: 0, duration: 5000, useNativeDriver: false }).start();
    }, []);

    return (
        <Animated.View style={[
            styles.progressBar,
            {
                backgroundColor: color,
                width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
        ]} />
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    card: {
        borderRadius: 20,
        padding: 28,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    iconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    progressTrack: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        marginTop: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
    },
});