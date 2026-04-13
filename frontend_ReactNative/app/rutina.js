import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import { API_URL } from '../config';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Dimensions,
    Animated
} from 'react-native';

const { width } = Dimensions.get('window');

export default function Rutina() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [diaActual, setDiaActual] = useState(null);
    const [usuario, setUsuario] = useState({ nombre: 'Usuario' });
    const [menuVisible, setMenuVisible] = useState(false);

    // --- ESTADO PARA LA NAVEGACIÓN INFERIOR ---
    const [vistaActiva, setVistaActiva] = useState('automatica'); // 'automatica', 'propia', 'dieta'

    // --- MAPEOS DE IMÁGENES ---
    const imagenesMusculos = {
        empuje:   require('../assets/images/musculo_pecho.png'),
        traccion: require('../assets/images/musculo_traccion.png'),
        pierna:   require('../assets/images/musculo_pierna.png'),
        fullbody: require('../assets/images/fullbody.png'),
        core:     require('../assets/images/musculo_core.png'),
        torso:    require('../assets/images/musculo_torso.png'),
        hombros:  require('../assets/images/musculo_hombros.png'),
        descanso: require('../assets/images/descanso.png'),
    };

    const imagenesEjercicios = {
        sentadilla:    require('../assets/images/ej_sentadilla.png'),
        press_banca:   require('../assets/images/ej_press_banca.png'),
        peso_muerto:   require('../assets/images/ej_peso_muerto.png'),
        dominadas:     require('../assets/images/ej_dominadas.png'),
        remo:          require('../assets/images/ej_remo.png'),
        press_militar: require('../assets/images/ej_press_militar.png'),
        curl:          require('../assets/images/ej_curl.png'),
        triceps:       require('../assets/images/ej_triceps.png'),
        elevaciones:   require('../assets/images/ej_elevaciones.png'),
        zancadas:      require('../assets/images/ej_zancadas.png'),
        core:          require('../assets/images/ej_core.png'),
        crunch:        require('../assets/images/ej_crunch.png'),
        descanso:      require('../assets/images/ej_descanso.png'),
        caminar:       require('../assets/images/ej_caminar.png'),
        prensa:        require('../assets/images/ej_prensa_piernas.png'),
        flexiones:     require('../assets/images/ej_flexiones.png'),
        jalon:         require('../assets/images/ej_jalon_pecho.png'),
        ext_cuad:      require('../assets/images/ej_extension_cuadriceps.png'),
        femoral:       require('../assets/images/ej_curl_femoral.png'),
        martillo:      require('../assets/images/ej_martillo.png'),
        fondos:        require('../assets/images/ej_fondos.png'),
        aperturas:     require('../assets/images/ej_aperturas.png'),
        pajaro:        require('../assets/images/ej_pajaro.png'),
        abd_piernas:   require('../assets/images/ej_abdominales_piernas.png'),
        estiramiento:  require('../assets/images/ej_estiramientos.png'),
        gato:          require('../assets/images/ej_gato_camello.png'),
        bird:          require('../assets/images/ej_bird_dog.png'),
        gemelos:       require('../assets/images/ej_gemelos.png'),
        trapecio:      require('../assets/images/ej_trapecio.png'),
        lumbares:      require('../assets/images/ej_lumbares.png'),
        deadbug:       require('../assets/images/ej_deadbug.png'),
    };

    const obtenerImagenMusculo = (textoDia) => {
        const dia = (textoDia || "").toLowerCase();
        if (dia.includes('empuje ligero')) return imagenesMusculos.hombros;
        if (dia.includes('empuje'))   return imagenesMusculos.empuje;
        if (dia.includes('tracción') || dia.includes('traccion')) return imagenesMusculos.traccion;
        if (dia.includes('core'))     return imagenesMusculos.core;
        if (dia.includes('pierna') || dia.includes('legs')) return imagenesMusculos.pierna;
        if (dia.includes('torso'))    return imagenesMusculos.torso;
        if (dia.includes('fullbody') || dia.includes('full body')) return imagenesMusculos.fullbody;
        if (dia.includes('descanso') || dia.includes('sesión') || dia.includes('sesion')) return imagenesMusculos.descanso;
        return imagenesMusculos.fullbody;
    };

    const obtenerFotoEjercicio = (nombreEjercicio) => {
        const ej = nombreEjercicio.toLowerCase();

        // --- PECHO ---
        if (ej.includes('press') && (ej.includes('banca') || ej.includes('pecho') || ej.includes('plano') || ej.includes('superior') || ej.includes('inclinado'))) return imagenesEjercicios.press_banca;
        if (ej.includes('aperturas') || ej.includes('contractor') || ej.includes('cruce')) return imagenesEjercicios.aperturas;
        if (ej.includes('flexiones') || ej.includes('push up')) return imagenesEjercicios.flexiones;
        if (ej.includes('fondos') && (ej.includes('pecho') || ej.includes('paralelas'))) return imagenesEjercicios.fondos;

        // --- ESPALDA ---
        if (ej.includes('dominadas') || ej.includes('pull up')) return imagenesEjercicios.dominadas;
        if (ej.includes('remo')) return imagenesEjercicios.remo;
        if (ej.includes('jalón') || ej.includes('jalon')) return imagenesEjercicios.jalon;
        if (ej.includes('peso muerto') && !ej.includes('rumano')) return imagenesEjercicios.peso_muerto;
        if (ej.includes('lumbares') || ej.includes('hiperextensiones')) return imagenesEjercicios.lumbares;

        // --- PIERNAS ---
        if (ej.includes('sentadilla') || ej.includes('squat')) return imagenesEjercicios.sentadilla;
        if (ej.includes('prensa')) return imagenesEjercicios.prensa;
        if (ej.includes('zancada') || ej.includes('lunge') || ej.includes('estocada')) return imagenesEjercicios.zancadas;
        if (ej.includes('extensión') && ej.includes('cuádriceps')) return imagenesEjercicios.ext_cuad;
        if (ej.includes('curl femoral') || ej.includes('peso muerto rumano')) return imagenesEjercicios.femoral;
        if (ej.includes('gemelo') || ej.includes('pantorrilla') || ej.includes('talones')) return imagenesEjercicios.gemelos;

        // --- HOMBROS ---
        if (ej.includes('press militar') || ej.includes('press hombro') || ej.includes('press arnold')) return imagenesEjercicios.press_militar;
        if (ej.includes('elevación lateral') || ej.includes('elevacion lateral') || ej.includes('laterales')) return imagenesEjercicios.elevaciones;
        if (ej.includes('pájaro') || ej.includes('pajaro') || ej.includes('deltoide posterior')) return imagenesEjercicios.pajaro;
        if (ej.includes('trapecio') || ej.includes('encogimiento')) return imagenesEjercicios.trapecio;

        // --- BRAZOS ---
        if (ej.includes('curl') && (ej.includes('bíceps') || ej.includes('biceps'))) return imagenesEjercicios.curl;
        if (ej.includes('martillo')) return imagenesEjercicios.martillo;
        if (ej.includes('tríceps') || ej.includes('triceps') || ej.includes('francés') || ej.includes('frances')) return imagenesEjercicios.triceps;
        if (ej.includes('fondos') && ej.includes('banco')) return imagenesEjercicios.fondos;

        // --- CORE / ABDOMEN ---
        if (ej.includes('crunch') || ej.includes('abdominal')) return imagenesEjercicios.crunch;
        if (ej.includes('plancha') || ej.includes('plank') || ej.includes('core')) return imagenesEjercicios.core;
        if (ej.includes('piernas') && ej.includes('elevación')) return imagenesEjercicios.abd_piernas;
        if (ej.includes('deadbug')) return imagenesEjercicios.deadbug;
        if (ej.includes('bird dog')) return imagenesEjercicios.bird;

        // --- SALUD / MOVILIDAD ---
        if (ej.includes('estiramiento') || ej.includes('movilidad')) return imagenesEjercicios.estiramiento;
        if (ej.includes('gato') || ej.includes('camello')) return imagenesEjercicios.gato;
        if (ej.includes('caminar') || ej.includes('pasos')) return imagenesEjercicios.caminar;

        return imagenesEjercicios.descanso;
    };

    const parsearEjercicio = (texto) => {
        const match = texto.match(/^(.*?)(\s+\d+x[\d\-]+\w*)?$/);
        const nombre = match ? match[1].trim() : texto;
        const series = match && match[2] ? match[2].trim() : '';
        return { nombre, series };
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const cargarData = async () => {
            try {
                let resRutina = await AsyncStorage.getItem("rutina");
                const userId = await AsyncStorage.getItem("userId");

                if (!resRutina && userId) {
                    const response = await fetch(`${API_URL}/usuarios/${userId}/rutina`);
                    const result = await response.json();
                    if (result.success) {
                        await AsyncStorage.setItem("rutina", JSON.stringify(result));
                        resRutina = JSON.stringify(result);
                    }
                }

                if (resRutina) {
                    const parsed = JSON.parse(resRutina);
                    setData(parsed);
                    setDiaActual(Object.keys(parsed.rutina)[0]);
                }

                const userName = await AsyncStorage.getItem("userName");
                if (userName) setUsuario({ nombre: userName });

                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: false,
                }).start();

            } catch (err) {
                console.error("Error al cargar datos:", err);
            }
        };
        cargarData();
    }, []);

    const cerrarSesion = async () => {
        await AsyncStorage.removeItem("userId");
        await AsyncStorage.removeItem("userName");
        await AsyncStorage.removeItem("rutina");
        router.replace('/');
    };

    const irAPerfil = () => router.push('/perfil');

    if (!data) return (
        <View style={styles.loading}>
            <Text style={{color:'white', fontSize: 18, fontWeight: '300'}}>Preparando entrenamiento...</Text>
        </View>
    );

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* --- TOP BAR --- */}
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.avatarGlow}
                    onPress={() => setMenuVisible(true)}
                >
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* --- MENÚ DESPLEGABLE --- */}
            <Modal transparent visible={menuVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdown}>
                                <Text style={styles.dropdownHeader}>{usuario.nombre}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); irAPerfil(); }}>
                                    <Text style={styles.dropdownText}>Ver Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); cerrarSesion(); }}>
                                    <Text style={[styles.dropdownText, {color: '#ff4444'}]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* --- CARD PRINCIPAL --- */}
            <View style={styles.mainCard}>

                {/* --- VISTA AUTOMÁTICA --- */}
                {vistaActiva === 'automatica' && (
                    <>
                        <View style={styles.header}>
                            <View style={{flex: 1}}>
                                <Text style={styles.methodLabel}>MÉTODO SELECCIONADO</Text>
                                <Text style={styles.title}>{data.metodo}</Text>
                                <Text style={styles.subtitleTitle}>{data.subtitulo}</Text>
                            </View>
                        </View>

                        <View style={styles.tabsWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                                {Object.keys(data.rutina).map(dia => (
                                    <TouchableOpacity
                                        key={dia}
                                        style={[styles.tab, diaActual === dia && styles.tabActive]}
                                        onPress={() => setDiaActual(dia)}
                                    >
                                        <Text style={[styles.tabText, diaActual === dia && styles.textOrange]}>
                                            {dia.split(' ').slice(0, 2).join(' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.content}
                            contentContainerStyle={{ paddingBottom: 120 }} // Espacio para que la barra no tape el final
                        >
                            <View style={styles.imageContainer}>
                                <Image source={obtenerImagenMusculo(diaActual)} style={styles.muscleImage} resizeMode="cover" />
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.overlayDia}>{diaActual}</Text>
                                    <Text style={styles.overlayCount}>{data.rutina[diaActual]?.length || 0} ejercicios</Text>
                                </View>
                            </View>

                            {data.rutina[diaActual]?.map((ej, i) => {
                                const { nombre, series } = parsearEjercicio(ej);
                                return (
                                    <View key={i} style={styles.exerciseCard}>
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} resizeMode="cover" />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{nombre}</Text>
                                            {series ? (
                                                <View style={styles.seriesBadge}>
                                                    <Text style={styles.seriesText}>{series}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {/* --- VISTA PROPIA --- */}
                {vistaActiva === 'propia' && (
                    <View style={styles.placeholderCenter}>
                        <Text style={styles.placeholderText}>Aquí podrás crear y visualizar tus rutinas personalizadas manualmente.</Text>
                        <TouchableOpacity style={styles.btnPlaceholder}>
                            <Text style={styles.btnPlaceholderText}>+ Crear Nueva Rutina</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- VISTA DIETA --- */}
                {vistaActiva === 'dieta' && (
                    <View style={styles.placeholderCenter}>
                        <Text style={styles.placeholderText}>Registro de alimentación y seguimiento de macros diarias.</Text>
                        <TouchableOpacity style={[styles.btnPlaceholder, {backgroundColor: '#4CAF50'}]}>
                            <Text style={styles.btnPlaceholderText}>Registrar Alimento</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* --- BARRA DE NAVEGACIÓN INFERIOR (FLOTANTE PREMIUM) --- */}
            <View style={styles.navContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={styles.tabBarItem}
                        onPress={() => setVistaActiva('propia')}
                    >
                        <View style={[styles.iconCircle, vistaActiva === 'propia' && styles.iconCircleActive]}>
                            <Text style={[styles.tabIcon, vistaActiva === 'propia' && styles.textWhite]}>📋</Text>
                        </View>
                        <Text style={[styles.tabBarText, vistaActiva === 'propia' && styles.tabBarTextActive]}>Mi Rutina</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabBarItem}
                        onPress={() => setVistaActiva('automatica')}
                    >
                        <View style={[styles.iconCircle, vistaActiva === 'automatica' && styles.iconCircleActive]}>
                            <Text style={[styles.tabIcon, vistaActiva === 'automatica' && styles.textWhite]}>⚡</Text>
                        </View>
                        <Text style={[styles.tabBarText, vistaActiva === 'automatica' && styles.tabBarTextActive]}>Auto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabBarItem}
                        onPress={() => setVistaActiva('dieta')}
                    >
                        <View style={[styles.iconCircle, vistaActiva === 'dieta' && styles.iconCircleActive]}>
                            <Text style={[styles.tabIcon, vistaActiva === 'dieta' && styles.textWhite]}>🍎</Text>
                        </View>
                        <Text style={[styles.tabBarText, vistaActiva === 'dieta' && styles.tabBarTextActive]}>Dieta</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 5, paddingTop: 5 },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },
    avatarGlow: { padding: 3, borderRadius: 26, backgroundColor: 'rgba(255, 122, 0, 0.15)' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },

    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { marginBottom: 10 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.8 },
    title: { fontSize: 17, fontWeight: '900', color: '#ffffff', marginTop: 2 },
    subtitleTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1, fontWeight: '500' },

    tabsWrapper: { marginBottom: 10, marginHorizontal: -18 },
    tabsScroll: { paddingHorizontal: 18, gap: 6 },
    tab: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    tabActive: { backgroundColor: '#ffffff' },
    tabText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
    textOrange: { color: '#ff7a00' },

    content: { flex: 1 },
    imageContainer: { width: '100%', height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
    muscleImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 10 },
    overlayDia: { color: 'white', fontWeight: '800', fontSize: 13 },
    overlayCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

    exerciseCard: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
    exercisePhoto: { width: 80, height: 80 },
    exerciseInfo: { flex: 1, paddingHorizontal: 14 },
    exerciseName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    seriesBadge: { marginTop: 4, backgroundColor: '#ff7a00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
    seriesText: { color: 'white', fontWeight: '800', fontSize: 12 },

    // --- ESTILOS BARRA INFERIOR PREMIUM ---
    navContainer: {
        position: 'absolute',
        bottom: 25,         // Elevada del suelo
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        height: 70,
        borderRadius: 25,
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        paddingHorizontal: 10,
    },
    tabBarItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        backgroundColor: 'transparent',
    },
    iconCircleActive: {
        backgroundColor: '#ff7a00',
        shadowColor: '#ff7a00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tabIcon: {
        fontSize: 18,
    },
    textWhite: {
        color: '#ffffff',
    },
    tabBarText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#bbb',
        textTransform: 'uppercase',
    },
    tabBarTextActive: {
        color: '#ff7a00',
    },

    // --- ESTILOS PLACEHOLDERS ---
    placeholderCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    placeholderText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    btnPlaceholder: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
    },
    btnPlaceholderText: {
        color: '#ff7a00',
        fontWeight: 'bold',
    },
    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' }
});