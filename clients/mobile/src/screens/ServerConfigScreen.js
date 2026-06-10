// clients/mobile/src/screens/ServerConfigScreen.js
// Espelho de settings_screen.dart (Flutter):
//   - Campos: server_host, server_port, auth_token (separados, igual ao Flutter)
//   - Teste de conexão: GET /api/auth/validate (igual ao agent_provider.dart → _testConnection)
//   - Salva: server_host, server_port, auth_token no SecureStore

import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../context/AuthContext';
import { buildServerUrl, normalizeServerInput } from '../utils/serverUrl';

export default function ServerConfigScreen({ navigation }) {
    const { saveSettings, settings } = useContext(AuthContext);

    const [serverHost, setServerHost] = useState('192.168.0.183');
    const [serverPort, setServerPort] = useState('3000');
    const [serverProtocol, setServerProtocol] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
    const [testMessage, setTestMessage] = useState('');

    // Scanner
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        // Carrega configurações salvas (main.dart → initialize)
        loadSavedConfig();
    }, []);

    const loadSavedConfig = async () => {
        const host = await SecureStore.getItemAsync('server_host');
        const port = await SecureStore.getItemAsync('server_port');
        const protocol = await SecureStore.getItemAsync('server_protocol');
        const token = await SecureStore.getItemAsync('auth_token');
        if (host) setServerHost(host);
        if (port) setServerPort(port);
        if (protocol) setServerProtocol(protocol);
        if (token) setAuthToken(token);
    };

    // Teste de conexão (agent_provider.dart → _testConnection: GET /api/auth/validate)
    const handleTest = async () => {
        if (!serverHost || !serverPort || !authToken) {
            setTestResult('error');
            setTestMessage('Preencha todos os campos antes de testar.');
            return;
        }

        setLoading(true);
        setTestResult(null);

        try {
            const normalized = normalizeServerInput(serverHost.trim(), serverPort.trim(), serverProtocol);
            const baseUrl = normalized.url;
            const token = authToken.trim();

            if (token.length >= 32) {
                const provisioningResponse = await fetch(
                    `${baseUrl}/api/provisioning/tokens/${encodeURIComponent(token)}/status`,
                    { method: 'GET' }
                );

                if (provisioningResponse.ok) {
                    setServerHost(normalized.host);
                    setServerPort(normalized.port);
                    setServerProtocol(normalized.protocol);
                    setTestResult('success');
                    setTestMessage('Token de provisionamento válido.');
                    return;
                }

                if (provisioningResponse.status === 410) {
                    setTestResult('error');
                    setTestMessage('Token de provisionamento expirado ou esgotado.');
                    return;
                }
            }

            let response = await fetch(`${baseUrl}/api/auth/validate`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'AUTH_TOKEN': token,
                },
            });

            if (response.status === 401 || response.status === 403) {
                response = await fetch(`${baseUrl}/api/modules/active`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'AUTH_TOKEN': token,
                    },
                });
            }

            if (response.status === 401 || response.status === 403) {
                setTestResult('error');
                setTestMessage('Token inválido ou expirado.');
            } else if (response.ok) {
                setServerHost(normalized.host);
                setServerPort(normalized.port);
                setServerProtocol(normalized.protocol);
                setTestResult('success');
                setTestMessage('✅ Conexão bem-sucedida!');
            } else {
                setTestResult('error');
                setTestMessage(`Falha: HTTP ${response.status}`);
            }
        } catch (e) {
            setTestResult('error');
            setTestMessage(`Não foi possível conectar ao servidor.\n${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Salvar e continuar (settings_screen.dart → _saveSettings)
    const handleSave = async () => {
        if (!serverHost || !serverPort || !authToken) {
            Alert.alert('Erro', 'Host, porta e token são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const normalized = normalizeServerInput(serverHost.trim(), serverPort.trim(), serverProtocol);
            await saveSettings({
                serverHost: normalized.host,
                serverPort: normalized.port,
                serverProtocol: normalized.protocol,
                authToken: authToken.trim(),
            });
            // Não precisa navegar manualmente; o AuthContext atualiza o estado (isConfigured)
            // e o App.js muda a rota automaticamente.
        } catch (e) {
            Alert.alert('Erro', 'Falha ao salvar configurações: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // QR Code Scanner Handlers
    const openScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permissão negada', 'Autorize o uso da câmera para ler o QR Code.');
                return;
            }
        }
        setIsScanning(true);
    };

    const handleBarcodeScanned = ({ type, data }) => {
        setIsScanning(false);
        try {
            // Esperado: {"provisioning_token": "...", "url": "http://IP:PORT/api/provisioning/enroll"}
            const parsed = JSON.parse(data);
            if (parsed.provisioning_token && parsed.url) {
                const urlObj = new URL(parsed.url);
                const host = urlObj.hostname;
                const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');

                setServerHost(host);
                setServerPort(port);
                setServerProtocol(urlObj.protocol.replace(':', ''));
                setAuthToken(parsed.provisioning_token);

                // Alert success via test messages
                setTestResult('success');
                setTestMessage('✅ QR Code LIDO! Teste ou Salve para continuar.');
            } else {
                throw new Error('Formato inválido');
            }
        } catch (e) {
            Alert.alert('Erro no Leitor', 'QR Code inválido ou formato desconhecido.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background} />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🛡️</Text>
                </View>

                <Text style={styles.title}>Configuração Inicial</Text>
                <Text style={styles.subtitle}>Unified MDM Agent Mobile</Text>

                {/* HOST DO SERVIDOR (settings_screen.dart → server_host) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Host do Servidor</Text>
                    <TextInput
                        style={styles.input}
                        value={serverHost}
                        onChangeText={setServerHost}
                        placeholder="192.168.0.183"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                        keyboardType="default"
                    />
                </View>

                {/* PORTA DO SERVIDOR (settings_screen.dart → server_port) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Porta do Servidor</Text>
                    <TextInput
                        style={styles.input}
                        value={serverPort}
                        onChangeText={setServerPort}
                        placeholder="3000"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                    />
                </View>

                {/* TOKEN (settings_screen.dart → auth_token) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Token de Autenticação</Text>
                    <TextInput
                        style={styles.input}
                        value={authToken}
                        onChangeText={setAuthToken}
                        placeholder="Token de Autenticação"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                    />
                </View>

                {/* Resultado do teste */}
                {testResult && (
                    <View style={[styles.testResultBox, testResult === 'success' ? styles.testSuccess : styles.testError]}>
                        <Text style={styles.testResultText}>{testMessage}</Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.button, styles.testButton]}
                        onPress={handleTest}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#94a3b8" size="small" />
                        ) : (
                            <Text style={styles.testButtonText}>Testar</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Salvar e Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.hint}>
                    URL gerada: {buildServerUrl(serverHost || '...', serverPort || '...', serverProtocol)}
                </Text>

                <TouchableOpacity
                    style={styles.qrButton}
                    onPress={openScanner}
                >
                    <Text style={styles.qrButtonText}>📷 Escanear QR Code de Provisionamento</Text>
                </TouchableOpacity>

            </ScrollView>

            <Modal visible={isScanning} animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
                    >
                        <View style={styles.scannerOverlay}>
                            <Text style={styles.scannerText}>Posicione o QR Code MDM na tela</Text>
                            <TouchableOpacity style={styles.scannerCancelBtn} onPress={() => setIsScanning(false)}>
                                <Text style={styles.scannerCancelBtnText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { padding: 30, paddingTop: 80, paddingBottom: 40 },
    iconContainer: { alignItems: 'center', marginBottom: 16 },
    icon: { fontSize: 56 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 36 },
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
    testResultBox: { borderRadius: 10, padding: 12, marginBottom: 16 },
    testSuccess: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981', borderWidth: 1 },
    testError: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', borderWidth: 1 },
    testResultText: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    button: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 16, elevation: 4 },
    saveButton: { backgroundColor: '#06b6d4', flex: 2, marginLeft: 10 },
    testButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flex: 1 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    testButtonText: { color: '#cbd5e1', fontSize: 15 },
    hint: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 16 },
    qrButton: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    qrButtonText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
    scannerOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60, backgroundColor: 'rgba(0,0,0,0.5)' },
    scannerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8 },
    scannerCancelBtn: { backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    scannerCancelBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
