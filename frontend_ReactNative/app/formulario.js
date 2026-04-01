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
        if (!datos.peso || !objetivo || !sexo) {
            Alert.alert("Campos incompletos", "Por favor, completa los campos principales");
            return;
        }

        const dataSimulada = {
            metodo: `Plan para ${objetivo === 'masa' ? 'Subir Masa' : objetivo === 'definicion' ? 'Definición' : 'Mantenimiento'}`,
            rutina: {
                "Lunes": ["Press Banca 3x10", "Aperturas 3x12", "Remo con barra 3x10", "Dominadas 3xMAX"],
                "Martes": ["Sentadillas 4x8", "Prensa 3x12", "Remo con barra 3x10", "Aperturas 3x12"],
                "Jueves": ["Remo con barra 3x10", "Dominadas 3xMAX", "Press Banca 3x10", "Aperturas 3x12"]
            }
        };

        await AsyncStorage.setItem("rutina", JSON.stringify(dataSimulada));
        router.push('/rutina');
    };

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.card}>
                <Text style={styles.h1}>¡Bienvenido!</Text>
                <Text style={styles.subtitle}>Cuéntanos sobre ti para crear tu plan personalizado</Text>

                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="Ej: 70" onChangeText={(t) => setDatos({...datos, peso: t})} />

                <Text style={styles.label}>Altura (cm)</Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="Ej: 175" onChangeText={(t) => setDatos({...datos, altura: t})} />

                <Text style={styles.label}>Sexo</Text>
                <View style={styles.row}>
                    <TouchableOpacity style={[styles.btnSex, sexo === 'masculino' && styles.active]} onPress={() => setSexo('masculino')}>
                        <Text style={sexo === 'masculino' ? styles.textWhite : {}}>Masculino</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnSex, sexo === 'femenino' && styles.active]} onPress={() => setSexo('femenino')}>
                        <Text style={sexo === 'femenino' ? styles.textWhite : {}}>Femenino</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Objetivo</Text>
                <TouchableOpacity style={[styles.btnObj, objetivo === 'masa' && styles.active]} onPress={() => setObjetivo('masa')}>
                    <Text style={objetivo === 'masa' && styles.textWhite}>💪 Subir masa muscular</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnObj, objetivo === 'definicion' && styles.active]} onPress={() => setObjetivo('definicion')}>
                    <Text style={objetivo === 'definicion' && styles.textWhite}>🔥 Bajar de peso</Text>
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
    subtitle: { textAlign: 'center', color: '#666', marginBottom: 20 },
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