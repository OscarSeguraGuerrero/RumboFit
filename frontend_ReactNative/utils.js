const UNIDADES_POR_DEFECTO = 'g';

const PALABRAS_ML = [
    'agua',
    'aceite',
    'leche',
    'bebida',
    'zumo',
    'jugo',
    'caldo',
    'salsa',
    'yogur',
    'yogurt',
    'kefir',
    'batido',
    'vino',
    'cerveza',
    'refresco',
    'infusion',
    'té',
    'te',
    'cafe',
    'café'
];

const PALABRAS_UNIDAD = [
    'huevo',
    'huevos',
    'manzana',
    'manzanas',
    'platano',
    'plátano',
    'platanos',
    'plátanos',
    'banana',
    'bananas',
    'pera',
    'peras',
    'naranja',
    'naranjas',
    'kiwi',
    'kiwis',
    'mandarina',
    'mandarinas'
];

export function getUnidad(nombreAlimento) {
    if (!nombreAlimento || typeof nombreAlimento !== 'string') {
        return UNIDADES_POR_DEFECTO;
    }

    const nombre = nombreAlimento.trim().toLowerCase();

    if (PALABRAS_ML.some((palabra) => nombre.includes(palabra))) {
        return 'ml';
    }

    if (PALABRAS_UNIDAD.some((palabra) => nombre.includes(palabra))) {
        return 'ud';
    }

    return UNIDADES_POR_DEFECTO;
}
