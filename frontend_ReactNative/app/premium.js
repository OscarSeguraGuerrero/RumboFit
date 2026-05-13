import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripe } from '@stripe/stripe-react-native';
import { API_URL } from '../config';

export default function PremiumScreen() {
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                Alert.alert("Error", "No has iniciado sesión");
                setLoading(false);
                return;
            }

            // 1. Crear el PaymentIntent en nuestro backend
            const response = await fetch(`${API_URL}/premium/crear-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || "Error al iniciar pago");

            // 2. Inicializar el SDK de Stripe con el clientSecret
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'RumboFit',
                paymentIntentClientSecret: data.clientSecret,
                returnURL: 'rumbofit://premium'
            });

            if (initError) throw new Error(initError.message);

            // 3. Mostrar el formulario nativo de pago de Stripe al usuario
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code !== 'Canceled') {
                    Alert.alert("Pago fallido", paymentError.message);
                }
                setLoading(false);
                return;
            }

            // 4. Si el pago fue exitoso, activar el Premium en el backend
            const activateRes = await fetch(`${API_URL}/premium/activar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            const activateData = await activateRes.json();
            if (activateData.success) {
                // Actualizar la caché local para que la app sepa que ya somos premium
                const profileDataStr = await AsyncStorage.getItem("profileData");
                if (profileDataStr) {
                    const profileData = JSON.parse(profileDataStr);
                    if (profileData.usuario) profileData.usuario.es_premium = true;
                    await AsyncStorage.setItem("profileData", JSON.stringify(profileData));
                }

                Alert.alert(
                    "¡Bienvenido a Premium! 👑", 
                    "Tu suscripción se ha activado correctamente. Ya puedes disfrutar de todos los beneficios.",
                    [{ text: "Empezar", onPress: () => router.back() }]
                );
            } else {
                throw new Error("El pago se procesó pero falló la activación.");
            }

        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={28} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>RumboFit Premium</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.heroSection}>
                    <MaterialIcons name="star" size={80} color="#FFD700" style={styles.heroIcon} />
                    <Text style={styles.heroTitle}>Desbloquea tu Potencial</Text>
                    <Text style={styles.heroSubtitle}>Acceso ilimitado a todas las funciones para maximizar tus resultados.</Text>
                </View>

                <View style={styles.benefitsContainer}>
                    <View style={styles.benefitRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="block" size={24} color="#ff7a00" />
                        </View>
                        <Text style={styles.benefitText}>Sin Anuncios</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="fitness-center" size={24} color="#ff7a00" />
                        </View>
                        <Text style={styles.benefitText}>Rutinas Ilimitadas</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="calendar-month" size={24} color="#ff7a00" />
                        </View>
                        <Text style={styles.benefitText}>Historial Completo de Entrenamientos</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="insights" size={24} color="#ff7a00" />
                        </View>
                        <Text style={styles.benefitText}>Estadísticas Avanzadas (Próximamente)</Text>
                    </View>
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>9,99€</Text>
                    <Text style={styles.pricePeriod}>/ pago único</Text>
                </View>

                <TouchableOpacity
                    style={[styles.subscribeButton, loading && styles.buttonDisabled]}
                    onPress={handleSubscribe}
                    disabled={loading}
                >
                    <Text style={styles.subscribeButtonText}>
                        {loading ? 'Procesando...' : 'Suscribirse Ahora'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#1e1e1e',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    heroIcon: {
        marginBottom: 15,
    },
    heroTitle: {
        color: '#ffffff',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    heroSubtitle: {
        color: '#aaaaaa',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    benefitsContainer: {
        backgroundColor: '#1e1e1e',
        borderRadius: 15,
        padding: 20,
        marginBottom: 30,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    iconContainer: {
        backgroundColor: '#333333',
        padding: 10,
        borderRadius: 10,
        marginRight: 15,
    },
    benefitText: {
        color: '#ffffff',
        fontSize: 16,
        flex: 1,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 25,
    },
    priceText: {
        color: '#ffffff',
        fontSize: 42,
        fontWeight: 'bold',
    },
    pricePeriod: {
        color: '#aaaaaa',
        fontSize: 18,
        marginLeft: 5,
    },
    subscribeButton: {
        backgroundColor: '#ff7a00',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#ff7a00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    subscribeButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
