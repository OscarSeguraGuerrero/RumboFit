import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { API_URL } from '../config';
import MainHeader from '../components/MainHeader';

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

export default function RedSocial() {
    const router = useRouter();
    const [userId, setUserId] = useState(null);
    const [createVisible, setCreateVisible] = useState(false);
    const [feed, setFeed] = useState([]);
    const searchInputRef = useRef(null);
    const [myPosts, setMyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [form, setForm] = useState({ titulo: '', descripcion: '', imagenes: [] });
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [topLikedPosts, setTopLikedPosts] = useState([]);
    const [errorModal, setErrorModal] = useState('');

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };


    const loadFeed = async (currentUserId) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/publicaciones/feed/${currentUserId}`);
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo cargar la comunidad');
            }
            setFeed(Array.isArray(data.publicaciones) ? data.publicaciones : []);
        } catch (error) {
            showMessage(error.message || 'No se pudo cargar la comunidad', 'error');
            setFeed([]);
        } finally {
            setLoading(false);
        }
    };

    const loadTopLikedPosts = async (currentUserId) => {
        try {
            const response = await fetch(`${API_URL}/publicaciones?userId=${currentUserId}`);
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudieron cargar las destacadas');
            }
            const rankedPosts = (Array.isArray(data.publicaciones) ? data.publicaciones : [])
                .sort((a, b) => {
                    const likeDiff = Number(b?._count?.me_gusta || 0) - Number(a?._count?.me_gusta || 0);
                    if (likeDiff !== 0) return likeDiff;
                    return new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion);
                })
                .slice(0, 6);
            setTopLikedPosts(rankedPosts);
        } catch {
            setTopLikedPosts([]);
        }
    };

    const loadMyPosts = async (currentUserId) => {
        try {
            const response = await fetch(`${API_URL}/publicaciones/usuario/${currentUserId}?viewerId=${currentUserId}`);
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudieron cargar tus publicaciones');
            }
            setMyPosts(Array.isArray(data.publicaciones) ? data.publicaciones : []);
        } catch (error) {
            showMessage(error.message || 'No se pudieron cargar tus publicaciones', 'error');
            setMyPosts([]);
        }
    };

    const bootstrap = async () => {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (!storedUserId) {
            router.replace('/');
            return;
        }
        setUserId(storedUserId);
        await loadFeed(storedUserId);
    };

    useEffect(() => {
        bootstrap();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (!userId) return undefined;
            loadFeed(userId);
            return undefined;
        }, [userId])
    );

    useEffect(() => {
        const run = async () => {
            if (!search.trim() || !userId) {
                setSearchResults([]);
                return;
            }

            setSearching(true);
            try {
                const response = await fetch(`${API_URL}/usuarios/buscar/${encodeURIComponent(search.trim())}?userId=${userId}`);
                const data = await parseResponse(response);
                if (response.ok && data.success) {
                    setSearchResults(Array.isArray(data.usuarios) ? data.usuarios : []);
                } else {
                    setSearchResults([]);
                }
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        };

        const timeout = setTimeout(run, 250);
        return () => clearTimeout(timeout);
    }, [search, userId]);

    const toggleFollowSearch = async (targetUser) => {
        const yaSiguiendo = targetUser.siguiendo;
        const endpoint = yaSiguiendo ? 'unfollow' : 'follow';
        try {
            const resp = await fetch(`${API_URL}/usuarios/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seguidorId: userId, seguidoId: targetUser.id })
            });
            const data = await resp.json();
            if (data.success) {
                // 1. Actualizar estado del buscador
                setSearchResults(prev => prev.map(u => 
                    u.id === targetUser.id ? { ...u, siguiendo: !yaSiguiendo } : u
                ));

                // 2. Si dejamos de seguir, limpiar el tablón local (HU-47)
                if (yaSiguiendo) {
                    setFeed(prev => prev.filter(p => Number(p.usuario_id) !== Number(targetUser.id)));
                    showMessage(`Has dejado de seguir a ${targetUser.nombre}`, 'success');
                } else {
                    // Si empezamos a seguir, recargamos el feed para que aparezcan sus posts
                    loadFeed(userId);
                    showMessage(`Ahora sigues a ${targetUser.nombre}`, 'success');
                }
            }
        } catch (e) {
            showMessage('No se pudo procesar el seguimiento', 'error');
        }
    };

    const seleccionarImagen = async () => {
        const remaining = 5 - form.imagenes.length;
        if (remaining === 0) {
            setErrorModal('Ya tienes el máximo de 5 imágenes');
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showMessage('Hace falta permiso para acceder a la galería', 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 0.3,
            base64: true,
            exif: false,
        });

        if (!result.canceled) {
            if (result.assets.length > remaining) {
                setErrorModal(`Solo puedes añadir ${remaining} imagen${remaining !== 1 ? 'es' : ''} más (máximo 5 en total)`);
                return;
            }
            const newImages = result.assets.map(asset => `data:image/jpeg;base64,${asset.base64}`);
            setForm(prev => ({ ...prev, imagenes: [...prev.imagenes, ...newImages] }));
        }
    };

    const eliminarImagenPrevia = (index) => {
        setForm(prev => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== index) }));
    };

    const cerrarModal = () => {
        setCreateVisible(false);
        setForm({ titulo: '', descripcion: '', imagenes: [] });
        setErrorModal('');
    };

    const publicar = async () => {
        if (!userId) return;
        setErrorModal('');

        if (!form.titulo.trim() || !form.descripcion.trim()) {
            setErrorModal('El título y la descripción son obligatorios');
            return;
        }

        setPublishing(true);
        try {
            const response = await fetch(`${API_URL}/publicaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    titulo: form.titulo,
                    descripcion: form.descripcion,
                    imagenes: form.imagenes,
                }),
            });
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo publicar');
            }

            setFeed((prev) => [data.publicacion, ...prev]);
            cerrarModal(); // Limpia y cierra
            showMessage('Publicación creada', 'success');
        } catch (error) {
            setErrorModal(error.message || 'No se pudo publicar');
        } finally {
            setPublishing(false);
        }
    };

    const confirmarEliminarPublicacion = async () => {
        if (!deleteTarget || !userId) return;
        try {
            const response = await fetch(`${API_URL}/publicaciones/${deleteTarget}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo eliminar');
            }
            setFeed((prev) => prev.filter((post) => Number(post.id) !== Number(deleteTarget)));
            showMessage('Publicación eliminada', 'success');
        } catch (error) {
            showMessage(error.message || 'No se pudo eliminar', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    const toggleLike = async (postId) => {
        if (!userId) return;

        const applyUpdate = (posts, liked, count) => posts.map((post) => {
            if (Number(post.id) !== Number(postId)) return post;
            return { ...post, likedByMe: liked, _count: { ...post._count, me_gusta: count } };
        });

        // Actualización optimista inmediata
        const currentPost = feed.find(p => Number(p.id) === Number(postId));
        if (!currentPost) return;
        const optimisticLiked = !currentPost.likedByMe;
        const optimisticCount = optimisticLiked
            ? (currentPost._count?.me_gusta || 0) + 1
            : Math.max(0, (currentPost._count?.me_gusta || 0) - 1);
        setFeed((prev) => applyUpdate(prev, optimisticLiked, optimisticCount));

        try {
            const response = await fetch(`${API_URL}/publicaciones/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await parseResponse(response);
            if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo actualizar el like');
            // Confirmar con los valores reales del servidor
            setFeed((prev) => applyUpdate(prev, data.liked, data.likesCount));
        } catch (error) {
            // Revertir si falla
            setFeed((prev) => applyUpdate(prev, currentPost.likedByMe, currentPost._count?.me_gusta || 0));
            showMessage(error.message || 'No se pudo actualizar el like', 'error');
        }
    };


    return (
        <View style={styles.container}>
            <MainHeader />

            <Modal transparent visible={createVisible} animationType="fade">
                <View style={styles.createOverlay}>
                    <View style={styles.createCard}>
                        <Text style={styles.createTitle}>Nueva publicación</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Título"
                            placeholderTextColor="#999"
                            maxLength={80}
                            value={form.titulo}
                            onChangeText={(text) => {
                                setForm((prev) => ({ ...prev, titulo: text }));
                                if (errorModal) setErrorModal('');
                            }}
                        />
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Descripción"
                            placeholderTextColor="#999"
                            multiline
                            value={form.descripcion}
                            onChangeText={(text) => {
                                setForm((prev) => ({ ...prev, descripcion: text }));
                                if (errorModal) setErrorModal('');
                            }}
                        />

                        {errorModal ? (
                            <Text style={styles.modalErrorText}>{errorModal}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.secondaryButton, form.imagenes.length >= 5 && styles.secondaryButtonDisabled]}
                            onPress={seleccionarImagen}
                        >
                            <Text style={styles.secondaryButtonText}>
                                {form.imagenes.length === 0
                                    ? 'Añadir imágenes'
                                    : form.imagenes.length >= 5
                                        ? '5/5 — máximo alcanzado'
                                        : `Añadir más (${form.imagenes.length}/5)`}
                            </Text>
                        </TouchableOpacity>
                        {form.imagenes.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                {form.imagenes.map((imagen, index) => (
                                    <View key={index} style={styles.previewThumbWrapper}>
                                        <Image source={{ uri: imagen }} style={styles.previewThumb} />
                                        <TouchableOpacity
                                            style={styles.removeThumbBtn}
                                            onPress={() => eliminarImagenPrevia(index)}
                                        >
                                            <Text style={styles.removeThumbText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        <View style={styles.createActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={cerrarModal}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={publicar} disabled={publishing}>
                                <Text style={styles.primaryButtonText}>{publishing ? 'Publicando...' : 'Publicar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={Boolean(deleteTarget)} animationType="fade">
                <View style={styles.createOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>Eliminar publicación</Text>
                        <Text style={styles.confirmText}>Esta acción borrará la publicación permanentemente del tablón.</Text>
                        <View style={styles.createActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteTarget(null)}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={confirmarEliminarPublicacion}>
                                <Text style={styles.primaryButtonText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.mainCard}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.methodLabel}>RED SOCIAL</Text>
                            <Text style={styles.title}>Comunidad</Text>
                        </View>
                        <TouchableOpacity style={styles.createButton} onPress={() => setCreateVisible(true)}>
                            <Text style={styles.createButtonText}>+ Crear Post</Text>
                        </TouchableOpacity>
                    </View>

                    {/* BUSCADOR INTERACTIVO (HU-45) */}
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar usuarios por nombre..."
                        placeholderTextColor="#999"
                        value={search}
                        onChangeText={setSearch}
                    />

                    {(search.trim().length > 0 || searching) && (
                        <View style={styles.searchPanel}>
                            {searching ? (
                                <Text style={styles.searchState}>Buscando coincidencias...</Text>
                            ) : searchResults.length === 0 ? (
                                <Text style={styles.searchState}>No se han encontrado coincidencias</Text>
                            ) : (
                                searchResults.map((result) => (
                                    <TouchableOpacity
                                        key={result.id}
                                        style={styles.searchResultRow}
                                        onPress={() => {
                                            setSearch('');
                                            router.push(`/perfil?id=${result.id}`);
                                        }}
                                    >
                                        {result.foto_perfil ? (
                                            <Image source={{ uri: result.foto_perfil }} style={styles.searchAvatar} />
                                        ) : (
                                            <View style={styles.searchAvatarFallback}>
                                                <Text style={styles.searchAvatarFallbackText}>
                                                    {result.nombre.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.searchName}>{result.nombre}</Text>
                                            <TouchableOpacity
                                                onPress={() => toggleFollowSearch(result)}
                                                style={[styles.miniFollowBtn, result.siguiendo && styles.miniUnfollowBtn]}
                                            >
                                                <Text style={styles.miniFollowBtnText}>
                                                    {result.siguiendo ? 'Siguiendo' : 'Seguir'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Tablón de Actividad</Text>

                    {loading ? (
                        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center', marginTop: 20 }}>Cargando publicaciones...</Text>
                    ) : feed.length === 0 ? (
                        <View style={styles.emptyFeedCard}>
                            <Text style={styles.emptyFeedText}>
                                Aún no hay actividad. ¡Busca a otros usuarios para empezar!
                            </Text>
                        </View>
                    ) : (
                        feed.map((post) => (
                            <View key={post.id} style={styles.postCard}>
                                <View style={styles.postHeader}>
                                    <TouchableOpacity
                                        style={styles.authorRow}
                                        onPress={() => router.push(`/perfil?id=${post.usuario_id}`)}
                                    >
                                        {post.autor_foto ? (
                                            <Image source={{ uri: post.autor_foto }} style={styles.authorAvatar} />
                                        ) : (
                                            <View style={styles.authorAvatarFallback}>
                                                <Text style={styles.authorAvatarFallbackText}>
                                                    {(post.autor_nombre || 'U').charAt(0)}
                                                </Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={styles.authorName}>{post.autor_nombre}</Text>
                                            <Text style={styles.postMeta}>
                                                {new Date(post.fecha_publicacion).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {Number(post.usuario_id) === Number(userId) && (
                                        <TouchableOpacity onPress={() => setDeleteTarget(post.id)}>
                                            <Text style={styles.deleteText}>Eliminar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.postTitle}>{post.titulo}</Text>
                                <Text style={styles.postDescription}>{post.descripcion}</Text>

                                <ImageCarousel imagenes={post.imagenes} />

                                <View style={styles.postActions}>
                                    <TouchableOpacity
                                        style={styles.likeButton}
                                        onPress={() => toggleLike(post.id)}
                                    >
                                        <Text style={[styles.likeIcon, post.likedByMe && styles.likeIconActive]}>
                                            {post.likedByMe ? '❤️' : '🤍'}
                                        </Text>
                                        <Text style={styles.likeCount}>{post._count?.me_gusta || 0}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            <View style={styles.navContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/rutina')}>
                        <Text style={styles.tabBarText}>MIS RUTINAS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/dieta')}>
                        <Text style={styles.tabBarText}>MI DIETA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem}>
                        <Text style={[styles.tabBarText, styles.tabBarTextActive]}>COMUNIDAD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

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
    wrapper: { width: '100%', aspectRatio: 1.6, borderRadius: 14, overflow: 'hidden', backgroundColor: '#eee', marginVertical: 10, position: 'relative' },
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

function FeaturedPostCard({ post, onOpenProfile, onOpenDetail }) {
    return (
        <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={() => onOpenDetail(post.id)}>
            {post.imagenes?.[0]?.url ? (
                <Image source={{ uri: post.imagenes[0].url }} style={styles.featuredImage} />
            ) : (
                <View style={styles.featuredImageFallback} />
            )}
            <View style={styles.featuredOverlay} />
            <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>♥ {post?._count?.me_gusta || 0}</Text>
            </View>
            <View style={styles.featuredContent}>
                <TouchableOpacity onPress={() => onOpenProfile(post.usuario_id)} activeOpacity={0.8}>
                    <Text style={styles.featuredAuthor}>{post.autor_nombre || 'Usuario'}</Text>
                </TouchableOpacity>
                <Text style={styles.featuredPostTitle} numberOfLines={2}>{post.titulo}</Text>
                {post.descripcion ? (
                    <Text style={styles.featuredDescription} numberOfLines={2}>{post.descripcion}</Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    createCard: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 20, padding: 20 },
    confirmCard: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 20, padding: 20 },
    createTitle: { fontSize: 18, fontWeight: '900', color: '#222', marginBottom: 14 },
    confirmText: { color: '#555', fontSize: 14, lineHeight: 20 },
    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, overflow: 'hidden' },
    scrollContent: { padding: 18, paddingBottom: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    createButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'white', paddingHorizontal: 15, paddingVertical: 8 },
    createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    searchInput: { backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#222', marginBottom: 12, fontWeight: '600' },
    searchPanel: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
    searchState: { color: '#666', padding: 14, fontWeight: '600' },
    searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    searchAvatar: { width: 36, height: 36, borderRadius: 18 },
    searchAvatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff7a00', alignItems: 'center', justifyContent: 'center' },
    searchAvatarFallbackText: { color: 'white', fontWeight: '900' },
    searchName: { color: '#222', fontWeight: '700' },
    featuredSection: { marginBottom: 18 },
    featuredHeader: { marginBottom: 12 },
    featuredEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    featuredTitle: { color: 'white', fontSize: 18, fontWeight: '900', marginTop: 3 },
    featuredList: { paddingRight: 10 },
    featuredCard: { width: 260, height: 180, borderRadius: 20, marginRight: 12, overflow: 'hidden', backgroundColor: '#d96b00', position: 'relative' },
    featuredImage: { width: '100%', height: '100%', position: 'absolute' },
    featuredImageFallback: { width: '100%', height: '100%', position: 'absolute', backgroundColor: 'rgba(255,255,255,0.18)' },
    featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
    featuredBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    featuredBadgeText: { color: '#e74c3c', fontWeight: '900', fontSize: 12 },
    featuredContent: { position: 'absolute', left: 14, right: 14, bottom: 14 },
    featuredAuthor: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', marginBottom: 6 },
    featuredPostTitle: { color: 'white', fontSize: 18, fontWeight: '900', lineHeight: 22, marginBottom: 4 },
    featuredDescription: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
    featuredEmptyCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 16 },
    featuredEmptyText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
    input: { backgroundColor: '#f4f4f4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#222', marginBottom: 10, fontWeight: '600' },
    textarea: { minHeight: 96, textAlignVertical: 'top' },
    modalErrorText: { color: '#e74c3c', fontSize: 12, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    previewThumb: { width: 64, height: 64, borderRadius: 10, marginRight: 8 },
    createActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 16 },
    secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
    secondaryButtonDisabled: { borderColor: '#ccc', backgroundColor: '#f9f9f9' },
    secondaryButtonText: { color: '#ff7a00', fontWeight: '800' },
    primaryButton: { flex: 1, backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    primaryButtonText: { color: 'white', fontWeight: '900' },
    cancelButton: { flex: 1, backgroundColor: '#efefef', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    cancelButtonText: { color: '#666', fontWeight: '800' },
    previewThumbWrapper: { position: 'relative', marginRight: 8 },
    removeThumbBtn: { position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.65)', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    removeThumbText: { color: 'white', fontSize: 11, fontWeight: '900', lineHeight: 13 },
    sectionTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 12 },
    emptyText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600', marginBottom: 16 },
    emptyFeedCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 18, marginBottom: 16 },
    emptyFeedText: { color: 'white', fontSize: 14, lineHeight: 20, marginBottom: 12, fontWeight: '700' },
    emptyFeedButton: { alignSelf: 'flex-start', backgroundColor: 'white', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
    emptyFeedButtonText: { color: '#ff7a00', fontWeight: '900' },
    myPostsCarousel: { paddingRight: 10, paddingBottom: 10 },
    postCard: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14 },
    postCardCompact: { width: 240, marginRight: 12, marginBottom: 4, padding: 14 },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    authorAvatar: { width: 42, height: 42, borderRadius: 21 },
    authorAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ff7a00', alignItems: 'center', justifyContent: 'center' },
    authorAvatarFallbackText: { color: 'white', fontWeight: '900', fontSize: 18 },
    authorName: { color: '#222', fontWeight: '900', fontSize: 14 },
    postTitle: { color: '#222', fontWeight: '900', fontSize: 16, marginBottom: 6 },
    postTitleCompact: { fontSize: 14, lineHeight: 18 },
    postMeta: { color: '#999', fontSize: 11, fontWeight: '700' },
    postDescription: { color: '#555', fontSize: 13, lineHeight: 19, marginBottom: 10 },
    postDescriptionCompact: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
    postImage: { width: '100%', height: 260, borderRadius: 14, backgroundColor: '#eee' },
    postImageCompact: { height: 140, borderRadius: 12 },
    postActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    likeIcon: { fontSize: 20, color: '#888' },
    likeIconActive: { color: '#e74c3c' },
    likeCount: { color: '#444', fontWeight: '800' },
    deleteText: { color: '#e74c3c', fontWeight: '800', fontSize: 12 },
    banner: { padding: 12, borderRadius: 12, marginBottom: 14, alignItems: 'center' },
    bannerError: { backgroundColor: 'rgba(231, 76, 60, 0.2)', borderWidth: 1, borderColor: '#e74c3c' },
    bannerSuccess: { backgroundColor: 'rgba(46, 204, 113, 0.2)', borderWidth: 1, borderColor: '#2ecc71' },
    bannerText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
    miniFollowBtn: {
        marginTop: 4,
        backgroundColor: '#ff7a00',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    miniUnfollowBtn: {
        backgroundColor: '#ccc'
    },
    miniFollowBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '900'
    },
    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
});
