import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Rutina() {
    const [data, setData] = useState(null);
    const [diaActual, setDiaActual] = useState(null);

    useEffect(() => {
        const cargarData = async () => {
            const res = await AsyncStorage.getItem("rutina");
            if (res) {
                const parsed = JSON.parse(res);
                setData(parsed);
                setDiaActual(Object.keys(parsed.rutina)[0]);
            }
        };
        cargarData();
    }, []);

    if (!data) return <View style={styles.loading}><Text style={{color:'white'}}>Cargando rutina...</Text></View>;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>{data.metodo}</Text>
                    <Image source={require('../assets/images/logo1.png')} style={styles.miniLogo} resizeMode="contain" />
                </View>

                <View style={styles.tabs}>
                    {Object.keys(data.rutina).map(dia => (
                        <TouchableOpacity 
                            key={dia} 
                            style={[styles.tab, diaActual === dia && styles.tabActive]}
                            onPress={() => setDiaActual(dia)}
                        >
                            <Text style={[styles.tabText, diaActual === dia && styles.textWhite]}>{dia}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.diaH3}>{diaActual}</Text>
                    {data.rutina[diaActual].map((ej, i) => (
                        <View key={i} style={styles.item}>
                            <View style={styles.bullet} />
                            <Text style={styles.itemText}>{ej}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', width: '90%', height: '80%', borderRadius: 20, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    miniLogo: { width: 45, height: 30 },
    tabs: { flexDirection: 'row', gap: 5, marginBottom: 20 },
    tab: { flex: 1, padding: 8, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#ff7a00' },
    tabText: { fontSize: 11, fontWeight: 'bold' },
    textWhite: { color: 'white' },
    content: { backgroundColor: '#f7f7f7', borderRadius: 15, padding: 15 },
    diaH3: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    item: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    bullet: { width: 8, height: 8, backgroundColor: '#ff7a00', borderRadius: 4, marginRight: 10 },
    itemText: { fontSize: 14, color: '#444' },
    loading: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }
});