/**
 * Determina la unidad de medida (g o ml) basada en el nombre del alimento.
 * @param {string} nombre - Nombre del alimento.
 * @returns {string} - 'ml' para líquidos, 'g' para sólidos.
 */
export const getUnidad = (nombre) => {
    if (!nombre) return 'g';
    const n = nombre.toLowerCase();
    
    // Palabras que suelen ser parte de un nombre largo (ej: 'leche' en 'leche desnatada')
    const liquidosParciales = [
        'leche', 'zumo', 'jugo', 'refresco', 'bebida', 'batido', 
        'vino', 'cerveza', 'aceite', 'caldo', 'cafe', 'café', 
        'infusion', 'infusión', 'yogur bebido', 'gazpacho', 'salmorejo'
    ];
    
    // Palabras que deben ser exactas para evitar falsos positivos (ej: 'agua' en 'aguacate' o 'te' en 'integral')
    const liquidosExactos = ['te', 'té', 'agua'];

    // 1. Comprobación de palabras parciales (líquidos claros)
    if (liquidosParciales.some(l => n.includes(l))) return 'ml';
    
    // 2. Comprobación de palabras exactas (evita el error de "aguacate")
    const palabras = n.split(/[\s,./()]+/).map(p => p.trim());
    if (liquidosExactos.some(l => palabras.includes(l))) return 'ml';

    return 'g';
};
