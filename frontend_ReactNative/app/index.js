import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// CONFIGURACIÓN: Cambia esto por tu IP local o URL de Ngrok
const API_URL = "http://192.168.1.20:3000/api";

export default function Auth() {
    const router = useRouter();
    const [esRegistro, setEsRegistro] = useState(true);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '' });
    const [error, setError] = useState('');

    const handleAuth = async () => {
        setError(''); // Limpiar errores previos

        try {
            if (esRegistro) {
                // 1. VALIDACIÓN LOCAL
                if (!form.nombre || !form.email || !form.password || !form.telefono) {
                    setError("Completa todos los campos");
                    return;
                }

                // 2. LLAMADA AL BACKEND (REGISTRO)
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                });

                const data = await response.json();

                if (data.success) {
                    Alert.alert("¡Éxito!", "Usuario guardado en la base de datos");
                    setEsRegistro(false); // Mandar a Login
                } else {
                    setError(data.error || "Error al registrar");
                }

            } else {
                // 3. LLAMADA AL BACKEND (LOGIN)
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: form.email, password: form.password })
                });

                const data = await response.json();

                if (data.success) {
                    // Guardamos los datos de sesión esenciales
                    await AsyncStorage.setItem("userId", data.user.id.toString());
                    await AsyncStorage.setItem("userName", data.user.nombre);

                    // LÓGICA DE NAVEGACIÓN INTELIGENTE:
                    // Si el backend nos dice que ya tiene peso (tieneDatos: true), vamos a rutina
                    if (data.user.tieneDatos === true) {
                        console.log("Usuario con perfil completo, enviando a Rutina...");
                        router.replace('/rutina');
                    } else {
                        // Si no tiene datos o es la primera vez, vamos al formulario
                        console.log("Usuario nuevo o incompleto, enviando a Formulario...");
                        router.replace('/formulario');
                    }

                } else {
                    // Si el backend devuelve success: false (contraseña mal, etc.)
                    setError(data.error || "Credenciales incorrectas");
                }
            }
        } catch (err) {
            console.error(err);
            setError("No se pudo conectar con el servidor. Revisa tu IP.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Image source={require('../assets/images/logo1.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.subtitle}>Tu entrenador personal digital</Text>

                {esRegistro && (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Nombre"
                            placeholderTextColor="#999"
                            onChangeText={(t) => setForm({...form, nombre: t})}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Teléfono móvil (Ej: 600123456)"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            maxLength={9}
                            onChangeText={(t) => setForm({...form, telefono: t})}
                        />
                    </>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(t) => setForm({...form, email: t})}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#999"
                    secureTextEntry
                    onChangeText={(t) => setForm({...form, password: t})}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleAuth}>
                    <Text style={styles.buttonText}>{esRegistro ? "Registrarse" : "Iniciar Sesión"}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {setEsRegistro(!esRegistro); setError('');}}>
                    <Text style={styles.switchText}>
                        {esRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#f3f3f3', padding: 25, borderRadius: 20, width: '85%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    logo: { width: 300, height: 210, marginBottom: 5 },
    subtitle: { color: '#666', marginBottom: 20, textAlign: 'center' },
    input: { width: '100%', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    button: { backgroundColor: '#ff7a00', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    switchText: { marginTop: 15, color: '#ff7a00', fontWeight: '500' },
    errorText: { color: 'red', fontSize: 12, marginBottom: 10, textAlign: 'center' }
});