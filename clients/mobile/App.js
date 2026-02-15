import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import ServerConfigScreen from './src/screens/ServerConfigScreen';
import DeviceRegisterScreen from './src/screens/DeviceRegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

// Placeholder for a Settings Screen
const SettingsScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <Text style={{ color: '#fff' }}>Configurações (Protegido por Senha)</Text>
    </View>
);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: 'rgba(255,255,255,0.1)',
                },
                tabBarActiveTintColor: '#06b6d4',
                tabBarInactiveTintColor: '#64748b',
            }}
        >
            <Tab.Screen name="Painel" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
            <Tab.Screen name="Config" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text> }} />
        </Tab.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <StatusBar style="light" />
                <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="ServerConfig">
                    <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
                    <Stack.Screen name="DeviceRegister" component={DeviceRegisterScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Main" component={MainTabs} />
                </Stack.Navigator>
            </NavigationContainer>
        </AuthProvider>
    );
}
