import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
    const [userName, setUserName] = useState('Usuario');
    const [menuVisible, setMenuVisible] = useState(false);
    const [createVisible, setCreateVisible] = useState(false);
    const [feed, setFeed] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [form, setForm] = useState({ titulo: '', descripcion: '', imagenes: [] });
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [topLikedPosts, setTopLikedPosts] = useState([]);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const loadUnreadCount = async (currentUserId) => {
        try {
            const response = await fetch(`${API_URL}/notificaciones/${currentUserId}/unread-count`);
            const data = await parseResponse(response);
            if (response.ok && data.success) {
                setUnreadCount(Number(data.count || 0));
            }
        } catch {}
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
        const storedUserName = await AsyncStorage.getItem('userName');

        if (!storedUserId) {
            router.replace('/');
            return;
        }

        setUserId(storedUserId);
        if (storedUserName) setUserName(storedUserName);
        await Promise.all([
            loadFeed(storedUserId),
            loadMyPosts(storedUserId),
            loadUnreadCount(storedUserId),
            loadTopLikedPosts(storedUserId)
        ]);
    };

    useEffect(() => {
        bootstrap();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (!userId) return undefined;
            loadFeed(userId);
            loadMyPosts(userId);
            loadUnreadCount(userId);
            loadTopLikedPosts(userId);
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

    const seleccionarImagen = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showMessage('Hace falta permiso para acceder a la galería', 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.6,
            base64: true,
        });

        if (!result.canceled) {
            const selectedImages = result.assets
                .slice(0, 5)
                .map((asset) => `data:image/jpeg;base64,${asset.base64}`);
            setForm((prev) => ({ ...prev, imagenes: selectedImages }));
        }
    };

    const publicar = async () => {
        if (!userId) return;
        if (!form.titulo.trim() || !form.descripcion.trim()) {
            showMessage('El título y la descripción son obligatorios', 'error');
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

            setMyPosts((prev) => [data.publicacion, ...prev]);
            setForm({ titulo: '', descripcion: '', imagenes: [] });
            setCreateVisible(false);
            showMessage('Publicación creada', 'success');
        } catch (error) {
            showMessage(error.message || 'No se pudo publicar', 'error');
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
            setMyPosts((prev) => prev.filter((post) => Number(post.id) !== Number(deleteTarget)));
            setTopLikedPosts((prev) => prev.filter((post) => Number(post.id) !== Number(deleteTarget)));
            showMessage('Publicación eliminada', 'success');
        } catch (error) {
            showMessage(error.message || 'No se pudo eliminar', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    const toggleLike = async (postId) => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_URL}/publicaciones/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await parseResponse(response);
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo actualizar el like');
            }

            const applyLikeUpdate = (posts) => posts.map((post) => {
                if (Number(post.id) !== Number(postId)) return post;
                return {
                    ...post,
                    likedByMe: data.liked,
                    _count: {
                        ...post._count,
                        me_gusta: data.likesCount
                    }
                };
            });

            setFeed((prev) => applyLikeUpdate(prev));
            setMyPosts((prev) => applyLikeUpdate(prev));
            setTopLikedPosts((prev) => applyLikeUpdate(prev));
        } catch (error) {
            showMessage(error.message || 'No se pudo actualizar el like', 'error');
        }
    };

    const cerrarSesion = async () => {
        setMenuVisible(false);
        await AsyncStorage.clear();
        if (typeof router.dismissAll === 'function') {
            router.dismissAll();
        }
        router.replace('/');
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
                <View style={styles.topRight}>
                    <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notificaciones')}>
                        <Text style={styles.bellIcon}>🔔</Text>
                        {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.avatarGlow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal transparent visible={menuVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdown}>
                                <Text style={styles.dropdownHeader}>{userName || 'Usuario'}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); router.push('/perfil'); }}>
                                    <Text style={styles.dropdownText}>Ver Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); router.push('/historial'); }}>
                                    <Text style={styles.dropdownText}>Mi Historial</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); router.push('/notificaciones'); }}>
                                    <Text style={styles.dropdownText}>Notificaciones</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={cerrarSesion}>
                                    <Text style={[styles.dropdownText, { color: '#ff4444' }]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

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
                            onChangeText={(text) => setForm((prev) => ({ ...prev, titulo: text }))}
                        />
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Descripción"
                            placeholderTextColor="#999"
                            multiline
                            value={form.descripcion}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, descripcion: text }))}
                        />
                        <TouchableOpacity style={styles.secondaryButton} onPress={seleccionarImagen}>
                            <Text style={styles.secondaryButtonText}>
                                {form.imagenes.length > 0 ? `${form.imagenes.length} imágenes seleccionadas` : 'Añadir imágenes'}
                            </Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            {form.imagenes.map((imagen, index) => (
                                <Image key={`${imagen}-${index}`} source={{ uri: imagen }} style={styles.previewThumb} />
                            ))}
                        </ScrollView>
                        <View style={styles.createActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setCreateVisible(false)}>
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
                        <Text style={styles.createTitle}>Eliminar publicaciÃ³n</Text>
                        <Text style={styles.confirmText}>Esta acciÃ³n quitarÃ¡ la publicaciÃ³n del tablÃ³n.</Text>
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
                {message.text ? (
                    <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
                        <Text style={styles.bannerText}>{message.text}</Text>
                    </View>
                ) : null}

                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodLabel}>RED SOCIAL</Text>
                        <Text style={styles.title}>Tu tablón</Text>
                    </View>
                    <TouchableOpacity style={styles.createButton} onPress={() => setCreateVisible(true)}>
                        <Text style={styles.createButtonText}>+ Crear</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar usuarios por nombre"
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={setSearch}
                />

                {(search.trim().length > 0 || searching) && (
                    <View style={styles.searchPanel}>
                        {searching ? (
                            <Text style={styles.searchState}>Buscando...</Text>
                        ) : searchResults.length === 0 ? (
                            <Text style={styles.searchState}>No se han encontrado coincidencias</Text>
                        ) : (
                            searchResults.map((result) => (
                                <TouchableOpacity
                                    key={result.id}
                                    style={styles.searchResultRow}
                                    onPress={() => router.push(`/perfil?id=${result.id}`)}
                                >
                                    {result.foto_perfil ? (
                                        <Image source={{ uri: result.foto_perfil }} style={styles.searchAvatar} />
                                    ) : (
                                        <View style={styles.searchAvatarFallback}>
                                            <Text style={styles.searchAvatarFallbackText}>{result.nombre.charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.searchName}>{result.nombre}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                <View style={styles.featuredSection}>
                    <View style={styles.featuredHeader}>
                        <View>
                            <Text style={styles.featuredEyebrow}>TENDENCIAS</Text>
                            <Text style={styles.featuredTitle}>Más likes de la comunidad</Text>
                        </View>
                    </View>
                    {topLikedPosts.length === 0 ? (
                        <View style={styles.featuredEmptyCard}>
                            <Text style={styles.featuredEmptyText}>Todavía no hay publicaciones destacadas.</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                            {topLikedPosts.map((post) => (
                                <FeaturedPostCard
                                    key={`top-${post.id}`}
                                    post={post}
                                    onOpenProfile={(targetUserId) => router.push(`/perfil?id=${targetUserId}`)}
                                    onOpenDetail={(postId) => router.push(`/publicacion?id=${postId}`)}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <Text style={styles.sectionTitle}>Tus publicaciones</Text>
                    {myPosts.length === 0 ? (
                        <Text style={styles.emptyText}>Todavía no has publicado nada.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myPostsCarousel}>
                            {myPosts.map((post) => (
                                <PostCard
                                    key={`mine-${post.id}`}
                                    post={post}
                                    ownPost
                                    compact
                                    onDelete={setDeleteTarget}
                                    onLike={toggleLike}
                                    onOpenProfile={(targetUserId) => router.push(`/perfil?id=${targetUserId}`)}
                                    onOpenDetail={(postId) => router.push(`/publicacion?id=${postId}`)}
                                />
                            ))}
                        </ScrollView>
                    )}

                    <Text style={styles.sectionTitle}>Actividad de amigos</Text>
                    {loading ? (
                        <Text style={styles.emptyText}>Cargando publicaciones...</Text>
                    ) : feed.length === 0 ? (
                        <View style={styles.emptyFeedCard}>
                            <Text style={styles.emptyFeedText}>Aún no hay actividad. ¡Busca a otros usuarios para empezar!</Text>
                            <TouchableOpacity style={styles.emptyFeedButton} onPress={() => showMessage('Usa la barra superior para buscar usuarios', 'success')}>
                                <Text style={styles.emptyFeedButtonText}>Buscar usuarios</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        feed.map((post) => (
                            <PostCard
                                key={`feed-${post.id}`}
                                post={post}
                                ownPost={Number(post.usuario_id) === Number(userId)}
                                onDelete={setDeleteTarget}
                                onLike={toggleLike}
                                onOpenProfile={(targetUserId) => router.push(`/perfil?id=${targetUserId}`)}
                                onOpenDetail={(postId) => router.push(`/publicacion?id=${postId}`)}
                            />
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

function PostCard({ post, ownPost, compact = false, onDelete, onLike, onOpenProfile, onOpenDetail }) {
    return (
        <View style={[styles.postCard, compact && styles.postCardCompact]}>
            <View style={styles.postHeader}>
                <TouchableOpacity style={styles.authorRow} onPress={() => onOpenProfile(post.usuario_id)}>
                    {post.autor_foto ? (
                        <Image source={{ uri: post.autor_foto }} style={styles.authorAvatar} />
                    ) : (
                        <View style={styles.authorAvatarFallback}>
                            <Text style={styles.authorAvatarFallbackText}>
                                {(post.autor_nombre || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.authorName}>{post.autor_nombre || 'Usuario'}</Text>
                        <Text style={styles.postMeta}>{relativeTime(post.fecha_publicacion)}</Text>
                    </View>
                </TouchableOpacity>
                {ownPost ? (
                    <TouchableOpacity onPress={() => onDelete(post.id)}>
                        <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <TouchableOpacity onPress={() => onOpenDetail(post.id)} activeOpacity={0.9}>
                <Text style={[styles.postTitle, compact && styles.postTitleCompact]} numberOfLines={compact ? 2 : undefined}>{post.titulo}</Text>
                {post.descripcion ? (
                    <Text style={[styles.postDescription, compact && styles.postDescriptionCompact]} numberOfLines={compact ? 2 : undefined}>
                        {post.descripcion}
                    </Text>
                ) : null}
                {post.imagenes?.[0]?.url ? (
                    <Image source={{ uri: post.imagenes[0].url }} style={[styles.postImage, compact && styles.postImageCompact]} />
                ) : null}
            </TouchableOpacity>

            <View style={styles.postActions}>
                <TouchableOpacity style={styles.likeButton} onPress={() => onLike(post.id)}>
                    <Text style={[styles.likeIcon, post.likedByMe && styles.likeIconActive]}>{post.likedByMe ? '♥' : '♡'}</Text>
                    <Text style={styles.likeCount}>{post?._count?.me_gusta || 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

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
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bellButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,122,0,0.12)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    bellIcon: { fontSize: 18 },
    bellDot: { position: 'absolute', top: 9, right: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff3b30' },
    avatarGlow: { padding: 3, borderRadius: 26, backgroundColor: 'rgba(255, 122, 0, 0.15)' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: {color: 'white', fontWeight: 'bold', fontSize: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },
    createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    createCard: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 20, padding: 20 },
    confirmCard: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 20, padding: 20 },
    createTitle: { fontSize: 18, fontWeight: '900', color: '#222', marginBottom: 14 },
    confirmText: { color: '#555', fontSize: 14, lineHeight: 20 },
    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
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
    previewThumb: { width: 64, height: 64, borderRadius: 10, marginRight: 8 },
    createActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 16 },
    secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
    secondaryButtonText: { color: '#ff7a00', fontWeight: '800' },
    primaryButton: { flex: 1, backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    primaryButtonText: { color: 'white', fontWeight: '900' },
    cancelButton: { flex: 1, backgroundColor: '#efefef', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    cancelButtonText: { color: '#666', fontWeight: '800' },
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
    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
});
