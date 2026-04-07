import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';

// CONFIGURACIÓN: Tu IP local
const API_URL = "http://192.168.1.20:3000/api";

export default function Formulario() {
    const router = useRouter();

    // Estados para todos los datos del formulario
    const [datos, setDatos] = useState({
        peso: '',
        altura: '',
        edad: '',
        frecuencia: ''
    });
    const [sexo, setSexo] = useState('');
    const [objetivo, setObjetivo] = useState('');

    const enviar = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");

            if (!userId) {
                Alert.alert("Error", "No se encontró sesión de usuario.");
                router.replace('/');
                return;
            }

            if (!datos.peso || !datos.altura || !datos.edad || !datos.frecuencia || !sexo || !objetivo) {
                Alert.alert("Atención", "Por favor completa todos los campos del formulario.");
                return;
            }

            // Lógica para transformar el valor del objetivo antes de enviar
            let objetivoTexto = '';
            if (objetivo === 'masa') objetivoTexto = 'Subir masa muscular';
            else if (objetivo === 'definicion') objetivoTexto = 'Bajar de peso';
            else if (objetivo === 'mantenimiento') objetivoTexto = 'Mantener peso';

            const response = await fetch(`${API_URL}/diagnostico`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    peso: datos.peso,
                    altura: datos.altura,
                    edad: datos.edad,
                    frecuencia_semanal: datos.frecuencia,
                    sexo: sexo,
                    objetivo: objetivoTexto
                })
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("¡Éxito!", "Tu plan ha sido generado correctamente.");
                router.replace('/rutina');
            } else {
                Alert.alert("Error", data.error || "No se pudo guardar.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No hay conexión con el servidor.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.card}>
                <Text style={styles.h1}>¡Bienvenido!</Text>
                <Text style={styles.subtitle}>Configura tu perfil para empezar</Text>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Peso (kg)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="70"
                            onChangeText={(t) => setDatos({...datos, peso: t})}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Altura (cm)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="175"
                            onChangeText={(t) => setDatos({...datos, altura: t})}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Edad</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="25"
                            onChangeText={(t) => setDatos({...datos, edad: t})}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Días/Semana</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="1-7"
                            maxLength={1}
                            onChangeText={(t) => setDatos({...datos, frecuencia: t})}
                        />
                    </View>
                </View>

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

                <Text style={styles.label}>Objetivo</Text>
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'masa' && styles.active]}
                    onPress={() => setObjetivo('masa')}
                >
                    <Text style={objetivo === 'masa' ? styles.textWhite : {}}>💪 Subir masa muscular</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'definicion' && styles.active]}
                    onPress={() => setObjetivo('definicion')}
                >
                    <Text style={objetivo === 'definicion' ? styles.textWhite : {}}>🔥 Bajar de peso</Text>
                </TouchableOpacity>

                {/* NUEVO BOTÓN DE MANTENIMIENTO */}
                <TouchableOpacity
                    style={[styles.btnObj, objetivo === 'mantenimiento' && styles.active]}
                    onPress={() => setObjetivo('mantenimiento')}
                >
                    <Text style={objetivo === 'mantenimiento' ? styles.textWhite : {}}>⚖️ Mantener peso</Text>
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
    card: { backgroundColor: '#f3f3f3', padding: 20, borderRadius: 20, elevation: 5 },
    h1: { fontSize: 24, fontWeight: 'bold', color: '#ff7a00', textAlign: 'center' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: 20 },
    label: { fontSize: 13, color: '#333', marginBottom: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    row: { flexDirection: 'row', gap: 10, marginBottom: 5 },
    btnSex: { flex: 1, padding: 12, backgroundColor: '#ddd', borderRadius: 10, alignItems: 'center' },
    btnObj: { padding: 15, backgroundColor: '#ddd', borderRadius: 10, marginBottom: 10 },
    active: { backgroundColor: '#ff7a00' },
    textWhite: { color: 'white', fontWeight: 'bold' },
    submit: { backgroundColor: 'red', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});