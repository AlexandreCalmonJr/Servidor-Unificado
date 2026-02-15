import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

export default function ServerConfigScreen({ navigation }) {
    const [url, setUrl] = useState('http://192.168.1.10:3000');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTestConnection = async () => {
        if (!url) return;
        setLoading(true);
        try {
            // Remove trailing slash
            const cleanUrl = url.replace(/\/$/, '');
            const response = await fetch(`${cleanUrl}/public/status`);
            const data = await response.json();

            if (data.success) {
                Alert.alert('Sucesso', `Conectado ao servidor!\nVersão: ${data.version || 'Unknown'}`);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            Alert.alert('Falha na Conexão', 'Não foi possível contatar o servidor.\nVerifique a URL e se o servidor está rodando.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!url) {
            Alert.alert('Erro', 'Por favor, insira a URL do servidor.');
            return;
        }

        setLoading(true);
        try {
            await SecureStore.setItemAsync('server_url', url);
            if (token) {
                await SecureStore.setItemAsync('fleet_token', token);
            }

            navigation.replace('DeviceRegister');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar configurações: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background} />

            <View style={styles.content}>
                <Text style={styles.title}>Configuração Inicial</Text>
                <Text style={styles.subtitle}>Unified Agent Mobile</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>URL do Servidor</Text>
                    <TextInput
                        style={styles.input}
                        value={url}
                        onChangeText={setUrl}
                        placeholder="http://ip:porta"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Token da Frota (Opcional)</Text>
                    <TextInput
                        style={styles.input}
                        value={token}
                        onChangeText={setToken}
                        placeholder="Token de Autenticação"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                    />
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.button, styles.testButton]} onPress={handleTestConnection} disabled={loading}>
                        <Text style={styles.testButtonText}>Testar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Salvar e Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { padding: 30 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
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
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    button: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },
    saveButton: { backgroundColor: '#06b6d4', flex: 2, marginLeft: 10 },
    testButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flex: 1 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    testButtonText: { color: '#cbd5e1', fontSize: 16 }
});
