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
    TextInput,
    Alert
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

    // --- ESTADO DE COMPLETADO ---
    const [completados, setCompletados] = useState({}); // { "Nombre Ejercicio": true/false }

    // --- ESTADOS PARA GUARDAR Y CARGAR ---
    const [modalGuardar, setModalGuardar] = useState(false);
    const [modalElegir, setModalElegir] = useState(false);
    const [nombreNuevaRutina, setNombreNuevaRutina] = useState('');
    const [listaRutinas, setListaRutinas] = useState([]);

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // --- MAPEOS DE IMÁGENES ---
    const imagenesMusculos = {
        empuje:   require('../assets/images/musculo_pecho.png'),
        traccion: require('../assets/images/musculo_traccion.png'),
        pierna:   require('../assets/images/musculo_pierna.png'),
        fullbody: require('../assets/images/fullbody.png'),
        core:     require('../assets/images/musculo_core.png'),
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
        if (dia.includes('empuje ligero') || dia.includes('hombros')) return imagenesMusculos.hombros;
        if (dia.includes('empuje') || dia.includes('push')) return imagenesMusculos.empuje;
        if (dia.includes('tracción') || dia.includes('traccion') || dia.includes('pull')) return imagenesMusculos.traccion;
        if (dia.includes('core'))     return imagenesMusculos.core;
        if (dia.includes('pierna') || dia.includes('legs')) return imagenesMusculos.pierna;
        if (dia.includes('fullbody') || dia.includes('full body')) return imagenesMusculos.fullbody;
        if (dia.includes('descanso')) return imagenesMusculos.descanso;
        return imagenesMusculos.fullbody;
    };

    const obtenerFotoEjercicio = (nombreEjercicio) => {
        const ej = (nombreEjercicio || "").toLowerCase();
        if (ej.includes('press') && (ej.includes('banca') || ej.includes('pecho'))) return imagenesEjercicios.press_banca;
        if (ej.includes('sentadilla')) return imagenesEjercicios.sentadilla;
        if (ej.includes('peso muerto')) return imagenesEjercicios.peso_muerto;
        if (ej.includes('remo')) return imagenesEjercicios.remo;
        if (ej.includes('curl')) return imagenesEjercicios.curl;
        if (ej.includes('militar')) return imagenesEjercicios.press_militar;
        if (ej.includes('prensa')) return imagenesEjercicios.prensa;
        if (ej.includes('jalon')) return imagenesEjercicios.jalon;
        return imagenesEjercicios.descanso;
    };

    const parsearEjercicio = (texto) => {
        const match = texto.match(/^(.*?)(\s+\d+x[\d\-]+\w*)?$/);
        const nombre = match ? match[1].trim() : texto;
        const series = match && match[2] ? match[2].trim() : '';
        return { nombre, series };
    };

    const toggleCompletado = (nombre) => {
        setCompletados(prev => ({
            ...prev,
            [nombre]: !prev[nombre]
        }));
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const cargarData = async () => {
            try {
                setData(null);
                setUsuario({ nombre: 'Usuario' });
                setRutinaPropia({});
                setCompletados({});

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
                if (propiaGuardada) {
                    const parsedPropia = JSON.parse(propiaGuardada);
                    // Si viene del formato nuevo con .ejercicios y .completados
                    if (parsedPropia.ejercicios) {
                        setRutinaPropia(parsedPropia.ejercicios);
                        setCompletados(parsedPropia.completados || {});
                    } else {
                        setRutinaPropia(parsedPropia);
                    }
                } else {
                    let inicial = {};
                    diasSemana.forEach(d => inicial[d] = []);
                    setRutinaPropia(inicial);
                }

                const resCat = await fetch(`${API_URL}/ejercicios`);
                const dataCat = await resCat.json();
                setEjerciciosCatalogo(dataCat);

                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
            } catch (err) {
                console.error(err);
                setData(null);
            }
        };
        cargarData();
    }, []);

    const irAPerfil = () => router.push('/perfil');

    const cerrarSesion = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    const handleGuardarEnDB = async () => {
        if (!nombreNuevaRutina.trim()) return Alert.alert("Error", "Ponle un nombre a tu rutina");
        const userId = await AsyncStorage.getItem("userId");
        try {
            const esquemaCompleto = {
                ejercicios: rutinaPropia,
                completados: completados
            };
            const response = await fetch(`${API_URL}/rutinas/guardar-personalizada`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    nombreRutina: nombreNuevaRutina,
                    esquema: esquemaCompleto
                })
            });
            const resData = await response.json();
            if (resData.success) {
                setModalGuardar(false);
                setNombreNuevaRutina('');
                Alert.alert("Éxito", "Rutina y progreso guardados");
            }
        } catch (e) { Alert.alert("Error", "No se pudo guardar"); }
    };

    const abrirElegirRutina = async () => {
        const userId = await AsyncStorage.getItem("userId");
        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/rutinas-guardadas`);
            const rutinas = await res.json();
            setListaRutinas(rutinas);
            setModalElegir(true);
        } catch (e) { console.error(e); }
    };

    const cargarRutinaSeleccionada = (rutina) => {
        const esquema = JSON.parse(rutina.descripcion);
        if (esquema.ejercicios) {
            setRutinaPropia(esquema.ejercicios);
            setCompletados(esquema.completados || {});
        } else {
            setRutinaPropia(esquema);
        }
        AsyncStorage.setItem("rutina_propia", rutina.descripcion);
        setModalElegir(false);
        Alert.alert("Cargada", `Rutina: ${rutina.nombre}`);
    };

    const añadirEjercicio = (ej) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = [...nueva[diaPropioActivo], `${ej.nombre} 3x12`];
        setRutinaPropia(nueva);
        AsyncStorage.setItem("rutina_propia", JSON.stringify({ ejercicios: nueva, completados }));
        setModalEjercicios(false);
    };

    const eliminarEjercicio = (index) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = nueva[diaPropioActivo].filter((_, i) => i !== index);
        setRutinaPropia(nueva);
        AsyncStorage.setItem("rutina_propia", JSON.stringify({ ejercicios: nueva, completados }));
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

            {/* --- MENÚ DESPLEGABLE --- */}
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
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => { setMenuVisible(false); router.push('/historial'); }}
                                >
                                    <Text style={styles.dropdownText}>📅 Historial de Entrenos</Text>
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
                            <View style={styles.imageContainer}>
                                <Image source={obtenerImagenMusculo(diaActual)} style={styles.muscleImage} resizeMode="cover" />
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.overlayDia}>{diaActual}</Text>
                                    <Text style={styles.overlayCount}>{data.rutina[diaActual]?.length || 0} ejercicios</Text>
                                </View>
                            </View>

                            {data.rutina[diaActual]?.map((ej, i) => {
                                const { nombre, series } = parsearEjercicio(ej);
                                const estaCompletado = completados[nombre];
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => toggleCompletado(nombre)}
                                        style={[styles.exerciseCard, estaCompletado && styles.exerciseCardCompleted]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "(COMPLETADO)" : ""}
                                            </Text>
                                            <View style={[styles.seriesBadge, estaCompletado && styles.badgeCompleted]}>
                                                <Text style={styles.seriesText}>{series}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {vistaActiva === 'propia' && (
                    <>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.methodLabel}>MI ENTRENAMIENTO PERSONAL</Text>
                                <Text style={styles.title}>Diseña tu semana</Text>
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.btnSmall} onPress={abrirElegirRutina}>
                                    <Text style={styles.btnSmallText}>ELEGIR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#2ecc71' }]} onPress={() => setModalGuardar(true)}>
                                    <Text style={styles.btnSmallText}>GUARDAR</Text>
                                </TouchableOpacity>
                            </View>
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
                                const estaCompletado = completados[nombre];
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => toggleCompletado(nombre)}
                                        style={[styles.exerciseCard, estaCompletado && styles.exerciseCardCompleted]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "✓" : ""}
                                            </Text>
                                            <Text style={styles.propiaSeries}>{series || '3x12'}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => eliminarEjercicio(i)} style={styles.btnDelete}><Text style={styles.deleteIcon}>✕</Text></TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity style={styles.btnAdd} onPress={() => setModalEjercicios(true)}>
                                <Text style={styles.btnAddText}>+ AÑADIR EJERCICIO</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </>
                )}
            </View>

            {/* MODALES GUARDAR/ELEGIR/CATÁLOGO (Sin cambios) */}
            <Modal visible={modalGuardar} transparent animationType="fade">
                <View style={styles.fullOverlay}>
                    <View style={styles.modalSmall}>
                        <Text style={styles.modalSub}>Guardar Rutina Como:</Text>
                        <TextInput style={styles.modalInput} placeholder="Nombre (ej: Fuerza 2024)" value={nombreNuevaRutina} onChangeText={setNombreNuevaRutina} />
                        <TouchableOpacity style={styles.btnConfirm} onPress={handleGuardarEnDB}><Text style={styles.btnConfirmText}>CONFIRMAR</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalGuardar(false)}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={modalElegir} transparent animationType="fade">
                <View style={styles.fullOverlay}>
                    <View style={styles.modalSmall}>
                        <Text style={styles.modalSub}>Selecciona una Rutina:</Text>
                        <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
                            {listaRutinas.map((r, i) => (
                                <TouchableOpacity key={i} style={styles.rutinaListItem} onPress={() => cargarRutinaSeleccionada(r)}>
                                    <Text style={styles.rutinaListItemText}>{r.nombre}</Text>
                                    <Text style={{color: '#ff7a00'}}>Cargar</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setModalElegir(false)}><Text style={styles.btnCancelText}>Cerrar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

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

            {/* NAV BAR */}
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

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 15 },
    dropdown: { backgroundColor: '#fff', borderRadius: 16, elevation: 12, minWidth: 190, overflow: 'hidden' },
    dropdownHeader: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 16 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
    dropdownText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    dropdownDivider: { height: 1, backgroundColor: '#f0f0f0' },

    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { marginBottom: 15 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    actionButtons: { flexDirection: 'row', gap: 8 },
    btnSmall: { backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'white' },
    btnSmallText: { color: 'white', fontSize: 10, fontWeight: '900' },

    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },

    tabsWrapper: { marginBottom: 15, marginHorizontal: -18 },
    tab: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, marginHorizontal: 5 },
    tabActive: { backgroundColor: '#ffffff' },
    tabText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
    textOrange: { color: '#ff7a00' },

    imageContainer: { width: '100%', height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 15 },
    muscleImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 10 },
    overlayDia: { color: 'white', fontWeight: '800', fontSize: 13 },
    overlayCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

    exerciseCard: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    exerciseCardCompleted: { backgroundColor: '#d4edda', borderColor: '#28a745', borderWidth: 1 },
    exercisePhoto: { width: 85, height: 85 },
    exerciseInfo: { flex: 1, paddingHorizontal: 15 },
    exerciseName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    textCompleted: { color: '#155724', textDecorationLine: 'line-through' },
    seriesBadge: { marginTop: 6, backgroundColor: '#ff7a00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
    badgeCompleted: { backgroundColor: '#28a745' },
    seriesText: { color: 'white', fontSize: 12, fontWeight: '800' },

    propiaSeries: { color: '#666', fontSize: 12, marginTop: 4 },
    btnDelete: { padding: 20 },
    deleteIcon: { color: '#ff4444', fontSize: 18, fontWeight: 'bold' },
    btnAdd: { backgroundColor: 'white', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    btnAddText: { color: '#ff7a00', fontWeight: '900' },

    fullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalSmall: { backgroundColor: 'white', width: '80%', borderRadius: 20, padding: 25 },
    modalSub: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 15 },
    modalInput: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginBottom: 15 },
    btnConfirm: { backgroundColor: '#2ecc71', padding: 12, borderRadius: 12, alignItems: 'center' },
    btnConfirmText: { color: 'white', fontWeight: 'bold' },
    btnCancelText: { color: 'red', textAlign: 'center', marginTop: 15, fontSize: 13 },
    rutinaListItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    rutinaListItemText: { fontWeight: '600', color: '#333' },

    modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
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