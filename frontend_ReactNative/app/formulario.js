import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Formulario() {
    const router = useRouter();
    const [sexo, setSexo] = useState(null);
    const [objetivo, setObjetivo] = useState(null);
    const [datos, setDatos] = useState({ peso: '', altura: '', edad: '', dias: '' });

    const enviar = async () => {
        // Validación: Ahora incluimos 'datos.dias' en la comprobación
        if (!datos.peso || !objetivo || !sexo || !datos.dias) {
            Alert.alert("Campos incompletos", "Por favor, completa todos los campos, incluyendo los días disponibles.");
            return;
        }

        const numDias = parseInt(datos.dias);
        if (isNaN(numDias) || numDias < 1 || numDias > 7) {
            Alert.alert("Dato inválido", "Por favor, introduce un número de días entre 1 y 7.");
            return;
        }

        // Simulación de rutina ampliada (Estructura de 7 días)
        const dataSimulada = {
            metodo: `Plan para ${objetivo === 'masa' ? 'Subir Masa' : objetivo === 'definicion' ? 'Definición' : 'Mantenimiento'}`,
            rutina: {
                "Lunes (Empuje)": ["Press Banca 4x8", "Press Militar 3x10", "Aperturas Mancuerna 3x12", "Tríceps Polea 3x15"],
                "Martes (Tracción)": ["Dominadas 3xMAX", "Remo con Barra 4x8", "Facepull 3x15", "Curl de Bíceps 3x12"],
                "Miércoles (Pierna)": ["Sentadilla 4x6", "Prensa 3x10", "Curl Femoral 3x12", "Extensiones Cuádriceps 3x15"],
                "Jueves (Torso)": ["Press Inclinado 3x10", "Remo en Polea 3x10", "Elevaciones Laterales 4x15", "Fondos 3x12"],
                "Viernes (Pierna/Core)": ["Peso Muerto 3x6", "Zancadas 3x12", "Gemelos 4x20", "Plancha Abdominal 3x1min"],
                "Sábado (Fullbody)": ["Burpees 3x15", "Press Mancuernas 3x10", "Copa Tríceps 3x12", "Dominadas Supinas 3x8"],
                "Domingo (Descanso Activo)": ["Caminar 30-40 min", "Estiramientos dinámicos", "Movilidad articular"]
            }
        };

        // Guardamos en AsyncStorage
        await AsyncStorage.setItem("rutina", JSON.stringify(dataSimulada));
        router.push('/rutina');
    };

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.card}>
                <Text style={styles.h1}>¡Bienvenido!</Text>
                <Text style={styles.subtitle}>Cuéntanos sobre ti para crear tu plan personalizado</Text>

                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Ej: 70"
                    onChangeText={(t) => setDatos({...datos, peso: t})}
                />

                <Text style={styles.label}>Altura (cm)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Ej: 175"
                    onChangeText={(t) => setDatos({...datos, altura: t})}
                />

                <Text style={styles.label}>Sexo</Text>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={[styles.btnSex, sexo === 'masculino' && styles.active]}
                        onPress={() => setSexo('masculino')}
                    >
                        <Text style={sexo === 'masculino' ? styles.textWhite : {}}>Masculino</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btnSex, sexo === 'femenino' && styles.active]}
                        onPress={() => setSexo('femenino')}
                    >
                        <Text style={sexo === 'femenino' ? styles.textWhite : {}}>Femenino</Text>
                    </TouchableOpacity>
                </View>

                {/* NUEVO CAMPO: DÍAS DISPONIBLES */}
                <Text style={styles.label}>Días disponibles (1-7)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Ej: 4"
                    maxLength={1} // Solo permitimos un carácter
                    onChangeText={(t) => setDatos({...datos, dias: t})}
                />

                <Text style={styles.label}>Objetivo</Text>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'masa' && styles.active]}
                    onPress={() => setObjetivo('masa')}
                >
                    <Text style={objetivo === 'masa' && styles.textWhite}>💪 Subir masa muscular</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'definicion' && styles.active]}
                    onPress={() => setObjetivo('definicion')}
                >
                    <Text style={objetivo === 'definicion' && styles.textWhite}>🔥 Bajar de peso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'mantenimiento' && styles.active]}
                    onPress={() => setObjetivo('mantenimiento')}
                >
                    <Text style={objetivo === 'mantenimiento' && styles.textWhite}>⚖️ Mantenimiento</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submit} onPress={enviar}>
                    <Text style={styles.submitText}>Generar mi plan personalizado</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, backgroundColor: '#ff7a00', padding: 20, justifyContent: 'center' },
    card: { backgroundColor: '#f3f3f3', padding: 20, borderRadius: 20 },
    h1: { fontSize: 24, fontWeight: 'bold', color: '#ff7a00', textAlign: 'center' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: 20, marginTop: 15 },
    label: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    btnSex: { flex: 1, padding: 12, backgroundColor: '#ddd', borderRadius: 10, alignItems: 'center' },
    btnObj: { padding: 15, backgroundColor: '#ddd', borderRadius: 10, marginBottom: 10 },
    active: { backgroundColor: '#ff7a00' },
    textWhite: { color: 'white', fontWeight: 'bold' },
    submit: { backgroundColor: 'red', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});