import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

export default function Historial() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [historialData, setHistorialData] = useState({});
    const [esPremium, setEsPremium] = useState(false);
    
    // --- ESTADOS CALENDARIO ---
    const [fechaReferencia, setFechaReferencia] = useState(new Date());
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) return;

            const response = await fetch(`${API_URL}/usuarios/${userId}/historial`);
            const result = await response.json();

            if (result.success) {
                setHistorialData(result.historial);
                setEsPremium(result.es_premium);
            }
        } catch (error) {
            console.error("Error cargando historial:", error);
            Alert.alert("Error", "No se pudo conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE CALENDARIO ---
    const getDiasMes = (fecha) => {
        const año = fecha.getFullYear();
        const mes = fecha.getMonth();
        const primerDia = new Date(año, mes, 1);
        const ultimoDia = new Date(año, mes + 1, 0);
        
        const dias = [];
        // Rellenar días vacíos al inicio (si el mes empieza en miércoles, dejamos huecos para Lunes y Martes)
        const diaSemanaInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1; // Ajustado a L-D
        for (let i = 0; i < diaSemanaInicio; i++) {
            dias.push(null);
        }

        for (let i = 1; i <= ultimoDia.getDate(); i++) {
            const dateStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dias.push({ dia: i, fechaStr: dateStr });
        }
        return dias;
    };

    const cambiarMes = (offset) => {
        const nueva = new Date(fechaReferencia);
        nueva.setMonth(nueva.getMonth() + offset);
        setFechaReferencia(nueva);
    };

    const diasDelMes = getDiasMes(fechaReferencia);
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // --- RENDERIZADO DE DATOS DEL DÍA ---
    const dataHoy = historialData[diaSeleccionado] || { entrenamientos: [], comidas: [] };
    
    const calcularMacrosTotales = (comidas) => {
        let totales = { kcal: 0, prot: 0, carb: 0, gras: 0 };
        comidas.forEach(c => {
            const factor = Number(c.cantidad_gramos) / 100;
            totales.kcal += Number(c.alimento.calorias_100g) * factor;
            totales.prot += Number(c.alimento.proteinas_100g) * factor;
            totales.carb += Number(c.alimento.carbohidratos_100g) * factor;
            totales.gras += Number(c.alimento.grasas_100g) * factor;
        });
        return totales;
    };

    const macros = calcularMacrosTotales(dataHoy.comidas);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff7a00" />
                <Text style={{color: 'white', marginTop: 10}}>Cargando historial unificado...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Historial RumboFit</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
                
                {/* CALENDARIO */}
                <View style={styles.calendarContainer}>
                    <View style={styles.calHeader}>
                        <TouchableOpacity onPress={() => cambiarMes(-1)}><Text style={styles.calNav}>{'<'}</Text></TouchableOpacity>
                        <Text style={styles.calMonth}>{nombresMeses[fechaReferencia.getMonth()]} {fechaReferencia.getFullYear()}</Text>
                        <TouchableOpacity onPress={() => cambiarMes(1)}><Text style={styles.calNav}>{'>'}</Text></TouchableOpacity>
                    </View>

                    <View style={styles.weekDays}>
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
                    </View>

                    <View style={styles.grid}>
                        {diasDelMes.map((item, idx) => {
                            if (!item) return <View key={`null-${idx}`} style={styles.dayCell} />;
                            
                            const tieneActividad = historialData[item.fechaStr];
                            const esSeleccionado = diaSeleccionado === item.fechaStr;

                            return (
                                <TouchableOpacity 
                                    key={item.fechaStr} 
                                    style={[styles.dayCell, esSeleccionado && styles.daySelected]} 
                                    onPress={() => setDiaSeleccionado(item.fechaStr)}
                                >
                                    <Text style={[styles.dayText, esSeleccionado && styles.dayTextActive]}>{item.dia}</Text>
                                    {tieneActividad && <View style={styles.dot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* LIMITACIÓN PREMIUM */}
                {!esPremium && (
                    <View style={styles.premiumBanner}>
                        <Text style={styles.premiumText}>Muestras de los últimos 3 meses (Gratis). ¡Pásate a Premium para ver todo!</Text>
                    </View>
                )}

                {/* DETALLE DEL DÍA */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Resumen del {diaSeleccionado.split('-').reverse().join('/')}</Text>
                    
                    {/* ENTRENAMIENTOS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>🏋️ Entrenamiento</Text>
                            <Text style={styles.cardCount}>{dataHoy.entrenamientos.length} sesiones</Text>
                        </View>
                        {dataHoy.entrenamientos.length > 0 ? (
                            dataHoy.entrenamientos.map((ent, i) => (
                                <View key={i} style={styles.sessionItem}>
                                    <Text style={styles.sessionVolume}>Volumen: {Number(ent.volumen_total_kg).toFixed(1)} kg</Text>
                                    {ent.series.map((s, idx) => (
                                        <Text key={idx} style={styles.exerciseLine}>• {s.ejercicio.nombre}: {s.peso_kg}kg x {s.repeticiones_reales}</Text>
                                    ))}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noData}>No hay entrenamientos registrados.</Text>
                        )}
                    </View>

                    {/* NUTRICIÓN */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>🍎 Nutrición</Text>
                            <Text style={styles.cardCount}>{dataHoy.comidas.length} registros</Text>
                        </View>
                        {dataHoy.comidas.length > 0 ? (
                            <>
                                <View style={styles.nutritionSummary}>
                                    <View style={styles.nutItem}><Text style={styles.nutVal}>{macros.kcal.toFixed(0)}</Text><Text style={styles.nutLab}>Kcal</Text></View>
                                    <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#3498db'}]}>{macros.prot.toFixed(1)}g</Text><Text style={styles.nutLab}>P</Text></View>
                                    <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#2ecc71'}]}>{macros.carb.toFixed(1)}g</Text><Text style={styles.nutLab}>C</Text></View>
                                    <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#f1c40f'}]}>{macros.gras.toFixed(1)}g</Text><Text style={styles.nutLab}>G</Text></View>
                                </View>
                                <View style={styles.divider} />
                                {dataHoy.comidas.map((com, i) => (
                                    <Text key={i} style={styles.foodLine}>• [{com.franja_horaria}] {com.alimento.nombre} ({com.cantidad_gramos}g)</Text>
                                ))}
                            </>
                        ) : (
                            <Text style={styles.noData}>No hay comidas registradas.</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backText: { color: '#ff7a00', fontSize: 30, fontWeight: 'bold' },
    title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    
    // CALENDARIO
    calendarContainer: { margin: 20, backgroundColor: '#1e1e1e', borderRadius: 20, padding: 15, elevation: 10 },
    calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calNav: { color: '#ff7a00', fontSize: 24, fontWeight: 'bold', paddingHorizontal: 10 },
    calMonth: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    weekDays: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { flex: 1, textAlign: 'center', color: '#666', fontWeight: 'bold', fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: (width - 70) / 7, height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderRadius: 10 },
    daySelected: { backgroundColor: '#ff7a00' },
    dayText: { color: '#bbb', fontSize: 14, fontWeight: '600' },
    dayTextActive: { color: 'white', fontWeight: 'bold' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ff7a00', marginTop: 4, position: 'absolute', bottom: 5 },
    
    premiumBanner: { backgroundColor: 'rgba(255,122,0,0.1)', marginHorizontal: 20, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,122,0,0.3)' },
    premiumText: { color: '#ff7a00', fontSize: 11, textAlign: 'center', fontWeight: '600' },

    // RESUMEN
    summaryContainer: { padding: 20 },
    summaryTitle: { color: '#888', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
    card: { backgroundColor: '#1e1e1e', borderRadius: 20, padding: 20, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    cardCount: { color: '#666', fontSize: 12 },
    noData: { color: '#555', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
    
    // SESSION
    sessionItem: { marginBottom: 15 },
    sessionVolume: { color: '#ff7a00', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    exerciseLine: { color: '#ccc', fontSize: 13, marginLeft: 10, marginBottom: 2 },
    
    // NUTRITION
    nutritionSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    nutItem: { alignItems: 'center' },
    nutVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    nutLab: { color: '#666', fontSize: 10, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
    foodLine: { color: '#ccc', fontSize: 13, marginBottom: 5 }
});
