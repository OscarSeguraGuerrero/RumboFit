import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function ImageCarousel({ imagenes }) {
    const [idx, setIdx] = React.useState(0);
    if (!imagenes || imagenes.length === 0) return null;
    const urls = imagenes.map(img => img.url || img).filter(Boolean);
    if (urls.length === 0) return null;
    return (
        <View style={carouselStyles.wrapper}>
            <Image source={{ uri: urls[idx] }} style={carouselStyles.image} />
            {urls.length > 1 && (
                <>
                    <TouchableOpacity
                        style={[carouselStyles.arrow, carouselStyles.arrowLeft, idx === 0 && carouselStyles.arrowDisabled]}
                        onPress={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                    >
                        <Text style={carouselStyles.arrowText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[carouselStyles.arrow, carouselStyles.arrowRight, idx === urls.length - 1 && carouselStyles.arrowDisabled]}
                        onPress={() => setIdx(i => Math.min(urls.length - 1, i + 1))}
                        disabled={idx === urls.length - 1}
                    >
                        <Text style={carouselStyles.arrowText}>›</Text>
                    </TouchableOpacity>
                    <View style={carouselStyles.dots}>
                        {urls.map((_, i) => (
                            <View key={i} style={[carouselStyles.dot, i === idx && carouselStyles.dotActive]} />
                        ))}
                    </View>
                </>
            )}
        </View>
    );
}

const carouselStyles = StyleSheet.create({
    wrapper: { width: '100%', aspectRatio: 1.4, backgroundColor: '#eee', marginBottom: 10, position: 'relative' },
    image: { width: '100%', height: '100%' },
    arrow: { position: 'absolute', top: '50%', marginTop: -22, backgroundColor: 'rgba(0,0,0,0.45)', width: 36, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    arrowLeft: { left: 8 },
    arrowRight: { right: 8 },
    arrowDisabled: { opacity: 0.2 },
    arrowText: { color: 'white', fontSize: 28, fontWeight: '900', lineHeight: 32 },
    dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: 'white', width: 9, height: 9 },
});
import { API_URL } from '../config';

async function parseResponse(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(text || `HTTP ${response.status}`);
    }
}

function getAuthorDisplayName(post, currentUserId) {
    return Number(post?.usuario_id) === Number(currentUserId) ? 'Yo' : (post?.autor_nombre || 'Usuario');
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
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/redsocial')}>
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
                                <Text style={styles.avatarFallbackText}>{getAuthorDisplayName(post, userId).charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View>
                            <Text style={styles.authorName}>{getAuthorDisplayName(post, userId)}</Text>
                            <Text style={styles.dateText}>{new Date(post.fecha_publicacion).toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.title}>{post.titulo}</Text>
                    <ImageCarousel imagenes={post.imagenes} />
                    <Text style={styles.description}>{post.descripcion}</Text>

                    <TouchableOpacity style={styles.likeButton} onPress={toggleLike}>
                        <Text style={[styles.likeIcon, post.likedByMe && styles.likeIconActive]}>{post.likedByMe ? '❤️' : '🤍'}</Text>
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
