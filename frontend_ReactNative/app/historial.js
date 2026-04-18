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
            Alert.alert("Error", "No se pudo conectar con el servidor. Verifica el backend.");
        } finally {
            setLoading(false);
        }
    };

    const getDiasMes = (fecha) => {
        const año = fecha.getFullYear();
        const mes = fecha.getMonth();
        const primerDia = new Date(año, mes, 1);
        const ultimoDia = new Date(año, mes + 1, 0);
        
        const dias = [];
        const diaSemanaInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1; 
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

        const hoy = new Date();
        const limiteAtras = new Date();
        limiteAtras.setMonth(hoy.getMonth() - 3);

        // Bloquear ir al futuro
        if (nueva.getFullYear() > hoy.getFullYear() || (nueva.getFullYear() === hoy.getFullYear() && nueva.getMonth() > hoy.getMonth())) {
            return;
        }

        // Bloquear ir más atrás de 3 meses (lógica Free actual)
        if (nueva.getFullYear() < limiteAtras.getFullYear() || (nueva.getFullYear() === limiteAtras.getFullYear() && nueva.getMonth() < limiteAtras.getMonth())) {
            Alert.alert("Historial Limitado", "Las cuentas gratuitas solo pueden ver los últimos 3 meses de historial. La funcionalidad Premium llegará en el próximo sprint.");
            return;
        }

        setFechaReferencia(nueva);
    };

    const diasDelMes = getDiasMes(fechaReferencia);
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const dataHoy = historialData[diaSeleccionado] || { entrenamientos: [], comidas: [] };
    
    const calcularMacrosTotales = (comidas) => {
        let totales = { kcal: 0, prot: 0, carb: 0, gras: 0 };
        comidas.forEach(c => {
            const factor = Number(c.cantidad_gramos) / 100;
            totales.kcal += Number(c.alimento?.calorias_100g || 0) * factor;
            totales.prot += Number(c.alimento?.proteinas_100g || 0) * factor;
            totales.carb += Number(c.alimento?.carbohidratos_100g || 0) * factor;
            totales.gras += Number(c.alimento?.grasas_100g || 0) * factor;
        });
        return totales;
    };

    const macros = calcularMacrosTotales(dataHoy.comidas);

    let eventosDia = [];
    if (dataHoy.entrenamientos) {
        dataHoy.entrenamientos.forEach(e => {
            eventosDia.push({
                tipo: 'entrenamiento',
                fecha: new Date(e.fecha_inicio),
                datos: e
            });
        });
    }
    if (dataHoy.comidas) {
        dataHoy.comidas.forEach(c => {
            eventosDia.push({
                tipo: 'comida',
                fecha: new Date(c.fecha),
                datos: c
            });
        });
    }
    eventosDia.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff7a00" />
                <Text style={{color: 'white', marginTop: 10}}>Sincronizando progreso...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Mi Historial RumboFit</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
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

                {!esPremium && (
                    <View style={styles.premiumBanner}>
                        <Text style={styles.premiumText}>Muestras de los últimos 3 meses (Gratis). ¡Pásate a Premium para ver todo!</Text>
                    </View>
                )}

                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Detalle del {diaSeleccionado.split('-').reverse().join('/')}</Text>
                    
                    {dataHoy.comidas.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Resumen Nutricional</Text>
                            </View>
                            <View style={styles.nutritionSummary}>
                                <View style={styles.nutItem}><Text style={styles.nutVal}>{macros.kcal.toFixed(0)}</Text><Text style={styles.nutLab}>Kcal</Text></View>
                                <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#3498db'}]}>{macros.prot.toFixed(1)}g</Text><Text style={styles.nutLab}>P</Text></View>
                                <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#2ecc71'}]}>{macros.carb.toFixed(1)}g</Text><Text style={styles.nutLab}>C</Text></View>
                                <View style={styles.nutItem}><Text style={[styles.nutVal, {color: '#f1c40f'}]}>{macros.gras.toFixed(1)}g</Text><Text style={styles.nutLab}>G</Text></View>
                            </View>
                        </View>
                    )}

                    {eventosDia.length > 0 ? (
                        eventosDia.map((ev, i) => {
                            const horaFormateada = ev.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            if (ev.tipo === 'entrenamiento') {
                                return (
                                    <View key={i} style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.cardTitle}>Entrenamiento</Text>
                                            <Text style={styles.cardCount}>{horaFormateada}</Text>
                                        </View>
                                        <View style={styles.sessionItem}>
                                            <Text style={styles.sessionVolume}>Volumen Total: {Number(ev.datos.volumen_total_kg).toFixed(1)} kg</Text>
                                            {ev.datos.series.map((s, idx) => (
                                                <Text key={idx} style={styles.exerciseLine}>• {s.ejercicio.nombre}: {s.peso_kg}kg x {s.repeticiones_reales}</Text>
                                            ))}
                                        </View>
                                    </View>
                                );
                            } else {
                                return (
                                    <View key={i} style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.cardTitle}>{ev.datos.franja_horaria}</Text>
                                            <Text style={styles.cardCount}>{horaFormateada}</Text>
                                        </View>
                                        <Text style={styles.foodLine}>• {ev.datos.alimento?.nombre || 'Alimento'} ({ev.datos.cantidad_gramos}g)</Text>
                                    </View>
                                );
                            }
                        })
                    ) : (
                        <Text style={styles.noData}>Nada registrado hoy.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#1a1a1a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backText: { color: '#ff7a00', fontSize: 30, fontWeight: 'bold' },
    title: { color: '#ff7a00', fontSize: 18, fontWeight: '900' },
    
    calendarContainer: { margin: 20, backgroundColor: 'white', borderRadius: 25, padding: 15, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calNav: { color: '#ff7a00', fontSize: 24, fontWeight: 'bold', paddingHorizontal: 10 },
    calMonth: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' },
    weekDays: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { width: '14.28%', textAlign: 'center', color: '#888', fontWeight: 'bold', fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderRadius: 12 },
    daySelected: { backgroundColor: '#ff7a00' },
    dayText: { color: '#555', fontSize: 14, fontWeight: '600' },
    dayTextActive: { color: 'white', fontWeight: 'bold' },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ff7a00', marginTop: 4, position: 'absolute', bottom: 5 },
    
    premiumBanner: { backgroundColor: 'rgba(255,122,0,0.1)', marginHorizontal: 20, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ff7a00' },
    premiumText: { color: '#e66e00', fontSize: 12, textAlign: 'center', fontWeight: '700' },

    summaryContainer: { padding: 20 },
    summaryTitle: { color: '#888', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
    card: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: 'bold' },
    cardCount: { color: '#888', fontSize: 12, fontWeight: '600' },
    noData: { color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
    
    sessionItem: { marginBottom: 15 },
    sessionVolume: { color: '#ff7a00', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    exerciseLine: { color: '#555', fontSize: 13, marginLeft: 10, marginBottom: 4 },
    
    nutritionSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    nutItem: { alignItems: 'center' },
    nutVal: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' },
    nutLab: { color: '#888', fontSize: 11, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    foodLine: { color: '#555', fontSize: 13, marginBottom: 5 },
    
    timelineItem: { marginBottom: 20, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#ff7a00' },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    timelineIcon: { fontSize: 16, marginRight: 8 },
    timelineTitle: { color: '#1a1a1a', fontSize: 14, fontWeight: 'bold' }
});