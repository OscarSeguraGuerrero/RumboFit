import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../config';

async function parseResponse(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(text || `HTTP ${response.status}`);
    }
}

function relativeTime(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
}

export default function Notificaciones() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                router.replace('/');
                return;
            }

            const response = await fetch(`${API_URL}/notificaciones/${userId}`);
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudieron cargar las notificaciones');
            }
            setItems(Array.isArray(data.notificaciones) ? data.notificaciones : []);
            setMessage('');
        } catch (error) {
            setMessage(error.message || 'No se pudieron cargar las notificaciones');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useFocusEffect(useCallback(() => {
        loadNotifications();
        return undefined;
    }, [loadNotifications]));

    const openNotification = (item) => {
        if (item.tipo_notificacion === 'follow' && item.origen_usuario_id) {
            router.push(`/perfil?id=${item.origen_usuario_id}`);
            return;
        }
        if (item.tipo_notificacion === 'like' && item.publicacion_id) {
            router.push(`/publicacion?id=${item.publicacion_id}`);
            return;
        }
        // HU-52: El recurso ya no existe
        setMessage('El contenido original ya no está disponible');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/perfil')} style={styles.backBtn}>
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Notificaciones</Text>
                <View style={{ width: 60 }} />
            </View>

            {message ? (
                <View style={styles.banner}>
                    <Text style={styles.bannerText}>{message}</Text>
                </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <Text style={styles.stateText}>Cargando notificaciones...</Text>
                ) : items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔕</Text>
                        <Text style={styles.emptyText}>Aún no tienes notificaciones. Empieza a seguir a otros usuarios o crea publicaciones para interactuar con la comunidad.</Text>
                    </View>
                ) : (
                    items.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.card} onPress={() => openNotification(item)}>
                            {item.origen_foto ? (
                                <Image source={{ uri: item.origen_foto }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarFallbackText}>
                                        {(item.origen_nombre || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardText}>
                                    {item.tipo_notificacion === 'like'
                                        ? `${item.origen_nombre || 'Alguien'} le ha dado me gusta a tu publicación${item.publicacion_titulo ? ` "${item.publicacion_titulo}"` : ''}`
                                        : `${item.origen_nombre || 'Alguien'} ha empezado a seguirte`}
                                </Text>
                                <Text style={styles.cardTime}>{relativeTime(item.fecha)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#ff7a00', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { minWidth: 60 },
    backText: { color: 'white', fontWeight: '800' },
    title: { color: 'white', fontSize: 18, fontWeight: '900' },
    content: { padding: 18, paddingBottom: 40 },
    banner: { margin: 18, marginBottom: 0, padding: 12, borderRadius: 12, backgroundColor: '#ffe7e0' },
    bannerText: { color: '#b4492f', fontWeight: '700', textAlign: 'center' },
    stateText: { color: '#666', textAlign: 'center', marginTop: 30, fontWeight: '700' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 42, marginBottom: 16 },
    emptyText: { color: '#666', textAlign: 'center', lineHeight: 22, fontWeight: '700' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff6ef', borderRadius: 16, padding: 14, marginBottom: 12 },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff7a00' },
    avatarFallbackText: { color: 'white', fontSize: 20, fontWeight: '900' },
    cardText: { color: '#222', fontWeight: '800', lineHeight: 20 },
    cardTime: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 },
});
