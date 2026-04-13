import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_URL } from '../config';

export default function Formulario() {
    const router = useRouter();
    const [sexo, setSexo] = useState(null);
    const [objetivo, setObjetivo] = useState(null);
    const [nivel, setNivel] = useState('Principiante');
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

        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                Alert.alert("Error de sesión", "No se encontró el ID de usuario. Por favor, re-inicia sesión.");
                return;
            }

            const response = await fetch(`${API_URL}/rutinas/generar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    peso: datos.peso,
                    altura: datos.altura,
                    edad: datos.edad,
                    experiencia: nivel,
                    objetivo: objetivo,
                    dias: numDias
                })
            });

            const result = await response.json();

            if (result.success) {
                // Guardamos la rutina real en el móvil
                await AsyncStorage.setItem("rutina", JSON.stringify(result));
                router.push('/rutina');
            } else {
                Alert.alert("Error", result.error || "No se pudo generar la rutina.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
        }
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

                <Text style={styles.label}>Edad</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Ej: 25"
                    onChangeText={(t) => setDatos({...datos, edad: t})}
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

                <Text style={styles.label}>Experiencia</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15, paddingBottom: 5}}>
                    <TouchableOpacity
                        style={[styles.btnExp, nivel === 'Principiante' && styles.active]}
                        onPress={() => setNivel('Principiante')}
                    >
                        <Text style={nivel === 'Principiante' && styles.textWhite}>Principiante</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btnExp, nivel === 'Intermedio' && styles.active]}
                        onPress={() => setNivel('Intermedio')}
                    >
                        <Text style={nivel === 'Intermedio' && styles.textWhite}>Intermedio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btnExp, nivel === 'Atleta' && styles.active]}
                        onPress={() => setNivel('Atleta')}
                    >
                        <Text style={nivel === 'Atleta' && styles.textWhite}>Atleta</Text>
                    </TouchableOpacity>
                </ScrollView>

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
                    style={[styles.btnObj, objetivo === 'Subir masa muscular' && styles.active]}
                    onPress={() => setObjetivo('Subir masa muscular')}
                >
                    <Text style={objetivo === 'Subir masa muscular' && styles.textWhite}>Subir masa muscular</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'Bajar de peso' && styles.active]}
                    onPress={() => setObjetivo('Bajar de peso')}
                >
                    <Text style={objetivo === 'Bajar de peso' && styles.textWhite}>Bajar de peso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'mantenimiento' && styles.active]}
                    onPress={() => setObjetivo('mantenimiento')}
                >
                    <Text style={objetivo === 'mantenimiento' && styles.textWhite}>Mantenimiento</Text>
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
    btnExp: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#ddd', borderRadius: 10, marginRight: 10, height: 45, justifyContent: 'center' },
    btnObj: { padding: 15, backgroundColor: '#ddd', borderRadius: 10, marginBottom: 10 },
    active: { backgroundColor: '#ff7a00' },
    textWhite: { color: 'white', fontWeight: 'bold' },
    submit: { backgroundColor: 'red', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});