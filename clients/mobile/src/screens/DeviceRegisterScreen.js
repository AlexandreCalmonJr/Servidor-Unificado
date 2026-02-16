// clients/mobile/src/screens/DeviceRegisterScreen.js
// Espelho de DeviceService._updateDeviceStatus() + sendDeviceData() (main.dart)
//
// Payload enviado para POST /api/devices/data:
//   Idêntico ao _deviceInfo do Flutter (device_name, device_model, serial_number,
//   imei, battery, network, ip_address, mac_address_radio, sector, floor, etc.)

import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView, Platform
} from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function DeviceRegisterScreen({ navigation }) {
    const { finishRegistration } = useContext(AuthContext);

    const [deviceName,  setDeviceName]  = useState('');
    const [model,       setModel]       = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [imei,        setImei]        = useState('');
    const [sector,      setSector]      = useState('');
    const [floor,       setFloor]       = useState('');
    const [ipAddress,   setIpAddress]   = useState('0.0.0.0');
    const [batteryLevel, setBatteryLevel] = useState(0);
    const [loading,     setLoading]     = useState(false);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        loadDeviceInfo();
    }, []);

    // _updateDeviceStatus (main.dart) — coleta as informações do dispositivo
    const loadDeviceInfo = async () => {
        setLoading(true);
        try {
            setDeviceName(Device.deviceName || 'Android Agent');
            setModel(Device.modelName || 'Unknown Model');

            // Serial number (main.dart → androidInfo.serialNumber com fallback)
            let serial = 'N/A';
            try {
                // Valor salvo anteriormente (prioridade)
                const savedSerial = await SecureStore.getItemAsync('serial_number');
                if (savedSerial && savedSerial !== 'N/A') {
                    serial = savedSerial;
                } else if (Platform.OS === 'android') {
                    // Android ID como identificador seguro (main.dart → androidInfo.id)
                    serial = Application.androidId || ('DEV-' + Math.random().toString(36).substr(2, 9));
                } else {
                    serial = Application.applicationId || 'UNKNOWN';
                }
            } catch (_) {}
            setSerialNumber(serial);

            // IMEI salvo ou Android ID (main.dart → prefs.getString('imei'))
            const savedImei = await SecureStore.getItemAsync('imei');
            setImei(savedImei || Application.androidId || 'N/A');

            // Setor e andar das configurações salvas
            const savedSector = await SecureStore.getItemAsync('sector') || '';
            const savedFloor  = await SecureStore.getItemAsync('floor')  || '';
            setSector(savedSector);
            setFloor(savedFloor);

            // IP  (main.dart → networkInfo.getWifiIP())
            try {
                const ip = await Network.getIpAddressAsync();
                if (ip) setIpAddress(ip);
            } catch (_) {}

            // Bateria (main.dart → battery.batteryLevel)
            try {
                const level = await Battery.getBatteryLevelAsync();
                setBatteryLevel(Math.round(level * 100));
            } catch (_) {}

        } catch (e) {
            console.error('[DeviceRegister] Erro ao carregar info:', e);
        } finally {
            setLoading(false);
        }
    };

    // handleRegister → POST /api/devices/data (DeviceService.sendDeviceData em main.dart)
    const handleRegister = async () => {
        if (!deviceName || !serialNumber) {
            Alert.alert('Erro', 'Nome do dispositivo e número de série são obrigatórios.');
            return;
        }

        setRegistering(true);
        try {
            // Persiste os campos de localização para uso futuro
            await SecureStore.setItemAsync('sector',        sector);
            await SecureStore.setItemAsync('floor',         floor);
            await SecureStore.setItemAsync('serial_number', serialNumber);
            await SecureStore.setItemAsync('imei',          imei);

            // Payload idêntico ao _deviceInfo do Flutter (main.dart → _updateDeviceStatus)
            const payload = {
                device_name:       deviceName,
                device_model:      model,
                serial_number:     serialNumber,
                imei:              imei || 'N/A',
                device_id:         Device.osInternalBuildId || serialNumber,
                battery:           batteryLevel,
                ip_address:        ipAddress,
                mac_address_radio: 'N/A',  // BSSID — sem acesso direto no Expo
                network:           'N/A',
                host:              deviceName,
                sector:            sector || 'N/A',
                floor:             floor  || 'N/A',
                last_seen:         new Date().toISOString(),
                secure_android_id: Application.androidId || serialNumber,
                operating_system:  `${Platform.OS} ${Device.osVersion || ''}`.trim(),
                os_version:        Device.osVersion   || 'N/A',
                manufacturer:      Device.manufacturer || 'N/A',
                status:            'online',
                is_mobile:         true,
            };

            const response = await api.post('/devices/data', payload);

            if (response.data?.success || response.status === 200) {
                const deviceId = response.data?.deviceId || response.data?.device?.id || serialNumber;
                await finishRegistration(deviceId);
                Alert.alert('✅ Sucesso', 'Dispositivo registrado com sucesso!', [
                    { text: 'OK', onPress: () => navigation.replace('Login') }
                ]);
            } else {
                Alert.alert('Erro', 'Falha no registro: ' + (response.data?.message || 'Resposta inválida'));
            }

        } catch (error) {
            console.error('[DeviceRegister] Erro:', error);
            const msg = error.response?.data?.message || error.message || 'Erro desconhecido';
            Alert.alert('Erro de Conexão', `Não foi possível registrar o dispositivo.\n${msg}`);
        } finally {
            setRegistering(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Registrar Dispositivo</Text>
                <Text style={styles.subtitle}>Confirme os dados do aparelho</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#06b6d4" style={{ marginVertical: 40 }} />
                ) : (
                    <>
                        {/* Nome do Dispositivo (main.dart → device_name) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome do Dispositivo</Text>
                            <TextInput
                                style={styles.input}
                                value={deviceName}
                                onChangeText={setDeviceName}
                                placeholder="Nome do aparelho"
                                placeholderTextColor="#64748b"
                            />
                        </View>

                        {/* Modelo (main.dart → device_model) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Modelo</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={model}
                                editable={false}
                            />
                        </View>

                        {/* Serial Number (main.dart → serial_number) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Número de Série</Text>
                            <TextInput
                                style={styles.input}
                                value={serialNumber}
                                onChangeText={setSerialNumber}
                                placeholder="Número de série"
                                placeholderTextColor="#64748b"
                            />
                            <Text style={styles.hint}>
                                * Android ID utilizado como identificador único neste aparelho.
                            </Text>
                        </View>

                        {/* IMEI (main.dart → imei) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>IMEI</Text>
                            <TextInput
                                style={styles.input}
                                value={imei}
                                onChangeText={setImei}
                                placeholder="IMEI do aparelho"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Setor (main.dart → sector) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Setor</Text>
                            <TextInput
                                style={styles.input}
                                value={sector}
                                onChangeText={setSector}
                                placeholder="Ex: TI, RH, Financeiro"
                                placeholderTextColor="#64748b"
                            />
                        </View>

                        {/* Andar (main.dart → floor) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Andar</Text>
                            <TextInput
                                style={styles.input}
                                value={floor}
                                onChangeText={setFloor}
                                placeholder="Ex: 1, 2, Térreo"
                                placeholderTextColor="#64748b"
                            />
                        </View>

                        {/* Info Automática */}
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>📊 Dados Coletados Automaticamente</Text>
                            <Text style={styles.infoItem}>🔋 Bateria: {batteryLevel}%</Text>
                            <Text style={styles.infoItem}>🌐 IP: {ipAddress}</Text>
                            <Text style={styles.infoItem}>📱 OS: {Platform.OS} {Device.osVersion || ''}</Text>
                            <Text style={styles.infoItem}>🏭 Fabricante: {Device.manufacturer || 'N/A'}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleRegister}
                            disabled={registering}
                        >
                            {registering ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Registrar Dispositivo</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: '#0f172a' },
    background:    { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content:       { padding: 30, paddingTop: 60 },
    title:         { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle:      { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
    inputGroup:    { marginBottom: 18 },
    label:         { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: '500' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        fontSize: 15,
    },
    disabledInput: { backgroundColor: 'rgba(255,255,255,0.03)', color: '#64748b' },
    hint:          { color: '#64748b', fontSize: 11, marginTop: 5, fontStyle: 'italic' },
    infoBox: {
        backgroundColor: 'rgba(6,182,212,0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.2)',
    },
    infoTitle:     { color: '#06b6d4', fontWeight: 'bold', marginBottom: 10, fontSize: 14 },
    infoItem:      { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
    button: {
        backgroundColor: '#06b6d4',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        elevation: 4,
    },
    buttonText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});