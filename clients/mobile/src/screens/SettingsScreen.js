// clients/mobile/src/screens/SettingsScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../context/AuthContext';
import { buildServerUrl, normalizeServerInput } from '../utils/serverUrl';

export default function SettingsScreen({ navigation }) {
    const { saveSettings } = useContext(AuthContext);

    const [serialNumber, setSerialNumber] = useState('');
    const [imei, setImei] = useState('');
    const [sector, setSector] = useState('');
    const [floor, setFloor] = useState('');
    const [serverHost, setServerHost] = useState('192.168.0.183');
    const [serverPort, setServerPort] = useState('3000');
    const [serverProtocol, setServerProtocol] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [dataInterval, setDataInterval] = useState('10');
    const [heartbeatInterval, setHeartbeatInterval] = useState('3');
    const [commandCheckInterval, setCommandCheckInterval] = useState('1');
    const [obscureToken, setObscureToken] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoadingData(true);
        try {
            setSerialNumber((await SecureStore.getItemAsync('serial_number')) || '');
            setImei((await SecureStore.getItemAsync('imei')) || '');
            setSector((await SecureStore.getItemAsync('sector')) || '');
            setFloor((await SecureStore.getItemAsync('floor')) || '');
            setServerHost((await SecureStore.getItemAsync('server_host')) || '192.168.0.183');
            setServerPort((await SecureStore.getItemAsync('server_port')) || '3000');
            setServerProtocol((await SecureStore.getItemAsync('server_protocol')) || '');
            setAuthToken((await SecureStore.getItemAsync('auth_token')) || '');
            setDataInterval((await SecureStore.getItemAsync('data_interval')) || '10');
            setHeartbeatInterval((await SecureStore.getItemAsync('heartbeat_interval')) || '3');
            setCommandCheckInterval((await SecureStore.getItemAsync('command_check_interval')) || '1');
        } catch (e) {
            console.error('[SettingsScreen] Erro ao carregar:', e);
        } finally {
            setLoadingData(false);
        }
    };

    const save = async () => {
        if (!serialNumber.trim()) {
            Alert.alert('Erro', 'Numero de serie e obrigatorio.');
            return;
        }
        if (!serverHost.trim() || !serverPort.trim()) {
            Alert.alert('Erro', 'Host e porta do servidor sao obrigatorios.');
            return;
        }
        if (!authToken.trim()) {
            Alert.alert('Erro', 'Token de autenticacao e obrigatorio.');
            return;
        }

        const intervals = [dataInterval, heartbeatInterval, commandCheckInterval];
        if (intervals.some(value => Number.isNaN(parseInt(value, 10)))) {
            Alert.alert('Erro', 'Intervalos devem ser numeros validos.');
            return;
        }

        setLoading(true);
        try {
            const normalizedServer = normalizeServerInput(serverHost.trim(), serverPort.trim(), serverProtocol);
            await saveSettings({
                serialNumber: serialNumber.trim(),
                imei: imei.trim(),
                sector: sector.trim(),
                floor: floor.trim(),
                serverHost: normalizedServer.host,
                serverPort: normalizedServer.port,
                serverProtocol: normalizedServer.protocol,
                authToken: authToken.trim(),
                dataInterval: parseInt(dataInterval, 10) || 10,
                heartbeatInterval: parseInt(heartbeatInterval, 10) || 3,
                commandCheckInterval: parseInt(commandCheckInterval, 10) || 1,
            });

            Alert.alert('Sucesso', 'Configuracoes salvas com sucesso.', [
                { text: 'OK', onPress: () => (navigation.canGoBack() ? navigation.goBack() : null) },
            ]);
        } catch (e) {
            Alert.alert('Erro', 'Falha ao salvar configuracoes: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando configuracoes...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.pageTitle}>Configuracoes</Text>

                <Section title="Dispositivo">
                    <Field label="Numero de Serie" value={serialNumber} onChangeText={setSerialNumber} />
                    <Field label="IMEI" value={imei} onChangeText={setImei} keyboardType="numeric" />
                </Section>

                <Section title="Localizacao">
                    <Field label="Setor" value={sector} onChangeText={setSector} placeholder="Ex: TI" />
                    <Field label="Andar" value={floor} onChangeText={setFloor} placeholder="Ex: 1" />
                </Section>

                <Section title="Servidor">
                    <Field
                        label="Host do Servidor"
                        value={serverHost}
                        onChangeText={setServerHost}
                        placeholder="192.168.0.183 ou https://mdm.exemplo.com"
                        autoCapitalize="none"
                    />
                    <Field
                        label="Porta"
                        value={serverPort}
                        onChangeText={setServerPort}
                        placeholder="3000"
                        keyboardType="numeric"
                    />

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Token de Autenticacao</Text>
                        <View style={styles.tokenRow}>
                            <TextInput
                                style={[styles.input, styles.tokenInput]}
                                value={authToken}
                                onChangeText={setAuthToken}
                                secureTextEntry={obscureToken}
                                placeholder="Token de autenticacao"
                                placeholderTextColor="#9ca3af"
                            />
                            <TouchableOpacity style={styles.eyeBtn} onPress={() => setObscureToken(!obscureToken)}>
                                <Text style={styles.eyeText}>{obscureToken ? 'Mostrar' : 'Ocultar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.urlPreview}>
                        URL: {buildServerUrl(serverHost || '...', serverPort || '...', serverProtocol)}
                    </Text>
                </Section>

                <Section title="Intervalos (minutos)">
                    <Field label="Envio de Dados" value={dataInterval} onChangeText={setDataInterval} keyboardType="numeric" />
                    <Field label="Heartbeat" value={heartbeatInterval} onChangeText={setHeartbeatInterval} keyboardType="numeric" />
                    <Field label="Verificacao de Comandos" value={commandCheckInterval} onChangeText={setCommandCheckInterval} keyboardType="numeric" />
                </Section>

                <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={save} disabled={loading}>
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>Salvando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.saveButtonText}>Salvar Configuracoes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function Section({ title, children }) {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {children}
        </View>
    );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || label}
                placeholderTextColor="#9ca3af"
                keyboardType={keyboardType || 'default'}
                autoCapitalize={autoCapitalize || 'sentences'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, marginTop: 8 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 18 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 14,
        color: '#1e293b',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tokenRow: { flexDirection: 'row', alignItems: 'center' },
    tokenInput: { flex: 1, marginRight: 10 },
    eyeBtn: { paddingHorizontal: 10, justifyContent: 'center' },
    eyeText: { color: '#2563eb', fontWeight: '600' },
    urlPreview: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    saveButton: {
        backgroundColor: '#3b82f6',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 4,
        marginTop: 8,
    },
    saveButtonDisabled: { backgroundColor: '#93c5fd', elevation: 0 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    loadingText: { color: '#64748b', marginTop: 12, fontSize: 16 },
});
