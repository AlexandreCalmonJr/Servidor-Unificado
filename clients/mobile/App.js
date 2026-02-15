import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Easing, SafeAreaView, StatusBar, Dimensions, BackHandler, Alert, ToastAndroid } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// --- ICONS (Simulated with Text/Unicodes for portability without font assets) ---
const Icons = {
    sync: '🔄',
    lock: '🔒',
    home: '🏠',
    settings: '⚙️',
    shield: '🛡️'
};

export default function App() {
    const [activeTab, setActiveTab] = useState('home');
    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState('Online');
    const [isKiosk, setIsKiosk] = useState(false); // KIOSK MODE STATE
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // KIOSK MODE: BLOCK BACK BUTTON
    useEffect(() => {
        const backAction = () => {
            if (isKiosk) {
                ToastAndroid.show("KIOSK MODE ACTIVE: Action Blocked", ToastAndroid.SHORT);
                return true; // Block default behavior
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [isKiosk]);

    // Pulse Animation Loop
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const handleSync = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setStatus('Syncing...');

        // Spin animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        // Simulate Network Request
        setTimeout(() => {
            setIsSyncing(false);
            setStatus('Online');
            rotateAnim.setValue(0);
        }, 2500);
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <SafeAreaView style={[styles.container, isKiosk && { backgroundColor: '#000' }]}>
            <ExpoStatusBar style={isKiosk ? "light" : "light"} hidden={isKiosk} />
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* HEADER (Hidden in Kiosk) */}
            {!isKiosk && (
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Android Agent</Text>
                        <Text style={styles.headerSubtitle}>Unified MDM</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setIsKiosk(!isKiosk)}>
                        <Text style={styles.iconText}>{Icons.settings}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isKiosk && (
                <TouchableOpacity style={styles.kioskExit} onLongPress={() => setIsKiosk(false)}>
                    <Text style={{ color: '#333' }}>Hold to Exit</Text>
                </TouchableOpacity>
            )}

            <ScrollView contentContainerStyle={styles.content}>

                {/* SYNC BUTTON CENTERPIECE */}
                <View style={styles.syncContainer}>
                    <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient
                            colors={['rgba(6,182,212,0.3)', 'rgba(139,92,246,0.1)']}
                            style={styles.gradientRing}
                        />
                    </Animated.View>

                    <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
                        <LinearGradient
                            colors={['#06b6d4', '#8b5cf6']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.syncGradient}
                        >
                            <Animated.Text style={[styles.syncIcon, isSyncing && { transform: [{ rotate: spin }] }]}>
                                {Icons.sync}
                            </Animated.Text>
                            <Text style={styles.syncText}>{isSyncing ? 'Syncing' : 'Sync Now'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* STATUS CARD */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Device Status</Text>
                        <View style={[styles.badge, { backgroundColor: status === 'Online' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }]}>
                            <Text style={[styles.badgeText, { color: status === 'Online' ? '#10b981' : '#f59e0b' }]}>{status}</Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Battery</Text>
                            <Text style={styles.statValue}>98%</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Storage</Text>
                            <Text style={styles.statValue}>45GB Free</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Policy</Text>
                            <Text style={styles.statValue}>Active</Text>
                        </View>
                    </View>
                </View>

                {/* KIOSK TOGGLE CARD */}
                <TouchableOpacity style={[styles.card, styles.alertCard]} onPress={() => setIsKiosk(true)}>
                    <View style={styles.alertIcon}>
                        <Text style={styles.alertIconText}>{Icons.lock}</Text>
                    </View>
                    <View>
                        <Text style={styles.alertTitle}>Enter Kiosk Mode</Text>
                        <Text style={styles.alertDesc}>Lock app & hide status bar</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* BOTTOM NAV */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
                    <Text style={[styles.navIcon, activeTab === 'home' && styles.navActive]}>{Icons.home}</Text>
                    <Text style={[styles.navLabel, activeTab === 'home' && styles.navActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('security')}>
                    <Text style={[styles.navIcon, activeTab === 'security' && styles.navActive]}>{Icons.shield}</Text>
                    <Text style={[styles.navLabel, activeTab === 'security' && styles.navActive]}>Security</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    iconText: { fontSize: 20 },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    syncContainer: {
        alignItems: 'center',
        marginVertical: 40,
        height: 200,
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientRing: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
    syncButton: {
        width: 160,
        height: 160,
        borderRadius: 80,
        elevation: 10,
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    syncGradient: {
        flex: 1,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    syncIcon: {
        fontSize: 40,
        color: '#fff',
        marginBottom: 8,
    },
    syncText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    alertIconText: { fontSize: 20 },
    alertTitle: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
    alertDesc: {
        color: '#fca5a5',
        fontSize: 12,
    },
    chevron: {
        marginLeft: 'auto',
        color: '#ef4444',
        fontSize: 24,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    navItem: {
        alignItems: 'center',
    },
    navIcon: {
        fontSize: 24,
        color: '#64748b',
        marginBottom: 4,
    },
    navLabel: {
        fontSize: 10,
        color: '#64748b',
    },
    navActive: {
        color: '#06b6d4',
    },
    kioskExit: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 20,
        zIndex: 999
    }
});
