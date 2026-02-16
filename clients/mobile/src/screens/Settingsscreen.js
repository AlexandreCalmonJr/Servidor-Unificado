// clients/mobile/src/screens/SettingsScreen.js
// Espelho exato de settings_screen.dart (Flutter MDM base)
//
// Campos (idênticos ao SharedPreferences do Flutter):
//   serial_number, imei, sector, floor,
//   server_host, server_port, auth_token,
//   data_interval, heartbeat_interval, command_check_interval

import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView,
    KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
    const { saveSettings } = useContext(AuthContext);

    // ── Campos idênticos ao _SettingsScreenState do Flutter ──
    const [serialNumber, setSerialNumber]   = useState('');
    const [imei,          setImei]          = useState('');
    const [sector,        setSector]        = useState('');
    const [floor,         setFloor]         = useState('');
    const [serverHost,    setServerHost]    = useState('192.168.0.183');
    const [serverPort,    setServerPort]    = useState('3000');
    const [authToken,     setAuthToken]     = useState('');
    const [dataInterval,  setDataInterval]  = useState('10');
    const [heartbeatInterval, setHeartbeatInterval]     = useState('3');
    const [commandCheckInterval, setCommandCheckInterval] = useState('1');
    const [obscureToken,  setObscureToken]  = useState(true);

    const [loading,       setLoading]       = useState(false);
    const [loadingData,   setLoadingData]   = useState(true);

    useEffect(() => {
        _loadSettings();
    }, []);

    // _loadSettings (settings_screen.dart → _loadSettings)
    const _loadSettings = async () => {
        setLoadingData(true);
        try {
            setSerialNumber(  (await SecureStore.getItemAsync('serial_number'))           || '');
            setImei(          (await SecureStore.getItemAsync('imei'))                    || '');
            setSector(        (await SecureStore.getItemAsync('sector'))                  || '');
            setFloor(         (await SecureStore.getItemAsync('floor'))                   || '');
            setServerHost(    (await SecureStore.getItemAsync('server_host'))             || '192.168.0.183');
            setServerPort(    (await SecureStore.getItemAsync('server_port'))             || '3000');
            setAuthToken(     (await SecureStore.getItemAsync('auth_token'))              || '');
            setDataInterval(  (await SecureStore.getItemAsync('data_interval'))           || '10');
            setHeartbeatInterval(    (await SecureStore.getItemAsync('heartbeat_interval'))    || '3');
            setCommandCheckInterval( (await SecureStore.getItemAsync('command_check_interval')) || '1');
        } catch (e) {
            console.error('[SettingsScreen] Erro ao carregar:', e);
        } finally {
            setLoadingData(false);
        }
    };

    // _saveSettings (settings_screen.dart → _saveSettings)
    const _saveSettings = async () => {
        // Validação (settings_screen.dart → _formKey.validate)
        if (!serialNumber.trim()) {
            Alert.alert('Erro', 'Número de série é obrigatório.');
            return;
        }
        if (!serverHost.trim() || !serverPort.trim()) {
            Alert.alert('Erro', 'Host e porta do servidor são obrigatórios.');
            return;
        }
        if (!authToken.trim()) {
            Alert.alert('Erro', 'Token de autenticação é obrigatório.');
            return;
        }
        if (isNaN(parseInt(dataInterval))           ||
            isNaN(parseInt(heartbeatInterval))      ||
            isNaN(parseInt(commandCheckInterval))) {
            Alert.alert('Erro', 'Intervalos devem ser números válidos.');
            return;
        }

        setLoading(true);
        try {
            const newSettings = {
                serialNumber:         serialNumber.trim(),
                imei:                 imei.trim(),
                sector:               sector.trim(),
                floor:                floor.trim(),
                serverHost:           serverHost.trim(),
                serverPort:           serverPort.trim(),
                authToken:            authToken.trim(),
                dataInterval:         parseInt(dataInterval)          || 10,
                heartbeatInterval:    parseInt(heartbeatInterval)     || 3,
                commandCheckInterval: parseInt(commandCheckInterval)  || 1,
            };

            await saveSettings(newSettings);

            Alert.alert('✅ Sucesso', 'Configurações salvas com sucesso!', [
                { text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : null }
            ]);

        } catch (e) {
            Alert.alert('Erro', 'Falha ao salvar configurações: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Carregando configurações...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.pageTitle}>⚙️ Configurações</Text>

                {/* ── DISPOSITIVO (settings_screen.dart → 'Dispositivo') ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>📱</Text>
                        <Text style={[styles.cardTitle, { color: '#3b82f6' }]}>Dispositivo</Text>
                    </View>

                    <Field label="Número de Série"   icon="🔢"
                        value={serialNumber}   onChangeText={setSerialNumber} />
                    <Field label="IMEI"              icon="🪪"
                        value={imei}           onChangeText={setImei}
                        keyboardType="numeric" />
                </View>

                {/* ── LOCALIZAÇÃO (settings_screen.dart → 'Localização') ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>📍</Text>
                        <Text style={[styles.cardTitle, { color: '#10b981' }]}>Localização</Text>
                    </View>

                    <Field label="Setor"  icon="🏢"
                        value={sector}    onChangeText={setSector}
                        placeholder="Ex: TI, RH, Financeiro" />
                    <Field label="Andar"  icon="🪜"
                        value={floor}     onChangeText={setFloor}
                        placeholder="Ex: 1, 2, Térreo" />
                </View>

                {/* ── SERVIDOR (settings_screen.dart → 'Servidor') ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>☁️</Text>
                        <Text style={[styles.cardTitle, { color: '#8b5cf6' }]}>Servidor</Text>
                    </View>

                    <Field label="Host do Servidor"    icon="🖥️"
                        value={serverHost}    onChangeText={setServerHost}
                        placeholder="192.168.0.183"
                        autoCapitalize="none" />
                    <Field label="Porta"               icon="🔌"
                        value={serverPort}    onChangeText={setServerPort}
                        placeholder="3000"   keyboardType="numeric" />

                    {/* Token com botão de visibilidade (settings_screen.dart → _buildTokenField) */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>🔑  Token de Autenticação</Text>
                        <View style={styles.tokenRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 10 }]}
                                value={authToken}
                                onChangeText={setAuthToken}
                                secureTextEntry={obscureToken}
                                placeholder="Token de autenticação"
                                placeholderTextColor="#9ca3af"
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setObscureToken(!obscureToken)}
                            >
                                <Text style={styles.eyeIcon}>{obscureToken ? '👁️' : '🙈'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.urlPreview}>
                        URL: http://{serverHost || '...'}:{serverPort || '...'}
                    </Text>
                </View>

                {/* ── INTERVALOS (settings_screen.dart → 'Intervalos (em minutos)') ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>⏱️</Text>
                        <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>Intervalos (em minutos)</Text>
                    </View>

                    <Field label="Envio de Dados"                icon="📤"
                        value={dataInterval}             onChangeText={setDataInterval}
                        keyboardType="numeric"           placeholder="10" />
                    <Field label="Heartbeat"                     icon="💓"
                        value={heartbeatInterval}        onChangeText={setHeartbeatInterval}
                        keyboardType="numeric"           placeholder="3" />
                    <Field label="Verificação de Comandos"       icon="📋"
                        value={commandCheckInterval}     onChangeText={setCommandCheckInterval}
                        keyboardType="numeric"           placeholder="1" />
                </View>

                {/* ── BOTÃO SALVAR (settings_screen.dart → _buildSaveButton) ── */}
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={_saveSettings}
                    disabled={loading}
                >
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>Salvando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.saveButtonText}>💾  Salvar Configurações</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ── Componente de campo reutilizável (settings_screen.dart → _buildModernTextFormField) ──
function Field({ label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{icon}  {label}</Text>
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
    container:    { flex: 1, backgroundColor: '#f8fafc' },
    content:      { padding: 16, paddingBottom: 40 },
    pageTitle:    { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, marginTop: 8 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    cardIcon:     { fontSize: 22, marginRight: 10 },
    cardTitle:    { fontSize: 18, fontWeight: 'bold' },
    fieldGroup:   { marginBottom: 16 },
    fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 14,
        color: '#1e293b',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tokenRow:     { flexDirection: 'row', alignItems: 'center' },
    eyeBtn:       { padding: 10, justifyContent: 'center' },
    eyeIcon:      { fontSize: 20 },
    urlPreview:   { color: '#94a3b8', fontSize: 12, marginTop: 4, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
    saveButton: {
        backgroundColor: '#3b82f6',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#3b82f6',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        marginTop: 8,
    },
    saveButtonDisabled: { backgroundColor: '#93c5fd', elevation: 0 },
    saveButtonText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    loadingRow:         { flexDirection: 'row', alignItems: 'center' },
    loadingText:        { color: '#64748b', marginTop: 12, fontSize: 16 },
});