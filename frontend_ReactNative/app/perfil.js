import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Perfil() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [verPassword, setVerPassword] = useState(false);

    useEffect(() => {
        const cargarUsuario = async () => {
            const res = await AsyncStorage.getItem("usuario");
            if (res) setUsuario(JSON.parse(res));
        };
        cargarUsuario();
    }, []);

    if (!usuario) return <View style={styles.container}><Text style={{color:'white'}}>Cargando...</Text></View>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>

            <View style={styles.avatarGrande}>
                <Text style={styles.avatarLetra}>{usuario.nombre.charAt(0).toUpperCase()}</Text>
            </View>

            <Text style={styles.titulo}>Mis Datos</Text>

            <View style={styles.infoCard}>
                <Text style={styles.label}>Nombre Completo</Text>
                <Text style={styles.valor}>{usuario.nombre}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Correo Electrónico</Text>
                <Text style={styles.valor}>{usuario.email}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Teléfono Móvil</Text>
                <Text style={styles.valor}>+34 {usuario.telefono}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Contraseña</Text>
                <TouchableOpacity onPress={() => setVerPassword(!verPassword)}>
                    <Text style={styles.valor}>
                        {verPassword ? usuario.password : '•••••••• (toca para ver)'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#1a1a1a', alignItems: 'center', padding: 30, paddingTop: 60 },
    backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
    backText: { color: '#ff7a00', fontSize: 16, fontWeight: 'bold' },
    avatarGrande: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: 'white' },
    avatarLetra: { color: 'white', fontSize: 40, fontWeight: 'bold' },
    titulo: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
    infoCard: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 25, shadowColor: "#000", shadowOpacity: 0.3, elevation: 10 },
    label: { color: '#999', fontSize: 12, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    valor: { color: '#333', fontSize: 16, marginBottom: 15, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 }
});