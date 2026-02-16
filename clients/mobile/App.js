// clients/mobile/App.js
// Roteamento baseado no AuthContext (idêntico ao home_screen_router.dart do Flutter):
//   - Não configurado → ServerConfigScreen
//   - Configurado, não registrado → DeviceRegisterScreen
//   - Registrado, não logado → LoginScreen
//   - Logado → MainTabs (Home + Settings)

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import ServerConfigScreen from './src/screens/ServerConfigScreen';
import DeviceRegisterScreen from './src/screens/DeviceRegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LauncherScreen from './src/screens/LauncherScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// Tabs principais (home_screen.dart → _buildMenuGrid)
function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor:  'rgba(255,255,255,0.08)',
                    paddingBottom:   4,
                },
                tabBarActiveTintColor:   '#06b6d4',
                tabBarInactiveTintColor: '#64748b',
            }}
        >
            <Tab.Screen
                name="Painel"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tab.Screen
                name="Launcher"
                component={LauncherScreen}
                options={{
                    tabBarLabel: 'Launcher',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🚀</Text>,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Configurações',
                    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

// Router principal baseado no estado do AuthContext
function AppNavigator() {
    const { isLoading, isConfigured, isRegistered, isLoggedIn } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 48, marginBottom: 20 }}>🛡️</Text>
                <ActivityIndicator size="large" color="#06b6d4" />
                <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 15 }}>
                    Unified MDM Agent
                </Text>
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isConfigured ? (
                // 1. Servidor não configurado → ServerConfigScreen
                <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
            ) : !isRegistered ? (
                // 2. Configurado, mas não registrado → DeviceRegisterScreen
                <Stack.Screen name="DeviceRegister" component={DeviceRegisterScreen} />
            ) : !isLoggedIn ? (
                // 3. Registrado, mas não autenticado → LoginScreen
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                // 4. Autenticado → App principal
                <Stack.Screen name="Main" component={MainTabs} />
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <StatusBar style="light" />
                <AppNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
}
