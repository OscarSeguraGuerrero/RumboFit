import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_URL } from '../config';
import Svg, { Path, G, Circle, Polyline, Line } from 'react-native-svg';
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Eliminamos el uso de height fijo para el fondo para que pueda crecer
const { width } = Dimensions.get('window');

const COMPOUND_EXERCISES = ['sentadilla', 'press banca', 'peso muerto', 'press militar', 'remo', 'dominadas'];

const calcularTDEE = (user) => {
    if (!user || !user.peso || !user.altura || !user.edad) return 2000;
    const sexo = user.sexo?.toLowerCase() || '';
    const constSexo = (sexo === 'femenino' || sexo === 'mujer' || sexo === 'f') ? -161 : 5;
    let tmb = (10 * Number(user.peso)) + (6.25 * Number(user.altura)) - (5 * Number(user.edad)) + constSexo;
    let multiplicador = 1.2;
    if (user.frecuencia_semanal >= 1 && user.frecuencia_semanal <= 2) multiplicador = 1.375;
    else if (user.frecuencia_semanal >= 3 && user.frecuencia_semanal <= 5) multiplicador = 1.55;
    else if (user.frecuencia_semanal > 5) multiplicador = 1.725;
    let tdee = tmb * multiplicador;
    if (user.objetivo) {
        const obj = user.objetivo.toLowerCase();
        if (obj.includes('perder') || obj.includes('bajar')) tdee -= 500;
        else if (obj.includes('masa') || obj.includes('ganar') || obj.includes('hipertrofia')) tdee += 500;
    }
    return Math.round(tdee);
};

const calcularMacrosObjetivo = (tdee, user) => {
    const peso = user?.peso || 70;
    const prot = peso * 2;
    const gras = peso * 1;
    const caloriasProt = prot * 4;
    const caloriasGras = gras * 9;
    const caloriasCarb = Math.max(0, tdee - caloriasProt - caloriasGras);
    return {
        kcal: tdee,
        prot: Math.round(prot),
        gras: Math.round(gras),
        carb: Math.round(caloriasCarb / 4)
    };
};

const calcularMacrosConsumidos = (comidas) => {
    return (comidas || []).reduce((totales, comida) => {
        const macros = comida.macros || {};
        return {
            kcal: totales.kcal + Number(macros.kcal || 0),
            prot: totales.prot + Number(macros.prot || 0),
            carb: totales.carb + Number(macros.carb || 0),
            gras: totales.gras + Number(macros.gras || 0),
        };
    }, { kcal: 0, prot: 0, carb: 0, gras: 0 });
};

const getWeekKey = (dateString) => {
    const date = new Date(dateString);
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return `${utc.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
};

const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPostTimestamp = (post) => {
    const parsed = new Date(post?.fecha_publicacion || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const sortPostsByRecent = (posts) => {
    return [...(Array.isArray(posts) ? posts : [])].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
};

const getPostImageUri = (post) => {
    const firstImage = Array.isArray(post?.imagenes) ? post.imagenes[0] : null;
    if (!firstImage) return null;
    if (typeof firstImage === 'string') return firstImage;
    if (typeof firstImage?.url === 'string' && firstImage.url.trim() !== '') return firstImage.url;
    if (typeof firstImage?.uri === 'string' && firstImage.uri.trim() !== '') return firstImage.uri;
    return null;
};

function buildProgressAnalysis(historial, user) {
    const fechas = Object.keys(historial || {}).sort((a, b) => new Date(a) - new Date(b));
    const fechasConDatos = fechas.filter((fecha) => {
        const item = historial[fecha];
        return (item?.entrenamientos?.length || 0) + (item?.comidas?.length || 0) > 0;
    });

    if (fechasConDatos.length < 3) {
        return {
            locked: true,
            recordCount: fechasConDatos.length
        };
    }

    const fuerzaPorEjercicio = {};
    const weeklyTraining = {};
    const calorieSeries = [];
    const tdee = calcularTDEE(user);
    const macrosGoal = calcularMacrosObjetivo(tdee, user);
    let macroDays = 0;
    let macroTotals = { kcal: 0, prot: 0, carb: 0, gras: 0 };

    fechasConDatos.forEach((fecha) => {
        const item = historial[fecha] || { entrenamientos: [], comidas: [] };

        (item.entrenamientos || []).forEach((entreno) => {
            weeklyTraining[getWeekKey(fecha)] = (weeklyTraining[getWeekKey(fecha)] || 0) + 1;

            (entreno.series || []).forEach((serie) => {
                const nombre = (serie.ejercicio?.nombre || '').toLowerCase();
                const peso = Number(serie.peso_kg || 0);
                if (!peso || !COMPOUND_EXERCISES.some((key) => nombre.includes(key))) return;
                const series = fuerzaPorEjercicio[nombre] || [];
                const lastPoint = series[series.length - 1];
                if (lastPoint?.label === formatShortDate(fecha)) {
                    lastPoint.value = Math.max(lastPoint.value, peso);
                } else {
                    series.push({ label: formatShortDate(fecha), value: peso });
                }
                fuerzaPorEjercicio[nombre] = series;
            });
        });

        const macrosDia = calcularMacrosConsumidos(item.comidas || []);
        if (macrosDia.kcal > 0) {
            macroDays += 1;
            macroTotals = {
                kcal: macroTotals.kcal + macrosDia.kcal,
                prot: macroTotals.prot + macrosDia.prot,
                carb: macroTotals.carb + macrosDia.carb,
                gras: macroTotals.gras + macrosDia.gras
            };
            calorieSeries.push({
                label: formatShortDate(fecha),
                consumed: Math.round(macrosDia.kcal),
                target: tdee
            });
        }
    });

    const fuerzaSeries = Object.entries(fuerzaPorEjercicio)
        .slice(0, 4)
        .map(([name, points], index) => ({
            key: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            color: ['#ff7a00', '#2ecc71', '#3498db', '#9b59b6'][index % 4],
            points
        }))
        .filter((serie) => serie.points.length > 0);

    const consistencySeries = Object.entries(weeklyTraining)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([week, count]) => ({ label: week.replace('-', ' '), value: count }));

    const averageMacros = macroDays > 0 ? {
        kcal: Math.round(macroTotals.kcal / macroDays),
        prot: Math.round(macroTotals.prot / macroDays),
        carb: Math.round(macroTotals.carb / macroDays),
        gras: Math.round(macroTotals.gras / macroDays),
    } : { kcal: 0, prot: 0, carb: 0, gras: 0 };

    return {
        locked: false,
        fuerzaSeries,
        consistencySeries,
        calorieSeries: calorieSeries.slice(-7),
        macrosGoal,
        averageMacros,
        recordCount: fechasConDatos.length
    };
}

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
    const [msgGeneral, setMsgGeneral] = useState({ text: '', type: '' });
    const [confirmModal, setConfirmModal] = useState({ visible: false, postId: null });
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const [publicaciones, setPublicaciones] = useState([]);
    const [siguiendo, setSiguiendo] = useState(false);
    const [analisis, setAnalisis] = useState({ locked: true, recordCount: 0 });

    const getTargetId = (value, fallback) => {
        if (Array.isArray(value)) return value[0] || fallback;
        return value || fallback;
    };

    useEffect(() => {
        cargarDatosIniciales();
    }, [params.id]);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        setUsuario(null);
        setPublicaciones([]);
        setSiguiendo(false);
        setEditando(false);
        const myId = await AsyncStorage.getItem("userId");
        setPropioId(myId);

        const targetId = getTargetId(params.id, myId);
        // Aseguramos comparación de strings para evitar fallos por tipo
        setEsPropioPerfil(String(targetId) === String(myId));
        
        const usuarioPerfil = await cargarUsuario(targetId);
        await cargarPublicaciones(targetId);
        if (targetId === myId) {
            await cargarAnalisis(targetId, usuarioPerfil);
        } else {
            setAnalisis({ locked: true, recordCount: 0 });
        }
        
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
                    return result.usuario;
                } else {
                    console.error("Error en respuesta de usuario:", result.error);
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
            const viewerId = await AsyncStorage.getItem("userId");
            const resp = await fetch(`${API_URL}/usuarios/${userId}/publicaciones?viewerId=${viewerId || ''}`);
            const data = await resp.json();
            if (data.success) setPublicaciones(sortPostsByRecent(data.publicaciones));
        } catch (e) { console.error(e); }
    };

    const cargarAnalisis = async (userId, usuarioPerfil) => {
        try {
            const response = await fetch(`${API_URL}/usuarios/${userId}/historial`);
            const result = await response.json();
            if (result.success) {
                setAnalisis(buildProgressAnalysis(result.historial || {}, usuarioPerfil || usuario || { id: userId, peso: Number(nuevoPeso || 0), altura: Number(nuevaAltura || 0), edad: Number(nuevaEdad || 0), sexo: nuevoSexo, frecuencia_semanal: Number(nuevaFrecuencia || 0), objetivo: nuevoObjetivo }));
            }
        } catch (error) {
            console.error("Error cargando análisis:", error);
        }
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
                const nuevoEstado = !siguiendo;
                setSiguiendo(nuevoEstado);
                
                // Actualización reactiva del contador local (HU-46)
                setUsuario(prev => ({
                    ...prev,
                    _count: {
                        ...prev._count,
                        seguidores: nuevoEstado 
                            ? (prev._count.seguidores + 1) 
                            : Math.max(0, prev._count.seguidores - 1)
                    }
                }));

                setMsgGeneral({ 
                    text: nuevoEstado ? `Ahora sigues a ${usuario.nombre}` : `Has dejado de seguir a ${usuario.nombre}`, 
                    type: 'success' 
                });
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
            }
        } catch (e) { 
            setMsgGeneral({ text: "No se pudo procesar la acción.", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
        }
    };

    const eliminarPublicacion = async (postId) => {
        setConfirmModal({ visible: true, postId });
    };

    const handleConfirmEliminar = async () => {
        const postId = confirmModal.postId;
        setConfirmModal({ visible: false, postId: null });
        try {
            const resp = await fetch(`${API_URL}/publicaciones/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: propioId })
            });
            const data = await resp.json();
            if (data.success) {
                setPublicaciones(prev => sortPostsByRecent(prev.filter(p => p.id !== postId)));
                setUsuario(prev => prev ? ({
                    ...prev,
                    _count: { ...prev._count, publicaciones: Math.max(0, (prev._count?.publicaciones || 1) - 1) }
                }) : prev);
                setMsgGeneral({ text: "Publicación eliminada.", type: 'success' });
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
            }
        } catch (e) {
            setMsgGeneral({ text: "No se pudo eliminar.", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
        }
    };

    const toggleLike = async (postId) => {
        if (!propioId) return;
        try {
            const resp = await fetch(`${API_URL}/publicaciones/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: propioId })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'No se pudo actualizar el like');
            }

            setPublicaciones((prev) => prev.map((post) => {
                if (Number(post.id) !== Number(postId)) return post;
                return {
                    ...post,
                    likedByMe: data.liked,
                    _count: {
                        ...post._count,
                        me_gusta: data.likesCount
                    }
                };
            }).sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a)));
        } catch (e) {
            setMsgGeneral({ text: "No se pudo actualizar el like.", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
        }
    };

    const seleccionarImagen = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setMsgGeneral({ text: "Necesitamos acceso a tu galería para cambiar la foto.", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
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
        if (typeof router.dismissAll === 'function') {
            router.dismissAll();
        }
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
                        setMsgGeneral({ text: "Perfil actualizado y rutina recalculada.", type: 'success' });
                    } else {
                        setMsgGeneral({ text: "Perfil actualizado, pero no se pudo recalcular la rutina.", type: 'error' });
                    }
                } else {
                    setMsgGeneral({ text: "Perfil actualizado.", type: 'success' });
                }
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);

                setUsuario(result.usuario);
                setEditando(false);
            } else {
                setMsgGeneral({ text: result.error || "Fallo en el servidor", type: 'error' });
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
            }
        } catch (error) {
            setMsgGeneral({ text: "No se pudo conectar con el servidor.", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        }
    };

    const handleCancelarSuscripcion = async () => {
        setCancelLoading(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            const response = await fetch(`${API_URL}/premium/cancelar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();
            if (data.success) {
                // 1. Actualizar estado local
                setUsuario(prev => ({ ...prev, es_premium: false }));
                
                // 2. Actualizar AsyncStorage
                const profileDataStr = await AsyncStorage.getItem("profileData");
                if (profileDataStr) {
                    const profileData = JSON.parse(profileDataStr);
                    if (profileData.usuario) profileData.usuario.es_premium = false;
                    await AsyncStorage.setItem("profileData", JSON.stringify(profileData));
                }

                setCancelModalVisible(false);
                setMsgGeneral({ text: "Tu suscripción ha sido cancelada.", type: 'success' });
            } else {
                throw new Error(data.error || "No se pudo cancelar");
            }
        } catch (error) {
            setMsgGeneral({ text: error.message, type: 'error' });
        } finally {
            setCancelLoading(false);
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{color:'white', fontWeight: 'bold'}}>Cargando perfil...</Text>
            </View>
        );
    }

    if (!usuario) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{color:'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20}}>Usuario no encontrado</Text>
                <TouchableOpacity
                    style={{backgroundColor: '#ff7a00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12}}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/redsocial')}
                >
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Volver atrás</Text>
                </TouchableOpacity>
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
                    {msgGeneral.text ? (
                        <View style={[styles.msgBanner, msgGeneral.type === 'error' ? styles.msgError : styles.msgSuccess]}>
                            <Text style={styles.msgText}>{msgGeneral.text}</Text>
                        </View>
                    ) : null}
                    <View style={styles.topHeader}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace(esPropioPerfil ? '/rutina' : '/redsocial')}>
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
                            {usuario?.es_premium && (
                                <View style={styles.premiumBanner}>
                                    <View style={styles.premiumTextContainer}>
                                        <Text style={styles.premiumBadge}>👑 PREMIUM ACTIVADO</Text>
                                        <Text style={styles.premiumStatusMsg}>Eres usuario Premium. Disfrutas de todas las ventajas.</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.cancelSubscriptionBtn}
                                        onPress={() => setCancelModalVisible(true)}
                                    >
                                        <Text style={styles.cancelSubscriptionText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

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

                            <View style={styles.analysisCard}>
                                <Text style={styles.analysisTitle}>Análisis de Progreso</Text>
                                {analisis.locked ? (
                                    <Text style={styles.analysisLockedText}>
                                        Sigue registrando entrenamientos y comidas para generar tu análisis de progreso.
                                    </Text>
                                ) : (
                                    <>
                                        <Text style={styles.analysisHint}>Datos analizados: {analisis.recordCount} registros</Text>
                                        <LineChartCard title="Evolución de fuerza" series={analisis.fuerzaSeries} />
                                        <BarChartCard title="Consistencia de entrenamiento" data={analisis.consistencySeries} />
                                        <BalanceChartCard
                                            title="Balance calórico"
                                            calorieSeries={analisis.calorieSeries}
                                            averageMacros={analisis.averageMacros}
                                            macrosGoal={analisis.macrosGoal}
                                        />
                                    </>
                                )}
                            </View>

                            <View style={styles.infoCard}>
                                <View style={styles.rowInfo}>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.label}>Peso</Text>
                                        {editando ? (
                                            <TextInput style={styles.inputEdit} value={nuevoPeso} onChangeText={setNuevoPeso} keyboardType="numeric" />
                                        ) : (
                                            <Text style={styles.valor}>{usuario?.peso} </Text>
                                        )}
                                    </View>
                                    <View style={styles.infoBox}>
                                        <Text style={styles.label}>Altura</Text>
                                        {editando ? (
                                            <TextInput style={styles.inputEdit} value={nuevaAltura} onChangeText={setNuevaAltura} keyboardType="numeric" />
                                        ) : (
                                            <Text style={styles.valor}>{usuario?.altura} </Text>
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

                            <View style={styles.quickActionsCard}>
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/historial')}>
                                    <Text style={styles.quickActionText}>Mi historial</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/notificaciones')}>
                                    <Text style={styles.quickActionText}>Notificaciones</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.quickActionBtn, styles.logoutBtn]} onPress={cerrarSesion}>
                                    <Text style={styles.quickActionText}>Cerrar sesión</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    )}

                    <View style={styles.postsSection}>
                        <Text style={styles.sectionTitle}>Publicaciones</Text>
                        {publicaciones.length === 0 ? (
                            <Text style={styles.noPosts}>No hay publicaciones todavía.</Text>
                        ) : (
                            publicaciones.map(post => (
                                <TouchableOpacity key={post.id} style={styles.postCard} activeOpacity={0.9} onPress={() => router.push(`/publicacion?id=${post.id}`)}>
                                    <View style={styles.postHeader}>
                                        <Text style={styles.postTitle}>{post.titulo}</Text>
                                        {esPropioPerfil && (
                                            <TouchableOpacity onPress={() => eliminarPublicacion(post.id)}>
                                                <Text style={styles.deletePostText}>Eliminar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.postDesc}>{post.descripcion}</Text>
                                    {getPostImageUri(post) && (
                                        <Image source={{ uri: getPostImageUri(post) }} style={styles.postImg} />
                                    )}
                                    <View style={styles.postFooter}>
                                        <Text style={styles.postDate}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                        <TouchableOpacity style={styles.likeButton} onPress={() => toggleLike(post.id)}>
                                            <Text style={[styles.likeIcon, post.likedByMe && styles.likeIconActive]}>
                                                {post.likedByMe ? '\u2665' : '\u2661'}
                                            </Text>
                                            <Text style={styles.likeCount}>{post?._count?.me_gusta || 0}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    <View style={{height: 100}} />
                </ScrollView>

                {/* MODAL CONFIRMACIÓN ELIMINAR POST */}
                {confirmModal.visible && (
                    <View style={styles.confirmOverlay}>
                        <View style={styles.confirmCard}>
                            <Text style={styles.confirmTitle}>Eliminar publicación</Text>
                            <Text style={styles.confirmMsg}>¿Estás seguro de que quieres borrar esta publicación?</Text>
                            <View style={styles.confirmActions}>
                                <TouchableOpacity 
                                    style={styles.confirmBtnCancel} 
                                    onPress={() => setConfirmModal({ visible: false, postId: null })}
                                >
                                    <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.confirmBtnDelete} 
                                    onPress={handleConfirmEliminar}
                                >
                                    <Text style={styles.confirmBtnDeleteText}>Eliminar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                {/* MODAL CONFIRMACIÓN CANCELAR SUSCRIPCIÓN (HU-58) */}
                {cancelModalVisible && (
                    <View style={styles.confirmOverlay}>
                        <View style={styles.confirmCard}>
                            <View style={styles.confirmIconContainer}>
                                <Text style={{fontSize: 40}}>👋</Text>
                            </View>
                            <Text style={styles.confirmTitle}>¿Quieres cancelar RumboFit Premium?</Text>
                            <Text style={styles.confirmMsg}>
                                Perderás el acceso al historial antiguo, la creación ilimitada de rutinas y volverás a ver anuncios.
                            </Text>
                            <View style={styles.confirmActions}>
                                <TouchableOpacity 
                                    style={styles.confirmBtnCancel} 
                                    onPress={() => setCancelModalVisible(false)}
                                    disabled={cancelLoading}
                                >
                                    <Text style={styles.confirmBtnCancelText}>Mantener</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.confirmBtnDelete, {backgroundColor: '#666'}]} 
                                    onPress={handleCancelarSuscripcion}
                                    disabled={cancelLoading}
                                >
                                    <Text style={styles.confirmBtnDeleteText}>
                                        {cancelLoading ? 'Procesando...' : 'Confirmar Baja'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </ImageBackground>
    );
}

function LineChartCard({ title, series }) {
    if (!series || series.length === 0) {
        return <Text style={styles.analysisEmpty}>Todavía no hay suficiente carga útil para esta gráfica.</Text>;
    }

    const allValues = series.flatMap((item) => item.points.map((point) => point.value));
    const maxValue = Math.max(...allValues, 1);
    const chartHeight = 120;
    const chartWidth = 280;
    const pointCount = Math.max(...series.map((item) => item.points.length), 2);

    return (
        <View style={styles.chartBlock}>
            <Text style={styles.chartTitle}>{title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    <Svg width={chartWidth} height={chartHeight + 24}>
                        {[0, 1, 2, 3].map((index) => {
                            const y = 12 + (chartHeight / 3) * index;
                            return <Line key={index} x1="0" y1={y} x2={chartWidth} y2={y} stroke="#ececec" strokeWidth="1" />;
                        })}
                        {series.map((serie) => {
                            const points = serie.points.map((point, index) => {
                                const x = pointCount === 1 ? chartWidth / 2 : (index / (pointCount - 1)) * (chartWidth - 20) + 10;
                                const y = 12 + chartHeight - ((point.value / maxValue) * chartHeight);
                                return `${x},${y}`;
                            }).join(' ');
                            return <Polyline key={serie.key} points={points} fill="none" stroke={serie.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />;
                        })}
                    </Svg>
                    <View style={styles.legendWrap}>
                        {series.map((serie) => (
                            <View key={serie.key} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: serie.color }]} />
                                <Text style={styles.legendText}>{serie.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function BarChartCard({ title, data }) {
    if (!data || data.length === 0) {
        return <Text style={styles.analysisEmpty}>Todavía no hay semanas registradas para esta gráfica.</Text>;
    }

    const maxValue = Math.max(...data.map((item) => item.value), 1);

    return (
        <View style={styles.chartBlock}>
            <Text style={styles.chartTitle}>{title}</Text>
            <View style={styles.barChartRow}>
                {data.map((item) => (
                    <View key={item.label} style={styles.barCol}>
                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, { height: `${(item.value / maxValue) * 100}%` }]} />
                        </View>
                        <Text style={styles.barValue}>{item.value}</Text>
                        <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function BalanceChartCard({ title, calorieSeries, averageMacros, macrosGoal }) {
    const maxValue = Math.max(...(calorieSeries || []).flatMap((item) => [item.consumed, item.target]), 1);
    const chartHeight = 110;
    const chartWidth = 280;
    const pointCount = Math.max((calorieSeries || []).length, 2);
    const caloriesPoints = (calorieSeries || []).map((item, index) => {
        const x = pointCount === 1 ? chartWidth / 2 : (index / (pointCount - 1)) * (chartWidth - 20) + 10;
        const y = 12 + chartHeight - ((item.consumed / maxValue) * chartHeight);
        return `${x},${y}`;
    }).join(' ');
    const targetPoints = (calorieSeries || []).map((item, index) => {
        const x = pointCount === 1 ? chartWidth / 2 : (index / (pointCount - 1)) * (chartWidth - 20) + 10;
        const y = 12 + chartHeight - ((item.target / maxValue) * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    return (
        <View style={styles.chartBlock}>
            <Text style={styles.chartTitle}>{title}</Text>
            {calorieSeries?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                        <Svg width={chartWidth} height={chartHeight + 24}>
                            {[0, 1, 2, 3].map((index) => {
                                const y = 12 + (chartHeight / 3) * index;
                                return <Line key={index} x1="0" y1={y} x2={chartWidth} y2={y} stroke="#ececec" strokeWidth="1" />;
                            })}
                            <Polyline points={targetPoints} fill="none" stroke="#2ecc71" strokeWidth="3" strokeDasharray="6,4" />
                            <Polyline points={caloriesPoints} fill="none" stroke="#ff7a00" strokeWidth="3" />
                        </Svg>
                        <View style={styles.legendWrap}>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ff7a00' }]} /><Text style={styles.legendText}>Consumidas</Text></View>
                            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} /><Text style={styles.legendText}>Objetivo</Text></View>
                        </View>
                    </View>
                </ScrollView>
            ) : (
                <Text style={styles.analysisEmpty}>No hay días con comidas suficientes para esta gráfica.</Text>
            )}

            <View style={styles.macroGrid}>
                {[
                    { key: 'prot', label: 'Proteínas', color: '#3498db' },
                    { key: 'carb', label: 'Carbohidratos', color: '#2ecc71' },
                    { key: 'gras', label: 'Grasas', color: '#f1c40f' },
                ].map((macro) => {
                    const value = averageMacros?.[macro.key] || 0;
                    const goal = macrosGoal?.[macro.key] || 1;
                    const ratio = Math.min(value / goal, 1);
                    const radius = 22;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference * (1 - ratio);
                    return (
                        <View key={macro.key} style={styles.ringItem}>
                            <Svg width="64" height="64" viewBox="0 0 64 64">
                                <Circle cx="32" cy="32" r={radius} stroke="#ececec" strokeWidth="8" fill="none" />
                                <Circle
                                    cx="32"
                                    cy="32"
                                    r={radius}
                                    stroke={macro.color}
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${circumference} ${circumference}`}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 32 32)"
                                />
                            </Svg>
                            <Text style={styles.ringValue}>{value}g</Text>
                            <Text style={styles.ringLabel}>{macro.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
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
    premiumBanner: { 
        backgroundColor: '#FFD700', 
        width: '100%', 
        borderRadius: 20, 
        padding: 18, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    premiumTextContainer: { flex: 1 },
    premiumBadge: { color: '#000', fontWeight: '900', fontSize: 13, marginBottom: 2 },
    premiumStatusMsg: { color: 'rgba(0,0,0,0.7)', fontSize: 11, fontWeight: '700' },
    cancelSubscriptionBtn: { backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' },
    cancelSubscriptionText: { color: '#000', fontWeight: 'bold', fontSize: 11 },
    confirmIconContainer: { alignItems: 'center', marginBottom: 15 },
    imcCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
    imcLabel: { color: '#666', fontSize: 14, fontWeight: '600' },
    gaugeContainer: { alignItems: 'center', marginTop: 10 },
    imcTextContainer: { marginTop: -20, alignItems: 'center' },
    imcValueText: { fontSize: 34, fontWeight: 'bold' },
    imcStatusText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
    analysisCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 20, marginBottom: 20 },
    analysisTitle: { color: '#222', fontSize: 18, fontWeight: '900', marginBottom: 8 },
    analysisHint: { color: '#666', fontWeight: '700', marginBottom: 12 },
    analysisLockedText: { color: '#666', lineHeight: 22, fontWeight: '700' },
    analysisEmpty: { color: '#666', fontWeight: '700', marginBottom: 14 },
    chartBlock: { marginBottom: 18 },
    chartTitle: { color: '#333', fontWeight: '900', marginBottom: 10 },
    legendWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { color: '#666', fontWeight: '700', fontSize: 12 },
    barChartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 150 },
    barCol: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
    barTrack: { height: 100, width: 24, borderRadius: 12, backgroundColor: '#ececec', justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', backgroundColor: '#ff7a00', borderRadius: 12 },
    barValue: { color: '#222', fontWeight: '900', marginTop: 6, fontSize: 12 },
    barLabel: { color: '#777', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4 },
    macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    ringItem: { flex: 1, alignItems: 'center' },
    ringValue: { color: '#222', fontWeight: '900', marginTop: -8, fontSize: 12 },
    ringLabel: { color: '#666', fontWeight: '700', fontSize: 11, textAlign: 'center', marginTop: 4 },
    infoCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 25, alignItems: 'center' },
    rowInfo: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    infoBox: { flex: 1, alignItems: 'center' },
    label: { color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
    valor: { color: '#333', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    inputEdit: { backgroundColor: '#e8e8e8', borderRadius: 8, padding: 8, fontSize: 16, fontWeight: 'bold', color: '#ff7a00', width: '80%', textAlign: 'center' },
    inputNombre: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 5, textAlign: 'center', minWidth: 200, color: 'white' },
    inputEmailEdit: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 3, textAlign: 'center', minWidth: 180, color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 5 },
    inputSimple: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 10, fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 5 },
    quickActionsCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, marginTop: 18, marginBottom: 12 },
    quickActionBtn: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
    quickActionText: { color: 'white', fontWeight: '800' },
    logoutBtn: { backgroundColor: 'rgba(231,76,60,0.25)', borderColor: 'rgba(231,76,60,0.45)', marginBottom: 0 },
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
    postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    postDate: { color: '#999', fontSize: 10 },
    likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 6 },
    likeIcon: { fontSize: 20, color: '#888' },
    likeIconActive: { color: '#e74c3c' },
    likeCount: { color: '#333', fontWeight: '900', fontSize: 12 },
    cancelarBtn: { marginTop: 20, padding: 10, alignSelf: 'center' },
    loadingContainer: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },

    msgBanner: { width: '100%', padding: 12, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
    msgError: { backgroundColor: 'rgba(231, 76, 60, 0.2)', borderWidth: 1, borderColor: '#e74c3c' },
    msgSuccess: { backgroundColor: 'rgba(46, 204, 113, 0.2)', borderWidth: 1, borderColor: '#2ecc71' },
    msgText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },

    confirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    confirmCard: { backgroundColor: 'white', width: '80%', padding: 20, borderRadius: 20 },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    confirmMsg: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
    confirmActions: { flexDirection: 'row', justifyContent: 'space-between' },
    confirmBtnCancel: { flex: 1, padding: 12, marginRight: 10, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
    confirmBtnCancelText: { color: '#666', fontWeight: 'bold' },
    confirmBtnDelete: { flex: 1, padding: 12, backgroundColor: '#e74c3c', borderRadius: 10, alignItems: 'center' },
    confirmBtnDeleteText: { color: 'white', fontWeight: 'bold' }
});
