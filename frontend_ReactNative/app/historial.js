import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

// Configuración del idioma
LocaleConfig.locales['es'] = {
    monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function Historial() {
    const router = useRouter();
    const [rutinasDB, setRutinasDB] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [diaSeleccionado, setDiaSeleccionado] = useState(null);
    const [ejerciciosDelDia, setEjerciciosDelDia] = useState([]);

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            const res = await fetch(`${API_URL}/usuarios/${userId}/rutinas-guardadas`);
            const data = await res.json();
            setRutinasDB(data);

            // Marcamos en el calendario los días que tienen rutinas guardadas
            let marks = {};
            data.forEach(item => {
                // Usamos la fecha de creación de la rutina guardada
                const fecha = item.fecha_registro?.split('T')[0] || new Date().toISOString().split('T')[0];
                marks[fecha] = {
                    marked: true,
                    dotColor: '#ff7a00',
                    selected: true,
                    selectedColor: 'rgba(255, 122, 0, 0.2)',
                    customStyles: {
                        container: { elevation: 4, shadowColor: '#ff7a00' },
                        text: { color: '#ff7a00', fontWeight: 'bold' }
                    }
                };
            });
            setMarkedDates(marks);
        } catch (e) {
            console.error("Error al cargar historial:", e);
        }
    };

    const handleDayPress = (day) => {
        setDiaSeleccionado(day.dateString);
        // Buscamos si hay una rutina para ese día
        const rutinaDelDia = rutinasDB.find(r => r.fecha_registro?.includes(day.dateString));

        if (rutinaDelDia) {
            const esquema = JSON.parse(rutinaDelDia.descripcion);
            // Extraemos todos los ejercicios de todos los días para mostrar qué se hizo
            const listaEjercicios = [];
            Object.values(esquema.ejercicios || {}).forEach(diaArr => {
                diaArr.forEach(ej => {
                    const completado = esquema.completados && esquema.completados[ej.split(' ')[0]];
                    listaEjercicios.push({ nombre: ej, completado });
                });
            });
            setEjerciciosDelDia(listaEjercicios);
        } else {
            setEjerciciosDelDia([]);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Progreso</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Calendario "3D" Card */}
                <View style={styles.calendarCard}>
                    <Calendar
                        theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: '#ff7a00',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#ff7a00',
                            dayTextColor: '#2d4150',
                            arrowColor: '#ff7a00',
                            monthTextColor: '#1a1a1a',
                            indicatorColor: 'blue',
                            textDayFontWeight: '600',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '500',
                            textDayFontSize: 14,
                            textMonthFontSize: 18,
                            textDayHeaderFontSize: 12
                        }}
                        onDayPress={handleDayPress}
                        markedDates={{
                            ...markedDates,
                            [diaSeleccionado]: {
                                ...markedDates[diaSeleccionado],
                                selected: true,
                                selectedColor: '#ff7a00'
                            }
                        }}
                    />
                </View>

                {/* Detalles del día seleccionado */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>
                        {diaSeleccionado ? `Sesión del ${diaSeleccionado}` : "Selecciona un día marcado"}
                    </Text>

                    {ejerciciosDelDia.length > 0 ? (
                        ejerciciosDelDia.map((item, index) => (
                            <View key={index} style={[styles.exerciseRow, item.completado && styles.completedRow]}>
                                <View style={[styles.dot, { backgroundColor: item.completado ? '#2ecc71' : '#ccc' }]} />
                                <Text style={[styles.exerciseText, item.completado && styles.completedText]}>
                                    {item.nombre}
                                </Text>
                                {item.completado && <Text style={styles.checkIcon}>✓</Text>}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No hay registros para este día.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4
    },
    backBtn: { marginRight: 20 },
    backText: { color: '#ff7a00', fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },

    calendarCard: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 25,
        padding: 10,
        // Efecto 3D / Elevación
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },

    detailsContainer: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#666', marginBottom: 15, textTransform: 'uppercase' },

    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 2
    },
    completedRow: { backgroundColor: '#f0fff4', borderColor: '#2ecc71', borderWidth: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
    exerciseText: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
    completedText: { color: '#2ecc71', textDecorationLine: 'line-through' },
    checkIcon: { color: '#2ecc71', fontWeight: 'bold' },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#999', fontSize: 14 }
});