import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Auth() {
    const router = useRouter();
    const [esRegistro, setEsRegistro] = useState(true);
    const [form, setForm] = useState({ nombre: '', email: '', password: '' });
    const [error, setError] = useState('');

    const handleAuth = async () => {
        if (esRegistro) {
            if (!form.nombre || !form.email || !form.password) {
                setError("Completa todos los campos");
                return;
            }
            await AsyncStorage.setItem("usuario", JSON.stringify(form));
            Alert.alert("¡Éxito!", "Usuario registrado correctamente");
            setEsRegistro(false);
        } else {
            const res = await AsyncStorage.getItem("usuario");
            const usuario = JSON.parse(res);
            if (usuario && usuario.email === form.email && usuario.password === form.password) {
                router.replace('/formulario');
            } else {
                setError("Credenciales incorrectas");
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Image source={require('../assets/images/logo1.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.subtitle}>Tu entrenador personal digital</Text>

                {esRegistro && (
                    <TextInput 
                        style={styles.input} 
                        placeholder="Nombre" 
                        placeholderTextColor="#999"
                        onChangeText={(t) => setForm({...form, nombre: t})} 
                    />
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
    logo: { width: 180, height: 80, marginBottom: 5 },
    subtitle: { color: '#666', marginBottom: 20, textAlign: 'center' },
    input: { width: '100%', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    button: { backgroundColor: '#ff7a00', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    switchText: { marginTop: 15, color: '#ff7a00', fontWeight: '500' },
    errorText: { color: 'red', fontSize: 12, marginBottom: 10 }
});