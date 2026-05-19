import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
import { API_URL } from '../config';

/**
 * Cabecera unificada para RumboFit.
 * Gestiona: Logo, Notificaciones (con contador), Menú de Usuario y Cierre de Sesión.
 */
export default function MainHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [userName, setUserName] = useState('Usuario');
    const [menuVisible, setMenuVisible] = useState(false);

    const loadData = async () => {
        const uid = await AsyncStorage.getItem('userId');
        const name = await AsyncStorage.getItem('userName');
        if (name) setUserName(name);
        if (uid) {
            try {
                // Forzamos un poco de cache-busting con la fecha para asegurar datos frescos
                const res = await fetch(`${API_URL}/notificaciones/${uid}/unread-count?t=${Date.now()}`);
                const data = await res.json();
                if (data.success) setUnreadCount(Number(data.count || 0));
            } catch (e) {
                console.log("Error cargando notificaciones en header:", e);
            }
        }
    };

    // Se ejecuta cada vez que la pantalla que contiene este header gana el foco
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const cerrarSesion = async () => {
        setMenuVisible(false);
        await AsyncStorage.clear();
        router.replace('/');
    };

    const irAPremium = async () => {
        await AsyncStorage.setItem('premiumReturnRoute', pathname || '/rutina');
        router.push('/premium');
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image 
                    source={require('../assets/images/logo1.png')} 
                    style={styles.topBarLogo} 
                    resizeMode="contain" 
                />
                <View style={styles.topRight}>
                    <TouchableOpacity
                        style={styles.premiumButton}
                        onPress={irAPremium}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.premiumIcon}>★</Text>
                        <Text style={styles.premiumText}>Premium</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.bellButton} 
                        onPress={() => router.push('/notificaciones')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.bellIcon}>🔔</Text>
                        {unreadCount > 0 && <View style={styles.bellDot} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setMenuVisible(true)} 
                        style={styles.avatarGlow}
                        activeOpacity={0.8}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Menú Desplegable (Modal) */}
            <Modal transparent visible={menuVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdown}>
                                <Text style={styles.dropdownHeader}>{userName}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => { setMenuVisible(false); router.push('/perfil'); }}
                                >
                                    <Text style={styles.dropdownText}>Mi Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => { setMenuVisible(false); router.push('/notificaciones'); }}
                                >
                                    <Text style={styles.dropdownText}>Notificaciones</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => { setMenuVisible(false); router.push('/historial'); }}
                                >
                                    <Text style={styles.dropdownText}>Mi Historial</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={cerrarSesion}
                                >
                                    <Text style={[styles.dropdownText, { color: '#e74c3c' }]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        backgroundColor: '#ffffff', 
        paddingTop: 10, 
        paddingBottom: 5 
    },
    topBar: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20 
    },
    topBarLogo: { 
        width: 140, 
        height: 51, 
        tintColor: '#ff7a00', 
        marginLeft: -35 
    },
    topRight: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    premiumButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f7c948',
        borderWidth: 1,
        borderColor: '#c58b00',
        borderRadius: 21,
        paddingVertical: 9,
        paddingHorizontal: 14,
        shadowColor: '#8a5a00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 8
    },
    premiumIcon: {
        fontSize: 16,
        color: '#fff7cc',
        textShadowColor: 'rgba(120, 72, 0, 0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2
    },
    premiumText: {
        fontSize: 12,
        color: '#5c3900',
        fontWeight: '800',
        textShadowColor: 'rgba(255, 244, 200, 0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1
    },
    bellButton: { 
        width: 42, 
        height: 42, 
        borderRadius: 21, 
        backgroundColor: 'rgba(255,122,0,0.12)', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative' 
    },
    bellIcon: { 
        fontSize: 18 
    },
    bellDot: { 
        position: 'absolute', 
        top: 9, 
        right: 9, 
        width: 10, 
        height: 10, 
        borderRadius: 5, 
        backgroundColor: '#ff3b30',
        borderWidth: 1.5,
        borderColor: 'white'
    },
    avatarGlow: { 
        padding: 3, 
        borderRadius: 26, 
        backgroundColor: 'rgba(255, 122, 0, 0.15)' 
    },
    avatar: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: '#ff7a00', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    avatarText: { 
        color: 'white', 
        fontWeight: 'bold', 
        fontSize: 18 
    },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        justifyContent: 'flex-start', 
        alignItems: 'flex-end', 
        paddingTop: 70, 
        paddingRight: 15 
    },
    dropdown: { 
        backgroundColor: '#fff', 
        borderRadius: 16, 
        elevation: 12, 
        minWidth: 190, 
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 }
    },
    dropdownHeader: { 
        fontSize: 13, 
        fontWeight: '800', 
        color: '#1a1a1a', 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        backgroundColor: '#fdfdfd'
    },
    dropdownItem: { 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center'
    },
    dropdownText: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#1a1a1a' 
    },
    dropdownDivider: { 
        height: 1, 
        backgroundColor: '#f0f0f0' 
    },
});
