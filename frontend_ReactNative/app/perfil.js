import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_URL = "http://192.168.1.22:3000/api";

export default function Perfil() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const obtenerDatosDB = async () => {
            try {
                const userId = await AsyncStorage.getItem("userId");
                if (!userId) {
                    router.replace('/');
                    return;
                }

                const response = await fetch(`${API_URL}/usuario/${userId}`);
                const data = await response.json();

                setUsuario(data);
            } catch (error) {
                console.error("Error cargando perfil:", error);
            } finally {
                setCargando(false);
            }
        };
        obtenerDatosDB();
    }, []);

    if (cargando) return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#ff7a00" />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>

            <View style={styles.avatarGrande}>
                <Text style={styles.avatarLetra}>
                    {usuario?.nombre?.charAt(0).toUpperCase()}
                </Text>
            </View>

            <Text style={styles.titulo}>Mi Perfil Fitness</Text>

            <View style={styles.infoCard}>
                <Text style={styles.label}>Datos Personales</Text>
                <Text style={styles.valor}>Nombre: {usuario?.nombre}</Text>
                <Text style={styles.valor}>Correo electrónico: {usuario?.email}</Text>
                <Text style={styles.valor}>📞 +34  {usuario?.telefono || 'No definido'}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Composición Física</Text>
                <View style={styles.row}>
                    <Text style={styles.valor}>⚖️ {usuario?.peso} kg</Text>
                    <Text style={styles.valor}>📏 {usuario?.altura} cm</Text>
                    <Text style={styles.valor}>🎂 {usuario?.edad} años</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.label}>Plan Actual</Text>
                <Text style={[styles.valor, {color: '#ff7a00', fontWeight: 'bold'}]}>
                    🎯 {usuario?.objetivo || 'Sin objetivo'}
                </Text>
                <Text style={styles.valor}>
                    🗓️ {usuario?.frecuencia_semanal} días a la semana
                </Text>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={async () => {
                        await AsyncStorage.clear();
                        router.replace('/');
                    }}
                >
                    <Text style={styles.logoutText}>Cerrar Sesión</Text>
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
    infoCard: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 25, elevation: 10 },
    label: { color: '#ff7a00', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
    valor: { color: '#333', fontSize: 16, marginBottom: 8, fontWeight: '500' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    logoutBtn: { marginTop: 10, alignItems: 'center' },
    logoutText: { color: 'red', fontWeight: 'bold' }
});