// clients/mobile/src/screens/LoginScreen.js
// Espelho de login_screen.dart + DeviceService.login() (main.dart)
//   - Login local por senha (main.dart: password == 'hap@2025')
//   - Sem chamada de rede — autenticação offline

import React, { useState, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
    const { login } = useContext(AuthContext);
    const [password, setPassword]             = useState('');
    const [showPassword, setShowPassword]     = useState(false);
    const [loading, setLoading]               = useState(false);
    const [errorMessage, setErrorMessage]     = useState('');

    const handleLogin = async () => {
        if (!password) {
            setErrorMessage('Por favor, insira sua senha.');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            // DeviceService.login() (main.dart: password == 'hap@2025')
            const success = await login(password);

            if (success) {
                navigation.replace('Main');
            } else {
                setErrorMessage('Credenciais inválidas. Tente novamente.');
            }
        } catch (e) {
            setErrorMessage('Erro inesperado. Tente novamente.');
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

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <View style={styles.iconBox}>
                        <Text style={styles.icon}>🔒</Text>
                    </View>
                </View>

                <Text style={styles.title}>MDM Sistema</Text>
                <Text style={styles.subtitle}>Gerenciamento de Dispositivos Móveis</Text>

                <View style={styles.card}>
                    {/* Campo de senha */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <View style={styles.passwordRow}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                value={password}
                                onChangeText={text => { setPassword(text); setErrorMessage(''); }}
                                secureTextEntry={!showPassword}
                                placeholder="Digite sua senha de acesso"
                                placeholderTextColor="#64748b"
                                onSubmitEditing={handleLogin}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>

                        {errorMessage ? (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={[styles.buttonText, { marginLeft: 10 }]}>Autenticando...</Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>Entrar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Alexandre Calmon - TI Bahia</Text>
                <Text style={styles.footerSub}>© 2025 - Todos os direitos reservados</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:     { flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' },
    background:    { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    content:       { padding: 30 },
    iconContainer: { alignItems: 'center', marginBottom: 24 },
    iconBox: {
        width: 90, height: 90, borderRadius: 24,
        backgroundColor: 'rgba(139,92,246,0.2)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)',
    },
    icon:          { fontSize: 40 },
    title:         { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle:      { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 36 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 32,
    },
    inputGroup:    { marginBottom: 20 },
    label:         { color: '#cbd5e1', marginBottom: 8, fontSize: 14, fontWeight: '500' },
    passwordRow:   { flexDirection: 'row', alignItems: 'center' },
    input: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        fontSize: 15,
    },
    passwordInput: { flex: 1, marginRight: 10 },
    eyeBtn:        { padding: 10 },
    eyeIcon:       { fontSize: 20 },
    errorText:     { color: '#ef4444', fontSize: 13, marginTop: 8 },
    button: {
        backgroundColor: '#8b5cf6',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 4,
    },
    buttonDisabled: { backgroundColor: '#6d28d9', opacity: 0.7 },
    buttonText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    loadingRow:    { flexDirection: 'row', alignItems: 'center' },
    footer:        { color: '#475569', fontSize: 12, textAlign: 'center' },
    footerSub:     { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 4 },
});