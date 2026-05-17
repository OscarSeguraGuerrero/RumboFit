import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useRef } from 'react';
import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';
import MainHeader from '../components/MainHeader';
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
    Alert,
    Platform
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Recarga el estado premium del usuario desde el backend o caché
 * para asegurar que los cambios de suscripción sean instantáneos.
 */
const useActualizarEstadoPremium = (setUsuarioCompleto) => {
    useFocusEffect(
        useCallback(() => {
            const refresh = async () => {
                const uid = await AsyncStorage.getItem('userId');
                if (!uid) return;
                try {
                    const res = await fetch(`${API_URL}/usuarios/${uid}`);
                    const data = await res.json();
                    if (data.success) {
                        setUsuarioCompleto(data.usuario);
                    }
                } catch (e) {
                    console.log("Error refrescando estado premium:", e);
                }
            };
            refresh();
        }, [])
    );
};

if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const id = 'rumbofit-no-focus-ring';
    if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            *:focus { outline: none !important; box-shadow: none !important; }
            *:focus-visible { outline: none !important; box-shadow: none !important; }
        `;
        document.head.appendChild(style);
    }
}

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

const necesitaDiagnostico = (usuario) => {
    if (!usuario) return true;

    // Si ya tiene una rutina asignada (sugerida o guardada), no necesita diagnóstico
    if (usuario.rutina_sugerida || (usuario._count && usuario._count.rutinas > 0)) return false;

    return !(
        usuario.peso &&
        usuario.altura &&
        usuario.edad &&
        usuario.sexo &&
        usuario.objetivo &&
        usuario.frecuencia_semanal &&
        usuario.nivel
    );
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
                </>
            )}
        </Pressable>
    );
}

export default function Rutina() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [diaActual, setDiaActual] = useState(null);
    const [usuario, setUsuario] = useState({ nombre: 'Usuario' });
    const [usuarioCompleto, setUsuarioCompleto] = useState(null);
    const [macrosHoy, setMacrosHoy] = useState({ kcal: 0, prot: 0, carb: 0, gras: 0 });
    const [rutinaEditable, setRutinaEditable] = useState({});
    const [entrenamientoCompletado, setEntrenamientoCompletado] = useState(false);
    
    // HU-57: Asegurar que el cambio a premium sea instantáneo al volver de la pasarela
    useActualizarEstadoPremium(setUsuarioCompleto);

    const [editando, setEditando] = useState(false);
    const [perfData, setPerfData] = useState({}); // { [index]: { peso: "", ritmo: "" } }

    // --- ESTADOS RUTINA PROPIA Y NAVEGACIÓN ---
    const [vistaActiva, setVistaActiva] = useState('rutinas_menu');
    const [rutinaPropia, setRutinaPropia] = useState({});
    const [diaPropioActivo, setDiaPropioActivo] = useState('Lunes');
    const [modalEjercicios, setModalEjercicios] = useState(false);
    const [modalEjercicioPersonalizado, setModalEjercicioPersonalizado] = useState(false);
    const [ejerciciosCatalogo, setEjerciciosCatalogo] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [indiceSustituir, setIndiceSustituir] = useState(null);
    const [ejercicioPersonalizado, setEjercicioPersonalizado] = useState({
        nombre: '',
        series: '3',
        reps: '12'
    });

    const esCardio = (nombre) => {
        if (!nombre) return false;
        const cardioKeywords = ['caminar', 'correr', 'bici', 'bicicleta', 'nadar', 'natacion', 'cinta', 'cardio', 'eliptica', 'spinning', 'trote', 'andalo', 'andar'];
        return cardioKeywords.some(kw => nombre.toLowerCase().includes(kw));
    };

    // --- ESTADO DE COMPLETADO ---
    const [completados, setCompletados] = useState({}); // { "Nombre Ejercicio": true/false }

    // Estado para ajustes temporales en el buscador
    const [ajustesCatalog, setAjustesCatalog] = useState({}); // { [ejNombre]: { series: 3, reps: 12 } }

    // --- ESTADOS PARA GUARDAR Y CARGAR ---
    const [modalGuardar, setModalGuardar] = useState(false);
    const [modalElegir, setModalElegir] = useState(false);
    const [modalCompletarEntreno, setModalCompletarEntreno] = useState(false);
    const [nombreNuevaRutina, setNombreNuevaRutina] = useState('');
    const [nombreEntrenamiento, setNombreEntrenamiento] = useState('');
    const [guardandoEntrenamiento, setGuardandoEntrenamiento] = useState(false);
    const [listaRutinas, setListaRutinas] = useState([]);
    const [idRutinaActual, setIdRutinaActual] = useState(null);
    const [nombreRutinaActual, setNombreRutinaActual] = useState('');
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
    const [msgGeneral, setMsgGeneral] = useState({ text: '', type: '' });
    const [errorModal, setErrorModal] = useState('');
    const [modalLimitePremium, setModalLimitePremium] = useState(false);

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const crearRutinaVacia = () => {
        const rutina = {};
        diasSemana.forEach((dia) => {
            rutina[dia] = [];
        });
        return rutina;
    };

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

    const parsearEjercicio = (ej) => {
        if (typeof ej === 'object' && ej !== null) {
            return { nombre: ej.nombre || '', series: '' };
        }
        const match = ej.match(/^(.*?)(\s+\d+x[\d\-]+\w*)?$/);
        const nombre = match ? match[1].trim() : ej;
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
                series: Array.from({ length: Number(ejercicio.series) || 0 }, (_, idx) => ({
                    peso: perfData[ejercicio.nombre]?.peso || ejercicio.peso || 0,
                    ritmo: perfData[ejercicio.nombre]?.ritmo || null,
                    reps: Number(ejercicio.reps) || 0
                }))
            };
        }).filter((ej) => ej.nombre && ej.series.length > 0);
    };

    const persistirRutinaPropiaLocal = async (ejercicios, completadosActuales = completados, idActual = idRutinaActual, nombreActual = nombreRutinaActual) => {
        await AsyncStorage.setItem(
            "rutina_propia",
            JSON.stringify({
                id: idActual,
                nombre: nombreActual,
                ejercicios,
                completados: completadosActuales
            })
        );
    };

    const obtenerRutinasOcultas = async () => {
        const raw = await AsyncStorage.getItem("rutinas_eliminadas");
        const ids = raw ? JSON.parse(raw) : [];
        return Array.isArray(ids) ? ids : [];
    };

    const marcarRutinaComoEliminadaLocalmente = async (rutinaId) => {
        const idsActuales = await obtenerRutinasOcultas();
        const idsNormalizados = idsActuales.map((id) => String(id));
        if (!idsNormalizados.includes(String(rutinaId))) {
            await AsyncStorage.setItem(
                "rutinas_eliminadas",
                JSON.stringify([...idsActuales, rutinaId])
            );
        }
    };

    const iniciarNuevaRutina = async () => {
        if (!usuarioCompleto?.es_premium && listaRutinas.length >= 3) {
            setModalLimitePremium(true);
            return;
        }

        const rutinaVacia = crearRutinaVacia();
        setRutinaPropia(rutinaVacia);
        setCompletados({});
        setPerfData({});
        setIdRutinaActual(null);
        setNombreRutinaActual('');
        setNombreNuevaRutina('');
        setDiaPropioActivo('Lunes');
        setEditando(true);
        setVistaActiva('propia');
        await persistirRutinaPropiaLocal(rutinaVacia, {}, null, '');
    };

    const registrarEntrenamientoCompletado = async () => {
        setErrorModal('');
        const nombreLimpio = nombreEntrenamiento.trim();
        if (!nombreLimpio) {
            setErrorModal("Ponle un nombre al entrenamiento");
            return;
        }

        const ejercicios = obtenerEjerciciosEntrenamientoActual();
        if (ejercicios.length === 0) {
            setErrorModal("No hay ejercicios para registrar hoy");
            return;
        }

        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
            setErrorModal("No se encontró la sesión del usuario");
            return;
        }

        setGuardandoEntrenamiento(true);
        try {
            const payload = {
                userId,
                rutinaId: vistaActiva === 'propia' ? idRutinaActual : (data?.id || null),
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
                setErrorModal(result.error || "No se pudo registrar el entrenamiento");
                return;
            }

            setEntrenamientoCompletado(true);
            setModalCompletarEntreno(false);
            setNombreEntrenamiento('');
            setMsgGeneral({ text: `"${nombreLimpio}" se registró correctamente.`, type: 'success' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        } catch (e) {
            setErrorModal("No se pudo conectar con el servidor");
        } finally {
            setGuardandoEntrenamiento(false);
        }
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const cargarData = async () => {
            try {
                setCargando(true);
                setData(null);
                setUsuario({ nombre: 'Usuario' });
                setRutinaPropia({});
                setCompletados({});

                let resRutina = await AsyncStorage.getItem("rutina");
                const userId = await AsyncStorage.getItem("userId");
                const userName = await AsyncStorage.getItem("userName");

                if (userName) setUsuario({ nombre: userName });
                if (!userId) {
                    router.replace('/');
                    return;
                }

                if (userId) {
                    // Cargar perfil del usuario
                    try {
                        const userRes = await fetch(`${API_URL}/usuarios/${userId}`);
                        const userData = await userRes.json();
                        if (userData.success) {
                            setUsuarioCompleto(userData.usuario);

                            if (necesitaDiagnostico(userData.usuario)) {
                                router.replace('/formulario');
                                return;
                            }
                        }
                    } catch (e) { console.warn('No se pudo cargar perfil', e); }

                    // Cargar historial (no crítico, no bloquea si falla)
                    try {
                        const histRes = await fetch(`${API_URL}/usuarios/${userId}/historial`);
                        const histData = await histRes.json();
                        if (histData.success && histData.historial) {
                            const hoyStr = new Date().toISOString().split('T')[0];
                            const dataHoy = histData.historial[hoyStr];
                            if (dataHoy && dataHoy.comidas) {
                                setMacrosHoy(calcularMacrosConsumidos(dataHoy.comidas));
                            }
                        }
                    } catch (e) { console.warn('No se pudo cargar historial', e); }

                    // Cargar rutina sugerida (crítico)
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
                            if (typeof ej === 'object' && ej !== null) {
                                return {
                                    nombre: ej.nombre || '',
                                    series: ej.series ?? 3,
                                    reps: ej.reps ?? 12
                                };
                            }
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
                        setRutinaPropia({ ...crearRutinaVacia(), ...parsedPropia.ejercicios });
                        setCompletados(parsedPropia.completados || {});
                        setIdRutinaActual(parsedPropia.id || null);
                        setNombreRutinaActual(parsedPropia.nombre || '');
                    } else {
                        setRutinaPropia({ ...crearRutinaVacia(), ...parsedPropia });
                        setIdRutinaActual(null);
                        setNombreRutinaActual('');
                    }
                } else {
                    setRutinaPropia(crearRutinaVacia());
                }

                // Cargar catálogo de ejercicios (no crítico)
                try {
                    const resCat = await fetch(`${API_URL}/ejercicios`);
                    const dataCat = await resCat.json();
                    setEjerciciosCatalogo(dataCat);
                } catch (e) { console.warn('No se pudo cargar catálogo', e); }

                await cargarRutinasGuardadas();

                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
            } catch (err) {
                console.error(err);
                setData(null);
            } finally {
                setCargando(false);
            }
        };
        cargarData();
    }, []);

    useEffect(() => {
        setEntrenamientoCompletado(false);
    }, [vistaActiva, diaActual, diaPropioActivo]);

    useEffect(() => {
        if (Platform.OS === 'web' && vistaActiva !== 'rutinas_menu') {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                    }
                });
            });
        }
    }, [vistaActiva]);

    const irAPerfil = () => router.push('/perfil');

    const cargarRutinasGuardadas = async () => {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
            setListaRutinas([]);
            return [];
        }

        try {
            const res = await fetch(`${API_URL}/usuarios/${userId}/rutinas-guardadas`);
            const rutinas = await res.json();
            const idsOcultos = await obtenerRutinasOcultas();
            const rutinasNormalizadas = (Array.isArray(rutinas) ? rutinas : []).filter(
                (rutina) => !idsOcultos.map((id) => String(id)).includes(String(rutina.id))
            );
            setListaRutinas(rutinasNormalizadas);
            return rutinasNormalizadas;
        } catch (e) {
            console.error(e);
            setListaRutinas([]);
            return [];
        }
    };

    const eliminarRutinaGuardada = async (rutina) => {
        const aplicarEliminacionLocal = async () => {
            await marcarRutinaComoEliminadaLocalmente(rutina.id);
            setListaRutinas((prev) => prev.filter((item) => item.id !== rutina.id));

            if (idRutinaActual === rutina.id) {
                const rutinaVacia = crearRutinaVacia();
                setRutinaPropia(rutinaVacia);
                setCompletados({});
                setPerfData({});
                setIdRutinaActual(null);
                setNombreRutinaActual('');
                setVistaActiva('rutinas_menu');
                await AsyncStorage.removeItem("rutina_propia");
            }
        };

        setConfirmModal({
            visible: true,
            title: 'Eliminar rutina',
            message: `¿Estás seguro de que quieres eliminar "${rutina.nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                try {
                    const userId = await AsyncStorage.getItem("userId");
                    if (!userId) { await aplicarEliminacionLocal(); return; }

                    const res = await fetch(`${API_URL}/rutinas/${rutina.id}?userId=${userId}`, { method: 'DELETE' });
                    let result = null;
                    try { result = await res.json(); } catch { result = null; }

                    await aplicarEliminacionLocal();
                } catch (e) {
                    await aplicarEliminacionLocal();
                }
            }
        });
    };

    const handleGuardarEnDB = async () => {
        const userId = await AsyncStorage.getItem("userId");
        const esquemaCompleto = {
            ejercicios: vistaActiva === 'automatica' ? rutinaEditable : rutinaPropia,
            completados: completados
        };

        try {
            let response;
            if (vistaActiva === 'automatica') {
                response = await fetch(`${API_URL}/usuarios/${userId}/rutina-sugerida`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        esquema: {
                            ...data,
                            rutina: rutinaEditable
                        }
                    })
                });

                const resData = await response.json();
                if (resData.success) {
                    setEditando(false);
                    setData(prev => ({ ...prev, rutina: rutinaEditable }));
                    await AsyncStorage.setItem("rutina", JSON.stringify({ ...data, rutina: rutinaEditable }));
                    setMsgGeneral({ text: "Cambios guardados en tu rutina sugerida", type: 'success' });
                    setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
                    return;
                }
            }

            const nombreParaGuardar = (idRutinaActual ? nombreRutinaActual : nombreNuevaRutina).trim() || 'Mi Rutina';

            if (idRutinaActual && vistaActiva === 'propia') {
                response = await fetch(`${API_URL}/rutinas/${idRutinaActual}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: nombreParaGuardar,
                        esquema: esquemaCompleto
                    })
                });
            } else {
                if (!nombreNuevaRutina.trim() && vistaActiva !== 'automatica') {
                    setModalGuardar(true);
                    return;
                }
                response = await fetch(`${API_URL}/rutinas/guardar-personalizada`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        nombreRutina: nombreParaGuardar,
                        esquema: esquemaCompleto
                    })
                });
            }

            const resData = await response.json();
            if (resData.success) {
                setMsgGeneral({ text: "Rutina guardada correctamente", type: 'success' });
                setIdRutinaActual(resData.rutina?.id || idRutinaActual);
                setNombreRutinaActual(resData.rutina?.nombre || nombreParaGuardar);
                setModalGuardar(false);
                setEditando(false);
                setNombreNuevaRutina('');
                await persistirRutinaPropiaLocal(rutinaPropia, completados, resData.rutina?.id || idRutinaActual, resData.rutina?.nombre || nombreParaGuardar);
                await cargarRutinasGuardadas();
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
            }
        } catch (e) { setMsgGeneral({ text: "No se pudo guardar", type: 'error' }); }
    };

    const abrirElegirRutina = async () => {
        await cargarRutinasGuardadas();
        setModalElegir(true);
    };

    const cargarRutinaSeleccionada = (rutina) => {
        const esquema = JSON.parse(rutina.descripcion);
        const ejercicios = { ...crearRutinaVacia(), ...(esquema.ejercicios || esquema) };
        setRutinaPropia(ejercicios);
        setCompletados(esquema.completados || {});
        setPerfData({});
        setIdRutinaActual(rutina.id);
        setNombreRutinaActual(rutina.nombre);
        persistirRutinaPropiaLocal(ejercicios, esquema.completados || {}, rutina.id, rutina.nombre);
        setModalElegir(false);
        setMsgGeneral({ text: `Cargando rutina: ${rutina.nombre}...`, type: 'success' });
        setTimeout(() => setMsgGeneral({ text: '', type: '' }), 3000);
    };

    const abrirRutinaGuardada = (rutina) => {
        if (Platform.OS === 'web' && document.activeElement) document.activeElement.blur();
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
        const isCardio = esCardio(ej.nombre);
        const ajustes = ajustesCatalog[ej.nombre] || (isCardio ? { series: '1', reps: '20' } : { series: '3', reps: '12' });
        const objEj = {
            nombre: ej.nombre,
            series: parseInt(ajustes.series) || (isCardio ? 1 : 3),
            reps: parseInt(ajustes.reps) || (isCardio ? 20 : 12),
            peso: 0,
            notas: ''
        };

        if (vistaActiva === 'automatica') {
            const nueva = { ...rutinaEditable };
            if (!nueva[diaActual]) nueva[diaActual] = [];
            nueva[diaActual].push(objEj);
            setRutinaEditable(nueva);
            setModalEjercicios(false);
            return;
        }

        const dia = diaPropioActivo;
        const listaActual = rutinaPropia[dia] || [];
        if (listaActual.length >= 20) {
            setErrorModal("Límite alcanzado: Una rutina no puede tener más de 20 ejercicios.");
            return;
        }

        const nueva = { ...rutinaPropia };
        if (!nueva[diaPropioActivo]) nueva[diaPropioActivo] = [];
        nueva[diaPropioActivo].push(objEj);
        setRutinaPropia(nueva);
        persistirRutinaPropiaLocal(nueva);
        setModalEjercicios(false);

        setMsgGeneral({ text: `"${ej.nombre}" añadido a ${diaPropioActivo}.`, type: 'success' });
        setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
    };

    const cerrarModalEjercicioPersonalizado = () => {
        setModalEjercicioPersonalizado(false);
        setEjercicioPersonalizado({
            nombre: '',
            series: '3',
            reps: '12'
        });
    };

    const handleAñadirEjercicioPersonalizado = () => {
        setErrorModal('');
        const nombre = ejercicioPersonalizado.nombre.trim();
        const series = parseInt(ejercicioPersonalizado.series, 10) || 0;
        const reps = parseInt(ejercicioPersonalizado.reps, 10) || 0;

        if (!nombre) {
            setErrorModal("Introduce un nombre para el ejercicio.");
            return;
        }

        if (series <= 0 || (reps <= 0 && !esCardio(nombre))) {
            setErrorModal("Las series y repeticiones deben ser mayores que 0.");
            return;
        }

        // 1. ELIMINAMOS EL BLOQUEO POR DUPLICADO EN EL DÍA
        // 2. COMPROBAMOS SI EXISTE EN EL CATÁLOGO
        const existeEnCatalogo = ejerciciosCatalogo.find(
            (e) => e.nombre.toLowerCase() === nombre.toLowerCase()
        );

        const nuevoEj = {
            nombre: existeEnCatalogo ? existeEnCatalogo.nombre : nombre,
            series,
            reps,
            peso: 0
        };

        const nueva = { ...rutinaPropia };
        if (!nueva[diaPropioActivo]) nueva[diaPropioActivo] = [];
        nueva[diaPropioActivo].push(nuevoEj);

        setRutinaPropia(nueva);
        persistirRutinaPropiaLocal(nueva);
        cerrarModalEjercicioPersonalizado();
        setModalEjercicios(false);

        // Retraso para que el mensaje aparezca cuando los modales se hayan cerrado
        setTimeout(() => {
            if (existeEnCatalogo) {
                setMsgGeneral({ 
                    text: `"${existeEnCatalogo.nombre}" ya existe en el catálogo. ¡Lo hemos añadido por ti!`, 
                    type: 'success' 
                });
            } else {
                setMsgGeneral({ text: `"${nombre}" añadido a tu rutina.`, type: 'success' });
            }
        }, 150);
        
        setTimeout(() => setMsgGeneral({ text: '', type: '' }), 6000);
    };

    const eliminarEjercicio = (index) => {
        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = nueva[diaPropioActivo].filter((_, i) => i !== index);
        setRutinaPropia(nueva);
        persistirRutinaPropiaLocal(nueva);
    };
    const eliminarEjAuto = (index) => {
        const nueva = { ...rutinaEditable };
        nueva[diaActual] = nueva[diaActual].filter((_, i) => i !== index);
        setRutinaEditable(nueva);
    };

    const actualizarEjAuto = (index, campo, valor) => {
        const nueva = { ...rutinaEditable };

        nueva[diaActual][index][campo] = Number(valor);

        setRutinaEditable(nueva);
    };
    // Para modificar las series y repeticiones
    const actualizarEjercicio = (index, campo, valor) => {
        const nueva = { ...rutinaPropia };

        nueva[diaPropioActivo][index][campo] = campo === 'notas' ? valor : Number(valor);

        setRutinaPropia(nueva);

        persistirRutinaPropiaLocal(nueva);
    };

    const actualizarPesoRutinaPropia = (nombre, valor) => {
        setPerfData((prev) => ({
            ...prev,
            [nombre]: {
                ...(prev[nombre] || {}),
                peso: valor
            }
        }));

        const nueva = { ...rutinaPropia };
        nueva[diaPropioActivo] = (nueva[diaPropioActivo] || []).map((ej) => {
            if (typeof ej === 'string') return ej;
            if (ej.nombre !== nombre) return ej;
            return {
                ...ej,
                peso: Number(valor || 0)
            };
        });

        setRutinaPropia(nueva);
        persistirRutinaPropiaLocal(nueva);
    };

    const cargarComunidad = async () => {
        setCargandoComunidad(true);
        try {
            const res = await fetch(`${API_URL}/publicaciones`);
            const dataPub = await res.json();
            if (dataPub.success) {
                setPublicacionesFeed(Array.isArray(dataPub.publicaciones) ? dataPub.publicaciones : []);
            }
        } catch (e) {
            setMsgGeneral({ text: "No se pudo cargar la comunidad", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        } finally {
            setCargandoComunidad(false);
        }
    };

    const seleccionarImagenComunidad = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setMsgGeneral({ text: "Hace falta permiso para acceder a la galer\u00eda", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.6,
            base64: true
        });

        if (!result.canceled) {
            setPostForm((prev) => ({
                ...prev,
                imagen: `data:image/jpeg;base64,${result.assets[0].base64}`
            }));
        }
    };

    const publicarEnComunidad = async () => {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
            setMsgGeneral({ text: "No se encontró la sesión", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
            return;
        }

        if (!postForm.nombre.trim()) {
            setMsgGeneral({ text: "Ponle un nombre a la publicación", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
            return;
        }

        setPublicandoComunidad(true);
        try {
            const res = await fetch(`${API_URL}/publicaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    nombre: postForm.nombre,
                    descripcion: postForm.descripcion,
                    imagen: postForm.imagen
                })
            });
            const result = await res.json();

            if (!res.ok || !result.success) {
                setMsgGeneral({ text: result.error || "No se pudo publicar", type: 'error' });
                setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
                return;
            }

            setPostForm({ nombre: '', descripcion: '', imagen: '' });
            setPublicacionesFeed((prev) => [result.publicacion, ...prev]);
            setMsgGeneral({ text: "Publicación creada", type: 'success' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        } catch (e) {
            setMsgGeneral({ text: "No se pudo conectar con la comunidad", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        } finally {
            setPublicandoComunidad(false);
        }
    };

    const eliminarPublicacionComunidad = async (postId) => {
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) return;

        setConfirmModal({
            visible: true,
            title: 'Eliminar publicación',
            message: 'Esta acción quitará la publicación de la comunidad.',
            onConfirm: async () => {
                try {
                    const resp = await fetch(`${API_URL}/publicaciones/${postId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId })
                    });
                    const dataResp = await resp.json();
                    if (!resp.ok || !dataResp.success) {
                        setMsgGeneral({ text: dataResp.error || "No se pudo eliminar", type: 'error' });
                    } else {
                        setPublicacionesFeed((prev) => prev.filter((post) => Number(post.id) !== Number(postId)));
                        setMsgGeneral({ text: "Publicación eliminada", type: 'success' });
                    }
                } catch (e) {
                    setMsgGeneral({ text: "No se pudo eliminar la publicación", type: 'error' });
                } finally {
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                    setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
                }
            }
        });
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
            if (res.ok) {
                setMsgGeneral({ text: "¡Comida Guardada! Se ha añadido al registro de hoy.", type: 'success' });
            } else {
                setMsgGeneral({ text: "Asegúrate de tener alimentos en la base de datos.", type: 'error' });
            }
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        } catch (e) { 
            setMsgGeneral({ text: "No se pudo conectar", type: 'error' });
            setTimeout(() => setMsgGeneral({ text: '', type: '' }), 4000);
        }
    };


    if (cargando || !data) return <View style={styles.loading}><Text style={{color:'white'}}>Cargando...</Text></View>;

    return (
        <View style={{ flex: 1 }}>
            <MainHeader />
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* MODAL CONFIRMACIÓN ELIMINAR RUTINA */}
            <Modal transparent={true} visible={confirmModal.visible} animationType="fade">
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
                        <Text style={styles.confirmMsg}>{confirmModal.message}</Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity style={styles.confirmBtnCancel} onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}>
                                <Text style={styles.confirmBtnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtnDelete} onPress={confirmModal.onConfirm}>
                                <Text style={styles.confirmBtnDeleteText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>



            {/* --- CARD PRINCIPAL --- */}
            <View style={styles.mainCard}>
                {vistaActiva === 'rutinas_menu' && (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        <View style={styles.header}>
                            <View style={styles.headerRow}>
                                <View>
                                    <Text style={styles.methodLabel}>GESTIÓN DE ENTRENAMIENTO</Text>
                                    <Text style={styles.title}>Mis Rutinas</Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.createRoutineButton,
                                        (!usuarioCompleto?.es_premium && listaRutinas.length >= 3) && styles.createRoutineButtonDisabled
                                    ]}
                                    onPress={iniciarNuevaRutina}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.createRoutineButtonText}>+ Crear rutina</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <LaserRoutineCard contentStyle={styles.menuCard} onPress={() => {
                            if (Platform.OS === 'web' && document.activeElement) document.activeElement.blur();
                            setVistaActiva('automatica');
                        }}>
                            <Text style={styles.menuCardTitle}>Mi rutina sugerida</Text>
                            <Text style={styles.menuCardSub}>Rutina inteligente creada en tu registro</Text>
                        </LaserRoutineCard>
                        {listaRutinas.length > 0 && (
                            <View style={styles.savedRoutinesSection}>
                                <Text style={styles.savedRoutinesTitle}>Rutinas creadas por ti</Text>
                                {listaRutinas.map((rutina) => {
                                    const resumen = obtenerResumenRutinaGuardada(rutina);
                                    return (
                                        <View key={rutina.id || rutina.nombre} style={styles.savedRoutineCardShell}>
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                style={styles.savedRoutineCard}
                                                onPress={() => abrirRutinaGuardada(rutina)}
                                            >
                                                <Text style={styles.savedRoutineName}>{rutina.nombre}</Text>
                                                <Text style={styles.savedRoutineMeta}>
                                                    {resumen.diasActivos} días • {resumen.totalEjercicios} ejercicios
                                                </Text>
                                                <Text style={styles.savedRoutineHint}>Toca para abrirla o editarla</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.savedRoutineDeleteX}
                                                onPress={() => eliminarRutinaGuardada(rutina)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Text style={styles.savedRoutineDeleteXText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                )}

                {vistaActiva === 'automatica' && (
                    <>
                        <View style={styles.headerWithButton}>
                            <View style={{ flex: 1 }}>
                                <TouchableOpacity onPress={() => setVistaActiva('rutinas_menu')}>
                                    <Text style={styles.backToMenuText}>← Volver al menú</Text>
                                </TouchableOpacity>
                                <Text style={styles.methodLabel}>MÉTODO INTELIGENTE</Text>
                                <Text style={styles.title}>{data.metodo}</Text>
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.btnSmall, editando && { backgroundColor: '#2ecc71', borderColor: '#2ecc71' }]}
                                    onPress={editando ? handleGuardarEnDB : () => setEditando(true)}
                                >
                                    <Text style={styles.btnSmallText}>{editando ? 'GUARDAR' : 'EDITAR'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.tabsWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {Object.keys(data.rutina).map(dia => {
                                    const diaNumStr = dia.split(' (')[0];
                                    const index = parseInt(diaNumStr.replace('Día ', '')) - 1;
                                    const totalDias = Object.keys(data.rutina).length;

                                    const esquemas = {
                                        2: ['Martes', 'Jueves'],
                                        3: ['Lunes', 'Miércoles', 'Viernes'],
                                        4: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
                                        5: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
                                    };
                                    const esquema = esquemas[totalDias] || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                    const nombreDia = esquema[index] || diaNumStr;

                                    return (
                                        <TouchableOpacity key={dia} style={[styles.tab, diaActual === dia && styles.tabActive]} onPress={() => setDiaActual(dia)}>
                                            <Text style={[styles.tabText, diaActual === dia && styles.textOrange]}>{nombreDia}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                            <View style={styles.imageContainer}>
                                <Image source={obtenerImagenMusculo(diaActual)} style={styles.muscleImage} resizeMode="cover" />
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.overlayDia}>
                                        {(() => {
                                            const diaNumStr = diaActual.split(' (')[0];
                                            const index = parseInt(diaNumStr.replace('Día ', '')) - 1;
                                            const totalDias = Object.keys(data.rutina).length;
                                            const esquemas = { 2: ['Martes', 'Jueves'], 3: ['Lunes', 'Miércoles', 'Viernes'], 4: ['Lunes', 'Martes', 'Jueves', 'Viernes'], 5: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] };
                                            const esquema = esquemas[totalDias] || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                            const nombreDia = esquema[index] || diaNumStr;
                                            return diaActual.replace(diaNumStr, nombreDia);
                                        })()}
                                    </Text>
                                    <Text style={styles.overlayCount}>{data.rutina[diaActual]?.length || 0} ejercicios</Text>
                                </View>
                            </View>

                            {rutinaEditable[diaActual]?.map((ej, i) => {
                                const nombre = ej.nombre;
                                const estaCompletado = completados[nombre];
                                const isCardio = esCardio(nombre);
                                const infoCat = ejerciciosCatalogo.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
                                const categoria = infoCat?.categoria || 'Fuerza';

                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.exerciseCard,
                                            estaCompletado && styles.exerciseCardCompleted
                                        ]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "✓" : ""}
                                            </Text>

                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center' }}>
                                                {editando ? (
                                                    <>
                                                        {!isCardio && (
                                                            <TextInput
                                                                style={styles.inputSeriesSmall}
                                                                keyboardType="numeric"
                                                                value={String(ej.series)}
                                                                onChangeText={(text) => actualizarEjAuto(i, 'series', text)}
                                                            />
                                                        )}
                                                        {!isCardio && <Text style={styles.labelSmall}>series</Text>}
                                                        <TextInput
                                                            style={styles.inputSeriesSmall}
                                                            keyboardType="numeric"
                                                            value={String(ej.reps)}
                                                            onChangeText={(text) => actualizarEjAuto(i, 'reps', text)}
                                                        />
                                                        <Text style={styles.labelSmall}>{isCardio ? 'minutos' : 'reps'}</Text>
                                                    </>
                                                ) : (
                                                    <Text style={styles.seriesTextStatic}>
                                                        {isCardio ? `${ej.reps} minutos` : `${ej.series} series x ${ej.reps} repeticiones`}
                                                    </Text>
                                                )}
                                            </View>

                                            {!editando && !estaCompletado && !isCardio && (
                                                <View style={styles.performanceSection}>
                                                    {categoria === 'Cardio' ? (
                                                        <View style={styles.perfRow}>
                                                            <Text style={styles.perfLabel}>Ritmo:</Text>
                                                            <TextInput
                                                                style={styles.perfInput}
                                                                placeholder="min/km"
                                                                keyboardType="numeric"
                                                                value={perfData[nombre]?.ritmo || ""}
                                                                onChangeText={(text) => setPerfData(prev => ({...prev, [nombre]: {...(prev[nombre] || {}), ritmo: text}}))}
                                                            />
                                                        </View>
                                                    ) : categoria === 'Fuerza' ? (
                                                        <View style={styles.perfRow}>
                                                            <Text style={styles.perfLabel}>Peso:</Text>
                                                            <TextInput
                                                                style={styles.perfInput}
                                                                placeholder="kg"
                                                                keyboardType="numeric"
                                                                value={perfData[nombre]?.peso || ""}
                                                                onChangeText={(text) => setPerfData(prev => ({...prev, [nombre]: {...(prev[nombre] || {}), peso: text}}))}
                                                            />
                                                        </View>
                                                    ) : null}
                                                </View>
                                            )}
                                            {editando && (
                                                <TouchableOpacity onPress={() => eliminarEjAuto(i)} style={[styles.btnDelete, { alignSelf: 'flex-end', marginTop: 5, padding: 5 }]}>
                                                    <Text style={[styles.deleteIcon, { fontSize: 12 }]}>✕ Eliminar</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                            {editando && (
                                <TouchableOpacity style={[styles.btnAdd, { marginTop: 10 }]} onPress={() => setModalEjercicios(true)}>
                                    <Text style={styles.btnAddText}>+ AÑADIR EJERCICIO</Text>
                                </TouchableOpacity>
                            )}
                            {!editando && (
                                <View style={styles.routineFooterActions}>
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
                                </View>
                            )}
                        </ScrollView>
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
                                <TouchableOpacity
                                    style={[styles.btnSmall, editando && { backgroundColor: '#2ecc71', borderColor: '#2ecc71' }]}
                                    onPress={editando ? handleGuardarEnDB : () => setEditando(true)}
                                >
                                    <Text style={styles.btnSmallText}>{editando ? 'GUARDAR' : 'EDITAR'}</Text>
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
                                const isCardio = esCardio(nombre);
                                const infoCat = ejerciciosCatalogo.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
                                const categoria = infoCat?.categoria || 'Fuerza';

                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.exerciseCard,
                                            estaCompletado && styles.exerciseCardCompleted
                                        ]}
                                    >
                                        <Image source={obtenerFotoEjercicio(nombre)} style={styles.exercisePhoto} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={[styles.exerciseName, estaCompletado && styles.textCompleted]}>
                                                {nombre} {estaCompletado ? "✓" : ""}
                                            </Text>

                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center' }}>
                                                {editando ? (
                                                    <>
                                                        {!isCardio && (
                                                            <TextInput
                                                                style={styles.inputSeriesSmall}
                                                                keyboardType="numeric"
                                                                value={String(ejercicio.series)}
                                                                onChangeText={(text) => actualizarEjercicio(i, 'series', text)}
                                                            />
                                                        )}
                                                        {!isCardio && <Text style={styles.labelSmall}>series</Text>}
                                                        <TextInput
                                                            style={styles.inputSeriesSmall}
                                                            keyboardType="numeric"
                                                            value={String(ejercicio.reps)}
                                                            onChangeText={(text) => actualizarEjercicio(i, 'reps', text)}
                                                        />
                                                        <Text style={styles.labelSmall}>{isCardio ? 'minutos' : 'reps'}</Text>
                                                    </>
                                                ) : (
                                                    <Text style={styles.seriesTextStatic}>
                                                        {isCardio 
                                                            ? `${ejercicio.reps} minutos`
                                                            : `${ejercicio.series} series x ${ejercicio.reps} repeticiones${ejercicio.peso > 0 ? ` • ${ejercicio.peso} kg` : ''}`}
                                                    </Text>
                                                )}
                                            </View>

                                            {!editando && !estaCompletado && !isCardio && (
                                                <View style={styles.performanceSection}>
                                                    {categoria === 'Cardio' ? (
                                                        <View style={styles.perfRow}>
                                                            <Text style={styles.perfLabel}>Ritmo:</Text>
                                                            <TextInput
                                                                style={styles.perfInput}
                                                                placeholder="min/km"
                                                                keyboardType="numeric"
                                                                value={perfData[nombre]?.ritmo || ""}
                                                                onChangeText={(text) => setPerfData(prev => ({...prev, [nombre]: {...(prev[nombre] || {}), ritmo: text}}))}
                                                            />
                                                        </View>
                                                    ) : categoria === 'Fuerza' ? (
                                                        <View style={styles.perfRow}>
                                                            <Text style={styles.perfLabel}>Peso:</Text>
                                                            <TextInput
                                                                style={styles.perfInput}
                                                                placeholder="kg"
                                                                keyboardType="numeric"
                                                                value={perfData[nombre]?.peso ?? (ejercicio.peso > 0 ? String(ejercicio.peso) : "")}
                                                                onChangeText={(text) => actualizarPesoRutinaPropia(nombre, text)}
                                                            />
                                                        </View>
                                                    ) : null}
                                                </View>
                                            )}

                                            {editando && (
                                                <View style={{ gap: 5, marginTop: 10, width: '100%' }}>
                                                    <TextInput
                                                        style={{ backgroundColor: '#f9f9f9', width: '100%', minHeight: 35, textAlign: 'left', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, borderWidth: 1, borderColor: '#eee', color: '#555' }}
                                                        placeholder="Añadir notas/observaciones (opcional)"
                                                        placeholderTextColor="#aaa"
                                                        value={ejercicio.notas || ""}
                                                        onChangeText={(text) => actualizarEjercicio(i, 'notas', text)}
                                                    />
                                                    <TouchableOpacity onPress={() => eliminarEjercicio(i)} style={[styles.btnDelete, { alignSelf: 'flex-end', marginTop: 5, padding: 5 }]}><Text style={[styles.deleteIcon, { fontSize: 12 }]}>✕ Eliminar</Text></TouchableOpacity>
                                                </View>
                                            )}
                                            {!editando && ejercicio.notas ? (
                                                <Text style={{ color: '#bdc3c7', fontSize: 12, marginTop: 10, fontStyle: 'italic', width: '100%' }}>Notas: {ejercicio.notas}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                            {editando && (
                                <TouchableOpacity style={styles.btnAdd} onPress={() => setModalEjercicios(true)}>
                                    <Text style={styles.btnAddText}>+ AÑADIR EJERCICIO</Text>
                                </TouchableOpacity>
                            )}
                            {!editando && (
                                <View style={{ marginTop: 20 }}>
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
                                </View>
                            )}
                        </ScrollView>
                    </>
                )}

                {vistaActiva === 'comunidad' && (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.methodLabel}>RED SOCIAL</Text>
                                <Text style={styles.title}>Comunidad</Text>
                            </View>
                            <TouchableOpacity style={styles.createRoutineButton} onPress={cargarComunidad} activeOpacity={0.85}>
                                <Text style={styles.createRoutineButtonText}>Actualizar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.communityComposer}>
                            <Text style={styles.communitySectionTitle}>Crear publicación</Text>
                            <TextInput
                                style={styles.communityInput}
                                placeholder="Nombre de la publicación"
                                placeholderTextColor="#999"
                                value={postForm.nombre}
                                onChangeText={(text) => setPostForm((prev) => ({ ...prev, nombre: text }))}
                            />
                            <TextInput
                                style={[styles.communityInput, styles.communityTextarea]}
                                placeholder="Descripción"
                                placeholderTextColor="#999"
                                multiline
                                value={postForm.descripcion}
                                onChangeText={(text) => setPostForm((prev) => ({ ...prev, descripcion: text }))}
                            />
                            {postForm.imagen ? (
                                <Image source={{ uri: postForm.imagen }} style={styles.communityPreviewImage} />
                            ) : null}
                            <View style={styles.communityComposerActions}>
                                <TouchableOpacity style={styles.communityGhostButton} onPress={seleccionarImagenComunidad}>
                                    <Text style={styles.communityGhostButtonText}>{postForm.imagen ? 'Cambiar imagen' : 'Añadir imagen'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.communityPrimaryButton, publicandoComunidad && styles.communityPrimaryButtonDisabled]}
                                    onPress={publicarEnComunidad}
                                    disabled={publicandoComunidad}
                                >
                                    <Text style={styles.communityPrimaryButtonText}>{publicandoComunidad ? 'Publicando...' : 'Publicar'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.communitySection}>
                            <Text style={styles.communitySectionTitle}>Tus publicaciones</Text>
                            {publicacionesFeed.filter((post) => Number(post.usuario_id) === Number(usuarioCompleto?.id)).length === 0 ? (
                                <Text style={styles.communityEmptyText}>Todavía no has publicado nada.</Text>
                            ) : (
                                publicacionesFeed
                                    .filter((post) => Number(post.usuario_id) === Number(usuarioCompleto?.id))
                                    .map((post) => (
                                        <View key={`mine-${post.id}`} style={styles.communityPostCard}>
                                            <View style={styles.communityPostHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.communityPostTitle}>{post.titulo}</Text>
                                                    <Text style={styles.communityPostMeta}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => eliminarPublicacionComunidad(post.id)}>
                                                    <Text style={styles.communityDeleteText}>Eliminar</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {post.descripcion ? <Text style={styles.communityPostDescription}>{post.descripcion}</Text> : null}
                                            {post.imagenes?.[0]?.url ? (
                                                <Image source={{ uri: post.imagenes[0].url }} style={styles.communityPostImage} />
                                            ) : null}
                                        </View>
                                    ))
                            )}
                        </View>

                        <View style={styles.communitySection}>
                            <Text style={styles.communitySectionTitle}>Publicaciones de la comunidad</Text>
                            {cargandoComunidad ? (
                                <Text style={styles.communityEmptyText}>Cargando publicaciones...</Text>
                            ) : publicacionesFeed.length === 0 ? (
                                <Text style={styles.communityEmptyText}>Todavía no hay publicaciones.</Text>
                            ) : (
                                publicacionesFeed.map((post) => (
                                    <View key={`feed-${post.id}`} style={styles.communityPostCard}>
                                        <View style={styles.communityAuthorRow}>
                                            {post.autor_foto ? (
                                                <Image source={{ uri: post.autor_foto }} style={styles.communityAvatar} />
                                            ) : (
                                                <View style={styles.communityAvatarFallback}>
                                                    <Text style={styles.communityAvatarFallbackText}>
                                                        {(post.autor_nombre || 'U').charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.communityAuthorName}>{post.autor_nombre || 'Usuario'}</Text>
                                                <Text style={styles.communityPostMeta}>{new Date(post.fecha_publicacion).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.communityPostTitle}>{post.titulo}</Text>
                                        {post.descripcion ? <Text style={styles.communityPostDescription}>{post.descripcion}</Text> : null}
                                        {post.imagenes?.[0]?.url ? (
                                            <Image source={{ uri: post.imagenes[0].url }} style={styles.communityPostImage} />
                                        ) : null}
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
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
                        {errorModal ? (
                            <Text style={{ color: '#ff4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
                                {errorModal}
                            </Text>
                        ) : null}
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
                        {errorModal ? (
                            <Text style={{ color: '#ff4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
                                {errorModal}
                            </Text>
                        ) : null}
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
                    {msgGeneral.text ? (
                        <View style={[styles.msgBanner, msgGeneral.type === 'error' ? styles.msgError : styles.msgSuccess, { marginHorizontal: 20, marginTop: 10, zIndex: 9999 }]}>
                            <Text style={styles.msgText}>{msgGeneral.text}</Text>
                        </View>
                    ) : null}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Añadir a {diaPropioActivo}</Text>
                        <TouchableOpacity onPress={() => setModalEjercicios(false)}><Text style={styles.closeModal}>Cerrar</Text></TouchableOpacity>
                    </View>
                    <TextInput placeholder="Buscar..." style={styles.searchInput} value={busqueda} onChangeText={setBusqueda} />
                    <View style={styles.customExerciseActions}>
                        <TouchableOpacity
                            style={styles.customExerciseButton}
                            onPress={() => {
                                setModalEjercicios(false);
                                setModalEjercicioPersonalizado(true);
                            }}
                        >
                            <Text style={styles.customExerciseButtonText}>+ Crear ejercicio personalizado</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{padding: 20}}>
                        {ejerciciosCatalogo.filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((ej, i) => {
                            const isCardio = esCardio(ej.nombre);
                            const ajustes = ajustesCatalog[ej.nombre] || (isCardio ? { series: 1, reps: 20 } : { series: 3, reps: 12 });

                            return (
                                <View key={i} style={[styles.catItem, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <Image source={obtenerFotoEjercicio(ej.nombre)} style={styles.catImage} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.catName}>{ej.nombre}</Text>
                                                <Text style={styles.catSub}>{ej.grupo_muscular}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            style={{ padding: 10 }}
                                            onPress={() => añadirEjercicio(ej)}
                                        >
                                            <Text style={{ color: '#ff7a00', fontSize: 28, fontWeight: 'bold' }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 65 }}>
                                        {isCardio ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <TextInput
                                                    style={[styles.inputSeriesSmall, { backgroundColor: '#f0f0f0', width: 60 }]}
                                                    keyboardType="numeric"
                                                    value={String(ajustes.reps)}
                                                    onChangeText={(t) => setAjustesCatalog(prev => ({ ...prev, [ej.nombre]: { ...ajustes, reps: t } }))}
                                                />
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ff7a00' }}>minutos (cardio)</Text>
                                            </View>
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                <TextInput
                                                    style={[styles.inputSeriesSmall, { backgroundColor: '#f0f0f0' }]}
                                                    keyboardType="numeric"
                                                    value={String(ajustes.series)}
                                                    onChangeText={(t) => setAjustesCatalog(prev => ({ ...prev, [ej.nombre]: { ...ajustes, series: t } }))}
                                                />
                                                <Text style={{ fontSize: 11, color: '#999' }}>ser.</Text>
                                                <TextInput
                                                    style={[styles.inputSeriesSmall, { backgroundColor: '#f0f0f0' }]}
                                                    keyboardType="numeric"
                                                    value={String(ajustes.reps)}
                                                    onChangeText={(t) => setAjustesCatalog(prev => ({ ...prev, [ej.nombre]: { ...ajustes, reps: t } }))}
                                                />
                                                <Text style={{ fontSize: 11, color: '#999' }}>rep.</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={modalEjercicioPersonalizado} transparent animationType="fade">
                <View style={styles.fullOverlay}>
                    <View style={styles.modalSmall}>
                        <Text style={styles.modalSub}>Crear ejercicio personalizado</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Nombre del ejercicio"
                            value={ejercicioPersonalizado.nombre}
                            onChangeText={(text) => setEjercicioPersonalizado((prev) => ({ ...prev, nombre: text }))}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                {esCardio(ejercicioPersonalizado.nombre) ? (
                                    <>
                                        <Text style={styles.smallLabel}>Tiempo (minutos)</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Ej: 30"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            value={ejercicioPersonalizado.reps}
                                            onChangeText={(t) => setEjercicioPersonalizado({ ...ejercicioPersonalizado, reps: t, series: '1' })}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.smallLabel}>Series</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="3"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            value={ejercicioPersonalizado.series}
                                            onChangeText={(t) => setEjercicioPersonalizado({ ...ejercicioPersonalizado, series: t })}
                                        />
                                    </>
                                )}
                            </View>
                            {!esCardio(ejercicioPersonalizado.nombre) && (
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.smallLabel}>Repeticiones</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="12"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                        value={ejercicioPersonalizado.reps}
                                        onChangeText={(t) => setEjercicioPersonalizado({ ...ejercicioPersonalizado, reps: t })}
                                    />
                                </View>
                            )}
                        </View>
                        {esCardio(ejercicioPersonalizado.nombre) && (
                            <Text style={{ fontSize: 11, color: '#ff7a00', fontWeight: 'bold', marginTop: -5, marginBottom: 10 }}>
                                Se guardará como tiempo en minutos.
                            </Text>
                        )}
                        {errorModal ? (
                            <Text style={{ color: '#ff4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
                                {errorModal}
                            </Text>
                        ) : null}
                        <TouchableOpacity style={styles.btnConfirm} onPress={handleAñadirEjercicioPersonalizado}>
                            <Text style={styles.btnConfirmText}>GUARDAR EJERCICIO</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cerrarModalEjercicioPersonalizado}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* NAV BAR */}
            <View style={styles.navContainer} onFocus={(e) => { if (Platform.OS === 'web') e.target?.blur?.(); }}>
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabBarItem} focusable={false} onFocus={(e) => { if (Platform.OS === 'web') e.target?.blur?.(); }} onPress={() => setVistaActiva('rutinas_menu')}>
                        <Text style={[styles.tabBarText, ['rutinas_menu', 'automatica', 'propia'].includes(vistaActiva) && styles.tabBarTextActive]}>MIS RUTINAS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} focusable={false} onFocus={(e) => { if (Platform.OS === 'web') e.target?.blur?.(); }} onPress={() => router.push('/dieta')}>
                        <Text style={styles.tabBarText}>MI DIETA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem} focusable={false} onFocus={(e) => { if (Platform.OS === 'web') e.target?.blur?.(); }} onPress={() => router.push('/redsocial')}>
                        <Text style={styles.tabBarText}>COMUNIDAD</Text>
                    </TouchableOpacity>
                </View>
            </View>

            </Animated.View>

            {msgGeneral.text ? (
                <View style={[styles.msgBanner, msgGeneral.type === 'error' ? styles.msgError : styles.msgSuccess]}>
                    <Text style={styles.msgText}>{msgGeneral.text}</Text>
                </View>
            ) : null}

            {/* MODAL LÍMITE PREMIUM (HU-55) */}
            <Modal
                visible={modalLimitePremium}
                transparent
                animationType="fade"
                onRequestClose={() => setModalLimitePremium(false)}
            >
                <View style={styles.premiumModalOverlay}>
                    <View style={styles.premiumModalBox}>
                        <Text style={styles.premiumModalIcon}>👑</Text>
                        <Text style={styles.premiumModalTitle}>Límite de rutinas alcanzado</Text>
                        <Text style={styles.premiumModalMsg}>
                            Las cuentas gratuitas pueden guardar hasta <Text style={{ fontWeight: 'bold', color: '#ff7a00' }}>3 rutinas</Text>.{'\n\n'}Actualiza a Premium para crear rutinas ilimitadas y mucho más.
                        </Text>
                        <TouchableOpacity
                            style={styles.premiumModalBtnPrimary}
                            onPress={() => { setModalLimitePremium(false); router.push('/premium'); }}
                        >
                            <Text style={styles.premiumModalBtnPrimaryText}>Mejorar a Premium</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.premiumModalBtnSecondary}
                            onPress={() => setModalLimitePremium(false)}
                        >
                            <Text style={styles.premiumModalBtnSecondaryText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },

    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { marginBottom: 15, position: 'relative' },
    headerWithButton: { marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    createRoutineButton: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    createRoutineButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    createRoutineButtonDisabled: {
        opacity: 0.4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderStyle: 'dashed',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    actionButtons: { flexDirection: 'row', gap: 8 },
    btnSmall: { backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'white' },
    btnSmallText: { color: 'white', fontSize: 10, fontWeight: '900' },

    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { color: 'white', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

    tabsWrapper: { marginBottom: 20, marginHorizontal: -18 },
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
    customExerciseActions: { paddingHorizontal: 15, paddingBottom: 5 },
    customExerciseButton: { backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
    customExerciseButtonText: { color: 'white', fontWeight: '900', fontSize: 12 },
    customExerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    customExerciseInput: { width: '48%', marginBottom: 0, textAlign: 'center' },
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
    savedRoutineCardShell: {
        position: 'relative'
    },
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
    savedRoutineDeleteX: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,68,68,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    savedRoutineDeleteXText: {
        color: '#ff4444',
        fontSize: 14,
        fontWeight: '900',
        lineHeight: 18,
    },
    msgBanner: { position: 'absolute', top: 60, left: 20, right: 20, padding: 15, borderRadius: 12, alignItems: 'center', elevation: 100, zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6 },
    msgError: { backgroundColor: '#e74c3c', borderWidth: 1, borderColor: '#c0392b' },
    msgSuccess: { backgroundColor: '#2ecc71', borderWidth: 1, borderColor: '#27ae60' },
    msgText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },

    // MODAL CONFIRMACIÓN
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    confirmCard: { backgroundColor: 'white', width: '82%', padding: 25, borderRadius: 20, elevation: 12 },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    confirmMsg: { fontSize: 14, color: '#666', marginBottom: 25, lineHeight: 20 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    confirmBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#f0f0f0' },
    confirmBtnCancelText: { color: '#666', fontWeight: 'bold' },
    confirmBtnDelete: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#ff4444' },
    confirmBtnDeleteText: { color: 'white', fontWeight: 'bold' },
    savedRoutineName: { color: '#b44f00', fontSize: 16, fontWeight: '900', marginBottom: 6, letterSpacing: 0.3 },
    savedRoutineMeta: { color: '#7a583e', fontSize: 12, fontWeight: '800', marginBottom: 6 },
    savedRoutineHint: { color: '#7a583e', fontSize: 11, fontWeight: '700' },
    backToMenuText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 15, opacity: 0.9 },
    inputSeriesSmall: { backgroundColor: '#eee', padding: 4, borderRadius: 6, width: 35, textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
    labelSmall: { fontSize: 11, color: '#666', fontWeight: '700' },
    seriesTextStatic: { fontSize: 13, color: '#666', fontWeight: '700' },
    performanceSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    perfRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    perfLabel: { fontSize: 12, fontWeight: '800', color: '#ff7a00' },
    perfInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ff7a00', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, width: 80, fontSize: 12, fontWeight: 'bold', color: '#333' },
    communityComposer: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 18 },
    communitySection: { marginBottom: 18 },
    communitySectionTitle: { color: 'white', fontWeight: '900', fontSize: 16, marginBottom: 12 },
    communityInput: { backgroundColor: '#f4f4f4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#222', marginBottom: 10, fontWeight: '600' },
    communityTextarea: { minHeight: 96, textAlignVertical: 'top' },
    communityComposerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    communityGhostButton: { flex: 1, borderWidth: 1, borderColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
    communityGhostButtonText: { color: '#ff7a00', fontWeight: '800' },
    communityPrimaryButton: { flex: 1, backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    communityPrimaryButtonDisabled: { opacity: 0.7 },
    communityPrimaryButtonText: { color: 'white', fontWeight: '900' },
    communityPreviewImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 10 },
    communityEmptyText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
    communityPostCard: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14 },
    communityPostHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
    communityAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    communityAvatar: { width: 42, height: 42, borderRadius: 21 },
    communityAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ff7a00', alignItems: 'center', justifyContent: 'center' },
    communityAvatarFallbackText: { color: 'white', fontWeight: '900', fontSize: 18 },
    communityAuthorName: { color: '#222', fontWeight: '900', fontSize: 14 },
    communityPostTitle: { color: '#222', fontWeight: '900', fontSize: 16, marginBottom: 6 },
    communityPostMeta: { color: '#999', fontSize: 11, fontWeight: '700' },
    communityPostDescription: { color: '#555', fontSize: 13, lineHeight: 19, marginBottom: 10 },
    communityPostImage: { width: '100%', height: 260, borderRadius: 14, backgroundColor: '#eee' },
    communityDeleteText: { color: '#e74c3c', fontWeight: '800', fontSize: 12 },

    // --- MODAL PREMIUM (HU-55) ---
    premiumModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    premiumModalBox: { backgroundColor: '#1e1e1e', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360 },
    premiumModalIcon: { fontSize: 52, marginBottom: 12 },
    premiumModalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
    premiumModalMsg: { color: '#aaaaaa', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    premiumModalBtnPrimary: { backgroundColor: '#ff7a00', borderRadius: 25, paddingVertical: 14, paddingHorizontal: 30, width: '100%', alignItems: 'center', marginBottom: 10 },
    premiumModalBtnPrimaryText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    premiumModalBtnSecondary: { paddingVertical: 10, paddingHorizontal: 20 },
    premiumModalBtnSecondaryText: { color: '#888888', fontSize: 14, fontWeight: '600' },
});
