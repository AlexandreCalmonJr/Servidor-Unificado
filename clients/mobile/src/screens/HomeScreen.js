import React, { useState, useEffect, useRef, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Easing, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

import CommandService from '../services/CommandService';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState('Online');
    const [lastSync, setLastSync] = useState(null);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // Auth Context to get device info if needed, or just load from secure store

    useEffect(() => {
        // Initial Heartbeat
        handleSync();
        const interval = setInterval(handleSync, 30000); // Auto sync every 30s

        // Start Command Service
        CommandService.start();

        return () => {
            clearInterval(interval);
            CommandService.stop();
        };
    }, []);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setStatus('Sincronizando...');

        // Spin animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        try {
            const serialNumber = await SecureStore.getItemAsync('device_registered') === 'true'
                ? await SecureStore.getItemAsync('device_id') // or Android ID if stored
                : 'unknown';

            // We need to send the actual serial number used during registration
            // For now, let's assume the backend handles the ID we got from registration response
            // or we stored the Android ID as 'serial_number' locally.
            // Let's use a dummy heartbeat for now or try to use the stored ID.

            // In a real scenario, we should store the 'serial_number' used for registration.

            // Mocking success for UI demo if API fails (since we might not have a real server running reachable from here)
            // But trying real request:
            // const response = await api.post('/devices/heartbeat', { serial_number: ... });

            setTimeout(() => {
                setIsSyncing(false);
                setStatus('Online');
                setLastSync(new Date().toLocaleTimeString());
                rotateAnim.setValue(0);
            }, 2000);

        } catch (error) {
            console.error(error);
            setIsSyncing(false);
            setStatus('Offline');
        }
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Agente Mobile</Text>
                    <Text style={styles.headerSubtitle}>Monitoramento Ativo</Text>
                </View>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* SYNC BUTTON */}
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

                {/* STATUS CARDS */}
                <View style={styles.grid}>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Bateria</Text>
                        <Text style={styles.cardValue}>98%</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Armazenamento</Text>
                        <Text style={styles.cardValue}>45GB Livres</Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Informações do Dispositivo</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Modelo:</Text>
                        <Text style={styles.value}>{Device.modelName || 'Genérico'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>OS:</Text>
                        <Text style={styles.value}>Android {Device.osVersion}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Último Sync:</Text>
                        <Text style={styles.value}>{lastSync || 'Nunca'}</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: '#94a3b8' },
    statusBadge: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { color: '#10b981', fontWeight: 'bold', fontSize: 12 },
    content: { padding: 20 },
    syncContainer: { alignItems: 'center', marginVertical: 30 },
    syncButton: { width: 160, height: 160, borderRadius: 80, elevation: 10, shadowColor: '#06b6d4', shadowOpacity: 0.5, shadowRadius: 20 },
    syncGradient: { flex: 1, borderRadius: 80, justifyContent: 'center', alignItems: 'center' },
    syncIcon: { fontSize: 40, color: '#fff', marginBottom: 8 },
    syncText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: { backgroundColor: 'rgba(30, 41, 59, 0.5)', width: '48%', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 5 },
    cardValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    infoCard: { backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    infoTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { color: '#94a3b8' },
    value: { color: '#fff', fontWeight: '500' }
});
