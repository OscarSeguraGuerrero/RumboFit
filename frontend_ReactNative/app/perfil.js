import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';
import Svg, { Path, G, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

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

    // --- LÓGICA DEL IMC ---
    const calcularIMC = () => {
        if (!usuario?.peso || !usuario?.altura) return 0;
        const alturaMetros = usuario.altura / 100;
        const imc = usuario.peso / (alturaMetros * alturaMetros);
        return imc.toFixed(1);
    };

    const imcValue = calcularIMC();

    // Determinar color y posición de la aguja (de 0 a 180 grados)
    const getImcData = (val) => {
        if (val < 18.5) return { color: '#3498db', label: 'Poco peso', angle: -60 };
        if (val < 25) return { color: '#2ecc71', label: 'Normal', angle: 0 };
        return { color: '#e74c3c', label: 'Sobrepeso', angle: 60 };
    };

    const infoImc = getImcData(imcValue);

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

            <Text style={styles.titulo}>Mi Perfil</Text>

            {/* --- GRÁFICO DE IMC TIPO VELOCÍMETRO --- */}
            <View style={styles.imcCard}>
                <Text style={styles.imcLabel}>Tu Índice de Masa Corporal (IMC)</Text>

                <View style={styles.gaugeContainer}>
                    <Svg width="200" height="120" viewBox="0 0 200 110">
                        <G transform="translate(100, 100)">
                            {/* Arco Poco Peso (Azul) */}
                            <Path d="M -90 0 A 90 90 0 0 1 -30 -84.8" fill="none" stroke="#3498db" strokeWidth="20" />
                            {/* Arco Normal (Verde) */}
                            <Path d="M -28 -85.5 A 90 90 0 0 1 28 -85.5" fill="none" stroke="#2ecc71" strokeWidth="20" />
                            {/* Arco Sobrepeso (Rojo) */}
                            <Path d="M 30 -84.8 A 90 90 0 0 1 90 0" fill="none" stroke="#e74c3c" strokeWidth="20" />

                            {/* Aguja Indicadora */}
                            <G transform={`rotate(${infoImc.angle})`}>
                                <Path d="M -5 0 L 0 -95 L 5 0 Z" fill="#333" />
                                <Circle cx="0" cy="0" r="8" fill="#333" />
                            </G>
                        </G>
                    </Svg>
                    <View style={styles.imcTextContainer}>
                        <Text style={[styles.imcValueText, { color: infoImc.color }]}>{imcValue}</Text>
                        <Text style={styles.imcStatusText}>{infoImc.label}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.label}>Nombre Completo</Text>
                <Text style={styles.valor}>{usuario.nombre}</Text>

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

                <Text style={styles.label}>Objetivo Actual</Text>
                <Text style={styles.valor}>{usuario.objetivo}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#1a1a1a', alignItems: 'center', padding: 25, paddingTop: 50 },
    backBtn: { alignSelf: 'flex-start', marginBottom: 15 },
    backText: { color: '#ff7a00', fontSize: 16, fontWeight: 'bold' },
    avatarGrande: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: 'white' },
    avatarLetra: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    titulo: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },

    // Estilos del Gráfico
    imcCard: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, elevation: 5 },
    imcLabel: { color: '#666', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    gaugeContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    imcTextContainer: { marginTop: -20, alignItems: 'center' },
    imcValueText: { fontSize: 34, fontWeight: 'bold' },
    imcStatusText: { fontSize: 16, fontWeight: 'bold', color: '#888', marginTop: -5 },

    infoCard: { backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 25, elevation: 5, marginBottom: 50 },
    label: { color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    valor: { color: '#333', fontSize: 16, marginBottom: 15, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 }
});