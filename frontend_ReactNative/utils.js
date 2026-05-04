const UNIDAD_POR_DEFECTO = 'g';

const ALIMENTOS_CONFIG = {
    'leche entera': { unidad: 'ml', cantidadInicial: 100, gramosPorUnidad: 1 },
    'leche desnatada': { unidad: 'ml', cantidadInicial: 100, gramosPorUnidad: 1 },
    'leche semidesnatada': { unidad: 'ml', cantidadInicial: 100, gramosPorUnidad: 1 },
    'bebida de soja sin azucar': { unidad: 'ml', cantidadInicial: 100, gramosPorUnidad: 1 },
    'kefir natural': { unidad: 'ml', cantidadInicial: 100, gramosPorUnidad: 1 },
    'aceite de oliva': { unidad: 'ml', cantidadInicial: 10, gramosPorUnidad: 1 },
    'huevo entero': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 60 },
    'clara de huevo': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 33 },
    'platano': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 120 },
    'manzana': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 180 },
    'naranja': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 150 },
    'kiwi': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 75 },
    'aguacate': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 200 },
    'pera': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 170 },
    'mandarina': { unidad: 'ud', cantidadInicial: 1, gramosPorUnidad: 90 }
};

function normalizarNombre(nombreAlimento) {
    if (!nombreAlimento || typeof nombreAlimento !== 'string') {
        return '';
    }

    return nombreAlimento
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export function getUnidad(nombreAlimento) {
    const nombre = normalizarNombre(nombreAlimento);

    if (!nombre) {
        return UNIDAD_POR_DEFECTO;
    }

    return ALIMENTOS_CONFIG[nombre]?.unidad || UNIDAD_POR_DEFECTO;
}

export function getCantidadInicial(nombreAlimento) {
    const nombre = normalizarNombre(nombreAlimento);
    return ALIMENTOS_CONFIG[nombre]?.cantidadInicial || 100;
}

export function convertirCantidadAGramos(nombreAlimento, cantidad) {
    const nombre = normalizarNombre(nombreAlimento);
    const unidad = getUnidad(nombre);
    const valor = Number(cantidad) || 0;

    if (unidad === 'ud') {
        return valor * (ALIMENTOS_CONFIG[nombre]?.gramosPorUnidad || 1);
    }

    return valor;
}

export function convertirGramosACantidad(nombreAlimento, gramos) {
    const nombre = normalizarNombre(nombreAlimento);
    const unidad = getUnidad(nombre);
    const valor = Number(gramos) || 0;

    if (unidad === 'ud') {
        const gramosPorUnidad = ALIMENTOS_CONFIG[nombre]?.gramosPorUnidad || 1;
        return valor / gramosPorUnidad;
    }

    return valor;
}

export function calcularMacrosAlimento(nombreAlimento, alimento, cantidad) {
    const gramos = convertirCantidadAGramos(nombreAlimento, cantidad);
    const factor = gramos / 100;

    return {
        kcal: Number(alimento?.calorias_100g || 0) * factor,
        prot: Number(alimento?.proteinas_100g || 0) * factor,
        carb: Number(alimento?.carbohidratos_100g || 0) * factor,
        gras: Number(alimento?.grasas_100g || 0) * factor
    };
}
