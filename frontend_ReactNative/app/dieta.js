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
    ActivityIndicator,
    Platform,
    TouchableWithoutFeedback
} from 'react-native';

const { width } = Dimensions.get('window');

// --- FUNCIONES DE CÁLCULO (Copiadas de rutina.js para mantener lógica) ---
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
    const franjasDisponibles = ['Desayuno', 'Media mañana', 'Almuerzo', 'Merienda', 'Cena', 'Comida extra'];
    const [tituloComida, setTituloComida] = useState(franjasDisponibles[0]);
    const [guardando, setGuardando] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    // Estado para crear alimento nuevo
    const [modalAlimentoVisible, setModalAlimentoVisible] = useState(false);
    const [nuevoAlim, setNuevoAlim] = useState({ nombre: '', kcal: '', prot: '', carb: '', gras: '' });
    const [creandoAlimento, setCreandoAlimento] = useState(false);

    // Estado para modal de confirmación general
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });

    // Estado para edición inline de comida
    const [editandoComida, setEditandoComida] = useState(null); // id de la comida en edición
    const [editandoCantidades, setEditandoCantidades] = useState({}); // { [itemId]: gramos }

    // Estado para vista detalle de comida
    const [comidaDetalleId, setComidaDetalleId] = useState(null);
    const [busquedaEdicion, setBusquedaEdicion] = useState('');
    const [modalAlimentosEdicion, setModalAlimentosEdicion] = useState(false);
    const [contextoCrearAlimento, setContextoCrearAlimento] = useState('registro');

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

    const handleCrearAlimentoCustom = async () => {
        if (!nuevoAlim.nombre || !nuevoAlim.kcal) {
            Alert.alert("Aviso", "El nombre y las calorías son obligatorios.");
            return;
        }
        setCreandoAlimento(true);
        try {
            const payload = {
                nombre: nuevoAlim.nombre,
                calorias_100g: nuevoAlim.kcal,
                proteinas_100g: nuevoAlim.prot || '0',
                carbohidratos_100g: nuevoAlim.carb || '0',
                grasas_100g: nuevoAlim.gras || '0'
            };
            const res = await fetch(`${API_URL}/alimentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setAlimentosCatalogo(prev => [...prev, data.alimento]);
                setModalAlimentoVisible(false);
                setNuevoAlim({ nombre: '', kcal: '', prot: '', carb: '', gras: '' });
                if (contextoCrearAlimento === 'edicion') {
                    await añadirAlimentoAComida(comidaDetalleId, data.alimento);
                    setBusquedaEdicion('');
                } else {
                    añadirAlimento(data.alimento);
                }
                setContextoCrearAlimento('registro');
                Alert.alert("¡Éxito!", "Alimento añadido al catálogo general.");
            } else {
                Alert.alert("Error", data.error || "Error al crear el alimento.");
            }
        } catch (error) {
            Alert.alert("Error", "Problema de conexión con el servidor.");
        } finally {
            setCreandoAlimento(false);
        }
    };

    const handleGuardarComida = async () => {
        if (!tituloComida) {
            Alert.alert("Aviso", "Por favor, selecciona una franja horaria.");
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
                setTituloComida(franjasDisponibles[0]);
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

    const ejecutarEliminar = async (id) => {
        try {
            const res = await fetch(`${API_URL}/dieta/comida/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                const nuevasComidas = comidasHoy.filter(c => c.id !== id);
                setComidasHoy(nuevasComidas);
                setMacrosHoy(calcularMacrosConsumidos(nuevasComidas));
                setComidaDetalleId(null);
            } else {
                Alert.alert("Error", "No se pudo eliminar la comida.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        }
    };

    const ejecutarEliminarAlimento = async (comidaId, alimentoId) => {
        try {
            const res = await fetch(`${API_URL}/dieta/alimento/${alimentoId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                const nuevasComidas = comidasHoy.map(c => {
                    if (c.id === comidaId) {
                        const nuevosItems = c.items.filter(it => it.id !== alimentoId);
                        let macrosComida = { kcal: 0, prot: 0, carb: 0, gras: 0 };
                        nuevosItems.forEach(it => {
                            const factor = Number(it.cantidad_gramos || it.cantidad || 0) / 100;
                            macrosComida.kcal += Number(it.alimento?.calorias_100g || 0) * factor;
                            macrosComida.prot += Number(it.alimento?.proteinas_100g || 0) * factor;
                            macrosComida.carb += Number(it.alimento?.carbohidratos_100g || 0) * factor;
                            macrosComida.gras += Number(it.alimento?.grasas_100g || 0) * factor;
                        });
                        return { ...c, items: nuevosItems, macros: macrosComida };
                    }
                    return c;
                }).filter(c => c.items && c.items.length > 0);

                setComidasHoy(nuevasComidas);
                setMacrosHoy(calcularMacrosConsumidos(nuevasComidas));
            } else {
                Alert.alert("Error", "No se pudo eliminar el alimento.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        }
    };

    const handleEliminarAlimento = (comidaId, alimentoId) => {
        setConfirmModal({
            visible: true,
            title: "Eliminar alimento",
            message: "¿Estás seguro de que quieres eliminar este alimento?",
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                ejecutarEliminarAlimento(comidaId, alimentoId);
            }
        });
    };

    const handleEliminarComida = (id) => {
        setConfirmModal({
            visible: true,
            title: "Eliminar comida",
            message: "¿Estás seguro de que quieres eliminar esta comida?",
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                ejecutarEliminar(id);
            }
        });
    };

    const cerrarSesion = async () => {
        setMenuVisible(false);
        await AsyncStorage.clear();
        router.replace('/');
    };

    const añadirAlimentoAComida = async (comidaId, alimento) => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            const res = await fetch(`${API_URL}/dieta/comida/${comidaId}/alimento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alimentoId: alimento.id, cantidad: 100, userId })
            });
            const data = await res.json();
            if (data.success) {
                const nuevasComidas = comidasHoy.map(c => {
                    if (c.id !== comidaId) return c;
                    const nuevosItems = [...(c.items || []), data.item];
                    let macros = { kcal: 0, prot: 0, carb: 0, gras: 0 };
                    nuevosItems.forEach(it => {
                        const factor = Number(it.cantidad_gramos) / 100;
                        macros.kcal += Number(it.alimento?.calorias_100g || 0) * factor;
                        macros.prot += Number(it.alimento?.proteinas_100g || 0) * factor;
                        macros.carb += Number(it.alimento?.carbohidratos_100g || 0) * factor;
                        macros.gras += Number(it.alimento?.grasas_100g || 0) * factor;
                    });
                    return { ...c, items: nuevosItems, macros };
                });
                setComidasHoy(nuevasComidas);
                setMacrosHoy(calcularMacrosConsumidos(nuevasComidas));
                setEditandoCantidades(prev => ({ ...prev, [data.item.id]: '100' }));
                setBusquedaEdicion('');
            } else {
                Alert.alert("Error", data.error || "No se pudo añadir el alimento.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        }
    };

    const iniciarEdicionComida = (comida) => {
        const cantidades = {};
        (comida.items || []).forEach(it => {
            cantidades[it.id] = String(it.cantidad_gramos || it.cantidad || '');
        });
        setEditandoCantidades(cantidades);
        setEditandoComida(comida.id);
    };

    const handleGuardarEdicionComida = async (comida) => {
        try {
            await Promise.all(
                (comida.items || []).map(it => {
                    const nuevaCantidad = editandoCantidades[it.id];
                    if (!nuevaCantidad || Number(nuevaCantidad) === (it.cantidad_gramos || it.cantidad)) return Promise.resolve();
                    return fetch(`${API_URL}/dieta/alimento/${it.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cantidad_gramos: Number(nuevaCantidad) })
                    });
                })
            );
            // Actualizar estado local con los nuevos gramos
            const nuevasComidas = comidasHoy.map(c => {
                if (c.id !== comida.id) return c;
                const nuevosItems = (c.items || []).map(it => ({
                    ...it,
                    cantidad_gramos: Number(editandoCantidades[it.id]) || (it.cantidad_gramos || it.cantidad)
                }));
                let macros = { kcal: 0, prot: 0, carb: 0, gras: 0 };
                nuevosItems.forEach(it => {
                    const factor = Number(it.cantidad_gramos) / 100;
                    macros.kcal += Number(it.alimento?.calorias_100g || 0) * factor;
                    macros.prot += Number(it.alimento?.proteinas_100g || 0) * factor;
                    macros.carb += Number(it.alimento?.carbohidratos_100g || 0) * factor;
                    macros.gras += Number(it.alimento?.grasas_100g || 0) * factor;
                });
                return { ...c, items: nuevosItems, macros };
            });
            setComidasHoy(nuevasComidas);
            setMacrosHoy(calcularMacrosConsumidos(nuevasComidas));
        } catch (e) {
            console.error(e);
        } finally {
            setEditandoComida(null);
            setEditandoCantidades({});
            setBusquedaEdicion('');
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
            {/* --- TOP BAR --- */}
            <View style={styles.topBar}>
                <Image source={require('../assets/images/logo1.png')} style={styles.topBarLogo} resizeMode="contain" />
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.avatarGlow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {usuarioCompleto?.nombre ? usuarioCompleto.nombre[0].toUpperCase() : 'U'}
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
                                <Text style={styles.dropdownHeader}>{usuarioCompleto?.nombre || 'Usuario'}</Text>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setMenuVisible(false); router.push('/perfil'); }}>
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
                                <TouchableOpacity style={styles.dropdownItem} onPress={cerrarSesion}>
                                    <Text style={[styles.dropdownText, {color: '#ff4444'}]}>Cerrar Sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View style={styles.mainCard}>
                {(() => {
                    const comidaDetalle = comidaDetalleId ? comidasHoy.find(c => c.id === comidaDetalleId) : null;
                    const enEdicion = editandoComida === comidaDetalleId;

                    if (comidaDetalle) {
                        // --- VISTA DETALLE ---
                        return (
                            <>
                                <View style={styles.header}>
                                    <TouchableOpacity onPress={() => { setComidaDetalleId(null); setEditandoComida(null); }}>
                                        <Text style={styles.backToMenuText}>← Volver al menú</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.headerRow, { marginTop: 8 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.methodLabel}>DETALLE DE COMIDA</Text>
                                            <Text style={styles.title}>{comidaDetalle.titulo || comidaDetalle.franja_horaria}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                            <TouchableOpacity
                                                style={[styles.comidaEditBtn, enEdicion && styles.comidaEditBtnActive]}
                                                onPress={() => enEdicion ? handleGuardarEdicionComida(comidaDetalle) : iniciarEdicionComida(comidaDetalle)}
                                            >
                                                <Text style={[styles.comidaEditBtnText, enEdicion && styles.comidaEditBtnTextActive]}>
                                                    {enEdicion ? 'GUARDAR' : 'EDITAR'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={[styles.comidaMacros, { marginTop: 10 }]}>
                                        <Text style={styles.comidaKcal}>{Math.round(comidaDetalle.macros?.kcal || 0)} Kcal</Text>
                                        <Text style={styles.comidaMacroItem}>P: {Math.round(comidaDetalle.macros?.prot || 0)}g</Text>
                                        <Text style={styles.comidaMacroItem}>C: {Math.round(comidaDetalle.macros?.carb || 0)}g</Text>
                                        <Text style={styles.comidaMacroItem}>G: {Math.round(comidaDetalle.macros?.gras || 0)}g</Text>
                                    </View>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                                    {comidaDetalle.items && comidaDetalle.items.map((it, i) => (
                                        <View key={it.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: 'white', borderRadius: 14, padding: 14 }}>
                                            <Text style={[styles.comidaItemText, { flex: 1 }]}>• {it.alimento?.nombre}</Text>
                                            {enEdicion ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <TextInput
                                                        style={styles.comidaGramInput}
                                                        keyboardType="numeric"
                                                        value={editandoCantidades[it.id] ?? String(it.cantidad_gramos || it.cantidad || '')}
                                                        onChangeText={(t) => setEditandoCantidades(prev => ({ ...prev, [it.id]: t }))}
                                                    />
                                                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '600' }}>g</Text>
                                                    <TouchableOpacity onPress={() => handleEliminarAlimento(comidaDetalle.id, it.id)}>
                                                        <Text style={{ color: '#e74c3c', fontSize: 15, fontWeight: 'bold', paddingLeft: 6 }}>✕</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <Text style={{ color: '#999', fontSize: 12 }}>({it.cantidad_gramos || it.cantidad}g)</Text>
                                            )}
                                        </View>
                                    ))}

                                    {enEdicion && (
                                        <TouchableOpacity
                                            style={[styles.btnAdd, { marginTop: 10 }]}
                                            onPress={() => setModalAlimentosEdicion(true)}
                                        >
                                            <Text style={styles.btnAddText}>+ AÑADIR ALIMENTO</Text>
                                        </TouchableOpacity>
                                    )}
                                </ScrollView>
                            </>
                        );
                    }

                    // --- VISTA LISTA ---
                    return (
                        <>
                            <View style={styles.header}>
                                <View style={styles.headerRow}>
                                    <View>
                                        <Text style={styles.methodLabel}>MI NUTRICIÓN DIARIA</Text>
                                        <Text style={styles.title}>Registro de Comidas</Text>
                                    </View>
                                    <TouchableOpacity style={styles.btnAddPill} onPress={() => setModalVisible(true)}>
                                        <Text style={styles.btnAddPillText}>+ Registrar dieta</Text>
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

                                {comidasHoy.length > 0 ? (
                                    <View style={styles.comidasList}>
                                        <Text style={styles.sectionTitle}>Comidas de hoy</Text>
                                        {comidasHoy.map((comida, index) => (
                                            <View key={comida.id || index} style={{ position: 'relative', marginBottom: 15 }}>
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    onPress={() => setComidaDetalleId(comida.id)}
                                                >
                                                    <View style={[styles.comidaCard, { marginBottom: 0 }]}>
                                                        <View style={[styles.comidaHeader, { paddingRight: 35 }]}>
                                                            <View>
                                                                <Text style={styles.comidaTitle}>{comida.titulo || comida.franja_horaria}</Text>
                                                                <Text style={styles.comidaTime}>{comida.hora}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.comidaMacros}>
                                                            <Text style={styles.comidaKcal}>{Math.round(comida.macros?.kcal || 0)} Kcal</Text>
                                                            <Text style={styles.comidaMacroItem}>P: {Math.round(comida.macros?.prot || 0)}g</Text>
                                                            <Text style={styles.comidaMacroItem}>C: {Math.round(comida.macros?.carb || 0)}g</Text>
                                                            <Text style={styles.comidaMacroItem}>G: {Math.round(comida.macros?.gras || 0)}g</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteComidaX}
                                                    onPress={() => handleEliminarComida(comida.id)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Text style={styles.deleteComidaXText}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.noDataText}>No has registrado ninguna comida hoy.</Text>
                                )}
                            </ScrollView>
                        </>
                    );
                })()}
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

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 10 }}>
                        <Text style={styles.inputLabel}>Franja Horaria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.franjasContainer}>
                            {franjasDisponibles.map((franja, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.franjaChip, tituloComida === franja && styles.franjaChipActive]}
                                    onPress={() => setTituloComida(franja)}
                                >
                                    <Text style={[styles.franjaChipText, tituloComida === franja && styles.franjaChipTextActive]}>
                                        {franja}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* LISTA DE INGREDIENTES SELECCIONADOS */}
                        {itemsReceta.length > 0 && (
                            <View style={styles.selectedItemsSection}>
                                <Text style={styles.inputLabel}>Ingredientes añadidos</Text>
                                {itemsReceta.map((it, idx) => (
                                    <View key={idx} style={styles.selectedItemCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.selectedItemName}>{it.nombre}</Text>
                                            <Text style={styles.selectedItemMacros}>
                                                {Math.round((Number(it.calorias_100g) * it.cantidad) / 100)} Kcal (P: {Math.round((Number(it.proteinas_100g) * it.cantidad) / 100)} C: {Math.round((Number(it.carbohidratos_100g) * it.cantidad) / 100)} G: {Math.round((Number(it.grasas_100g) * it.cantidad) / 100)})
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

                        {/* BOTÓN CREAR ALIMENTO PERSONALIZADO - arriba del todo */}
                        <View style={styles.customExerciseActions}>
                            <TouchableOpacity
                                style={styles.customExerciseButton}
                                onPress={() => {
                                    setNuevoAlim({ nombre: busqueda, kcal: '', prot: '', carb: '', gras: '' });
                                    setContextoCrearAlimento('registro');
                                    setModalAlimentoVisible(true);
                                }}
                            >
                                <Text style={styles.customExerciseButtonText}>
                                    {busqueda.length > 0 ? `¿No encuentras "${busqueda}"? Añádelo aquí +` : '+ Crear alimento personalizado'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* RESULTADOS DE BÚSQUEDA */}
                        <View style={styles.resultsContainer}>
                            {alimentosCatalogo
                                .filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                                .slice(0, 10)
                                .map((alim, i) => (
                                    <TouchableOpacity key={i} style={styles.foodItem} onPress={() => añadirAlimento(alim)}>
                                        <View>
                                            <Text style={styles.foodName}>{alim.nombre}</Text>
                                            <Text style={styles.foodSub}>{Math.round(alim.calorias_100g)} Kcal (P: {Math.round(alim.proteinas_100g)} C: {Math.round(alim.carbohidratos_100g)} G: {Math.round(alim.grasas_100g)})</Text>
                                        </View>
                                        <Text style={styles.plusIcon}>+</Text>
                                    </TouchableOpacity>
                                ))}
                        </View>

                    </ScrollView>
                    {/* BOTÓN GUARDAR - fijo en la parte inferior */}
                    <View style={{ padding: 20, paddingBottom: 30, backgroundColor: '#f8f9fa', borderTopWidth: 1, borderTopColor: '#eee' }}>
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
                    </View>
                </View>
            </Modal>

            {/* MODAL CREAR ALIMENTO PERSONALIZADO */}
            <Modal visible={modalAlimentoVisible} animationType="fade" transparent>
                <View style={styles.fullOverlay}>
                    <View style={styles.modalSmall}>
                        <Text style={styles.modalSub}>Añadir Nuevo Alimento</Text>
                        
                        <Text style={styles.smallLabel}>Nombre del alimento</Text>
                        <TextInput style={styles.modalInputSmall} value={nuevoAlim.nombre} onChangeText={(t) => setNuevoAlim({...nuevoAlim, nombre: t})} />
                        
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallLabel}>Kcal (100g)</Text>
                                <TextInput style={styles.modalInputSmall} keyboardType="numeric" placeholder="Ej: 250" value={nuevoAlim.kcal} onChangeText={(t) => setNuevoAlim({...nuevoAlim, kcal: t})} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallLabel}>Proteínas (g)</Text>
                                <TextInput style={styles.modalInputSmall} keyboardType="numeric" placeholder="Ej: 20" value={nuevoAlim.prot} onChangeText={(t) => setNuevoAlim({...nuevoAlim, prot: t})} />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallLabel}>Carbos (g)</Text>
                                <TextInput style={styles.modalInputSmall} keyboardType="numeric" placeholder="Ej: 0" value={nuevoAlim.carb} onChangeText={(t) => setNuevoAlim({...nuevoAlim, carb: t})} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.smallLabel}>Grasas (g)</Text>
                                <TextInput style={styles.modalInputSmall} keyboardType="numeric" placeholder="Ej: 15" value={nuevoAlim.gras} onChangeText={(t) => setNuevoAlim({...nuevoAlim, gras: t})} />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.btnConfirm, creandoAlimento && {opacity: 0.7}]} onPress={handleCrearAlimentoCustom} disabled={creandoAlimento}>
                            <Text style={styles.btnConfirmText}>{creandoAlimento ? 'Guardando...' : 'GUARDAR ALIMENTO'}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setModalAlimentoVisible(false)} style={{ marginTop: 15 }}>
                            <Text style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL AÑADIR ALIMENTO EN EDICIÓN */}
            <Modal visible={modalAlimentosEdicion} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Añadir alimento</Text>
                        <TouchableOpacity onPress={() => { setModalAlimentosEdicion(false); setBusquedaEdicion(''); }}>
                            <Text style={styles.closeModalText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        placeholder="Buscar..."
                        style={styles.searchInput}
                        value={busquedaEdicion}
                        onChangeText={setBusquedaEdicion}
                        placeholderTextColor="#999"
                    />
                    <View style={styles.customExerciseActions}>
                        <TouchableOpacity
                            style={styles.customExerciseButton}
                            onPress={() => {
                                setNuevoAlim({ nombre: busquedaEdicion, kcal: '', prot: '', carb: '', gras: '' });
                                setContextoCrearAlimento('edicion');
                                setModalAlimentosEdicion(false);
                                setModalAlimentoVisible(true);
                            }}
                        >
                            <Text style={styles.customExerciseButtonText}>+ Crear alimento personalizado</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        {alimentosCatalogo
                            .filter(a => busquedaEdicion.length === 0 || a.nombre.toLowerCase().includes(busquedaEdicion.toLowerCase()))
                            .map((alim, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.foodItem}
                                    onPress={() => {
                                        añadirAlimentoAComida(comidaDetalleId, alim);
                                        setModalAlimentosEdicion(false);
                                        setBusquedaEdicion('');
                                    }}
                                >
                                    <View>
                                        <Text style={styles.foodName}>{alim.nombre}</Text>
                                        <Text style={styles.foodSub}>{Math.round(alim.calorias_100g)} Kcal (P: {Math.round(alim.proteinas_100g)} C: {Math.round(alim.carbohidratos_100g)} G: {Math.round(alim.grasas_100g)})</Text>
                                    </View>
                                    <Text style={styles.plusIcon}>+</Text>
                                </TouchableOpacity>
                            ))
                        }
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL CONFIRMACIÓN GENÉRICA */}
            <Modal transparent={true} visible={confirmModal.visible} animationType="fade">
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalCard}>
                        <Text style={styles.confirmModalTitle}>{confirmModal.title}</Text>
                        <Text style={styles.confirmModalMsg}>{confirmModal.message}</Text>
                        <View style={styles.confirmModalActions}>
                            <TouchableOpacity style={styles.confirmModalBtnCancel} onPress={() => setConfirmModal({ ...confirmModal, visible: false })}>
                                <Text style={styles.confirmModalBtnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmModalBtnConfirm} onPress={confirmModal.onConfirm}>
                                <Text style={styles.confirmModalBtnConfirmText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    loading: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    topBarLogo: { width: 140, height: 51, tintColor: '#ff7a00', marginLeft: -35 },

    // ESTILOS DEL AVATAR Y MENÚ DESPLEGABLE
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
    backToMenuText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 15, opacity: 0.9 },
    methodLabel: { color: '#ffffff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, opacity: 0.9 },
    title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btnAddCircle: { backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
    btnAddText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    btnAddPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white' },
    btnAddPillText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
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
    comidaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingRight: 30 },
    comidaTitle: { fontSize: 16, fontWeight: '900', color: '#333' },
    comidaTime: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    deleteComidaX: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,68,68,0.15)', justifyContent: 'center', alignItems: 'center' },
    deleteComidaXText: { color: '#ff4444', fontSize: 14, fontWeight: '900', lineHeight: 18 },
    comidaEditBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
    comidaEditBtnActive: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
    comidaEditBtnText: { color: 'white', fontSize: 11, fontWeight: '900' },
    comidaEditBtnTextActive: { color: 'white' },
    comidaGramInput: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, width: 50, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#333' },
    comidaMacros: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ef', padding: 10, borderRadius: 10, marginBottom: 10 },
    comidaKcal: { color: '#ff7a00', fontWeight: '900', fontSize: 14, marginRight: 15 },
    comidaMacroItem: { fontSize: 12, color: '#666', fontWeight: 'bold', marginRight: 10 },
    comidaItems: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    comidaItemText: { fontSize: 13, color: '#555', marginBottom: 4 },
    btnDeleteComida: { padding: 5, backgroundColor: '#ffeeee', borderRadius: 8 },
    deleteComidaIcon: { fontSize: 16 },

    // MODAL STYLES
    modalContainer: { flex: 1, backgroundColor: '#f8f9fa' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#333' },
    closeModalText: { color: '#ff7a00', fontWeight: 'bold' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 15 },
    modalInput: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', fontSize: 16, color: '#333', marginBottom: 10 },
    
    // ESTILOS FRANJAS HORARIAS
    franjasContainer: { flexDirection: 'row', marginBottom: 15, paddingBottom: 5 },
    franjaChip: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
    franjaChipActive: { backgroundColor: '#ff7a00' },
    franjaChipText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
    franjaChipTextActive: { color: '#fff' },

    // ESTILOS BUSCADOR (Estilo Rutina)
    searchInput: { backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, fontSize: 16, color: '#333', marginBottom: 20 },
    resultsContainer: { marginTop: 5 },
    foodItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
    foodName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    foodSub: { fontSize: 12, color: '#999', marginTop: 2 },
    plusIcon: { fontSize: 24, color: '#ff7a00', fontWeight: 'bold', paddingRight: 5 },
    btnAñadirCustom: { padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ff7a00', borderRadius: 12, alignItems: 'center', marginTop: 10, backgroundColor: '#fff7ef' },
    btnAñadirCustomText: { color: '#ff7a00', fontWeight: 'bold', fontSize: 13 },
    btnAdd: { backgroundColor: 'white', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    btnAddText: { color: '#ff7a00', fontWeight: '900' },
    customExerciseActions: { paddingHorizontal: 15, paddingBottom: 5 },
    customExerciseButton: { backgroundColor: '#ff7a00', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
    customExerciseButtonText: { color: 'white', fontWeight: '900', fontSize: 12 },
    
    // MODAL PEQUEÑO
    fullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalSmall: { backgroundColor: 'white', width: '85%', borderRadius: 20, padding: 20 },
    modalSub: { fontWeight: '900', fontSize: 18, color: '#333', marginBottom: 15, textAlign: 'center' },
    modalInputSmall: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginBottom: 10, color: '#333', fontWeight: 'bold' },
    smallLabel: { fontSize: 11, color: '#666', fontWeight: 'bold', marginBottom: 4 },

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

    // ESTILOS MODAL CONFIRMACIÓN
    confirmModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    confirmModalCard: { backgroundColor: 'white', width: '80%', padding: 25, borderRadius: 20, elevation: 10 },
    confirmModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    confirmModalMsg: { fontSize: 14, color: '#666', marginBottom: 25, lineHeight: 20 },
    confirmModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
    confirmModalBtnCancel: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#f0f0f0' },
    confirmModalBtnCancelText: { color: '#666', fontWeight: 'bold' },
    confirmModalBtnConfirm: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#ff4444' },
    confirmModalBtnConfirmText: { color: 'white', fontWeight: 'bold' },

    navContainer: { position: 'absolute', bottom: 25, left: 20, right: 20 },
    tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', height: 60, borderRadius: 25, alignItems: 'center', elevation: 10 },
    tabBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabBarText: { fontSize: 13, fontWeight: '900', color: '#bbb', letterSpacing: 1 },
    tabBarTextActive: { color: '#ff7a00' },
});
