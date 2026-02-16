// clients/mobile/src/screens/ServerConfigScreen.js
// Espelho de settings_screen.dart (Flutter):
//   - Campos: server_host, server_port, auth_token (separados, igual ao Flutter)
//   - Teste de conexão: GET /api/auth/validate (igual ao agent_provider.dart → _testConnection)
//   - Salva: server_host, server_port, auth_token no SecureStore

import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';

export default function ServerConfigScreen({ navigation }) {
    const { saveSettings, settings } = useContext(AuthContext);

    const [serverHost, setServerHost] = useState('192.168.0.183');
    const [serverPort, setServerPort] = useState('3000');
    const [authToken,  setAuthToken]  = useState('');
    const [loading,    setLoading]    = useState(false);
    const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        // Carrega configurações salvas (main.dart → initialize)
        loadSavedConfig();
    }, []);

    const loadSavedConfig = async () => {
        const host  = await SecureStore.getItemAsync('server_host');
        const port  = await SecureStore.getItemAsync('server_port');
        const token = await SecureStore.getItemAsync('auth_token');
        if (host)  setServerHost(host);
        if (port)  setServerPort(port);
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
            const baseUrl = `http://${serverHost.trim()}:${serverPort.trim()}`;
            const response = await fetch(`${baseUrl}/api/auth/validate`, {
                method:  'GET',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${authToken.trim()}`,
                    'AUTH_TOKEN':    authToken.trim(),
                },
            });

            if (response.status === 401) {
                setTestResult('error');
                setTestMessage('Token inválido ou expirado.');
            } else if (response.ok) {
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
            await SecureStore.setItemAsync('server_host', serverHost.trim());
            await SecureStore.setItemAsync('server_port', serverPort.trim());
            await SecureStore.setItemAsync('auth_token',  authToken.trim());

            navigation.replace('DeviceRegister');
        } catch (e) {
            Alert.alert('Erro', 'Falha ao salvar configurações: ' + e.message);
        } finally {
            setLoading(false);
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
                    URL gerada: http://{serverHost || '...' }:{serverPort || '...'}
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#0f172a' },
    background:      { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content:         { padding: 30, paddingTop: 80, paddingBottom: 40 },
    iconContainer:   { alignItems: 'center', marginBottom: 16 },
    icon:            { fontSize: 56 },
    title:           { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle:        { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 36 },
    inputGroup:      { marginBottom: 18 },
    label:           { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: '500' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        fontSize: 15,
    },
    testResultBox:   { borderRadius: 10, padding: 12, marginBottom: 16 },
    testSuccess:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981', borderWidth: 1 },
    testError:       { backgroundColor: 'rgba(239,68,68,0.15)',  borderColor: '#ef4444',  borderWidth: 1 },
    testResultText:  { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
    buttonRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    button:          { borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 16, elevation: 4 },
    saveButton:      { backgroundColor: '#06b6d4', flex: 2, marginLeft: 10 },
    testButton:      { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flex: 1 },
    buttonText:      { color: '#fff',     fontSize: 15, fontWeight: 'bold' },
    testButtonText:  { color: '#cbd5e1',  fontSize: 15 },
    hint:            { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 16 },
});