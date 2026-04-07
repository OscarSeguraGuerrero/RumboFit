import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = "http://192.168.1.39:3000/api";

export default function RecuperarPassword() {
    const router = useRouter();
    const [paso, setPaso] = useState(1);
    const [email, setEmail] = useState('');
    const [codigo, setCodigo] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [error, setError] = useState('');

    const solicitarCodigo = async () => {
        setError('');
        if (!email) {
            setError("Introduce tu correo electrónico");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("Éxito", "Si el correo está registrado, se habrá generado el código.");
                setPaso(2);
            } else {
                setError(data.error || "Ocurrió un error");
            }
        } catch (err) {
            setError("No se pudo conectar con el servidor.");
        }
    };

    const cambiarPassword = async () => {
        setError('');
        if (!codigo || !nuevaPassword) {
            setError("Completa todos los campos");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, codigo, nuevaPassword })
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert("¡Hecho!", "Contraseña actualizada correctamente.");
                router.replace('/');
            } else {
                setError(data.error || "Error al resetear contraseña");
            }
        } catch (err) {
            setError("No se pudo conectar con el servidor.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.h1}>Recuperar Contraseña</Text>

                {paso === 1 ? (
                    <>
                        <Text style={styles.subtitle}>
                            Introduce tu correo para recibir un código de recuperación.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Email registrado"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity style={styles.button} onPress={solicitarCodigo}>
                            <Text style={styles.buttonText}>Enviar Código</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.subtitle}>
                            Introduce el código que has recibido y tu nueva contraseña.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Código de 6 dígitos"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={codigo}
                            onChangeText={setCodigo}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Nueva contraseña segura"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={nuevaPassword}
                            onChangeText={setNuevaPassword}
                        />

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity style={styles.button} onPress={cambiarPassword}>
                            <Text style={styles.buttonText}>Actualizar Contraseña</Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity onPress={() => router.replace('/')}>
                    <Text style={styles.switchText}>Volver al inicio</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#f3f3f3', padding: 25, borderRadius: 20, width: '85%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    h1: { fontSize: 24, fontWeight: 'bold', color: '#ff7a00', textAlign: 'center', marginBottom: 10 },
    subtitle: { color: '#666', marginBottom: 20, textAlign: 'center', fontSize: 13 },
    input: { width: '100%', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    button: { backgroundColor: '#ff7a00', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    switchText: { marginTop: 15, color: '#666', fontSize: 13 },
    errorText: { color: 'red', fontSize: 12, marginBottom: 10, textAlign: 'center' }
});
