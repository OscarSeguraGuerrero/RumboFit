import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import { API_URL } from '../config';
import {
    Image,
    Modal,
    Pressable,
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

const calcularTDEE = (user) => {
    if (!user || !user.peso || !user.altura || !user.edad) return 2000;
    let tmb = (10 * user.peso) + (6.25 * user.altura) - (5 * user.edad) + 5; 
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
    const carb = caloriasCarb / 4;
    return {
        kcal: tdee,
        prot: Math.round(prot),
        gras: Math.round(gras),
        carb: Math.round(carb)
    };
};

const calcularMacrosConsumidos = (comidas) => {
    let totales = { kcal: 0, prot: 0, carb: 0, gras: 0 };
    if (!comidas) return totales;
    comidas.forEach(c => {
        const factor = Number(c.cantidad_gramos) / 100;
        totales.kcal += Number(c.alimento?.calorias_100g || 0) * factor;
        totales.prot += Number(c.alimento?.proteinas_100g || 0) * factor;
        totales.carb += Number(c.alimento?.carbohidratos_100g || 0) * factor;
        totales.gras += Number(c.alimento?.grasas_100g || 0) * factor;
    });
    return totales;
};

function LaserRoutineCard({ children, style, contentStyle, onPress }) {
    const laserAnim = useRef(new Animated.Value(0)).current;
    const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(laserAnim, {
                toValue: 1,
                duration: 4200,
                useNativeDriver: true
            })
        );

        loop.start();
        return () => loop.stop();
    }, [laserAnim]);

    const beamSize = 68;
    const safeWidth = Math.max(cardSize.width - beamSize, 1);
    const safeHeight = Math.max(cardSize.height - beamSize, 1);

    const topBeamX = laserAnim.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, safeWidth, safeWidth]
    });
    const rightBeamY = laserAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 1],
        outputRange: [0, 0, safeHeight, safeHeight]
    });
    const bottomBeamX = laserAnim.interpolate({
        inputRange: [0, 0.5, 0.75, 1],
        outputRange: [safeWidth, safeWidth, 0, 0]
    });
    const leftBeamY = laserAnim.interpolate({
        inputRange: [0, 0.75, 1],
        outputRange: [safeHeight, safeHeight, 0]
    });

    const topOpacity = laserAnim.interpolate({
        inputRange: [0, 0.22, 0.28, 0.94, 1],
        outputRange: [1, 1, 0.35, 0.35, 1]
    });
    const rightOpacity = laserAnim.interpolate({
        inputRange: [0, 0.2, 0.25, 0.47, 0.53, 1],
        outputRange: [0.2, 0.2, 1, 1, 0.35, 0.2]
    });
    const bottomOpacity = laserAnim.interpolate({
        inputRange: [0, 0.45, 0.5, 0.72, 0.78, 1],
        outputRange: [0.2, 0.2, 1, 1, 0.35, 0.2]
    });
    const leftOpacity = laserAnim.interpolate({
        inputRange: [0, 0.7, 0.75, 0.97, 1],
        outputRange: [0.2, 0.2, 1, 1, 0.6]
    });

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed, hovered }) => [
                styles.laserCardShell,
                style,
                (pressed || hovered) && styles.laserCardShellActive
            ]}
            onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setCardSize({ width, height });
            }}
        >
            {({ pressed, hovered }) => (
                <>
                    <View style={styles.laserCardFrame}>
                        <View
                            style={[
                                styles.laserCardInner,
                                contentStyle,
                                (pressed || hovered) && styles.laserCardInnerActive
                            ]}
                        >
                            {children}
                        </View>
                    </View>
                    <View pointerEvents="none" style={styles.laserOverlay}>
                        <Animated.View
                            style={[
                                styles.laserBeamHorizontal,
                                styles.laserBeamTop,
                                { opacity: topOpacity, transform: [{ translateX: topBeamX }] }
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.laserBeamVertical,
                                styles.laserBeamRight,
                                { opacity: rightOpacity, transform: [{ translateY: rightBeamY }] }
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.laserBeamHorizontal,
                                styles.laserBeamBottom,
                                { opacity: bottomOpacity, transform: [{ translateX: bottomBeamX }] }
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.laserBeamVertical,
                                styles.laserBeamLeft,
                                { opacity: leftOpacity, transform: [{ translateY: leftBeamY }] }
                            ]}
                        />
                    </View>
                </>
            )}
        </Pressable>
    );
}

export default function Rutina() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [diaActual, setDiaActual] = useState(null);
    const [usuario, setUsuario] = useState({ nombre: 'Usuario' });
    const [usuarioCompleto, setUsuarioCompleto] = useState(null);
    const [macrosHoy, setMacrosHoy] = useState({ kcal: 0, prot: 0, carb: 0, gras: 0 });
    const [menuVisible, setMenuVisible] = useState(false);
    const [rutinaEditable, setRutinaEditable] = useState({});
    const [entrenamientoCompletado, setEntrenamientoCompletado] = useState(false);

    // --- ESTADOS RUTINA PROPIA Y NAVEGACIÓN ---
    const [vistaActiva, setVistaActiva] = useState('rutinas_menu');
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
    const [modalCompletarEntreno, setModalCompletarEntreno] = useState(false);
    const [nombreNuevaRutina, setNombreNuevaRutina] = useState('');
    const [nombreEntrenamiento, setNombreEntrenamiento] = useState('');
    const [guardandoEntrenamiento, setGuardandoEntrenamiento] = useState(false);
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
        press_maquina: require('../assets/images/ej_press_maquina.png'),
        remo_gironda:  require('../assets/images/ej_remo_gironda.png'),
        extension_polea:         require('../assets/images/ej_extension_polea.png'),
        apertura_cadera:         require('../assets/images/ej_apertura_cadera.png'),
        rotacion_tronco:         require('../assets/images/ej_rotacion_tronco.png'),
        press_banca_mancuernas:  require('../assets/images/ej_press_banca_mancuernas.png'),
        press_inclinado:         require('../assets/images/ej_press_inclinado.png'),
        cruce_poleas:            require('../assets/images/ej_cruce_poleas.png'),
        remo_mancuerna:          require('../assets/images/ej_remo_mancuerna.png'),
        press_militar_mancuernas:require('../assets/images/ej_press_militar_mancuernas.png'),
        press_arnold:            require('../assets/images/ej_press_arnold.png'),
        sentadilla_mancuernas:   require('../assets/images/ej_sentadilla_mancuernas.png'),
        peso_muerto_rumano:      require('../assets/images/ej_peso_muerto_rumano.png'),
        curl_mancuernas:         require('../assets/images/ej_curl_mancuernas.png'),
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



// --- PECHO ---

        if (ej.includes('press de banca con mancuernas') || ej.includes('press con mancuernas')) return imagenesEjercicios.press_banca_mancuernas;
        if (ej.includes('press inclinado')) return imagenesEjercicios.press_inclinado;
        if (ej.includes('cruce de poleas')) return imagenesEjercicios.cruce_poleas;

        if (ej.includes('press en máquina') || ej.includes('press en maquina')) return imagenesEjercicios.press_maquina;

        if (ej.includes('press') && (ej.includes('banca') || ej.includes('pecho') || ej.includes('plano') || ej.includes('superior') || ej.includes('inclinado'))) return imagenesEjercicios.press_banca;

        if (ej.includes('aperturas') || ej.includes('contractor') || ej.includes('cruce') || ej.includes('peck deck')) return imagenesEjercicios.aperturas;

        if (ej.includes('flexiones') || ej.includes('push up')) return imagenesEjercicios.flexiones;

        if (ej.includes('fondos') && (ej.includes('pecho') || ej.includes('paralelas'))) return imagenesEjercicios.fondos;



// --- ESPALDA ---

        if (ej.includes('dominadas') || ej.includes('pull up')) return imagenesEjercicios.dominadas;

        if (ej.includes('remo gironda') || ej.includes('gironda')) return imagenesEjercicios.remo_gironda;

        if (ej.includes('remo con mancuerna') || ej.includes('remo a una mano')) return imagenesEjercicios.remo_mancuerna;

        if (ej.includes('remo')) return imagenesEjercicios.remo;

        if (ej.includes('jalón') || ej.includes('jalon')) return imagenesEjercicios.jalon;

        if (ej.includes('peso muerto') && !ej.includes('rumano')) return imagenesEjercicios.peso_muerto;

        if (ej.includes('lumbares') || ej.includes('hiperextensiones') || ej.includes('extension de espalda')) return imagenesEjercicios.lumbares;



// --- PIERNAS ---

        if (ej.includes('sentadilla con mancuernas') || (ej.includes('sentadilla') && ej.includes('mancuernas'))) return imagenesEjercicios.sentadilla_mancuernas;

        if (ej.includes('sentadilla') || ej.includes('squat')) return imagenesEjercicios.sentadilla;

        if (ej.includes('prensa')) return imagenesEjercicios.prensa;

        if (ej.includes('zancada') || ej.includes('lunge') || ej.includes('estocada')) return imagenesEjercicios.zancadas;

        if (ej.includes('extensión') && ej.includes('cuádriceps')) return imagenesEjercicios.ext_cuad;

        if (ej.includes('peso muerto rumano')) return imagenesEjercicios.peso_muerto_rumano;

        if (ej.includes('curl femoral') || ej.includes('femoral')) return imagenesEjercicios.femoral;

        if (ej.includes('gemelo') || ej.includes('pantorrilla') || ej.includes('talones')) return imagenesEjercicios.gemelos;



// --- HOMBROS ---

        if (ej.includes('press arnold')) return imagenesEjercicios.press_arnold;
        if (ej.includes('press militar con mancuernas') || (ej.includes('press') && ej.includes('mancuernas') && (ej.includes('hombro') || ej.includes('militar')))) return imagenesEjercicios.press_militar_mancuernas;

        if (ej.includes('press militar') || ej.includes('press hombro')) return imagenesEjercicios.press_militar;

        if (ej.includes('elevación lateral') || ej.includes('elevacion lateral') || ej.includes('laterales')) return imagenesEjercicios.elevaciones;

        if (ej.includes('pájaro') || ej.includes('pajaro') || ej.includes('deltoide posterior')) return imagenesEjercicios.pajaro;

        if (ej.includes('trapecio') || ej.includes('encogimiento')) return imagenesEjercicios.trapecio;



// --- BRAZOS ---

        if (ej.includes('extensión en polea alta') || ej.includes('extension en polea alta')) return imagenesEjercicios.extension_polea;

        if (ej.includes('curl de bíceps con mancuernas') || ej.includes('curl con mancuernas') || (ej.includes('curl') && ej.includes('mancuernas'))) return imagenesEjercicios.curl_mancuernas;

        if (ej.includes('curl') && (ej.includes('bíceps') || ej.includes('biceps'))) return imagenesEjercicios.curl;

        if (ej.includes('martillo') || ej.includes('hammer')) return imagenesEjercicios.martillo;

        if (ej.includes('tríceps') || ej.includes('triceps') || ej.includes('francés') || ej.includes('frances') || ej.includes('extension de codo')) return imagenesEjercicios.triceps;

        if (ej.includes('fondos') && (ej.includes('banco') || ej.includes('silla'))) return imagenesEjercicios.fondos;



// --- CORE / ABDOMEN ---

        if (ej.includes('deadbug')) return imagenesEjercicios.deadbug;

        if (ej.includes('crunch') || ej.includes('abdominal')) return imagenesEjercicios.crunch;

        if (ej.includes('plancha') || ej.includes('plank')) return imagenesEjercicios.core;

        if (ej.includes('piernas') && (ej.includes('elevación') || ej.includes('elevacion'))) return imagenesEjercicios.abd_piernas;

        if (ej.includes('bird dog') || ej.includes('bird-dog')) return imagenesEjercicios.bird;



// --- SALUD / MOVILIDAD / OTROS ---

        if (ej.includes('apertura de cadera')) return imagenesEjercicios.apertura_cadera;
        if (ej.includes('rotación de tronco') || ej.includes('rotacion de tronco')) return imagenesEjercicios.rotacion_tronco;

        if (ej.includes('gato') || ej.includes('camello') || ej.includes('cat-cow')) return imagenesEjercicios.gato;

        if (ej.includes('estiramiento') || ej.includes('movilidad')) return imagenesEjercicios.estiramiento;

        if (ej.includes('caminar') || ej.includes('pasos') || ej.includes('cardio')) return imagenesEjercicios.caminar;



// Si no encuentra nada de lo anterior, pero el nombre del ejercicio coincide con alguna clave de tu objeto:

        const claveDirecta = Object.keys(imagenesEjercicios).find(key => ej.includes(key));

        if (claveDirecta) return imagenesEjercicios[claveDirecta];



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

    const obtenerNombreEntrenamientoPorDefecto = () => {
        if (vistaActiva === 'propia') return `Entrenamiento ${diaPropioActivo}`;
        return diaActual ? `Entrenamiento ${diaActual}` : 'Entrenamiento RumboFit';
    };

    const abrirModalCompletarEntrenamiento = () => {
        setNombreEntrenamiento(obtenerNombreEntrenamientoPorDefecto());
        setModalCompletarEntreno(true);
    };

    const cerrarModalCompletarEntrenamiento = () => {
        if (guardandoEntrenamiento) return;
        setModalCompletarEntreno(false);
        setNombreEntrenamiento('');
    };

    const obtenerEjerciciosEntrenamientoActual = () => {
        const ejerciciosActivos = vistaActiva === 'propia'
            ? (rutinaPropia[diaPropioActivo] || [])
            : (rutinaEditable[diaActual] || []);

        return ejerciciosActivos.map((ej) => {
            const ejercicio = typeof ej === 'string'
                ? (() => {
                    const parsed = parsearEjercicio(ej);
                    return {
                        nombre: parsed.nombre,
                        series: 3,
                        reps: 12
                    };
                })()
                : ej;

            return {
                nombre: ejercicio.nombre,
                series: Array.from({ length: Number(ejercicio.series) || 0 }, () => ({
                    peso: 0,
                    reps: Number(ejercicio.reps) || 0
                }))
            };
        }).filter((ej) => ej.nombre && ej.series.length > 0);
    };

    const registrarEntrenamientoCompletado = async () => {
        const nombreLimpio = nombreEntrenamiento.trim();
        if (!nombreLimpio) {
            Alert.alert("Error", "Ponle un nombre al entrenamiento");
            return;
        }

        const ejercicios = obtenerEjerciciosEntrenamientoActual();
        if (ejercicios.length === 0) {
            Alert.alert("Error", "No hay ejercicios para registrar hoy");
            return;
        }

        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
            Alert.alert("Error", "No se encontró la sesión del usuario");
            return;
        }

        setGuardandoEntrenamiento(true);
        try {
            const payload = {
                userId,
                rutinaId: data?.id || null,
                nombreEntrenamiento: nombreLimpio,
                ejercicios
            };

            const res = await fetch(`${API_URL}/historial/entrenamiento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                Alert.alert("Error", result.error || "No se pudo registrar el entrenamiento");
                return;
            }

            setEntrenamientoCompletado(true);
            setModalCompletarEntreno(false);
            setNombreEntrenamiento('');
            Alert.alert("Entrenamiento guardado", `"${nombreLimpio}" se registró correctamente.`);
        } catch (e) {
            Alert.alert("Error", "No se pudo conectar con el servidor");
        } finally {
            setGuardandoEntrenamiento(false);
        }
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

                if (userId) {
                    const userRes = await fetch(`${API_URL}/usuarios/${userId}`);
                    const userData = await userRes.json();
                    if (userData.success) setUsuarioCompleto(userData.usuario);

                    const histRes = await fetch(`${API_URL}/usuarios/${userId}/historial`);
                    const histData = await histRes.json();
                    if (histData.success && histData.historial) {
                        const hoyStr = new Date().toISOString().split('T')[0];
                        const dataHoy = histData.historial[hoyStr];
                        if (dataHoy && dataHoy.comidas) {
                            setMacrosHoy(calcularMacrosConsumidos(dataHoy.comidas));
                        }
                    }

                    if (!resRutina) {
                        const response = await fetch(`${API_URL}/usuarios/${userId}/rutina`);
                        const result = await response.json();
                        if (result.success) {
                            await AsyncStorage.setItem("rutina", JSON.stringify(result));
                            resRutina = JSON.stringify(result);
                        }
                    }
                }

                if (resRutina) {
                    const parsed = JSON.parse(resRutina);
                    setData(parsed);
                    setDiaActual(Object.keys(parsed.rutina)[0]);
                    const rutinaConvertida = {};

                    Object.keys(parsed.rutina).forEach(dia => {
                        rutinaConvertida[dia] = parsed.rutina[dia].map(ej => {
                            const parsedEj = parsearEjercicio(ej);
                            return {
                                nombre: parsedEj.nombre,
                                series: 3,
                                reps: 12
                            };
                        });
                    });

                    setRutinaEditable(rutinaConvertida);
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
                await cargarRutinasGuardadas();

                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
            } catch (err) {
                console.error(err);
                setData(null);
            }
        };
        cargarData();
    }, []);

    useEffect(() => {
        setEntrenamientoCompletado(false);
    }, [vistaActiva, diaActual, diaPropioActivo]);

    const irAPerfil = () => router.push('/perfil');

    const cerrarSesion = async () => {
        await AsyncStorage.clear();
        router.replace('/');
    };

    const cargarRutinasGuardadas = async () => {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
            setListaRutinas([]);
            return [];
        }

        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/rutinas-guardadas`);
            const rutinas = await res.json();
            const rutinasNormalizadas = Array.isArray(rutinas) ? rutinas : [];
            setListaRutinas(rutinasNormalizadas);
            return rutinasNormalizadas;
        } catch (e) {
            console.error(e);
            setListaRutinas([]);
            return [];
        }
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
                await cargarRutinasGuardadas();
                Alert.alert("Éxito", "Rutina y progreso guardados");
            }
        } catch (e) { Alert.alert("Error", "No se pudo guardar"); }
    };

    const abrirElegirRutina = async () => {
        await cargarRutinasGuardadas();
        setModalElegir(true);
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

    const abrirRutinaGuardada = (rutina) => {
        cargarRutinaSeleccionada(rutina);
        setVistaActiva('propia');
    };

    const obtenerResumenRutinaGuardada = (rutina) => {
        try {
            const esquema = JSON.parse(rutina.descripcion);
            const ejercicios = esquema.ejercicios || esquema;
            const diasActivos = Object.keys(ejercicios || {}).filter(
                (dia) => Array.isArray(ejercicios[dia]) && ejercicios[dia].length > 0
            );
            const totalEjercicios = diasActivos.reduce(
                (total, dia) => total + ejercicios[dia].length,
                0
            );

            return {
                diasActivos: diasActivos.length,
                totalEjercicios
            };
        } catch (e) {
            return {
                diasActivos: 0,
                totalEjercicios: 0
            };
        }
    };

    const añadirEjercicio = (ej) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = [
            ...nueva[diaPropioActivo],
            {
                nombre: ej.nombre,
                series: 3,
                reps: 12
            }
        ];
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
    const actualizarEjAuto = (index, campo, valor) => {
        const nueva = { ...rutinaEditable };

        nueva[diaActual][index][campo] = Number(valor);

        setRutinaEditable(nueva);
    };
    // Para modificar las series y repeticiones
    const actualizarEjercicio = (index, campo, valor) => {
        const nueva = { ...rutinaPropia };

        nueva[diaPropioActivo][index][campo] = Number(valor);

        setRutinaPropia(nueva);

        AsyncStorage.setItem(
            "rutina_propia",
            JSON.stringify({ ejercicios: nueva, completados })
        );
    };

    const simulateTrainingLog = async () => {
        abrirModalCompletarEntrenamiento();
    };

    const simulateFoodLog = async () => {
        const userId = await AsyncStorage.getItem("userId");
        const payload = {
            userId,
            alimentoId: 1,
            cantidad: 150,
            franja: 'Comida'
        };
        try {
            const res = await fetch(`${API_URL}/historial/comida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) Alert.alert("¡Comida Guardada!", "Se ha añadido al registro de hoy.");
            else Alert.alert("Error", "Asegúrate de tener alimentos en la base de datos.");
        } catch (e) { Alert.alert("Error", "No se pudo conectar"); }
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
                                    <Text style={styles.dropdownText}>Ver Perfil</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => { setMenuVisible(false); router.push('/historial'); }}
                                >
                                    <Text style={styles.dropdownText}>Mi Historial</Text>
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
                {vistaActiva === 'rutinas_menu' && (
                    <View style={{ flex: 1, paddingBottom: 100 }}>
                        <View style={styles.header}>
                            <Text style={styles.methodLabel}>GESTIÓN DE ENTRENAMIENTO</Text>
                            <Text style={styles.title}>Mis Rutinas</Text>
                            <TouchableOpacity
                                style={styles.createRoutineButton}
                                onPress={() => setVistaActiva('propia')}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.createRoutineButtonText}>+ Crear personalizada</Text>
                            </TouchableOpacity>
                        </View>
                        <LaserRoutineCard contentStyle={styles.menuCard} onPress={() => setVistaActiva('automatica')}>
                            <Text style={styles.menuCardTitle}>Mi rutina sugerida</Text>
                            <Text style={styles.menuCardSub}>Rutina inteligente creada en tu registro</Text>
                        </LaserRoutineCard>
                        {listaRutinas.length > 0 && (
                            <View style={styles.savedRoutinesSection}>
                                <Text style={styles.savedRoutinesTitle}>Rutinas creadas por ti</Text>
                                {listaRutinas.map((rutina) => {
                                    const resumen = obtenerResumenRutinaGuardada(rutina);
                                    return (
                                        <LaserRoutineCard
                                            key={rutina.id || rutina.nombre}
                                            contentStyle={styles.savedRoutineCard}
                                            onPress={() => abrirRutinaGuardada(rutina)}
                                        >
                                            <Text style={styles.savedRoutineName}>{rutina.nombre}</Text>
                                            <Text style={styles.savedRoutineMeta}>
                                                {resumen.diasActivos} días • {resumen.totalEjercicios} ejercicios
                                            </Text>
                                            <Text style={styles.savedRoutineHint}>Toca para abrirla o editarla</Text>
                                        </LaserRoutineCard>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {vistaActiva === 'automatica' && (
                    <>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setVistaActiva('rutinas_menu')}>
                                <Text style={styles.backToMenuText}>← Volver al menú</Text>
                            </TouchableOpacity>
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

                            {rutinaEditable[diaActual]?.map((ej, i) => {
                                const nombre = ej.nombre;
                                const estaCompletado = completados[nombre];
                                return (
                                    <Pressable
                                        key={i}
                                        onPress={() => {}}
                                        style={({ pressed, hovered }) => [
                                            styles.exerciseCard,
                                            estaCompletado && styles.exerciseCardCompleted,
                                            (pressed || hovered) && styles.exerciseCardActive
                                        ]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "(COMPLETADO)" : ""}
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>

                                                <TextInput
                                                    style={styles.inputSeries}
                                                    keyboardType="numeric"
                                                    value={String(ej.series)}
                                                    onChangeText={(text) => actualizarEjAuto(i, 'series', text)}
                                                />

                                                <Text style={{ alignSelf: 'center' }}>x</Text>

                                                <TextInput
                                                    style={styles.inputSeries}
                                                    keyboardType="numeric"
                                                    value={String(ej.reps)}
                                                    onChangeText={(text) => actualizarEjAuto(i, 'reps', text)}
                                                />
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={abrirModalCompletarEntrenamiento}
                            style={[
                                styles.checkEntreno,
                                entrenamientoCompletado && styles.checkEntrenoActivo
                            ]}
                        >
                            <Text style={styles.checkEntrenoText}>
                                {entrenamientoCompletado ? "✔ ENTRENAMIENTO COMPLETADO" : "MARCAR COMO COMPLETADO"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSimular} onPress={() => simulateTrainingLog()}>
                            <Text style={styles.btnSimularText}>🏁 FINALIZAR Y REGISTRAR SESIÓN</Text>
                        </TouchableOpacity>
                    </>
                )}

                {vistaActiva === 'propia' && (
                    <>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <TouchableOpacity onPress={() => setVistaActiva('rutinas_menu')}>
                                    <Text style={styles.backToMenuText}>← Volver al menú</Text>
                                </TouchableOpacity>
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
                                const ejercicio = typeof ej === 'string'
                                    ? (() => {
                                        const parsed = parsearEjercicio(ej);
                                        return {
                                            nombre: parsed.nombre,
                                            series: 3,
                                            reps: 12
                                        };
                                    })()
                                    : ej;

                                const nombre = ejercicio.nombre;
                                const estaCompletado = completados[nombre];
                                return (
                                    <Pressable
                                        key={i}
                                        onPress={() => {}}
                                        style={({ pressed, hovered }) => [
                                            styles.exerciseCard,
                                            estaCompletado && styles.exerciseCardCompleted,
                                            (pressed || hovered) && styles.exerciseCardActive
                                        ]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "✓" : ""}
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>

                                                <TextInput
                                                    style={{
                                                        backgroundColor: '#eee',
                                                        padding: 5,
                                                        borderRadius: 5,
                                                        width: 40,
                                                        textAlign: 'center'
                                                    }}
                                                    keyboardType="numeric"
                                                    value={String(ejercicio.series)}
                                                    onChangeText={(text) => actualizarEjercicio(i, 'series', text)}
                                                />

                                                <Text style={{ alignSelf: 'center' }}>x</Text>

                                                <TextInput
                                                    style={{
                                                        backgroundColor: '#eee',
                                                        padding: 5,
                                                        borderRadius: 5,
                                                        width: 40,
                                                        textAlign: 'center'
                                                    }}
                                                    keyboardType="numeric"
                                                    value={String(ejercicio.reps)}
                                                    onChangeText={(text) => actualizarEjercicio(i, 'reps', text)}
                                                />

                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => eliminarEjercicio(i)} style={styles.btnDelete}><Text style={styles.deleteIcon}>✕</Text></TouchableOpacity>
                                    </Pressable>
                                );
                            })}
                            <TouchableOpacity style={styles.btnAdd} onPress={() => setModalEjercicios(true)}>
                                <Text style={styles.btnAddText}>+ AÑADIR EJERCICIO</Text>
                            </TouchableOpacity>
                        </ScrollView>
                        <TouchableOpacity
                            onPress={abrirModalCompletarEntrenamiento}
                            style={[
                                styles.checkEntreno,
                                entrenamientoCompletado && styles.checkEntrenoActivo
                            ]}
                        >
                            <Text style={styles.checkEntrenoText}>
                                {entrenamientoCompletado ? "✔ ENTRENAMIENTO COMPLETADO" : "MARCAR COMO COMPLETADO"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnSimular} onPress={() => simulateTrainingLog()}>
                            <Text style={styles.btnSimularText}>FINALIZAR Y REGISTRAR SESIÓN</Text>
                        </TouchableOpacity>
                    </>
                )}

                {vistaActiva === 'dieta' && (
                    <View style={{ flex: 1 }}>
                         <View style={styles.header}>
                            <Text style={styles.methodLabel}>MI NUTRICIÓN DIARIA</Text>
                            <Text style={styles.title}>Registro de Comidas</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                            <View style={styles.dietBanner}>
                                <Text style={styles.dietBannerText}>El historial unificado está disponible en el menú superior ↗</Text>
                            </View>
                            
                            {(() => {
                                const objMacros = calcularMacrosObjetivo(calcularTDEE(usuarioCompleto), usuarioCompleto);
                                const pctKcal = Math.min(100, (macrosHoy.kcal / objMacros.kcal) * 100) || 0;
                                const pctProt = Math.min(100, (macrosHoy.prot / objMacros.prot) * 100) || 0;
                                const pctCarb = Math.min(100, (macrosHoy.carb / objMacros.carb) * 100) || 0;
                                const pctGras = Math.min(100, (macrosHoy.gras / objMacros.gras) * 100) || 0;

                                return (
                                    <>
                                        <View style={styles.dashboardCard}>
                                            <Text style={styles.dashboardTitle}>Calorías Consumidas</Text>
                                            <View style={styles.progressBg}>
                                                <View style={[styles.progressFill, { width: `${pctKcal}%`, backgroundColor: '#ff7a00' }]} />
                                            </View>
                                            <Text style={styles.dashboardSub}>{Math.round(macrosHoy.kcal)} / {objMacros.kcal} Kcal</Text>
                                        </View>

                                        <View style={styles.macrosRow}>
                                            <View style={styles.macroCol}>
                                                <Text style={styles.macroLabel}>Proteínas</Text>
                                                <View style={styles.macroBg}><View style={[styles.macroFill, {width: `${pctProt}%`, backgroundColor: '#3498db'}]} /></View>
                                                <Text style={styles.macroValue}>{Math.round(macrosHoy.prot)} / {objMacros.prot}g</Text>
                                            </View>
                                            <View style={styles.macroCol}>
                                                <Text style={styles.macroLabel}>Carbos</Text>
                                                <View style={styles.macroBg}><View style={[styles.macroFill, {width: `${pctCarb}%`, backgroundColor: '#2ecc71'}]} /></View>
                                                <Text style={styles.macroValue}>{Math.round(macrosHoy.carb)} / {objMacros.carb}g</Text>
                                            </View>
                                            <View style={styles.macroCol}>
                                                <Text style={styles.macroLabel}>Grasas</Text>
                                                <View style={styles.macroBg}><View style={[styles.macroFill, {width: `${pctGras}%`, backgroundColor: '#f1c40f'}]} /></View>
                                                <Text style={styles.macroValue}>{Math.round(macrosHoy.gras)} / {objMacros.gras}g</Text>
                                            </View>
                                        </View>
                                    </>
                                );
                            })()}

                            <TouchableOpacity 
                                style={[styles.btnAdd, { borderStyle: 'solid', backgroundColor: 'rgba(255,122,0,0.1)', borderColor: '#ff7a00' }]}
                                onPress={() => simulateFoodLog()}
                            >
                                <Text style={styles.btnAddText}>Registrar dieta</Text>
                            </TouchableOpacity>

                            <Text style={styles.noDataText}>Las funciones de búsqueda avanzada de alimentos estarán disponibles próximamente.</Text>
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* MODALES GUARDAR/ELEGIR/CATÁLOGO (Sin cambios) */}
            <Modal visible={modalCompletarEntreno} transparent animationType="fade">
                <View style={styles.fullOverlay}>
                    <View style={styles.modalSmall}>
                        <Text style={styles.modalSub}>Nombre del entrenamiento</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej: Push pesado"
                            value={nombreEntrenamiento}
                            onChangeText={setNombreEntrenamiento}
                            editable={!guardandoEntrenamiento}
                        />
                        <TouchableOpacity
                            style={styles.btnConfirm}
                            onPress={registrarEntrenamientoCompletado}
                            disabled={guardandoEntrenamiento}
                        >
                            <Text style={styles.btnConfirmText}>
                                {guardandoEntrenamiento ? 'GUARDANDO...' : 'CONFIRMAR Y GUARDAR'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cerrarModalCompletarEntrenamiento}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => setVistaActiva('rutinas_menu')}>
                        <Text style={[styles.tabBarText, ['rutinas_menu', 'automatica', 'propia'].includes(vistaActiva) && styles.tabBarTextActive]}>MIS RUTINAS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => setVistaActiva('dieta')}>
                        <Text style={[styles.tabBarText, vistaActiva === 'dieta' && styles.tabBarTextActive]}>MI DIETA</Text>
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
    header: { marginBottom: 15, position: 'relative', paddingRight: 150 },
    createRoutineButton: {
        position: 'absolute',
        top: 10,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    createRoutineButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
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

    exerciseCard: {
        backgroundColor: '#fff7ef',
        borderRadius: 24,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        shadowColor: '#3d1600',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8
    },
    exerciseCardCompleted: { backgroundColor: '#dcf8e5', borderColor: '#43b36b', borderWidth: 1.5 },
    exerciseCardActive: {
        transform: [{ translateY: -2 }, { scale: 1.01 }],
        shadowColor: '#2c1404',
        shadowOpacity: 0.28,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
        elevation: 12
    },
    exercisePhoto: { width: 96, height: 96, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
    exerciseInfo: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    exerciseName: { fontSize: 15, fontWeight: '800', color: '#24150d', letterSpacing: 0.2 },
    textCompleted: { color: '#155724', textDecorationLine: 'line-through' },
    seriesBadge: { marginTop: 6, backgroundColor: '#ff7a00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
    badgeCompleted: { backgroundColor: '#28a745' },
    seriesText: { color: 'white', fontSize: 12, fontWeight: '800' },
    inputSeries: {
        backgroundColor: '#eee',
        padding: 5,
        borderRadius: 5,
        width: 40,
        textAlign: 'center'
    },
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
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    iconCircleActive: { backgroundColor: '#ff7a00' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    btnSimular: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
    checkEntreno: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 2,
        borderColor: '#ff7a00'
    },

    checkEntrenoActivo: {
        backgroundColor: '#2ecc71',
        borderColor: '#2ecc71'
    },

    checkEntrenoText: {
        fontWeight: '900',
        color: '#ff7a00'
    },
    btnSimularText: { color: 'white', fontWeight: '900', fontSize: 13 },
    dietBanner: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: 'white' },
    dietBannerText: { color: 'white', fontSize: 11, fontWeight: '700' },
    dashboardCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20 },
    dashboardTitle: { color: '#333', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    progressBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#ff7a00', borderRadius: 4 },
    dashboardSub: { color: '#666', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    noDataText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: 30, lineHeight: 18 },
    
    macrosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    macroCol: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, marginHorizontal: 4, elevation: 2 },
    macroLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 5, textAlign: 'center' },
    macroBg: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginBottom: 5 },
    macroFill: { height: '100%', borderRadius: 3 },
    macroValue: { fontSize: 12, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    
    laserCardShell: {
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        padding: 2
    },
    laserCardShellActive: {
        transform: [{ translateY: -3 }, { scale: 1.01 }]
    },
    laserCardFrame: {
        borderRadius: 22,
        overflow: 'hidden'
    },
    laserCardInner: {
        borderRadius: 22,
        overflow: 'hidden'
    },
    laserCardInnerActive: {
        shadowColor: '#1a0f00',
        shadowOpacity: 0.35,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 16 },
        elevation: 14
    },
    laserOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24
    },
    laserBeamHorizontal: {
        position: 'absolute',
        width: 68,
        height: 3,
        borderRadius: 999,
        backgroundColor: '#ffd84d',
        shadowColor: '#ffd84d',
        shadowOpacity: 0.95,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 }
    },
    laserBeamVertical: {
        position: 'absolute',
        width: 3,
        height: 68,
        borderRadius: 999,
        backgroundColor: '#ffd84d',
        shadowColor: '#ffd84d',
        shadowOpacity: 0.95,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 }
    },
    laserBeamTop: { top: 0, left: 0 },
    laserBeamRight: { top: 0, right: 0 },
    laserBeamBottom: { bottom: 0, left: 0 },
    laserBeamLeft: { top: 0, left: 0 },
    menuCard: {
        backgroundColor: '#fff8f1',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#4a1d00',
        shadowOpacity: 0.2,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 9
    },
    menuCardTitle: { fontSize: 18, fontWeight: '900', color: '#b44f00', marginBottom: 6, letterSpacing: 0.2 },
    menuCardSub: { fontSize: 13, color: '#7a583e', lineHeight: 18 },
    savedRoutinesSection: { marginTop: 20, gap: 12 },
    savedRoutinesTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginBottom: 2, letterSpacing: 0.4 },
    savedRoutineCard: {
        backgroundColor: '#fff8f1',
        borderRadius: 24,
        padding: 18,
        shadowColor: '#4a1d00',
        shadowOpacity: 0.2,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 9
    },
    savedRoutineName: { color: '#b44f00', fontSize: 16, fontWeight: '900', marginBottom: 6, letterSpacing: 0.3 },
    savedRoutineMeta: { color: '#7a583e', fontSize: 12, fontWeight: '800', marginBottom: 6 },
    savedRoutineHint: { color: '#7a583e', fontSize: 11, fontWeight: '700' },
    backToMenuText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 15, opacity: 0.9 },
});
