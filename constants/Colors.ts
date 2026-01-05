// constants/Colors.ts

const tintColorLight = '#2a8c4a';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        // Tu diseño "Clean Gray" con burbujas suaves
        brandGreen: '#2a8c4a',
        bgStart: '#F8FAFC',
        bgEnd: '#E2E8F0',
        cardBg: '#FFFFFF',
        inputBg: '#F1F5F9',
        textMain: '#0F172A',
        textSub: '#64748B',
        iconGray: '#64748B',
        cardBorder: '#FFFFFF',
        shadowColor: '#64748B',
        bubbleOpacity: 0.1, // Burbujas suaves
        statusBarStyle: 'dark-content' as const,
    },
    dark: {
        // Tu diseño "Glow Intenso"
        brandGreen: '#2a8c4a',
        bgStart: '#0f172a',
        bgEnd: '#020617',
        cardBg: '#1e293b',
        inputBg: '#020617',
        textMain: '#F8FAFC',
        textSub: '#94A3B8',
        iconGray: '#94A3B8',
        cardBorder: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        bubbleOpacity: 0.2, // Burbujas más fuertes
        statusBarStyle: 'light-content' as const,
    },
};