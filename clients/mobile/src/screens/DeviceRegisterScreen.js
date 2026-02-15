import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function DeviceRegisterScreen({ navigation }) {
    const [deviceName, setDeviceName] = useState('');
    const [model, setModel] = useState('');
    const [imei, setImei] = useState('');
    const [loading, setLoading] = useState(false);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        loadDeviceInfo();
    }, []);

    const loadDeviceInfo = async () => {
        setLoading(true);
        try {
            setDeviceName(Device.deviceName || 'Android Agent');
            setModel(Device.modelName || 'Unknown Model');

            // Get Android ID (as generic unique ID)
            let uniqueId = Application.androidId;
            if (!uniqueId) {
                // Fallback (e.g. for development/emulator)
                uniqueId = 'DEV-' + Math.random().toString(36).substr(2, 9);
            }
            setImei(uniqueId); // Using Android ID as primary identifier/IMEI representation

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!deviceName || !imei) {
            Alert.alert('Erro', 'Nome do dispositivo e ID/IMEI são obrigatórios.');
            return;
        }

        setRegistering(true);
        try {
            const response = await api.post('/devices/data', {
                device_name: deviceName,
                device_model: model,
                serial_number: imei, // Sending as serial_number to backend
                ip_address: '0.0.0.0', // Will be detected by server or updated later
                status: 'online',
                is_mobile: true
            });

            if (response.data.success) {
                await SecureStore.setItemAsync('device_registered', 'true');
                await SecureStore.setItemAsync('device_id', response.data.deviceId);
                Alert.alert('Sucesso', 'Dispositivo registrado!', [
                    { text: 'OK', onPress: () => navigation.replace('Login') }
                ]);
            } else {
                Alert.alert('Erro', 'Falha no registro: ' + response.data.message);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao conectar ao servidor. Verifique a URL e tente novamente.');
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
                    <ActivityIndicator size="large" color="#06b6d4" />
                ) : (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome do Dispositivo</Text>
                            <TextInput
                                style={styles.input}
                                value={deviceName}
                                onChangeText={setDeviceName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Modelo</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={model}
                                editable={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ID do Android / IMEI (Simulado)</Text>
                            <TextInput
                                style={styles.input}
                                value={imei}
                                onChangeText={setImei} // Allow manual edit if needed
                                placeholder="Insira IMEI ou ID"
                                placeholderTextColor="#64748b"
                            />
                            <Text style={styles.hint}>
                                * Devido a restrições do Android 10+, usamos o Android ID. Edite se necessário.
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={registering}>
                            {registering ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Registrar e Acessar</Text>
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
    inputGroup: { marginBottom: 20 },
    label: { color: '#cbd5e1', marginBottom: 8, fontSize: 14 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    disabledInput: { backgroundColor: 'rgba(255,255,255,0.02)', color: '#64748b' },
    button: {
        backgroundColor: '#06b6d4',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    hint: { color: '#64748b', fontSize: 12, marginTop: 5, fontStyle: 'italic' }
});
