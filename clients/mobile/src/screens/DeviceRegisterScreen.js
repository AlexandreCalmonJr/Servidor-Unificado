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
    const { finishRegistration, setLocalAdminPassword } = useContext(AuthContext);

    const [deviceName, setDeviceName] = useState('');
    const [model, setModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [imei, setImei] = useState('');
    const [sector, setSector] = useState('');
    const [floor, setFloor] = useState('');
    const [ipAddress, setIpAddress] = useState('0.0.0.0');
    const [batteryLevel, setBatteryLevel] = useState(0);
    const [loading, setLoading] = useState(false);
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
            } catch (_) { }
            setSerialNumber(serial);

            // IMEI salvo ou Android ID (main.dart → prefs.getString('imei'))
            const savedImei = await SecureStore.getItemAsync('imei');
            setImei(savedImei || Application.androidId || 'N/A');

            // Setor e andar das configurações salvas
            const savedSector = await SecureStore.getItemAsync('sector') || '';
            const savedFloor = await SecureStore.getItemAsync('floor') || '';
            setSector(savedSector);
            setFloor(savedFloor);

            // IP  (main.dart → networkInfo.getWifiIP())
            try {
                const ip = await Network.getIpAddressAsync();
                if (ip) setIpAddress(ip);
            } catch (_) { }

            // Bateria (main.dart → battery.batteryLevel)
            try {
                const level = await Battery.getBatteryLevelAsync();
                setBatteryLevel(Math.round(level * 100));
            } catch (_) { }

        } catch (e) {
            console.error('[DeviceRegister] Erro ao carregar info:', e);
        } finally {
            setLoading(false);
        }
    };

    // handleRegister → POST /api/provisioning/enroll ou /api/modules/mobile/assets
    const handleRegister = async () => {
        if (!deviceName || !serialNumber) {
            Alert.alert('Erro', 'Nome do dispositivo e número de série são obrigatórios.');
            return;
        }

        setRegistering(true);
        try {
            // Persiste os campos de localização para uso futuro
            await SecureStore.setItemAsync('sector', sector);
            await SecureStore.setItemAsync('floor', floor);
            await SecureStore.setItemAsync('serial_number', serialNumber);
            await SecureStore.setItemAsync('imei', imei);

            const authToken = await SecureStore.getItemAsync('auth_token');

            let response;
            let usedEnroll = false;

            // Se o token parece ser um token de provisionamento via QRCode (ex: 64 chars) ou foi lido pelo leitor
            // O ideal seria que a tela anterior marcasse isso, mas podemos sempre tentar a rota unificada primeiro se acharmos que é provisionamento.
            if (authToken && authToken.length >= 32) { // Typically provisioning tokens are 64 hex strings
                usedEnroll = true;
                const enrollPayload = {
                    provisioning_token: authToken,
                    device_id: Application.androidId || serialNumber,
                    device_name: deviceName,
                    device_model: model,
                    serial_number: serialNumber,
                    imei: imei || 'N/A',
                    android_id: Application.androidId || serialNumber,
                    ip_address: ipAddress,
                    mac_address_radio: 'N/A',
                    wifi_ipv6: 'N/A',
                    wifi_gateway_ip: 'N/A',
                    wifi_broadcast: 'N/A',
                    wifi_submask: 'N/A'
                };

                // Enviando para a rota unificada de provisionamento
                response = await api.post('/provisioning/enroll', enrollPayload);

            } else {
                // Endpoint antigo/direto: POST /api/modules/mobile/assets (se não for provisionamento zero-touch)
                const payload = {
                    asset_name: deviceName,
                    model: model,
                    serial_number: serialNumber,
                    imei: imei || 'N/A',
                    battery_level: batteryLevel,
                    ip_address: ipAddress,
                    mac_address: 'N/A',
                    sector: sector || 'N/A',
                    floor: floor || 'N/A',
                    last_seen: new Date().toISOString(),
                    android_id: Application.androidId || serialNumber,
                    os_version: Device.osVersion || 'N/A',
                    manufacturer: Device.manufacturer || 'N/A',
                    status: 'online',
                    custom_data: {
                        network: 'N/A',
                        operating_system: `${Platform.OS} ${Device.osVersion || ''}`.trim()
                    }
                };

                response = await api.post('/modules/mobile/assets', payload);
            }

            if (response.data?.success || response.status === 200 || response.status === 201 || response.data?.message?.includes('sucesso')) {
                // Unified API retorna { success: true, asset: { id: ... } } ou o Provisionamento retorna device_id
                const deviceId = response.data?.asset?.id || response.data?.asset?._id || response.data?.device_id || serialNumber;

                if (usedEnroll && response.data?.device_token) {
                    await SecureStore.setItemAsync('auth_token', response.data.device_token);
                }
                if (usedEnroll && response.data?.local_admin_password) {
                    await setLocalAdminPassword(response.data.local_admin_password);
                }

                // Finaliza o provisionamento na API (opcional, dependendo do design, mas o enroll já cria o dispositivo)
                if (usedEnroll) {
                    try {
                        await api.post('/provisioning/complete', {
                            device_id: deviceId,
                            serial_number: serialNumber,
                            success: true
                        });
                    } catch (err) {
                        console.log('Aviso ao completar provisionamento:', err);
                    }
                }

                await finishRegistration(deviceId);
                Alert.alert('✅ Sucesso', 'Dispositivo configurado e registrado com sucesso!', [
                    { text: 'OK', onPress: () => navigation.replace('Login') }
                ]);
            } else {
                Alert.alert('Erro', 'Falha no registro: ' + (response.data?.message || response.data?.error || 'Resposta inválida'));
            }

        } catch (error) {
            console.error('[DeviceRegister] Erro:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro desconhecido';
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
                            style={[styles.button, registering && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={registering}
                        >
                            {registering ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonText}>Registrando no MDM...</Text>
                                </View>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { padding: 30, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
    inputGroup: { marginBottom: 18 },
    label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: '500' },
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
    hint: { color: '#64748b', fontSize: 11, marginTop: 5, fontStyle: 'italic' },
    infoBox: {
        backgroundColor: 'rgba(6,182,212,0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.2)',
    },
    infoTitle: { color: '#06b6d4', fontWeight: 'bold', marginBottom: 10, fontSize: 14 },
    infoItem: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
    button: {
        backgroundColor: '#06b6d4',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        elevation: 4,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { backgroundColor: '#0ea5e9', opacity: 0.8 }
});
