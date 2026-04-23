import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import React from 'react';
import { API_URL } from '../config';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

// --- FUNCIONES DE CÁLCULO (Copiadas de rutina.js para mantener lógica) ---
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
        // Dependiendo de si es el formato viejo u nuevo
        const itemAlimento = c.alimento || c;
        totales.kcal += Number(itemAlimento.calorias_100g || 0) * factor;
        totales.prot += Number(itemAlimento.proteinas_100g || 0) * factor;
        totales.carb += Number(itemAlimento.carbohidratos_100g || 0) * factor;
        totales.gras += Number(itemAlimento.grasas_100g || 0) * factor;
    });
    return totales;
};

export default function Dieta() {
    const router = useRouter();
    const [usuarioCompleto, setUsuarioCompleto] = useState(null);
    const [macrosHoy, setMacrosHoy] = useState({ kcal: 0, prot: 0, carb: 0, gras: 0 });
    const [loading, setLoading] = useState(true);

    // --- ESTADOS PARA CRUD ---
    const [modalVisible, setModalVisible] = useState(false);
    const [alimentosCatalogo, setAlimentosCatalogo] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [itemsReceta, setItemsReceta] = useState([]); // Ingredientes temporales
    const [tituloComida, setTituloComida] = useState('');

    useEffect(() => {
        const cargarData = async () => {
            try {
                const userId = await AsyncStorage.getItem("userId");
                if (userId) {
                    // Cargar perfil
                    const userRes = await fetch(`${API_URL}/usuarios/${userId}`);
                    const userData = await userRes.json();
                    if (userData.success) setUsuarioCompleto(userData.usuario);

                    // Cargar historial para macros
                    const histRes = await fetch(`${API_URL}/usuarios/${userId}/historial`);
                    const histData = await histRes.json();
                    if (histData.success && histData.historial) {
                        const hoyStr = new Date().toISOString().split('T')[0];
                        const dataHoy = histData.historial[hoyStr];
                        if (dataHoy && dataHoy.comidas) {
                            setMacrosHoy(calcularMacrosConsumidos(dataHoy.comidas));
                        }
                    }

                    // Cargar catálogo de alimentos
                    const alimRes = await fetch(`${API_URL}/alimentos`);
                    const alimData = await alimRes.json();
                    setAlimentosCatalogo(alimData);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        cargarData();
    }, []);

    const objMacros = calcularMacrosObjetivo(calcularTDEE(usuarioCompleto), usuarioCompleto);
    const pctKcal = Math.min(100, (macrosHoy.kcal / objMacros.kcal) * 100) || 0;
    const pctProt = Math.min(100, (macrosHoy.prot / objMacros.prot) * 100) || 0;
    const pctCarb = Math.min(100, (macrosHoy.carb / objMacros.carb) * 100) || 0;
    const pctGras = Math.min(100, (macrosHoy.gras / objMacros.gras) * 100) || 0;

    if (loading) return <View style={styles.loading}><Text style={{color:'white'}}>Cargando...</Text></View>;

    return (
        <View style={styles.container}>
            {/* TOP BAR */}
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
            </View>

            <View style={styles.mainCard}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.methodLabel}>MI NUTRICIÓN DIARIA</Text>
                            <Text style={styles.title}>Registro de Comidas</Text>
                        </View>
                        <TouchableOpacity style={styles.btnAddCircle} onPress={() => setModalVisible(true)}>
                            <Text style={styles.btnAddText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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

                    <Text style={styles.noDataText}>Las funciones de búsqueda avanzada de alimentos estarán disponibles próximamente.</Text>
                </ScrollView>
            </View>

            {/* NAV BAR */}
            <View style={styles.navContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/rutina')}>
                        <Text style={styles.tabBarText}>MIS RUTINAS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabBarItem}>
                        <Text style={[styles.tabBarText, styles.tabBarTextActive]}>MI DIETA</Text>
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
    mainCard: { flex: 1, backgroundColor: '#ff7a00', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, elevation: 20 },
    header: { marginBottom: 15 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btnAddCircle: { backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
    btnAddText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    dashboardCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20 },
    dashboardTitle: { color: '#333', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    progressBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#ff7a00', borderRadius: 4 },
    dashboardSub: { color: '#666', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    macrosRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    macroCol: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, marginHorizontal: 4, elevation: 2 },
    macroLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 5, textAlign: 'center' },
    macroBg: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginBottom: 5 },
    macroFill: { height: '100%', borderRadius: 3 },
    macroValue: { fontSize: 12, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    noDataText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', marginTop: 30, lineHeight: 18 },
    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
});
