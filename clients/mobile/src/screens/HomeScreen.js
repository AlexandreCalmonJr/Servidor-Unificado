// clients/mobile/src/screens/HomeScreen.js
// CORREÇÕES:
//   1. Bug: `battery_level: Math.round(level * 100)` — `level` declarada DENTRO do try,
//      usada FORA. Corrigido declarando `let level = 0` no escopo externo.
//   2. `mac_address` → `mac_address_radio` (campo correto do DeviceInfo)
//   3. Heartbeat: POST /api/devices/heartbeat (endpoint existente via deviceRoutes)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, AppState, TouchableOpacity,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEARTBEAT_INTERVAL = 30_000; // 30 segundos

export default function HomeScreen({ navigation }) {
  const [deviceInfo, setDeviceInfo]   = useState(null);
  const [batteryPct, setBatteryPct]   = useState(null);
  const [serverStatus, setServerStatus] = useState('connecting');
  const appState      = useRef(AppState.currentState);
  const heartbeatTimer = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Carrega config armazenada (baseUrl + authToken)
  // ──────────────────────────────────────────────────────────────────────────
  const _loadConfig = useCallback(async () => {
    const baseUrl   = await AsyncStorage.getItem('server_base_url')  || '';
    const authToken = await AsyncStorage.getItem('auth_token')        || '';
    return { baseUrl, authToken };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Coleta informações do dispositivo
  // ──────────────────────────────────────────────────────────────────────────
  const _collectDeviceInfo = useCallback(async () => {
    const serial     = await DeviceInfo.getSerialNumber();
    const model      = await DeviceInfo.getModel();
    const brand      = await DeviceInfo.getBrand();
    const osVersion  = await DeviceInfo.getSystemVersion();
    const macAddress = await DeviceInfo.getMacAddress();     // mac_address_radio

    return {
      serial_number:    serial,
      model,
      brand,
      os_version:       osVersion,
      mac_address_radio: macAddress,   // CORRIGIDO (era mac_address)
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Envia heartbeat ao servidor
  // POST /api/devices/heartbeat
  // Body: { device_id, serial_number, battery, last_seen }
  // ──────────────────────────────────────────────────────────────────────────
  const _sendHeartbeat = useCallback(async () => {
    // CORRIGIDO: `level` declarada no escopo externo para evitar undefined
    let level = 0;

    try {
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      // getBatteryLevel() retorna 0.0–1.0
      level = batteryLevel;
      setBatteryPct(Math.round(level * 100));
    } catch {
      // mantém level = 0 em caso de erro
    }

    try {
      const { baseUrl, authToken } = await _loadConfig();
      const info = await _collectDeviceInfo();

      if (!baseUrl) {
        console.warn('[HomeScreen] baseUrl não configurado, heartbeat ignorado');
        return;
      }

      const payload = {
        device_id:     info.serial_number,
        serial_number: info.serial_number,
        battery:       Math.round(level * 100),   // CORRIGIDO: level sempre definido aqui
        last_seen:     new Date().toISOString(),
      };

      await axios.post(
        `${baseUrl}/api/devices/heartbeat`,
        payload,
        {
          timeout: 10_000,
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      setServerStatus('online');
    } catch (error) {
      console.warn('[HomeScreen] Heartbeat falhou:', error.message);
      setServerStatus('offline');
    }
  }, [_loadConfig, _collectDeviceInfo]);

  // ──────────────────────────────────────────────────────────────────────────
  // Inicialização
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const info = await _collectDeviceInfo();
      if (mounted) setDeviceInfo(info);
      await _sendHeartbeat();
    };

    init();

    // Polling de heartbeat
    heartbeatTimer.current = setInterval(_sendHeartbeat, HEARTBEAT_INTERVAL);

    // Heartbeat ao voltar do background
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        _sendHeartbeat();
      }
      appState.current = nextState;
    });

    return () => {
      mounted = false;
      clearInterval(heartbeatTimer.current);
      subscription.remove();
    };
  }, [_sendHeartbeat, _collectDeviceInfo]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  const statusColor = {
    online:     '#4CAF50',
    offline:    '#F44336',
    connecting: '#FF9800',
  }[serverStatus] || '#FF9800';

  return (
    <View style={styles.container}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={styles.statusText}>
        Servidor: {serverStatus}
      </Text>

      {deviceInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Serial</Text>
          <Text style={styles.infoValue}>{deviceInfo.serial_number}</Text>

          <Text style={styles.infoLabel}>Modelo</Text>
          <Text style={styles.infoValue}>{deviceInfo.brand} {deviceInfo.model}</Text>

          <Text style={styles.infoLabel}>Android</Text>
          <Text style={styles.infoValue}>{deviceInfo.os_version}</Text>

          {batteryPct !== null && (
            <>
              <Text style={styles.infoLabel}>Bateria</Text>
              <Text style={styles.infoValue}>{batteryPct}%</Text>
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.buttonText}>Configurações</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusDot:   { width: 14, height: 14, borderRadius: 7, marginBottom: 6 },
  statusText:  { fontSize: 16, fontWeight: '600', marginBottom: 24 },
  infoBox:     { width: '100%', backgroundColor: '#f5f5f5', borderRadius: 10, padding: 16, marginBottom: 24 },
  infoLabel:   { fontSize: 12, color: '#888', marginTop: 8 },
  infoValue:   { fontSize: 15, fontWeight: '500', color: '#222' },
  button:      { backgroundColor: '#1976D2', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  buttonText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
});
