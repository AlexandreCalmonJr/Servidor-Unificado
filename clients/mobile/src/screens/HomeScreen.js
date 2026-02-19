// clients/mobile/src/screens/HomeScreen.js
// Espelho de DeviceService (main.dart):
//   - sendDeviceData()   → POST /api/devices/data     (data_interval)
//   - sendHeartbeat()    → POST /api/devices/heartbeat (heartbeat_interval)
//   - checkForCommands() → via CommandService          (command_check_interval)
//   - _deviceInfo fields → battery, network, ip_address, serial_number, etc.

import React, { useState, useEffect, useRef, useContext } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, ScrollView,
    Animated, Easing, SafeAreaView, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import CommandService from '../services/CommandService';

export default function HomeScreen({ navigation }) {
    const { deviceInfo, refreshDeviceInfo, serverUrl } = useContext(AuthContext);

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('Online');
    const [lastDataSync, setLastDataSync] = useState(null);
    const [lastHeartbeat, setLastHeartbeat] = useState(null);
    const [batteryLevel, setBatteryLevel] = useState(0);
    const [ipAddress, setIpAddress] = useState('...');
    const [serialNumber, setSerialNumber] = useState('...');
    const [liveInfo, setLiveInfo] = useState({});

    const rotateAnim = useRef(new Animated.Value(0)).current;
    const syncTimerRef = useRef(null);
    const heartbeatTimerRef = useRef(null);

    useEffect(() => {
        // Carrega informações ao montar
        _loadInfo();

        // Inicia ciclos (main.dart → background_service onStart)
        _startCycles();

        // Inicia verificação de comandos (CommandService)
        CommandService.start();

        // Sincronização inicial
        handleSync();

        return () => {
            clearInterval(syncTimerRef.current);
            clearInterval(heartbeatTimerRef.current);
            CommandService.stop();
        };
    }, []);

    const _loadInfo = async () => {
        // Lê campos do SecureStore (main.dart → _updateDeviceStatus)
        const serial = await SecureStore.getItemAsync('serial_number') || 'N/A';
        setSerialNumber(serial);

        try {
            const level = await Battery.getBatteryLevelAsync();
            setBatteryLevel(Math.round(level * 100));
        } catch (_) { }

        try {
            const ip = await Network.getIpAddressAsync();
            setIpAddress(ip || 'N/A');
        } catch (_) { }

        const info = await refreshDeviceInfo();
        setLiveInfo(info || {});
    };

    // _startCycles — background_service onStart (main.dart)
    const _startCycles = async () => {
        const dataIntervalMin = parseInt(await SecureStore.getItemAsync('data_interval')) || 10;
        const heartbeatIntervalMin = parseInt(await SecureStore.getItemAsync('heartbeat_interval')) || 3;

        // Ciclo de envio de dados (main.dart: data_interval)
        syncTimerRef.current = setInterval(() => {
            handleSync();
        }, dataIntervalMin * 60 * 1000);

        // Ciclo de heartbeat (main.dart: heartbeat_interval)
        heartbeatTimerRef.current = setInterval(() => {
            _sendHeartbeat();
        }, heartbeatIntervalMin * 60 * 1000);

        console.log(`[HomeScreen] Ciclos iniciados — dados: ${dataIntervalMin}min | heartbeat: ${heartbeatIntervalMin}min`);
    };

    // Animação de sincronização
    const _startSpinAnimation = () => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    };

    const _stopSpinAnimation = () => {
        rotateAnim.stopAnimation();
        rotateAnim.setValue(0);
    };

    // handleSync → DeviceService.sendDeviceData() (main.dart)
    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncStatus('Sincronizando...');
        _startSpinAnimation();

        try {
            // Atualiza info em tempo real antes de enviar
            const info = await refreshDeviceInfo();
            setLiveInfo(info || {});

            // Atualiza bateria e IP
            try {
                const level = await Battery.getBatteryLevelAsync();
                setBatteryLevel(Math.round(level * 100));
                info.battery = Math.round(level * 100);
            } catch (_) { }

            try {
                const ip = await Network.getIpAddressAsync();
                setIpAddress(ip || 'N/A');
                info.ip_address = ip || 'N/A';
            } catch (_) { }

            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) {
                setSyncStatus('Token ausente');
                return;
            }

            // POST /api/modules/mobile/assets  (Migração Unified Schema)
            const payload = {
                asset_name: deviceInfo.device_name || 'Agente Mobile',
                model: deviceInfo.model || 'Unknown',
                serial_number: serialNumber,
                // imei: assumindo que já foi enviado no registro ou está no contexto, senão N/A.
                // O Contexto deviceInfo pode não ter todos os campos se não foi recarregado.
                // Vamos usar os dados liveInfo onde possível.
                battery_level: Math.round(level * 100),
                ip_address: ipAddress,
                mac_address: liveInfo.mac_address || 'N/A',
                sector: liveInfo.sector || 'N/A',
                floor: liveInfo.floor || 'N/A',
                last_seen: new Date().toISOString(),
                android_id: Application.androidId || serialNumber,
                os_version: Device.osVersion || 'N/A',
                manufacturer: Device.manufacturer || 'N/A',
                status: 'online',
                custom_data: {
                    network: 'N/A', // Não temos acesso direto ao SSID no Expo Managed sem config extra
                    operating_system: `${Platform.OS} ${Device.osVersion || ''}`.trim()
                }
            };

            const response = await api.post('/modules/mobile/assets', payload);

            if (response.status === 200 || response.status === 201 || response.data?.success) {
                const now = new Date();
                setLastDataSync(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                setSyncStatus('Online');
                // Salva last_sync (main.dart → prefs.setString('last_sync'))
                await SecureStore.setItemAsync('last_sync', now.toISOString());
                console.log('[HomeScreen] ✅ Dados enviados (Module API)');
            } else {
                setSyncStatus('Erro no envio');
            }

        } catch (error) {
            console.error('[HomeScreen] ❌ Falha ao sincronizar:', error.message);
            setSyncStatus(error.response?.status === 401 ? 'Token inválido' : 'Offline');
        } finally {
            setIsSyncing(false);
            _stopSpinAnimation();
        }
    };

    // _sendHeartbeat → DeviceService.sendHeartbeat() (main.dart)
    const _sendHeartbeat = async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const deviceId = await SecureStore.getItemAsync('serial_number');
            if (!token || !deviceId) return;

            // POST /api/devices/heartbeat  (main.dart → sendHeartbeat)
            const response = await api.post('/devices/heartbeat', {
                device_id: deviceId,
                serial_number: deviceId,
                battery: batteryLevel,
                last_seen: new Date().toISOString(),
            });

            if (response.status === 200) {
                setLastHeartbeat(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                console.log('[HomeScreen] 💓 Heartbeat enviado');
            }
        } catch (e) {
            console.warn('[HomeScreen] Heartbeat falhou:', e.message);
        }
    };

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const batteryColor = batteryLevel > 50 ? '#10b981' : batteryLevel > 20 ? '#f59e0b' : '#ef4444';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Agente Mobile</Text>
                    <Text style={styles.headerSubtitle}>Monitoramento Ativo</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: syncStatus === 'Online' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                    <Text style={[styles.statusText, { color: syncStatus === 'Online' ? '#10b981' : '#ef4444' }]}>
                        {syncStatus}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* BOTÃO SINCRONIZAR */}
                <View style={styles.syncContainer}>
                    <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
                        <LinearGradient
                            colors={['#06b6d4', '#8b5cf6']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.syncGradient}
                        >
                            <Animated.Text style={[styles.syncIcon, isSyncing && { transform: [{ rotate: spin }] }]}>
                                🔄
                            </Animated.Text>
                            <Text style={styles.syncText}>{isSyncing ? 'Enviando...' : 'Sincronizar'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* STATS CARDS  (home_screen.dart → _buildStatusDashboard) */}
                <View style={styles.grid}>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Bateria</Text>
                        <Text style={[styles.cardValue, { color: batteryColor }]}>{batteryLevel}%</Text>
                        <View style={styles.batteryBar}>
                            <View style={[styles.batteryFill, { width: `${batteryLevel}%`, backgroundColor: batteryColor }]} />
                        </View>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Status</Text>
                        <Text style={[styles.cardValue, { color: syncStatus === 'Online' ? '#10b981' : '#ef4444' }]}>
                            {syncStatus === 'Online' ? 'Online' : 'Offline'}
                        </Text>
                        <Text style={styles.cardSub}>{syncStatus}</Text>
                    </View>
                </View>

                {/* INFO DO DISPOSITIVO  (home_screen.dart → _buildStatusItem) */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>📱 Informações do Dispositivo</Text>

                    <InfoRow label="Modelo" value={Device.modelName || 'N/A'} />
                    <InfoRow label="OS" value={`${Platform.OS} ${Device.osVersion || ''}`.trim()} />
                    <InfoRow label="Fabricante" value={Device.manufacturer || 'N/A'} />
                    <InfoRow label="Serial" value={serialNumber} />
                    <InfoRow label="IP" value={ipAddress} />
                    <InfoRow label="BSSID/MAC" value={liveInfo.mac_address_radio || 'N/A'} />
                    <InfoRow label="Setor" value={liveInfo.sector || 'N/A'} />
                    <InfoRow label="Andar" value={liveInfo.floor || 'N/A'} />
                    <InfoRow label="Último Envio" value={lastDataSync || 'Nunca'} />
                    <InfoRow label="Último Heartbeat" value={lastHeartbeat || 'Nunca'} />
                </View>

                {/* AÇÕES RÁPIDAS  (home_screen.dart → _buildQuickActions) */}
                <View style={styles.quickActions}>
                    <Text style={styles.infoTitle}>⚡ Ações Rápidas</Text>
                    <View style={styles.actionsRow}>
                        <ActionBtn label="Sincronizar" icon="🔄" color="#06b6d4" onPress={handleSync} />
                        <ActionBtn label="Heartbeat" icon="💓" color="#10b981" onPress={_sendHeartbeat} />
                        <ActionBtn label="Configurações" icon="⚙️" color="#8b5cf6"
                            onPress={() => navigation.navigate('Settings')} />
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ label, value }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}:</Text>
            <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
        </View>
    );
}

function ActionBtn({ label, icon, color, onPress }) {
    return (
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
            <View style={[styles.actionIcon, { backgroundColor: `${color}22` }]}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#94a3b8' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    content: { padding: 20, paddingBottom: 40 },
    syncContainer: { alignItems: 'center', marginVertical: 24 },
    syncButton: { width: 140, height: 140, borderRadius: 70, elevation: 10, shadowColor: '#06b6d4', shadowOpacity: 0.5, shadowRadius: 20 },
    syncGradient: { flex: 1, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
    syncIcon: { fontSize: 36, color: '#fff', marginBottom: 8 },
    syncText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: {
        backgroundColor: 'rgba(30,41,59,0.8)', width: '48%',
        padding: 18, borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    cardLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
    cardValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    cardSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
    batteryBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
    batteryFill: { height: '100%', borderRadius: 2 },
    infoCard: {
        backgroundColor: 'rgba(30,41,59,0.8)', padding: 20,
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20,
    },
    infoTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    rowLabel: { color: '#94a3b8', fontSize: 13, flex: 1 },
    rowValue: { color: '#fff', fontWeight: '500', fontSize: 13, flex: 2, textAlign: 'right' },
    quickActions: {
        backgroundColor: 'rgba(30,41,59,0.8)', padding: 20,
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
    actionBtn: { alignItems: 'center' },
    actionIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
});