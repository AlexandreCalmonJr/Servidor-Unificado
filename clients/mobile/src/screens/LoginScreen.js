import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Erro', 'Preencha usuário e senha.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login', { username, password });

            if (response.data.success) {
                await SecureStore.setItemAsync('user_token', response.data.token);
                // Navigate to Main Stack
                navigation.replace('Main');
            } else {
                Alert.alert('Login Falhou', response.data.message || 'Credenciais inválidas.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha na conexão ou credenciais incorretas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.background} />

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🔒</Text>
                </View>

                <Text style={styles.title}>Acesso Restrito</Text>
                <Text style={styles.subtitle}>Faça login para continuar</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Usuário</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        placeholder="admin"
                        placeholderTextColor="#64748b"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Senha</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="******"
                        placeholderTextColor="#64748b"
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Entrar</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content: { padding: 30 },
    iconContainer: { alignItems: 'center', marginBottom: 20 },
    icon: { fontSize: 50 },
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
    button: {
        backgroundColor: '#8b5cf6',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
