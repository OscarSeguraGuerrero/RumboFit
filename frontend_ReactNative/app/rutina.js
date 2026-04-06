import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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

    // --- MAPEO DE IMÁGENES POR MÚSCULO ---
    // Asegúrate de tener estas imágenes en tu carpeta assets/images/
    const imagenesMusculos = {
        empuje: require('../assets/images/musculo_pecho.png'),
        traccion: require('../assets/images/musculo_traccion.png'),
        pierna: require('../assets/images/musculo_pierna.png'),
        fullbody: require('../assets/images/fullbody.png'),
        core: require('../assets/images/musculo_core.png'),
        torso: require('../assets/images/musculo_torso.png'),
        descanso: require('../assets/images/descanso.png')
    };

    // Función para decidir qué imagen mostrar basándose en el texto del día
    const obtenerImagenMusculo = (textoDia) => {
        const dia = textoDia.toLowerCase();
        if (dia.includes('empuje')) return imagenesMusculos.empuje;
        if (dia.includes('tracción') || dia.includes('traccion')) return imagenesMusculos.traccion;
        if (dia.includes('core')) return imagenesMusculos.core;
        if (dia.includes('pierna')) return imagenesMusculos.pierna;
        if (dia.includes('torso')) return imagenesMusculos.torso;
        if (dia.includes('fullbody')) return imagenesMusculos.fullbody;
        if (dia.includes('descanso')) return imagenesMusculos.descanso;
        return imagenesMusculos.default;
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

            const resUser = await AsyncStorage.getItem("usuario");
            if (resUser) {
                setUsuario(JSON.parse(resUser));
            }

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();
        };
        cargarData();
    }, []);

    const cerrarSesion = async () => {
        router.replace('/');
    };

    const irAPerfil = () => {
        router.push('/perfil');
    };

    if (!data) return (
        <View style={styles.loading}>
            <Text style={{color:'white', fontSize: 18, fontWeight: '300'}}>Preparando entrenamiento...</Text>
        </View>
    );

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* --- TOP BAR --- */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
                    <Text style={styles.logoutIcon}>✕</Text>
                    <Text style={styles.logoutText}>Salir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.profileTrigger}
                    onPress={irAPerfil}
                >
                    <View style={styles.textContainer}>
                        <Text style={styles.userName}>{usuario.nombre}</Text>
                    </View>
                    <View style={styles.avatarGlow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* --- CARD PRINCIPAL --- */}
            <View style={styles.mainCard}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.methodLabel}>MÉTODO SELECCIONADO</Text>
                        <Text style={styles.title}>{data.metodo}</Text>
                    </View>
                    <Image source={require('../assets/images/logo1.png')} style={styles.miniLogo} resizeMode="contain" />
                </View>

                {/* --- TABS --- */}
                <View style={styles.tabsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsScroll}
                    >
                        {Object.keys(data.rutina).map(dia => (
                            <TouchableOpacity
                                key={dia}
                                style={[styles.tab, diaActual === dia && styles.tabActive]}
                                onPress={() => setDiaActual(dia)}
                            >
                                <Text style={[styles.tabText, diaActual === dia && styles.textWhite]}>
                                    {dia.split(' ')[0]}
                                </Text>
                                {diaActual === dia && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                    <View style={styles.contentHeader}>
                        <Text style={styles.diaH3}>{diaActual}</Text>
                        <Text style={styles.exerciseCount}>{data.rutina[diaActual].length} ejercicios</Text>
                    </View>

                    {/* --- NUEVA FOTO DE MÚSCULOS --- */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={obtenerImagenMusculo(diaActual)}
                            style={styles.muscleImage}
                            resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                            <Text style={styles.overlayText}>Músculos trabajados</Text>
                        </View>
                    </View>

                    {/* --- LISTA EJERCICIOS --- */}
                    {data.rutina[diaActual].map((ej, i) => (
                        <View key={i} style={styles.exerciseCard}>
                            <View style={styles.indexCircle}>
                                <Text style={styles.indexText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.itemText}>{ej}</Text>
                        </View>
                    ))}
                    <View style={{height: 20}} />
                </ScrollView>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 60 },

    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 25
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee'
    },
    logoutIcon: { color: '#ff4444', fontSize: 14, fontWeight: 'bold', marginRight: 4 },
    logoutText: { color: '#666', fontSize: 12, fontWeight: '600' },

    profileTrigger: { flexDirection: 'row', alignItems: 'center' },
    textContainer: { alignItems: 'flex-end', marginRight: 10 },
    userName: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
    avatarGlow: { padding: 2, borderRadius: 25, backgroundColor: 'rgba(255, 122, 0, 0.1)' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

    mainCard: {
        flex: 1,
        backgroundColor: '#ff7a00',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 25,
        elevation: 20
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    methodLabel: { color: '#ffffff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, opacity: 0.8 },
    title: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginTop: 4 },
    miniLogo: { width: 60, height: 45, tintColor: 'white' },

    tabsWrapper: { marginBottom: 20, marginHorizontal: -25 },
    tabsScroll: { paddingHorizontal: 25, gap: 10 },
    tab: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15, minWidth: 85 },
    tabActive: { backgroundColor: '#ffffff' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
    textWhite: { color: '#ff7a00' },
    activeDot: { position: 'absolute', bottom: 6, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: '#ff7a00' },

    content: { flex: 1 },
    contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    diaH3: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
    exerciseCount: { color: '#ffffff', fontSize: 12, opacity: 0.8 },

    // ESTILOS DE LA NUEVA IMAGEN
    imageContainer: {
        width: '100%',
        height: 235,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        position: 'relative'
    },
    muscleImage: {
        width: '100%',
        height: '100%'
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10
    },
    overlayText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },

    exerciseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 18,
        borderRadius: 20,
        marginBottom: 12,
    },
    indexCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    indexText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    itemText: { fontSize: 15, color: '#333', fontWeight: '600', flex: 1 },

    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' }
})