import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

export default function RedSocial() {
    const router = useRouter();
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState('Usuario');
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [form, setForm] = useState({ nombre: '', descripcion: '', imagen: '' });
    const [menuVisible, setMenuVisible] = useState(false);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const loadFeed = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/publicaciones`);
            const data = await parseResponse(response);

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo cargar la comunidad');
            }

            setFeed(Array.isArray(data.publicaciones) ? data.publicaciones : []);
        } catch (error) {
            showMessage(error.message || 'No se pudo cargar la comunidad', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            const storedUserId = await AsyncStorage.getItem('userId');
            const storedUserName = await AsyncStorage.getItem('userName');

            if (!storedUserId) {
                router.replace('/');
                return;
            }

            setUserId(storedUserId);
            if (storedUserName) setUserName(storedUserName);
            await loadFeed();
        };

        bootstrap();
    }, []);

    const seleccionarImagen = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showMessage('Hace falta permiso para acceder a la galería', 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.6,
            base64: true,
        });

        if (!result.canceled) {
            setForm((prev) => ({
                ...prev,
                imagen: `data:image/jpeg;base64,${result.assets[0].base64}`,
            }));
        }
    };

    const publicar = async () => {
        if (!userId) return;
        if (!form.nombre.trim()) {
            showMessage('Ponle un nombre a la publicación', 'error');
            return;
        }

        setPublishing(true);
        try {
            const response = await fetch(`${API_URL}/publicaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    nombre: form.nombre,
                    descripcion: form.descripcion,
                    imagen: form.imagen,
                }),
            });
            const data = await parseResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo publicar');
            }

            setFeed((prev) => [data.publicacion, ...prev]);
            setForm({ nombre: '', descripcion: '', imagen: '' });
            showMessage('Publicación creada', 'success');
        } catch (error) {
            showMessage(error.message || 'No se pudo publicar', 'error');
        } finally {
            setPublishing(false);
        }
    };

    const eliminarPublicacion = async (postId) => {
        if (!userId) return;

        try {
            const response = await fetch(`${API_URL}/publicaciones/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await parseResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'No se pudo eliminar');
            }

            setFeed((prev) => prev.filter((post) => Number(post.id) !== Number(postId)));
            showMessage('Publicación eliminada', 'success');
        } catch (error) {
            showMessage(error.message || 'No se pudo eliminar', 'error');
        }
    };

    const cerrarSesion = async () => {
        setMenuVisible(false);
        await AsyncStorage.clear();
        router.replace('/');
    };

    const misPublicaciones = feed.filter((post) => Number(post.usuario_id) === Number(userId));

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.avatarGlow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                    </View>
                </TouchableOpacity>
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
                                <TouchableOpacity style={styles.dropdownItem} onPress={cerrarSesion}>
                                    <Text style={[styles.dropdownText, { color: '#ff4444' }]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View style={styles.mainCard}>
                {message.text ? (
                    <View style={[styles.banner, message.type === 'error' ? styles.bannerError : styles.bannerSuccess]}>
                        <Text style={styles.bannerText}>{message.text}</Text>
                    </View>
                ) : null}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.methodLabel}>RED SOCIAL</Text>
                            <Text style={styles.title}>Comunidad</Text>
                        </View>
                        <TouchableOpacity style={styles.refreshButton} onPress={loadFeed}>
                            <Text style={styles.refreshButtonText}>Actualizar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.composer}>
                        <Text style={styles.sectionTitleDark}>Crear publicación</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nombre de la publicación"
                            placeholderTextColor="#999"
                            value={form.nombre}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, nombre: text }))}
                        />
                        <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Descripción"
                            placeholderTextColor="#999"
                            multiline
                            value={form.descripcion}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, descripcion: text }))}
                        />
                        {form.imagen ? <Image source={{ uri: form.imagen }} style={styles.previewImage} /> : null}
                        <View style={styles.composerActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={seleccionarImagen}>
                                <Text style={styles.secondaryButtonText}>{form.imagen ? 'Cambiar imagen' : 'Añadir imagen'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={publicar} disabled={publishing}>
                                <Text style={styles.primaryButtonText}>{publishing ? 'Publicando...' : 'Publicar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Tus publicaciones</Text>
                    {misPublicaciones.length === 0 ? (
                        <Text style={styles.emptyText}>Todavía no has publicado nada.</Text>
                    ) : (
                        misPublicaciones.map((post) => (
                            <View key={`mine-${post.id}`} style={styles.postCard}>
                                <View style={styles.postHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.postTitle}>{post.titulo}</Text>
                                        <Text style={styles.postMeta}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => eliminarPublicacion(post.id)}>
                                        <Text style={styles.deleteText}>Eliminar</Text>
                                    </TouchableOpacity>
                                </View>
                                {post.descripcion ? <Text style={styles.postDescription}>{post.descripcion}</Text> : null}
                                {post.imagenes?.[0]?.url ? <Image source={{ uri: post.imagenes[0].url }} style={styles.postImage} /> : null}
                            </View>
                        ))
                    )}

                    <Text style={styles.sectionTitle}>Comunidad</Text>
                    {loading ? (
                        <Text style={styles.emptyText}>Cargando publicaciones...</Text>
                    ) : feed.length === 0 ? (
                        <Text style={styles.emptyText}>Todavía no hay publicaciones.</Text>
                    ) : (
                        feed.map((post) => (
                            <View key={`feed-${post.id}`} style={styles.postCard}>
                                <View style={styles.authorRow}>
                                    {post.autor_foto ? (
                                        <Image source={{ uri: post.autor_foto }} style={styles.authorAvatar} />
                                    ) : (
                                        <View style={styles.authorAvatarFallback}>
                                            <Text style={styles.authorAvatarFallbackText}>
                                                {(post.autor_nombre || 'U').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.authorName}>{post.autor_nombre || 'Usuario'}</Text>
                                        <Text style={styles.postMeta}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <Text style={styles.postTitle}>{post.titulo}</Text>
                                {post.descripcion ? <Text style={styles.postDescription}>{post.descripcion}</Text> : null}
                                {post.imagenes?.[0]?.url ? <Image source={{ uri: post.imagenes[0].url }} style={styles.postImage} /> : null}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },
    avatarGlow: { padding: 3, borderRadius: 26, backgroundColor: 'rgba(255, 122, 0, 0.15)' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },
    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    refreshButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'white', paddingHorizontal: 15, paddingVertical: 8 },
    refreshButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    composer: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 18 },
    input: { backgroundColor: '#f4f4f4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#222', marginBottom: 10, fontWeight: '600' },
    textarea: { minHeight: 96, textAlignVertical: 'top' },
    previewImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 10 },
    composerActions: { flexDirection: 'row', gap: 10 },
    secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
    secondaryButtonText: { color: '#ff7a00', fontWeight: '800' },
    primaryButton: { flex: 1, backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    primaryButtonText: { color: 'white', fontWeight: '900' },
    sectionTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 12 },
    sectionTitleDark: { color: '#222', fontWeight: '900', fontSize: 16, marginBottom: 12 },
    emptyText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600', marginBottom: 16 },
    postCard: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14 },
    postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    authorAvatar: { width: 42, height: 42, borderRadius: 21 },
    authorAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ff7a00', alignItems: 'center', justifyContent: 'center' },
    authorAvatarFallbackText: { color: 'white', fontWeight: '900', fontSize: 18 },
    authorName: { color: '#222', fontWeight: '900', fontSize: 14 },
    postTitle: { color: '#222', fontWeight: '900', fontSize: 16, marginBottom: 6 },
    postMeta: { color: '#999', fontSize: 11, fontWeight: '700' },
    postDescription: { color: '#555', fontSize: 13, lineHeight: 19, marginBottom: 10 },
    postImage: { width: '100%', height: 260, borderRadius: 14, backgroundColor: '#eee' },
    deleteText: { color: '#e74c3c', fontWeight: '800', fontSize: 12 },
    banner: { padding: 12, borderRadius: 12, marginBottom: 14, alignItems: 'center' },
    bannerError: { backgroundColor: 'rgba(231, 76, 60, 0.2)', borderWidth: 1, borderColor: '#e74c3c' },
    bannerSuccess: { backgroundColor: 'rgba(46, 204, 113, 0.2)', borderWidth: 1, borderColor: '#2ecc71' },
    bannerText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
    navContainer: { position: 'absolute', bottom: 15, left: 0, right: 0, alignItems: 'center' },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', width: '92%', borderRadius: 20, paddingVertical: 10, elevation: 10, justifyContent: 'space-around', alignItems: 'center' },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
});
