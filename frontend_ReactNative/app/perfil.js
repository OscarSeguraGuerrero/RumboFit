import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../config';
import Svg, { Path, G, Circle } from 'react-native-svg';

// Eliminamos el uso de height fijo para el fondo para que pueda crecer
const { width } = Dimensions.get('window');

export default function Perfil() {
    const router = useRouter();
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);

    const [editando, setEditando] = useState(false);
    const [nuevoPeso, setNuevoPeso] = useState('');
    const [nuevaAltura, setNuevaAltura] = useState('');
    const [nuevaEdad, setNuevaEdad] = useState('');

    useEffect(() => {
        cargarUsuario();
    }, []);

    const cargarUsuario = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                const response = await fetch(`${API_URL}/usuarios/${userId}`);
                const result = await response.json();
                if (result.success) {
                    setUsuario(result.usuario);
                    setNuevoPeso(result.usuario.peso?.toString() || '');
                    setNuevaAltura(result.usuario.altura?.toString() || '');
                    setNuevaEdad(result.usuario.edad?.toString() || '');
                }
            }
        } catch (error) {
            console.error("Error cargando perfil:", error);
        } finally {
            setLoading(false);
        }
    };

    const guardarCambios = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            const urlFinal = `${API_URL}/usuarios/${userId}`;
            const datosActualizados = {
                peso: parseFloat(nuevoPeso),
                altura: parseInt(nuevaAltura),
                edad: parseInt(nuevaEdad)
            };

            const response = await fetch(urlFinal, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });

            const result = await response.json();

            if (result.success) {
                setUsuario(prev => ({
                    ...prev,
                    peso: datosActualizados.peso,
                    altura: datosActualizados.altura,
                    edad: datosActualizados.edad
                }));
                setEditando(false);
                Alert.alert("Éxito", "¡Perfil actualizado!");
            } else {
                Alert.alert("Error", result.error || "Fallo en el servidor");
            }
        } catch (error) {
            console.error("Error en Guardar:", error);
            Alert.alert("Error", "No se pudo conectar con el servidor.");
        }
    };

    const calcularIMC = () => {
        const p = editando ? parseFloat(nuevoPeso) : usuario?.peso;
        const a = editando ? parseFloat(nuevaAltura) : usuario?.altura;
        if (!p || !a || a === 0) return 0;
        const alturaMetros = a / 100;
        return (p / (alturaMetros * alturaMetros)).toFixed(1);
    };

    const imcValue = calcularIMC();

    const getImcData = (val) => {
        if (val < 18.5) return { color: '#3498db', label: 'Poco peso', angle: -60 };
        if (val < 25) return { color: '#2ecc71', label: 'Normal', angle: 0 };
        return { color: '#e74c3c', label: 'Sobrepeso', angle: 60 };
    };

    const infoImc = getImcData(imcValue);

    if (loading || !usuario) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{color:'white'}}>Cargando perfil...</Text>
            </View>
        );
    }

    return (
        <ImageBackground
            source={require('../assets/images/fondo.jpg')}
            style={styles.backgroundImage} // Ahora es flexible
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.topHeader}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Text style={styles.backText}>← Volver</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.editBtn, editando && styles.saveBtn]}
                            onPress={() => editando ? guardarCambios() : setEditando(true)}
                        >
                            <Text style={styles.editBtnText}>{editando ? '✓ GUARDAR' : '✎ EDITAR'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.avatarGrande}>
                        <Text style={styles.avatarLetra}>
                            {usuario?.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>

                    <Text style={styles.titulo}>{usuario?.nombre || 'Usuario'}</Text>
                    <Text style={styles.subtituloEmail}>{usuario?.email || ''}</Text>

                    <View style={styles.imcCard}>
                        <Text style={styles.imcLabel}>Tu IMC calculado</Text>
                        <View style={styles.gaugeContainer}>
                            <Svg width="200" height="120" viewBox="0 0 200 110">
                                <G transform="translate(100, 100)">
                                    <Path d="M -90 0 A 90 90 0 0 1 -30 -84.8" fill="none" stroke="#3498db" strokeWidth="20" />
                                    <Path d="M -28 -85.5 A 90 90 0 0 1 28 -85.5" fill="none" stroke="#2ecc71" strokeWidth="20" />
                                    <Path d="M 30 -84.8 A 90 90 0 0 1 90 0" fill="none" stroke="#e74c3c" strokeWidth="20" />
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
                        <View style={styles.rowInfo}>
                            <View style={styles.infoBox}>
                                <Text style={styles.label}>Peso (kg)</Text>
                                {editando ? (
                                    <TextInput style={styles.inputEdit} value={nuevoPeso} onChangeText={setNuevoPeso} keyboardType="numeric" />
                                ) : (
                                    <Text style={styles.valor}>{usuario?.peso} kg</Text>
                                )}
                            </View>
                            <View style={styles.infoBox}>
                                <Text style={styles.label}>Altura (cm)</Text>
                                {editando ? (
                                    <TextInput style={styles.inputEdit} value={nuevaAltura} onChangeText={setNuevaAltura} keyboardType="numeric" />
                                ) : (
                                    <Text style={styles.valor}>{usuario?.altura} cm</Text>
                                )}
                            </View>
                            <View style={styles.infoBox}>
                                <Text style={styles.label}>Edad</Text>
                                {editando ? (
                                    <TextInput style={styles.inputEdit} value={nuevaEdad} onChangeText={setNuevaEdad} keyboardType="numeric" />
                                ) : (
                                    <Text style={styles.valor}>{usuario?.edad}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.label}>Objetivo Actual</Text>
                        <Text style={styles.valor}>{usuario?.objetivo || 'No definido'}</Text>
                    </View>

                    {editando && (
                        <TouchableOpacity style={styles.cancelarBtn} onPress={() => setEditando(false)}>
                            <Text style={{color: 'white', fontWeight: 'bold'}}>Descartar cambios</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{height: 100}} />
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1, // Esto hace que ocupe todo el espacio disponible
        width: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)'
    },
    scrollContent: {
        flexGrow: 1, // Importante para que el scroll funcione correctamente con flex
        alignItems: 'center',
        padding: 25,
        paddingTop: 50
    },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 20 },
    backBtn: { padding: 5 },
    backText: { color: '#ff7a00', fontSize: 16, fontWeight: 'bold' },
    editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'white' },
    saveBtn: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
    editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    avatarGrande: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ff7a00', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'white' },
    avatarLetra: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    titulo: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
    subtituloEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 },
    imcCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
    imcLabel: { color: '#666', fontSize: 14, fontWeight: '600' },
    gaugeContainer: { alignItems: 'center', marginTop: 10 },
    imcTextContainer: { marginTop: -20, alignItems: 'center' },
    imcValueText: { fontSize: 34, fontWeight: 'bold' },
    imcStatusText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
    infoCard: { backgroundColor: 'rgba(255,255,255,0.95)', width: '100%', borderRadius: 20, padding: 25 },
    rowInfo: { flexDirection: 'row', justifyContent: 'space-between' },
    infoBox: { flex: 1, alignItems: 'center' },
    label: { color: '#999', fontSize: 11, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
    valor: { color: '#333', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    inputEdit: { backgroundColor: '#e8e8e8', borderRadius: 8, padding: 8, fontSize: 16, fontWeight: 'bold', color: '#ff7a00', width: '80%', textAlign: 'center' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    cancelarBtn: { marginTop: 20, padding: 10 },
    loadingContainer: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }
});