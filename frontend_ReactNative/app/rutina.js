import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

    // --- MAPEO DE IMÁGENES POR GRUPO MUSCULAR (cabecera del día) ---
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

    const obtenerImagenMusculo = (textoDia) => {
        const dia = textoDia.toLowerCase();
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

    // --- MAPEO DE IMÁGENES POR EJERCICIO ---
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
        core:          require('../assets/images/ej_core.png'),       // plancha
        crunch:        require('../assets/images/ej_crunch.png'),     // crunch abdominal
        descanso:      require('../assets/images/ej_descanso.png'),
        caminar:       require('../assets/images/ej_caminar.png'),
        prensa:        require('../assets/images/ej_prensa_piernas.png'),
    };

    const obtenerFotoEjercicio = (nombreEjercicio) => {
        const ej = nombreEjercicio.toLowerCase();
        if (ej.includes('sentadilla') && !ej.includes('prensa')) return imagenesEjercicios.sentadilla;
        if (ej.includes('prensa')) return imagenesEjercicios.prensa;
        if (ej.includes('press de banca') || ej.includes('press inclinado') || ej.includes('aperturas') || ej.includes('cruce') || ej.includes('fondos')) return imagenesEjercicios.press_banca;
        if (ej.includes('peso muerto')) return imagenesEjercicios.peso_muerto;
        if (ej.includes('dominadas') || ej.includes('jalón') || ej.includes('jalon')) return imagenesEjercicios.dominadas;
        if (ej.includes('remo') || ej.includes('encogimiento') || ej.includes('pájaro') || ej.includes('pajaro')) return imagenesEjercicios.remo;
        if (ej.includes('press militar') || ej.includes('press arnold')) return imagenesEjercicios.press_militar;
        if (ej.includes('curl') || ej.includes('bíceps') || ej.includes('biceps')) return imagenesEjercicios.curl;
        if (ej.includes('tríceps') || ej.includes('triceps') || ej.includes('francés') || ej.includes('frances') || ej.includes('extensión en') || ej.includes('extension en')) return imagenesEjercicios.triceps;
        if (ej.includes('elevacion') || ej.includes('elevación') || ej.includes('lateral')) return imagenesEjercicios.elevaciones;
        if (ej.includes('zancada') || ej.includes('curl femoral') || ej.includes('extensión de') || ej.includes('talones')) return imagenesEjercicios.zancadas;
        if (ej.includes('crunch') || ej.includes('abdominal') || ej.includes('elevación de pierna')) return imagenesEjercicios.crunch;
        if (ej.includes('plancha')) return imagenesEjercicios.core;
        if (ej.includes('caminar')) return imagenesEjercicios.caminar;
        if (ej.includes('estiramientos') || ej.includes('descanso') || ej.includes('movilidad')) return imagenesEjercicios.descanso;
        return imagenesEjercicios.descanso;
    };

    // Parsear nombre y series del texto (ej: "Sentadilla Libre 4x6" -> {nombre, series})
    const parsearEjercicio = (texto) => {
        const match = texto.match(/^(.*?)(\s+\d+x[\d\-]+\w*)?$/);
        const nombre = match ? match[1].trim() : texto;
        const series = match && match[2] ? match[2].trim() : '';
        return { nombre, series };
    };

    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        const cargarData = async () => {
            const resRutina = await AsyncStorage.getItem("rutina");
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
                useNativeDriver: true,
            }).start();
        };
        cargarData();
    }, []);

    const cerrarSesion = async () => {
        await AsyncStorage.removeItem("userToken");
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

            {/* --- MENÚ DESPLEGABLE (Modal) --- */}
            <Modal
                transparent
                visible={menuVisible}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdown}>
                                <Text style={styles.dropdownHeader}>{usuario.nombre}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => { setMenuVisible(false); irAPerfil(); }}
                                >
                                    <Text style={styles.dropdownText}>Ver Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => { setMenuVisible(false); cerrarSesion(); }}
                                >
                                    <Text style={[styles.dropdownText, {color: '#ff4444'}]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* --- CARD PRINCIPAL --- */}
            <View style={styles.mainCard}>
                <View style={styles.header}>
                    <View style={{flex: 1}}>
                        <Text style={styles.methodLabel}>MÉTODO SELECCIONADO</Text>
                        {(() => {
                            // Lógica para limpiar títulos antiguos con paréntesis
                            const fullTitle = data.metodo || "";
                            if (data.subtitulo) {
                                return (
                                    <>
                                        <Text style={styles.title}>{fullTitle}</Text>
                                        <Text style={styles.subtitleTitle}>{data.subtitulo}</Text>
                                    </>
                                );
                            } else {
                                const parts = fullTitle.split(' (');
                                const principal = parts[0];
                                const secundario = parts.slice(1).map(p => p.replace(/[\(\)]/g, '')).join(' - ');
                                return (
                                    <>
                                        <Text style={styles.title}>{principal}</Text>
                                        {secundario ? <Text style={styles.subtitleTitle}>{secundario}</Text> : null}
                                    </>
                                );
                            }
                        })()}
                    </View>
                </View>

                {/* --- TABS DÍAS --- */}
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

                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>

                    {/* --- FOTO DE MÚSCULOS DEL DÍA --- */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={obtenerImagenMusculo(diaActual)}
                            style={styles.muscleImage}
                            resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                            <Text style={styles.overlayDia}>{diaActual}</Text>
                            <Text style={styles.overlayCount}>{data.rutina[diaActual].length} ejercicios</Text>
                        </View>
                    </View>

                    {/* --- TARJETAS CON FOTO POR EJERCICIO --- */}
                    {data.rutina[diaActual].map((ej, i) => {
                        const { nombre, series } = parsearEjercicio(ej);
                        return (
                            <View key={i} style={styles.exerciseCard}>
                                <Image
                                    source={obtenerFotoEjercicio(nombre)}
                                    style={styles.exercisePhoto}
                                    resizeMode="cover"
                                />
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
                    <View style={{height: 30}} />
                </ScrollView>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 10, paddingRight: 20, marginBottom: 5, paddingTop: 5 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    logoutIcon: { color: '#ff4444', fontSize: 14, fontWeight: 'bold', marginRight: 4 },
    logoutText: { color: '#666', fontSize: 12, fontWeight: '600' },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },
    profileTrigger: { flexDirection: 'row', alignItems: 'center' },
    textContainer: { alignItems: 'flex-end', marginRight: 10 },
    userName: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },
    avatarGlow: { padding: 3, borderRadius: 26, backgroundColor: 'rgba(255, 122, 0, 0.15)' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.18, shadowRadius: 14, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownIcon: { fontSize: 17, marginRight: 12 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },

    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.8 },
    title: { fontSize: 17, fontWeight: '900', color: '#ffffff', marginTop: 2 },
    subtitleTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1, fontWeight: '500' },
    explicacion: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 3, fontStyle: 'italic', lineHeight: 13 },
    miniLogo: { width: 40, height: 30, tintColor: 'white' },

    tabsWrapper: { marginBottom: 10, marginHorizontal: -18 },
    tabsScroll: { paddingHorizontal: 18, gap: 6 },
    tab: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, minWidth: 60 },
    tabActive: { backgroundColor: '#ffffff' },
    tabText: { fontSize: 11, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
    textOrange: { color: '#ff7a00' },
    activeDot: { position: 'absolute', bottom: 4, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: '#ff7a00' },

    content: { flex: 1 },

    imageContainer: { width: '100%', height: 120, borderRadius: 16, overflow: 'hidden', marginBottom: 10, position: 'relative' },
    muscleImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 7 },
    overlayDia: { color: 'white', fontWeight: '800', fontSize: 13 },
    overlayCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },

    exerciseCard: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:3}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    exercisePhoto: { width: 90, height: 90 },
    exerciseInfo: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
    exerciseName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', flexWrap: 'wrap' },
    seriesBadge: { marginTop: 8, backgroundColor: '#ff7a00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    seriesText: { color: 'white', fontWeight: '800', fontSize: 13 },

    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' }
});