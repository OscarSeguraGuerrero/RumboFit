import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_URL } from '../config';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Eliminamos el uso de height fijo para el fondo para que pueda crecer
const { width } = Dimensions.get('window');

export default function Perfil() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [usuario, setUsuario] = useState(null);
    const [propioId, setPropioId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [esPropioPerfil, setEsPropioPerfil] = useState(false);

    const [editando, setEditando] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoEmail, setNuevoEmail] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoPeso, setNuevoPeso] = useState('');
    const [nuevaAltura, setNuevaAltura] = useState('');
    const [nuevaEdad, setNuevaEdad] = useState('');
    const [nuevoSexo, setNuevoSexo] = useState('');
    const [nuevoObjetivo, setNuevoObjetivo] = useState('');
    const [nuevoNivel, setNuevoNivel] = useState('');
    const [nuevaFrecuencia, setNuevaFrecuencia] = useState('');
    const [nuevaFoto, setNuevaFoto] = useState('');

    const [publicaciones, setPublicaciones] = useState([]);
    const [siguiendo, setSiguiendo] = useState(false);

    useEffect(() => {
        cargarDatosIniciales();
    }, [params.id]);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        const myId = await AsyncStorage.getItem("userId");
        setPropioId(myId);
        
        const targetId = params.id || myId;
        setEsPropioPerfil(targetId === myId);
        
        await cargarUsuario(targetId);
        await cargarPublicaciones(targetId);
        
        if (targetId !== myId) {
            verificarSeguimiento(myId, targetId);
        }
    };

    const cargarUsuario = async (userId) => {
        try {
            if (userId) {
                const response = await fetch(`${API_URL}/usuarios/${userId}`);
                const result = await response.json();
                if (result.success) {
                    setUsuario(result.usuario);
                    setNuevoNombre(result.usuario.nombre || '');
                    setNuevoEmail(result.usuario.email || '');
                    setNuevoTelefono(result.usuario.telefono || '');
                    setNuevoPeso(result.usuario.peso?.toString() || '');
                    setNuevaAltura(result.usuario.altura?.toString() || '');
                    setNuevaEdad(result.usuario.edad?.toString() || '');
                    setNuevoSexo(result.usuario.sexo || '');
                    setNuevoObjetivo(result.usuario.objetivo || '');
                    setNuevoNivel(result.usuario.nivel || '');
                    setNuevaFrecuencia(result.usuario.frecuencia_semanal?.toString() || '');
                    setNuevaFoto(result.usuario.foto_perfil || '');
                }
            }
        } catch (error) {
            console.error("Error cargando perfil:", error);
        } finally {
            setLoading(false);
        }
    };

    const cargarPublicaciones = async (userId) => {
        try {
            const resp = await fetch(`${API_URL}/usuarios/${userId}/publicaciones`);
            const data = await resp.json();
            if (data.success) setPublicaciones(data.publicaciones);
        } catch (e) { console.error(e); }
    };

    const verificarSeguimiento = async (myId, targetId) => {
        try {
            const resp = await fetch(`${API_URL}/usuarios/${myId}/sigue/${targetId}`);
            const data = await resp.json();
            setSiguiendo(data.siguiendo);
        } catch (e) { console.error(e); }
    };

    const toggleFollow = async () => {
        const endpoint = siguiendo ? 'unfollow' : 'follow';
        try {
            const resp = await fetch(`${API_URL}/usuarios/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seguidorId: propioId, seguidoId: usuario.id })
            });
            const data = await resp.json();
            if (data.success) {
                setSiguiendo(!siguiendo);
                // Actualizamos contadores localmente
                setUsuario(prev => ({
                    ...prev,
                    _count: {
                        ...prev._count,
                        seguidores: siguiendo ? prev._count.seguidores - 1 : prev._count.seguidores + 1
                    }
                }));
            }
        } catch (e) { Alert.alert("Error", "No se pudo procesar la acción."); }
    };

    const eliminarPublicacion = async (postId) => {
        Alert.alert(
            "Confirmar eliminación",
            "¿Estás seguro de que quieres borrar esta publicación?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const resp = await fetch(`${API_URL}/publicaciones/${postId}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: propioId })
                            });
                            const data = await resp.json();
                            if (data.success) {
                                setPublicaciones(prev => prev.filter(p => p.id !== postId));
                                Alert.alert("Éxito", "Publicación eliminada.");
                            }
                        } catch (e) { Alert.alert("Error", "No se pudo eliminar."); }
                    }
                }
            ]
        );
    };

    const seleccionarImagen = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para cambiar la foto.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5, // Reducimos calidad para no sobrecargar el Base64
            base64: true, // Importante para persistencia sin servidor de archivos
        });

        if (!result.canceled) {
            const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setNuevaFoto(base64Image);
        }
    };

    const cerrarSesion = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    const guardarCambios = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            const urlFinal = `${API_URL}/usuarios/${userId}`;
            
            const datosActualizados = {
                nombre: nuevoNombre,
                email: nuevoEmail,
                telefono: nuevoTelefono,
                peso: parseFloat(nuevoPeso),
                altura: parseInt(nuevaAltura),
                edad: parseInt(nuevaEdad),
                sexo: nuevoSexo,
                objetivo: nuevoObjetivo,
                nivel: nuevoNivel,
                frecuencia_semanal: parseInt(nuevaFrecuencia)
            };

            // 1. Actualizar datos básicos
            const response = await fetch(urlFinal, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });

            const result = await response.json();

            if (result.success) {
                // 2. ¿Han cambiado datos que afectan a la rutina?
                const haCambiadoRutina = 
                    datosActualizados.peso !== usuario.peso ||
                    datosActualizados.altura !== usuario.altura ||
                    datosActualizados.edad !== usuario.edad ||
                    datosActualizados.objetivo !== usuario.objetivo ||
                    datosActualizados.nivel !== usuario.nivel ||
                    datosActualizados.frecuencia_semanal !== usuario.frecuencia_semanal;

                if (haCambiadoRutina) {
                    // Recalcular rutina automáticamente
                    const respRutina = await fetch(`${API_URL}/rutinas/generar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: userId,
                            peso: datosActualizados.peso,
                            altura: datosActualizados.altura,
                            edad: datosActualizados.edad,
                            experiencia: datosActualizados.nivel,
                            objetivo: datosActualizados.objetivo,
                            dias: datosActualizados.frecuencia_semanal
                        })
                    });
                    const resultRutina = await respRutina.json();
                    if (resultRutina.success) {
                        await AsyncStorage.setItem("rutina", JSON.stringify(resultRutina));
                        Alert.alert("Éxito", "Perfil actualizado y rutina recalculada.");
                    } else {
                        Alert.alert("Aviso", "Perfil actualizado, pero no se pudo recalcular la rutina.");
                    }
                } else {
                    Alert.alert("Éxito", "Perfil actualizado.");
                }

                setUsuario(result.usuario);
                setEditando(false);
            } else {
                Alert.alert("Error", result.error || "Fallo en el servidor");
            }
        } catch (error) {
            console.error("Error en Guardar:", error);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        }
    };

    const calcularIMC = () => {
        const p = editando ? parseFloat(nuevoPeso) : usuario?.peso;
        const a = editando ? parseFloat(nuevaAltura) : usuario?.altura;
        if (!p || !a || a === 0) return 0;
        const alturaMetros = a / 100;
        return (p / (alturaMetros * alturaMetros)).toFixed(1);
    };

    const imcValue = calcularIMC();

    const getImcData = (val) => {
        if (val < 18.5) return { color: '#3498db', label: 'Poco peso', angle: -60 };
        if (val < 25) return { color: '#2ecc71', label: 'Normal', angle: 0 };
        return { color: '#e74c3c', label: 'Sobrepeso', angle: 60 };
    };

    const infoImc = getImcData(imcValue);

    if (loading || !usuario) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{color:'white'}}>Cargando perfil...</Text>
            </View>
        );
    }

    return (
        <ImageBackground
            source={require('../assets/images/fondo.jpg')}
            style={styles.backgroundImage} // Ahora es flexible
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.topHeader}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Text style={styles.backText}>← Volver</Text>
                        </TouchableOpacity>

                        {esPropioPerfil && (
                            <TouchableOpacity
                                style={[styles.editBtn, editando && styles.saveBtn]}
                                onPress={() => editando ? guardarCambios() : setEditando(true)}
                            >
                                <Text style={styles.editBtnText}>{editando ? '✓ GUARDAR' : '✎ EDITAR'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.headerPublico}>
                        <View style={styles.avatarContainer}>
                            {nuevaFoto || usuario?.foto_perfil ? (
                                <Image source={{ uri: nuevaFoto || usuario.foto_perfil }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarGrande}>
                                    <Text style={styles.avatarLetra}>
                                        {usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
                                    </Text>
                                </View>
                            )}
                            {editando && (
                                <TouchableOpacity style={styles.changePhotoBtn} onPress={seleccionarImagen}>
                                    <Text style={styles.changePhotoText}>Cambiar foto</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{usuario?._count?.publicaciones || 0}</Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{usuario?._count?.seguidores || 0}</Text>
                                <Text style={styles.statLabel}>Seguidores</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{usuario?._count?.seguidos || 0}</Text>
                                <Text style={styles.statLabel}>Seguidos</Text>
                            </View>
                        </View>
                    </View>

                    {!esPropioPerfil && (
                        <TouchableOpacity 
                            style={[styles.followBtn, siguiendo && styles.unfollowBtn]} 
                            onPress={toggleFollow}
                        >
                            <Text style={styles.followBtnText}>{siguiendo ? 'Siguiendo' : 'Seguir'}</Text>
                        </TouchableOpacity>
                    )}

                    {editando ? (
                        <TextInput 
                            style={[styles.titulo, styles.inputNombre]} 
                            value={nuevoNombre} 
                            onChangeText={setNuevoNombre} 
                            placeholder="Tu nombre"
                        />
                    ) : (
                        <Text style={styles.titulo}>{usuario?.nombre || 'Usuario'}</Text>
                    )}
                    
                    {editando ? (
                        <TextInput 
                            style={styles.inputEmailEdit} 
                            value={nuevoEmail} 
                            onChangeText={setNuevoEmail} 
                            placeholder="Tu email"
                            keyboardType="email-address"
                        />
                    ) : (
                        <Text style={styles.subtituloEmail}>{usuario?.email || ''}</Text>
                    )}

                    {esPropioPerfil && (
                        <View style={styles.privateZone}>
                            <View style={styles.imcCard}>
                                <Text style={styles.imcLabel}>Tu IMC calculado</Text>
                                <View style={styles.gaugeContainer}>
                                    <Svg width="200" height="120" viewBox="0 0 200 110">
                                        <G transform="translate(100, 100)">
                                            <Path d="M -90 0 A 90 90 0 0 1 -30 -84.8" fill="none" stroke="#3498db" strokeWidth="20" />
                                            <Path d="M -28 -85.5 A 90 90 0 0 1 28 -85.5" fill="none" stroke="#2ecc71" strokeWidth="20" />
                                            <Path d="M 30 -84.8 A 90 90 0 0 1 90 0" fill="none" stroke="#e74c3c" strokeWidth="20" />
                                            <G transform={`rotate(${infoImc.angle})`}>
                                                <Path d="M -5 0 L 0 -95 L 5 0 Z" fill="#333" />
                                                <Circle cx="0" cy="0" r="8" fill="#333" />
                                            </G>
                                        </G>
                                    </Svg>
                                    <View style={styles.imcTextContainer}>
                                        <Text style={[styles.imcValueText, { color: infoImc.color }]}>{imcValue}</Text>
                                        <Text style={styles.imcStatusText}>{infoImc.label}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.infoCard}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.label}>Peso</Text>
                                        {editando ? (
                                            <TextInput style={styles.inputEdit} value={nuevoPeso} onChangeText={setNuevoPeso} keyboardType="numeric" />
                                        ) : (
                                            <Text style={styles.valor}>{usuario?.peso} kg</Text>
                                        )}
                                    </View>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.label}>Altura</Text>
                                        {editando ? (
                                            <TextInput style={styles.inputEdit} value={nuevaAltura} onChangeText={setNuevaAltura} keyboardType="numeric" />
                                        ) : (
                                            <Text style={styles.valor}>{usuario?.altura} cm</Text>
                                        )}
                                    </View>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.label}>Edad</Text>
                                        {editando ? (
                                            <TextInput style={styles.inputEdit} value={nuevaEdad} onChangeText={setNuevaEdad} keyboardType="numeric" />
                                        ) : (
                                            <Text style={styles.valor}>{usuario?.edad}</Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <Text style={styles.label}>Teléfono</Text>
                                {editando ? (
                                    <TextInput style={styles.inputSimple} value={nuevoTelefono} onChangeText={setNuevoTelefono} keyboardType="phone-pad" />
                                ) : (
                                    <Text style={styles.valor}>{usuario?.telefono || 'No definido'}</Text>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Sexo</Text>
                                {editando ? (
                                    <View style={styles.rowSelectors}>
                                        <TouchableOpacity 
                                            style={[styles.miniBtn, nuevoSexo === 'masculino' && styles.miniBtnActive]} 
                                            onPress={() => setNuevoSexo('masculino')}
                                        >
                                            <Text style={[styles.miniBtnText, nuevoSexo === 'masculino' && styles.textWhite]}>Masc.</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.miniBtn, nuevoSexo === 'femenino' && styles.miniBtnActive]} 
                                            onPress={() => setNuevoSexo('femenino')}
                                        >
                                            <Text style={[styles.miniBtnText, nuevoSexo === 'femenino' && styles.textWhite]}>Fem.</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={styles.valor}>
                                        {usuario?.sexo ? usuario.sexo.charAt(0).toUpperCase() + usuario.sexo.slice(1) : 'No definido'}
                                    </Text>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Objetivo</Text>
                                {editando ? (
                                    <View style={styles.columnSelectors}>
                                        {['Subir masa muscular', 'Bajar de peso', 'mantenimiento'].map((obj) => (
                                            <TouchableOpacity 
                                                key={obj}
                                                style={[styles.optionBtn, nuevoObjetivo === obj && styles.optionBtnActive]} 
                                                onPress={() => setNuevoObjetivo(obj)}
                                            >
                                                <Text style={[styles.optionBtnText, nuevoObjetivo === obj && styles.textWhite]}>
                                                    {obj === 'mantenimiento' ? 'Mantenimiento' : obj}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.valor}>
                                        {usuario?.objetivo ? usuario.objetivo.charAt(0).toUpperCase() + usuario.objetivo.slice(1) : 'No definido'}
                                    </Text>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Nivel / Experiencia</Text>
                                {editando ? (
                                    <View style={styles.rowSelectors}>
                                        {['Principiante', 'Intermedio', 'Atleta'].map((niv) => (
                                            <TouchableOpacity 
                                                key={niv}
                                                style={[styles.miniBtn, nuevoNivel === niv && styles.miniBtnActive]} 
                                                onPress={() => setNuevoNivel(niv)}
                                            >
                                                <Text style={[styles.miniBtnText, nuevoNivel === niv && styles.textWhite]}>{niv}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.valor}>{usuario?.nivel || 'Principiante'}</Text>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.label}>Días por semana</Text>
                                {editando ? (
                                    <TextInput 
                                        style={styles.inputSimple} 
                                        value={nuevaFrecuencia} 
                                        onChangeText={setNuevaFrecuencia} 
                                        keyboardType="numeric" 
                                        maxLength={1}
                                    />
                                ) : (
                                    <Text style={styles.valor}>{usuario?.frecuencia_semanal || '3'} días</Text>
                                )}
                            </View>

                            {editando && (
                                <TouchableOpacity style={styles.cancelarBtn} onPress={() => setEditando(false)}>
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>Descartar cambios</Text>
                                </TouchableOpacity>
                            )}
                            

                        </View>
                    )}

                    <View style={styles.postsSection}>
                        <Text style={styles.sectionTitle}>Publicaciones</Text>
                        {publicaciones.length === 0 ? (
                            <Text style={styles.noPosts}>No hay publicaciones todavía.</Text>
                        ) : (
                            publicaciones.map(post => (
                                <View key={post.id} style={styles.postCard}>
                                    <View style={styles.postHeader}>
                                        <Text style={styles.postTitle}>{post.titulo}</Text>
                                        {esPropioPerfil && (
                                            <TouchableOpacity onPress={() => eliminarPublicacion(post.id)}>
                                                <Text style={styles.deletePostText}>Eliminar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.postDesc}>{post.descripcion}</Text>
                                    {post.imagenes && post.imagenes.length > 0 && (
                                        <Image source={{ uri: post.imagenes[0].url }} style={styles.postImg} />
                                    )}
                                    <Text style={styles.postDate}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={{height: 100}} />
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1, // Esto hace que ocupe todo el espacio disponible
        width: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)'
    },
    scrollContent: {
        flexGrow: 1, // Importante para que el scroll funcione correctamente con flex
        alignItems: 'center',
        padding: 25,
        paddingTop: 50
    },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 20 },
    backBtn: { padding: 5 },
    backText: { color: '#ff7a00', fontSize: 16, fontWeight: 'bold' },
    editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'white' },
    saveBtn: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
    editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    avatarGrande: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'white' },
    avatarLetra: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    headerPublico: { flexDirection: 'row', width: '100%', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 20 },
    avatarContainer: { alignItems: 'center' },
    avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'white' },
    changePhotoBtn: { backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', bottom: 0, width: 80, paddingVertical: 4, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    changePhotoText: { color: 'white', fontSize: 9, textAlign: 'center', fontWeight: 'bold' },
    inputFoto: { backgroundColor: 'white', borderRadius: 5, padding: 5, fontSize: 10, width: 80, marginTop: 5 },
    statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 10 },
    statBox: { alignItems: 'center' },
    statNumber: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    followBtn: { backgroundColor: '#ff7a00', width: '100%', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    unfollowBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'white' },
    followBtnText: { color: 'white', fontWeight: 'bold' },
    privateZone: { width: '100%' },
    titulo: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
    subtituloEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 },
    imcCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
    imcLabel: { color: '#666', fontSize: 14, fontWeight: '600' },
    gaugeContainer: { alignItems: 'center', marginTop: 10 },
    imcTextContainer: { marginTop: -20, alignItems: 'center' },
    imcValueText: { fontSize: 34, fontWeight: 'bold' },
    imcStatusText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
    infoCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 25, alignItems: 'center' },
    rowInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    infoBox: { flex: 1, alignItems: 'center' },
    label: { color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
    valor: { color: '#333', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    inputEdit: { backgroundColor: '#e8e8e8', borderRadius: 8, padding: 8, fontSize: 16, fontWeight: 'bold', color: '#ff7a00', width: '80%', textAlign: 'center' },
    inputNombre: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 5, textAlign: 'center', minWidth: 200, color: 'white' },
    inputEmailEdit: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 3, textAlign: 'center', minWidth: 180, color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 5 },
    inputSimple: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 10, fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 5 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    rowSelectors: { flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' },
    columnSelectors: { gap: 8, marginTop: 10 },
    miniBtn: { flex: 1, padding: 10, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    miniBtnActive: { backgroundColor: '#ff7a00', borderColor: '#ff7a00' },
    miniBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
    optionBtn: { padding: 12, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    optionBtnActive: { backgroundColor: '#ff7a00', borderColor: '#ff7a00' },
    optionBtnText: { fontSize: 14, fontWeight: 'bold', color: '#444' },
    textWhite: { color: 'white' },
    logoutBtn: { marginTop: 30, padding: 15, backgroundColor: 'rgba(255,0,0,0.2)', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'red' },
    logoutText: { color: 'white', fontWeight: 'bold' },
    postsSection: { width: '100%', marginTop: 30 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    noPosts: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontStyle: 'italic' },
    postCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, padding: 15, marginBottom: 15 },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    deletePostText: { color: 'red', fontSize: 12, fontWeight: '600' },
    postDesc: { color: '#666', fontSize: 14, marginBottom: 10 },
    postImg: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
    postDate: { color: '#999', fontSize: 10, textAlign: 'right' },
    cancelarBtn: { marginTop: 20, padding: 10, alignSelf: 'center' },
    loadingContainer: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }
});