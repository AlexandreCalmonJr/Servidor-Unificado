import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false); // Device registered?

    useEffect(() => {
        bootstrapAsync();
    }, []);

    const bootstrapAsync = async () => {
        try {
            const url = await SecureStore.getItemAsync('server_url');
            const token = await SecureStore.getItemAsync('user_token');
            const deviceId = await SecureStore.getItemAsync('device_id');

            if (url) setIsConfigured(true);
            if (deviceId) setIsRegistered(true);
            if (token) setUserToken(token);
        } catch (e) {
            console.error('Bootstrap failed', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const token = response.data.token;
            await SecureStore.setItemAsync('user_token', token);
            setUserToken(token);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('user_token');
        setUserToken(null);
    };

    const finishConfig = () => setIsConfigured(true);
    const finishRegistration = async (id) => {
        await SecureStore.setItemAsync('device_id', id);
        setIsRegistered(true);
    };

    return (
        <AuthContext.Provider value={{
            isLoading,
            userToken,
            isConfigured,
            isRegistered,
            login,
            logout,
            finishConfig,
            finishRegistration
        }}>
            {children}
        </AuthContext.Provider>
    );
};
