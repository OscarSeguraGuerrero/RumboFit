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
    Animated,
    TextInput
} from 'react-native';

const { width } = Dimensions.get('window');

export default function Rutina() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [diaActual, setDiaActual] = useState(null);
    const [usuario, setUsuario] = useState({ nombre: 'Usuario' });
    const [menuVisible, setMenuVisible] = useState(false);

    // --- ESTADOS RUTINA PROPIA Y NAVEGACIÓN ---
    const [vistaActiva, setVistaActiva] = useState('automatica');
    const [rutinaPropia, setRutinaPropia] = useState({});
    const [diaPropioActivo, setDiaPropioActivo] = useState('Lunes');
    const [modalEjercicios, setModalEjercicios] = useState(false);
    const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // --- MAPEOS DE IMÁGENES (Mantenidos) ---
    const imagenesMusculos = {
        empuje:   require('../assets/images/musculo_pecho.png'),
        traccion: require('../assets/images/musculo_traccion.png'),
        pierna:   require('../assets/images/musculo_pierna.png'),
        fullbody: require('../assets/images/fullbody.png'),
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

    const obtenerFotoEjercicio = (nombreEjercicio) => {
        const ej = nombreEjercicio.toLowerCase();
        if (ej.includes('press') && ej.includes('banca')) return imagenesEjercicios.press_banca;
        if (ej.includes('sentadilla')) return imagenesEjercicios.sentadilla;
        if (ej.includes('peso muerto')) return imagenesEjercicios.peso_muerto;
        if (ej.includes('remo')) return imagenesEjercicios.remo;
        if (ej.includes('curl')) return imagenesEjercicios.curl;
        if (ej.includes('jalón')) return imagenesEjercicios.jalon;
        if (ej.includes('prensa')) return imagenesEjercicios.prensa;
        if (ej.includes('zancada')) return imagenesEjercicios.zancadas;
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
                const userName = await AsyncStorage.getItem("userName");
                if (userName) setUsuario({ nombre: userName });

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

                const propiaGuardada = await AsyncStorage.getItem("rutina_propia");
                if (propiaGuardada) setRutinaPropia(JSON.parse(propiaGuardada));
                else {
                    let inicial = {};
                    diasSemana.forEach(d => inicial[d] = []);
                    setRutinaPropia(inicial);
                }

                const resCat = await fetch(`${API_URL}/ejercicios`);
                const dataCat = await resCat.json();
                setEjerciciosCatalogo(dataCat);

                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
            } catch (err) { console.error(err); }
        };
        cargarData();
    }, []);

    const irAPerfil = () => router.push('/perfil');

    const cerrarSesion = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    const añadirEjercicio = (ej) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = [...nueva[diaPropioActivo], `${ej.nombre} 3x12`];
        setRutinaPropia(nueva);
        AsyncStorage.setItem("rutina_propia", JSON.stringify(nueva));
        setModalEjercicios(false);
    };

    const eliminarEjercicio = (index) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = nueva[diaPropioActivo].filter((_, i) => i !== index);
        setRutinaPropia(nueva);
        AsyncStorage.setItem("rutina_propia", JSON.stringify(nueva));
    };

    if (!data) return <View style={styles.loading}><Text style={{color:'white'}}>Cargando...</Text></View>;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* --- TOP BAR --- */}
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.avatarGlow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{usuario.nombre[0].toUpperCase()}</Text></View>
                </TouchableOpacity>
            </View>

            {/* --- MENÚ DESPLEGABLE (RESTURADO) --- */}
            <Modal transparent visible={menuVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.dropdown}>
                                <Text style={styles.dropdownHeader}>{usuario.nombre}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); irAPerfil(); }}>
                                    <Text style={styles.dropdownText}>👤 Ver Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); cerrarSesion(); }}>
                                    <Text style={[styles.dropdownText, {color: '#ff4444'}]}>🚪 Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* --- CARD PRINCIPAL --- */}
            <View style={styles.mainCard}>
                {vistaActiva === 'automatica' && (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.methodLabel}>MÉTODO INTELIGENTE</Text>
                            <Text style={styles.title}>{data.metodo}</Text>
                        </View>
                        <View style={styles.tabsWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {Object.keys(data.rutina).map(dia => (
                                    <TouchableOpacity key={dia} style={[styles.tab, diaActual === dia && styles.tabActive]} onPress={() => setDiaActual(dia)}>
                                        <Text style={[styles.tabText, diaActual === dia && styles.textOrange]}>{dia.split(' (')[0]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                            {data.rutina[diaActual]?.map((ej, i) => {
                                const { nombre, series } = parsearEjercicio(ej);
                                return (
                                    <View key={i} style={styles.exerciseCard}>
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{nombre}</Text>
                                            <View style={styles.seriesBadge}><Text style={styles.seriesText}>{series}</Text></View>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {vistaActiva === 'propia' && (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.methodLabel}>MI ENTRENAMIENTO PERSONAL</Text>
                            <Text style={styles.title}>Diseña tu semana</Text>
                        </View>
                        <View style={styles.tabsWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {diasSemana.map(dia => (
                                    <TouchableOpacity key={dia} style={[styles.tab, diaPropioActivo === dia && styles.tabActive]} onPress={() => setDiaPropioActivo(dia)}>
                                        <Text style={[styles.tabText, diaPropioActivo === dia && styles.textOrange]}>{dia}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                            {rutinaPropia[diaPropioActivo]?.map((ej, i) => {
                                const { nombre, series } = parsearEjercicio(ej);
                                return (
                                    <View key={i} style={styles.exerciseCard}>
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{nombre}</Text>
                                            <Text style={styles.propiaSeries}>{series || '3x12'}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => eliminarEjercicio(i)} style={styles.btnDelete}><Text style={styles.deleteIcon}>✕</Text></TouchableOpacity>
                                    </View>
                                );
                            })}
                            <TouchableOpacity style={styles.btnAdd} onPress={() => setModalEjercicios(true)}>
                                <Text style={styles.btnAddText}>+ AÑADIR EJERCICIO</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </>
                )}
            </View>

            {/* --- MODAL CATÁLOGO --- */}
            <Modal visible={modalEjercicios} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Añadir a {diaPropioActivo}</Text>
                        <TouchableOpacity onPress={() => setModalEjercicios(false)}><Text style={styles.closeModal}>Cerrar</Text></TouchableOpacity>
                    </View>
                    <TextInput placeholder="Buscar..." style={styles.searchInput} value={busqueda} onChangeText={setBusqueda} />
                    <ScrollView contentContainerStyle={{padding: 20}}>
                        {ejerciciosCatalogo.filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((ej, i) => (
                            <TouchableOpacity key={i} style={styles.catItem} onPress={() => añadirEjercicio(ej)}>
                                <Image source={obtenerFotoEjercicio(ej.nombre)} style={styles.catImage} />
                                <View><Text style={styles.catName}>{ej.nombre}</Text><Text style={styles.catSub}>{ej.grupo_muscular}</Text></View>
                                <Text style={styles.plusIcon}>+</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* --- NAV BAR --- */}
            <View style={styles.navContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => setVistaActiva('propia')}>
                        <View style={[styles.iconCircle, vistaActiva === 'propia' && styles.iconCircleActive]}><Text>📋</Text></View>
                        <Text style={[styles.tabBarText, vistaActiva === 'propia' && styles.tabBarTextActive]}>Mi Rutina</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => setVistaActiva('automatica')}>
                        <View style={[styles.iconCircle, vistaActiva === 'automatica' && styles.iconCircleActive]}><Text>⚡</Text></View>
                        <Text style={[styles.tabBarText, vistaActiva === 'automatica' && styles.tabBarTextActive]}>Auto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => setVistaActiva('dieta')}>
                        <View style={[styles.iconCircle, vistaActiva === 'dieta' && styles.iconCircleActive]}><Text>🍎</Text></View>
                        <Text style={[styles.tabBarText, vistaActiva === 'dieta' && styles.tabBarTextActive]}>Dieta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },
    avatarGlow: { padding: 3, borderRadius: 26, backgroundColor: 'rgba(255, 122, 0, 0.15)' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

    // --- ESTILOS MODAL MENÚ ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },

    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { marginBottom: 15 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },

    tabsWrapper: { marginBottom: 15, marginHorizontal: -18 },
    tab: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, marginHorizontal: 5 },
    tabActive: { backgroundColor: '#ffffff' },
    tabText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
    textOrange: { color: '#ff7a00' },

    exerciseCard: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    exercisePhoto: { width: 85, height: 85 },
    exerciseInfo: { flex: 1, paddingHorizontal: 15 },
    exerciseName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    seriesBadge: { marginTop: 6, backgroundColor: '#ff7a00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
    seriesText: { color: 'white', fontSize: 12, fontWeight: '800' },

    propiaSeries: { color: '#666', fontSize: 12, marginTop: 4 },
    btnDelete: { padding: 20 },
    deleteIcon: { color: '#ff4444', fontSize: 18, fontWeight: 'bold' },
    btnAdd: { backgroundColor: 'white', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    btnAddText: { color: '#ff7a00', fontWeight: '900' },

    modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeModal: { color: '#ff7a00', fontWeight: 'bold' },
    searchInput: { backgroundColor: 'white', margin: 15, padding: 15, borderRadius: 12, elevation: 2 },
    catItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 15, marginBottom: 10 },
    catImage: { width: 50, height: 50, borderRadius: 10, marginRight: 15 },
    catName: { fontSize: 14, fontWeight: 'bold' },
    catSub: { fontSize: 11, color: '#999' },
    plusIcon: { marginLeft: 'auto', fontSize: 24, color: '#ff7a00', paddingRight: 10 },

    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 70, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center' },
    iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    iconCircleActive: { backgroundColor: '#ff7a00' },
    tabBarText: { fontSize: 9, fontWeight: '800', color: '#bbb' },
    tabBarTextActive: { color: '#ff7a00' },
    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' }
});