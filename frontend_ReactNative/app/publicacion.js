import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function PublicacionDetalle() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [userId, setUserId] = useState(null);
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const storedUserId = await AsyncStorage.getItem('userId');
                setUserId(storedUserId);
                const response = await fetch(`${API_URL}/publicaciones/${params.id}?userId=${storedUserId || ''}`);
                const data = await parseResponse(response);
                if (response.status === 404) {
                    setNotFound(true);
                    setPost(null);
                    return;
                }
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'No se pudo cargar la publicación');
                }
                setPost(data.publicacion);
                setNotFound(false);
                setMessage('');
            } catch (error) {
                setMessage(error.message || 'No se pudo cargar la publicación');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            load();
        }
    }, [params.id]);

    const toggleLike = async () => {
        if (!userId || !post) return;
        try {
            const response = await fetch(`${API_URL}/publicaciones/${post.id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo actualizar el like');
            }
            setPost((prev) => ({
                ...prev,
                likedByMe: data.liked,
                _count: {
                    ...prev._count,
                    me_gusta: data.likesCount
                }
            }));
        } catch (error) {
            setMessage(error.message || 'No se pudo actualizar el like');
        }
    };

    if (loading) {
        return <View style={styles.center}><Text style={styles.stateText}>Cargando publicación...</Text></View>;
    }

    if (notFound) {
        return (
            <View style={styles.center}>
                <Text style={styles.notFoundTitle}>Publicación no encontrada. Es posible que el autor la haya eliminado.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/redsocial')}>
                    <Text style={styles.primaryButtonText}>Volver al inicio</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {post ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <TouchableOpacity style={styles.authorRow} onPress={() => router.push(`/perfil?id=${post.usuario_id}`)}>
                        {post.autor_foto ? (
                            <Image source={{ uri: post.autor_foto }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarFallbackText}>{(post.autor_nombre || 'U').charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View>
                            <Text style={styles.authorName}>{post.autor_nombre || 'Usuario'}</Text>
                            <Text style={styles.dateText}>{new Date(post.fecha_publicacion).toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.title}>{post.titulo}</Text>
                    {post.imagenes?.map((imagen, index) => (
                        <Image key={`${post.id}-${index}`} source={{ uri: imagen.url }} style={styles.mainImage} />
                    ))}
                    <Text style={styles.description}>{post.descripcion}</Text>

                    <TouchableOpacity style={styles.likeButton} onPress={toggleLike}>
                        <Text style={[styles.likeIcon, post.likedByMe && styles.likeIconActive]}>{post.likedByMe ? '♥' : '♡'}</Text>
                        <Text style={styles.likeCount}>{post?._count?.me_gusta || 0}</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
    header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#ff7a00' },
    backText: { color: 'white', fontWeight: '900' },
    content: { paddingBottom: 36 },
    stateText: { color: '#666', fontWeight: '700' },
    notFoundTitle: { color: '#444', textAlign: 'center', lineHeight: 24, fontWeight: '800', marginBottom: 16 },
    primaryButton: { backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
    primaryButtonText: { color: 'white', fontWeight: '900' },
    message: { color: '#b4492f', fontWeight: '700', textAlign: 'center', padding: 14 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ff7a00', alignItems: 'center', justifyContent: 'center' },
    avatarFallbackText: { color: 'white', fontWeight: '900', fontSize: 20 },
    authorName: { color: '#222', fontWeight: '900', fontSize: 15 },
    dateText: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 2 },
    title: { color: '#222', fontSize: 22, fontWeight: '900', paddingHorizontal: 18, marginBottom: 14 },
    mainImage: { width: '100%', height: 320, backgroundColor: '#eee', marginBottom: 10 },
    description: { color: '#444', fontSize: 15, lineHeight: 22, paddingHorizontal: 18, paddingTop: 8 },
    likeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 18 },
    likeIcon: { fontSize: 24, color: '#888' },
    likeIconActive: { color: '#e74c3c' },
    likeCount: { color: '#333', fontWeight: '900' },
});
