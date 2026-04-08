import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_URL = "http://192.168.1.22:3000/api";

export default function Perfil() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarUsuario = async () => {
            try {
                const userId = await AsyncStorage.getItem("userId");
                if (userId) {
                    const response = await fetch(`${API_URL}/usuarios/${userId}`);
                    const result = await response.json();
                    if (result.success) {
                        setUsuario(result.usuario);
                    }
                }
            } catch (error) {
                console.error("Error cargando perfil:", error);
            } finally {
                setLoading(false);
            }
        };
        cargarUsuario();
    }, []);

    if (loading) return <View style={styles.container}><Text style={{color:'white'}}>Cargando...</Text></View>;
    if (!usuario) return <View style={styles.container}><Text style={{color:'white'}}>No se pudo cargar el perfil</Text></View>;

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

                <Text style={styles.label}>Teléfono</Text>
                <Text style={styles.valor}>{usuario.telefono || 'No especificado'}</Text>

                <View style={styles.divider} />

                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Peso</Text>
                        <Text style={styles.valor}>{usuario.peso} kg</Text>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Altura</Text>
                        <Text style={styles.valor}>{usuario.altura} cm</Text>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Edad</Text>
                        <Text style={styles.valor}>{usuario.edad} años</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.label}>Objetivo</Text>
                <Text style={styles.valor}>{usuario.objetivo}</Text>

                <View style={styles.divider} />

                <Text style={styles.label}>Nivel de Experiencia</Text>
                <Text style={styles.valor}>{usuario.nivel}</Text>
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