// clients/mobile/src/screens/LauncherScreen.js
// Launcher customizado:
//   - Exibe somente os apps que o servidor permite
//   - Modo Kiosk: trava o dispositivo (Lock Task Mode)
//   - Sinc automática da lista de apps a cada X minutos
//   - Relógio + data em tempo real
//   - Botão admin (protegido por senha) para sair do kiosk

import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    FlatList, Image, Modal, TextInput, Alert, StatusBar,
    Dimensions, SafeAreaView, ActivityIndicator, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../context/AuthContext';
import {
    startKioskMode, stopKioskMode, isKioskActive,
    setAsDefaultLauncher, launchApp,
    getAllowedInstalledApps, fetchAllowedAppsFromServer,
    getLauncherMode,
} from '../services/KioskService';

const { width, height } = Dimensions.get('window');
const COLS = 4; // apps por linha
const LOCAL_PASSWORD = 'hap@2025'; // mesma senha do LoginScreen

export default function LauncherScreen({ navigation }) {
    const { deviceInfo } = useContext(AuthContext);

    const [apps,        setApps]        = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [kioskActive, setKioskActive] = useState(false);
    const [time,        setTime]        = useState(new Date());
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminPassword,  setAdminPassword]  = useState('');
    const [adminError,     setAdminError]     = useState('');
    const [syncStatus,     setSyncStatus]     = useState('');

    const clockRef  = useRef(null);
    const syncRef   = useRef(null);

    // ── Inicialização ──────────────────────────────────────

    useEffect(() => {
        initialize();

        // Relógio em tempo real
        clockRef.current = setInterval(() => setTime(new Date()), 1000);

        // Sinc de apps a cada 5 minutos
        syncRef.current = setInterval(() => syncApps(), 5 * 60 * 1000);

        // Bloqueia o botão físico "voltar" no launcher
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

        return () => {
            clearInterval(clockRef.current);
            clearInterval(syncRef.current);
            backHandler.remove();
        };
    }, []);

    const initialize = async () => {
        setLoading(true);
        try {
            // Verifica estado do kiosk
            const kiosk = await isKioskActive();
            setKioskActive(kiosk);

            // Carrega apps (local primeiro, depois sinc com servidor)
            await loadApps();
            await syncApps();
        } finally {
            setLoading(false);
        }
    };

    // ── Carregamento de apps ──────────────────────────────

    const loadApps = async () => {
        const allowed = await getAllowedInstalledApps();
        // Remove o próprio app MDM da lista (não faz sentido abrir ele mesmo)
        const filtered = allowed.filter(a =>
            !a.packageName.includes('com.yourapp') &&
            !a.packageName.includes('com.expo')
        );
        setApps(filtered);
    };

    const syncApps = async () => {
        setSyncStatus('Sincronizando apps...');
        try {
            const fetched = await fetchAllowedAppsFromServer();
            if (fetched !== null) {
                await loadApps();
                setSyncStatus(`✅ ${apps.length} app(s)`);
            } else {
                setSyncStatus('');
            }
        } catch (_) {
            setSyncStatus('');
        }
        setTimeout(() => setSyncStatus(''), 3000);
    };

    // ── Abrir app ─────────────────────────────────────────

    const handleOpenApp = async (app) => {
        const ok = await launchApp(app.packageName);
        if (!ok) {
            Alert.alert('Erro', `Não foi possível abrir ${app.appName}`);
        }
    };

    // ── Kiosk Toggle ──────────────────────────────────────

    const handleToggleKiosk = async () => {
        if (kioskActive) {
            // Para sair do kiosk, exige senha admin
            setShowAdminModal(true);
        } else {
            Alert.alert(
                '🔒 Ativar Modo Kiosk',
                'O dispositivo será bloqueado neste app. Apenas o administrador poderá sair.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ativar',
                        onPress: async () => {
                            const ok = await startKioskMode();
                            setKioskActive(ok);
                            if (!ok) Alert.alert('Erro', 'Não foi possível ativar o modo kiosk.');
                        }
                    }
                ]
            );
        }
    };

    // ── Autenticação admin ────────────────────────────────

    const handleAdminLogin = async () => {
        if (adminPassword === LOCAL_PASSWORD) {
            setShowAdminModal(false);
            setAdminPassword('');
            setAdminError('');
            await stopKioskMode();
            setKioskActive(false);
        } else {
            setAdminError('Senha incorreta');
        }
    };

    // ── Formatar data/hora ────────────────────────────────

    const formatTime = (d) =>
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const formatDate = (d) =>
        d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    // ── App Icon ──────────────────────────────────────────

    const AppIcon = ({ item }) => (
        <TouchableOpacity
            style={styles.appItem}
            onPress={() => handleOpenApp(item)}
            activeOpacity={0.7}
        >
            <View style={styles.appIconBox}>
                <Text style={styles.appEmoji}>
                    {getAppEmoji(item.packageName)}
                </Text>
            </View>
            <Text style={styles.appName} numberOfLines={2}>
                {item.appName}
            </Text>
        </TouchableOpacity>
    );

    // ── Render ────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <StatusBar hidden={kioskActive} />
            <LinearGradient
                colors={['#0f172a', '#1e3a5f', '#0f172a']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safe}>

                {/* ── Header: Relógio ── */}
                <View style={styles.header}>
                    <Text style={styles.clock}>{formatTime(time)}</Text>
                    <Text style={styles.date}>{formatDate(time)}</Text>
                    {syncStatus ? (
                        <Text style={styles.syncStatus}>{syncStatus}</Text>
                    ) : null}
                </View>

                {/* ── Grade de Apps ── */}
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#06b6d4" />
                        <Text style={styles.loadingText}>Carregando apps...</Text>
                    </View>
                ) : apps.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>Nenhum app permitido</Text>
                        <Text style={styles.emptySubText}>
                            Configure os apps permitidos no painel do servidor.
                        </Text>
                        <TouchableOpacity style={styles.refreshBtn} onPress={syncApps}>
                            <Text style={styles.refreshBtnText}>🔄 Sincronizar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={apps}
                        keyExtractor={(item) => item.packageName}
                        numColumns={COLS}
                        contentContainerStyle={styles.grid}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => <AppIcon item={item} />}
                    />
                )}

                {/* ── Footer: Controles ── */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.footerBtn} onPress={syncApps}>
                        <Text style={styles.footerIcon}>🔄</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.footerBtn, kioskActive && styles.footerBtnActive]}
                        onPress={handleToggleKiosk}
                    >
                        <Text style={styles.footerIcon}>{kioskActive ? '🔒' : '🔓'}</Text>
                        <Text style={styles.footerLabel}>
                            {kioskActive ? 'Kiosk ON' : 'Kiosk OFF'}
                        </Text>
                    </TouchableOpacity>

                    {/* Botão admin (secreto — long press) */}
                    <TouchableOpacity
                        style={styles.footerBtn}
                        onLongPress={() => setShowAdminModal(true)}
                        delayLongPress={2000}
                    >
                        <Text style={styles.footerIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            {/* ── Modal Admin ── */}
            <Modal
                visible={showAdminModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAdminModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>🔑 Acesso Admin</Text>
                        <Text style={styles.modalSubtitle}>
                            Insira a senha para sair do modo kiosk
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            value={adminPassword}
                            onChangeText={(t) => { setAdminPassword(t); setAdminError(''); }}
                            secureTextEntry
                            placeholder="Senha"
                            placeholderTextColor="#64748b"
                            autoFocus
                        />

                        {adminError ? (
                            <Text style={styles.modalError}>{adminError}</Text>
                        ) : null}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => { setShowAdminModal(false); setAdminPassword(''); setAdminError(''); }}
                            >
                                <Text style={styles.modalBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnConfirm]}
                                onPress={handleAdminLogin}
                            >
                                <Text style={styles.modalBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Ícone emoji por categoria de app (fallback visual enquanto não carrega ícone real)
function getAppEmoji(packageName) {
    const map = {
        'com.whatsapp':            '💬',
        'com.google.android.apps.maps': '🗺️',
        'com.android.chrome':     '🌐',
        'com.google.android.youtube': '▶️',
        'com.android.settings':   '⚙️',
        'com.android.camera2':    '📷',
        'com.google.android.gm':  '📧',
        'com.microsoft.teams':    '👥',
        'com.slack':               '💼',
        'com.spotify.music':       '🎵',
        'com.netflix.mediaclient': '🎬',
        'com.ubercab':             '🚗',
        'com.ifood.android':       '🍔',
    };
    for (const [key, emoji] of Object.entries(map)) {
        if (packageName.includes(key)) return emoji;
    }
    // Primeira letra do package como fallback
    const parts = packageName.split('.');
    return parts[parts.length - 1]?.[0]?.toUpperCase() || '📱';
}

const ITEM_SIZE = (width - 48) / COLS;

const styles = StyleSheet.create({
    container:      { flex: 1 },
    safe:           { flex: 1 },

    // Header
    header:         { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
    clock:          { fontSize: 64, fontWeight: '200', color: '#fff', letterSpacing: 2 },
    date:           { fontSize: 16, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' },
    syncStatus:     { fontSize: 12, color: '#06b6d4', marginTop: 8 },

    // Grid
    grid:           { paddingHorizontal: 16, paddingBottom: 20 },
    appItem: {
        width: ITEM_SIZE,
        alignItems: 'center',
        paddingVertical: 16,
    },
    appIconBox: {
        width: 60, height: 60,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    appEmoji:       { fontSize: 28 },
    appName:        { color: '#e2e8f0', fontSize: 11, textAlign: 'center', lineHeight: 14 },

    // Loading / Empty
    loadingBox:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText:    { color: '#94a3b8', marginTop: 12, fontSize: 15 },
    emptyBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon:      { fontSize: 64, marginBottom: 16 },
    emptyText:      { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptySubText:   { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    refreshBtn:     { marginTop: 24, backgroundColor: 'rgba(6,182,212,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#06b6d4' },
    refreshBtnText: { color: '#06b6d4', fontWeight: 'bold' },

    // Footer
    footer: {
        flexDirection: 'row', justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    footerBtn:      { alignItems: 'center', padding: 10, borderRadius: 12 },
    footerBtnActive:{ backgroundColor: 'rgba(239,68,68,0.2)' },
    footerIcon:     { fontSize: 24 },
    footerLabel:    { color: '#94a3b8', fontSize: 10, marginTop: 4 },

    // Modal Admin
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalBox: {
        backgroundColor: '#1e293b', borderRadius: 20,
        padding: 28, width: width * 0.85, maxWidth: 380,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle:     { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    modalSubtitle:  { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24 },
    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12, padding: 14,
        color: '#fff', fontSize: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 8,
    },
    modalError:     { color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
    modalButtons:   { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn:       { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.08)' },
    modalBtnConfirm:{ backgroundColor: '#06b6d4' },
    modalBtnText:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
