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
    Dimensions,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator
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
        // Soporte para el nuevo esquema (comida.macros calculado en backend)
        if (c.macros) {
            totales.kcal += c.macros.kcal;
            totales.prot += c.macros.prot;
            totales.carb += c.macros.carb;
            totales.gras += c.macros.gras;
        } 
        // Soporte para items anidados si no viene con macros precalculados
        else if (c.items) {
            c.items.forEach(it => {
                const factor = Number(it.cantidad_gramos || it.cantidad) / 100;
                totales.kcal += Number(it.alimento?.calorias_100g || 0) * factor;
                totales.prot += Number(it.alimento?.proteinas_100g || 0) * factor;
                totales.carb += Number(it.alimento?.carbohidratos_100g || 0) * factor;
                totales.gras += Number(it.alimento?.grasas_100g || 0) * factor;
            });
        }
        // Soporte para esquema viejo (flat list)
        else {
            const factor = Number(c.cantidad_gramos) / 100;
            const itemAlimento = c.alimento || c;
            totales.kcal += Number(itemAlimento.calorias_100g || 0) * factor;
            totales.prot += Number(itemAlimento.proteinas_100g || 0) * factor;
            totales.carb += Number(itemAlimento.carbohidratos_100g || 0) * factor;
            totales.gras += Number(itemAlimento.grasas_100g || 0) * factor;
        }
    });
    return totales;
};

export default function Dieta() {
    const router = useRouter();
    const [usuarioCompleto, setUsuarioCompleto] = useState(null);
    const [macrosHoy, setMacrosHoy] = useState({ kcal: 0, prot: 0, carb: 0, gras: 0 });
    const [comidasHoy, setComidasHoy] = useState([]); // Nueva lista de comidas del día
    const [loading, setLoading] = useState(true);

    // --- ESTADOS PARA CRUD ---
    const [modalVisible, setModalVisible] = useState(false);
    const [alimentosCatalogo, setAlimentosCatalogo] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [itemsReceta, setItemsReceta] = useState([]); // Ingredientes temporales
    const [tituloComida, setTituloComida] = useState('');
    const [guardando, setGuardando] = useState(false);

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
                            setComidasHoy(dataHoy.comidas);
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

    // --- FUNCIONES CRUD FRONTEND ---
    const añadirAlimento = (alim) => {
        // Evitar duplicados simples (opcional, pero mejora la UX)
        if (itemsReceta.find(it => it.id === alim.id)) {
            Alert.alert("Aviso", "Este alimento ya está en la lista.");
            return;
        }
        setItemsReceta([...itemsReceta, { ...alim, cantidad: 100 }]);
        setBusqueda(''); // Limpiar búsqueda al añadir
    };

    const quitarAlimento = (id) => {
        setItemsReceta(itemsReceta.filter(it => it.id !== id));
    };

    const actualizarGramos = (id, gramos) => {
        setItemsReceta(itemsReceta.map(it => 
            it.id === id ? { ...it, cantidad: Number(gramos) || 0 } : it
        ));
    };

    const handleGuardarComida = async () => {
        if (!tituloComida.trim()) {
            Alert.alert("Aviso", "Por favor, introduce un título para la comida (Ej: Desayuno).");
            return;
        }
        if (itemsReceta.length === 0) {
            Alert.alert("Aviso", "Añade al menos un alimento a la comida.");
            return;
        }

        setGuardando(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) return;

            const payload = {
                userId,
                titulo: tituloComida.trim(),
                items: itemsReceta.map(it => ({
                    alimentoId: it.id,
                    cantidad: it.cantidad
                })),
                franja: tituloComida.trim() // Usamos el título como franja temporalmente
            };

            const res = await fetch(`${API_URL}/dieta/comida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                // Calculamos los macros para que estén listos (si no vienen del backend)
                let macrosComida = data.comida.macros;
                if (!macrosComida) {
                    macrosComida = { kcal: 0, prot: 0, carb: 0, gras: 0 };
                    data.comida.items.forEach(it => {
                        const factor = Number(it.cantidad_gramos || it.cantidad) / 100;
                        macrosComida.kcal += Number(it.alimento?.calorias_100g || 0) * factor;
                        macrosComida.prot += Number(it.alimento?.proteinas_100g || 0) * factor;
                        macrosComida.carb += Number(it.alimento?.carbohidratos_100g || 0) * factor;
                        macrosComida.gras += Number(it.alimento?.grasas_100g || 0) * factor;
                    });
                }
                const comidaConMacros = { ...data.comida, macros: macrosComida };

                // Actualizar estado local
                const nuevasComidas = [comidaConMacros, ...comidasHoy];
                setComidasHoy(nuevasComidas);
                setMacrosHoy(calcularMacrosConsumidos(nuevasComidas));

                // Limpiar modal y cerrar
                setTituloComida('');
                setItemsReceta([]);
                setBusqueda('');
                setModalVisible(false);
                Alert.alert("¡Éxito!", "Comida registrada correctamente.");
            } else {
                Alert.alert("Error", data.error || "No se pudo guardar la comida.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        } finally {
            setGuardando(false);
        }
    };

    const objMacros = calcularMacrosObjetivo(calcularTDEE(usuarioCompleto), usuarioCompleto);
    const pctKcal = Math.min(100, (macrosHoy.kcal / objMacros.kcal) * 100) || 0;
    const pctProt = Math.min(100, (macrosHoy.prot / objMacros.prot) * 100) || 0;
    const pctCarb = Math.min(100, (macrosHoy.carb / objMacros.carb) * 100) || 0;
    const pctGras = Math.min(100, (macrosHoy.gras / objMacros.gras) * 100) || 0;

    if (loading) return <View style={styles.loading}><Text style={{ color: 'white' }}>Cargando...</Text></View>;

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
                            <View style={styles.macroBg}><View style={[styles.macroFill, { width: `${pctProt}%`, backgroundColor: '#3498db' }]} /></View>
                            <Text style={styles.macroValue}>{Math.round(macrosHoy.prot)} / {objMacros.prot}g</Text>
                        </View>
                        <View style={styles.macroCol}>
                            <Text style={styles.macroLabel}>Carbos</Text>
                            <View style={styles.macroBg}><View style={[styles.macroFill, { width: `${pctCarb}%`, backgroundColor: '#2ecc71' }]} /></View>
                            <Text style={styles.macroValue}>{Math.round(macrosHoy.carb)} / {objMacros.carb}g</Text>
                        </View>
                        <View style={styles.macroCol}>
                            <Text style={styles.macroLabel}>Grasas</Text>
                            <View style={styles.macroBg}><View style={[styles.macroFill, { width: `${pctGras}%`, backgroundColor: '#f1c40f' }]} /></View>
                            <Text style={styles.macroValue}>{Math.round(macrosHoy.gras)} / {objMacros.gras}g</Text>
                        </View>
                    </View>

                    {/* LISTA DE COMIDAS REGISTRADAS */}
                    {comidasHoy.length > 0 ? (
                        <View style={styles.comidasList}>
                            <Text style={styles.sectionTitle}>Comidas de hoy</Text>
                            {comidasHoy.map((comida, index) => (
                                <View key={comida.id || index} style={styles.comidaCard}>
                                    <View style={styles.comidaHeader}>
                                        <Text style={styles.comidaTitle}>{comida.titulo || comida.franja_horaria}</Text>
                                        <Text style={styles.comidaTime}>{comida.hora}</Text>
                                    </View>
                                    <View style={styles.comidaMacros}>
                                        <Text style={styles.comidaKcal}>{Math.round(comida.macros?.kcal || 0)} Kcal</Text>
                                        <Text style={styles.comidaMacroItem}>P: {Math.round(comida.macros?.prot || 0)}g</Text>
                                        <Text style={styles.comidaMacroItem}>C: {Math.round(comida.macros?.carb || 0)}g</Text>
                                        <Text style={styles.comidaMacroItem}>G: {Math.round(comida.macros?.gras || 0)}g</Text>
                                    </View>
                                    <View style={styles.comidaItems}>
                                        {comida.items && comida.items.map((it, i) => (
                                            <Text key={i} style={styles.comidaItemText}>
                                                • {it.alimento?.nombre} ({it.cantidad_gramos || it.cantidad}g)
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.noDataText}>No has registrado ninguna comida hoy.</Text>
                    )}
                </ScrollView>
            </View>

            {/* MODAL DE REGISTRO DE COMIDA */}
            <Modal visible={modalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Registrar Comida</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeModalText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={styles.inputLabel}>¿Qué has comido?</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ej: Desayuno, Almuerzo, Cheat Meal..."
                            placeholderTextColor="#999"
                            value={tituloComida}
                            onChangeText={setTituloComida}
                        />

                        {/* LISTA DE INGREDIENTES SELECCIONADOS */}
                        {itemsReceta.length > 0 && (
                            <View style={styles.selectedItemsSection}>
                                <Text style={styles.inputLabel}>Ingredientes añadidos</Text>
                                {itemsReceta.map((it, idx) => (
                                    <View key={idx} style={styles.selectedItemCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.selectedItemName}>{it.nombre}</Text>
                                            <Text style={styles.selectedItemMacros}>
                                                {Math.round((Number(it.calorias_100g) * it.cantidad) / 100)} Kcal
                                            </Text>
                                        </View>
                                        <View style={styles.qtyContainer}>
                                            <TextInput
                                                style={styles.inputGrams}
                                                keyboardType="numeric"
                                                value={String(it.cantidad)}
                                                onChangeText={(text) => actualizarGramos(it.id, text)}
                                            />
                                            <Text style={styles.gramsLabel}>g</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => quitarAlimento(it.id)} style={styles.btnRemove}>
                                            <Text style={styles.removeIcon}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Buscar alimento</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar en el catálogo..."
                            placeholderTextColor="#999"
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />

                        {/* RESULTADOS DE BÚSQUEDA */}
                        <View style={styles.resultsContainer}>
                            {alimentosCatalogo
                                .filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                                .slice(0, 10)
                                .map((alim, i) => (
                                    <TouchableOpacity key={i} style={styles.foodItem} onPress={() => añadirAlimento(alim)}>
                                        <View>
                                            <Text style={styles.foodName}>{alim.nombre}</Text>
                                            <Text style={styles.foodSub}>{Math.round(alim.calorias_100g)} Kcal / 100g</Text>
                                        </View>
                                        <Text style={styles.plusIcon}>+</Text>
                                    </TouchableOpacity>
                                ))}
                        </View>
                        
                        {/* BOTÓN GUARDAR */}
                        <TouchableOpacity 
                            style={[styles.btnConfirm, guardando && { opacity: 0.7 }]} 
                            onPress={handleGuardarComida}
                            disabled={guardando}
                        >
                            {guardando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnConfirmText}>GUARDAR COMIDA</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

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
    noDataText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 30, lineHeight: 18, fontWeight: '600' },
    
    // ESTILOS COMIDAS REGISTRADAS
    comidasList: { marginTop: 10 },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: '900', marginBottom: 15, letterSpacing: 0.5 },
    comidaCard: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    comidaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    comidaTitle: { fontSize: 16, fontWeight: '900', color: '#333' },
    comidaTime: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    comidaMacros: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ef', padding: 10, borderRadius: 10, marginBottom: 10 },
    comidaKcal: { color: '#ff7a00', fontWeight: '900', fontSize: 14, marginRight: 15 },
    comidaMacroItem: { fontSize: 12, color: '#666', fontWeight: 'bold', marginRight: 10 },
    comidaItems: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    comidaItemText: { fontSize: 13, color: '#555', marginBottom: 4 },

    // MODAL STYLES
    modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#333' },
    closeModalText: { color: '#ff7a00', fontWeight: 'bold' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 15 },
    modalInput: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 16, color: '#333', marginBottom: 10 },
    
    // ESTILOS BUSCADOR (Estilo Rutina)
    searchInput: { backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, fontSize: 16, color: '#333', marginBottom: 20 },
    resultsContainer: { marginTop: 5 },
    foodItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
    foodName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    foodSub: { fontSize: 12, color: '#999', marginTop: 2 },
    plusIcon: { fontSize: 24, color: '#ff7a00', fontWeight: 'bold', paddingRight: 5 },

    // ESTILOS INGREDIENTES SELECCIONADOS
    selectedItemsSection: { marginBottom: 20 },
    selectedItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    selectedItemName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    selectedItemMacros: { fontSize: 11, color: '#ff7a00', fontWeight: '600' },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: 10 },
    inputGrams: { paddingVertical: 4, width: 45, textAlign: 'center', fontWeight: 'bold', color: '#333' },
    gramsLabel: { fontSize: 12, color: '#666', fontWeight: 'bold' },
    btnRemove: { padding: 5 },
    removeIcon: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
    btnConfirm: { backgroundColor: '#ff7a00', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    btnConfirmText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
    loading: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
});
