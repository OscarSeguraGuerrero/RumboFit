const fs = require('fs');
const path = require('path');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyC_RMlHNFPK7pP9TBftLz1OHx2oaEWbVL4',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'rumbofit-7547c.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'rumbofit-7547c',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rumbofit-7547c.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '432601597806',
    appId: process.env.FIREBASE_APP_ID || '1:432601597806:web:6dba4e5695ba334b42637f'
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

function encodeValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((item) => encodeValue(item))
            }
        };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: String(value) };
        return { doubleValue: value };
    }
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'object') {
        const fields = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            fields[key] = encodeValue(nestedValue);
        });
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

function decodeValue(value) {
    if (!value) return null;
    if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
    if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
    if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue;
    if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
    if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
    if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
    if (value.arrayValue) {
        return (value.arrayValue.values || []).map((item) => decodeValue(item));
    }
    if (value.mapValue) {
        const result = {};
        Object.entries(value.mapValue.fields || {}).forEach(([key, nestedValue]) => {
            result[key] = decodeValue(nestedValue);
        });
        return result;
    }
    return null;
}

function encodeDocument(data) {
    const fields = {};
    Object.entries(data).forEach(([key, value]) => {
        fields[key] = encodeValue(value);
    });
    return { fields };
}

function decodeDocument(document) {
    const docId = document.name.split('/').pop();
    const decoded = { _docId: docId };
    Object.entries(document.fields || {}).forEach(([key, value]) => {
        decoded[key] = decodeValue(value);
    });
    return decoded;
}

async function firestoreRequest(url, options = {}) {
    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 404) return null;

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        const error = new Error(data?.error?.message || 'Error en Firestore');
        error.status = response.status;
        error.payload = data;
        throw error;
    }

    return data;
}

function collectionUrl(collection, query = '') {
    const suffix = query ? `?${query}&key=${firebaseConfig.apiKey}` : `?key=${firebaseConfig.apiKey}`;
    return `${FIRESTORE_BASE_URL}/${collection}${suffix}`;
}

function documentUrl(collection, docId, query = '') {
    const suffix = query ? `?${query}&key=${firebaseConfig.apiKey}` : `?key=${firebaseConfig.apiKey}`;
    return `${FIRESTORE_BASE_URL}/${collection}/${docId}${suffix}`;
}

async function listDocuments(collection) {
    const all = [];
    let pageToken = null;

    do {
        const query = [`pageSize=1000`];
        if (pageToken) query.push(`pageToken=${encodeURIComponent(pageToken)}`);
        const data = await firestoreRequest(collectionUrl(collection, query.join('&')));
        const docs = (data?.documents || []).map(decodeDocument);
        all.push(...docs);
        pageToken = data?.nextPageToken || null;
    } while (pageToken);

    return all;
}

async function getDocument(collection, docId) {
    const data = await firestoreRequest(documentUrl(collection, docId));
    return data ? decodeDocument(data) : null;
}

async function setDocument(collection, docId, data) {
    const payload = encodeDocument(data);
    const result = await firestoreRequest(documentUrl(collection, docId), {
        method: 'PATCH',
        body: payload
    });
    return decodeDocument(result);
}

async function deleteDocument(collection, docId) {
    return firestoreRequest(documentUrl(collection, docId), {
        method: 'DELETE'
    });
}

async function upsertDocument(collection, docId, patch) {
    const current = await getDocument(collection, docId);
    const merged = { ...(current || {}), ...patch };
    delete merged._docId;
    return setDocument(collection, docId, merged);
}

async function nextId(counterName) {
    const counters = (await getDocument('meta', 'counters')) || {};
    const nextValue = Number(counters[counterName] || 0) + 1;
    const payload = { ...counters, [counterName]: nextValue };
    delete payload._docId;
    await setDocument('meta', 'counters', payload);
    return nextValue;
}

async function ensureCounterAtLeast(counterName, floorValue) {
    const counters = (await getDocument('meta', 'counters')) || {};
    const current = Number(counters[counterName] || 0);
    if (current >= floorValue) return;
    const payload = { ...counters, [counterName]: floorValue };
    delete payload._docId;
    await setDocument('meta', 'counters', payload);
}

function extractSeedArray(seedSource, variableName) {
    const regex = new RegExp(`const ${variableName} = (\\[[\\s\\S]*?\\n  \\]);`);
    const match = seedSource.match(regex);
    if (!match) {
        throw new Error(`No se pudo extraer ${variableName} desde prisma/seed.ts`);
    }
    return Function(`"use strict"; return (${match[1]});`)();
}

async function ensureCatalogSeeded() {
    const state = await getDocument('meta', 'seed_state');
    if (state?.catalogSeeded) return;

    const seedPath = path.join(__dirname, 'prisma', 'seed.ts');
    const source = fs.readFileSync(seedPath, 'utf8');
    const ejercicios = extractSeedArray(source, 'ejercicios');
    const alimentos = extractSeedArray(source, 'alimentos');

    const existingExercises = await listDocuments('ejercicios');
    if (existingExercises.length === 0) {
        for (let index = 0; index < ejercicios.length; index += 1) {
            await setDocument('ejercicios', String(index + 1), {
                id: index + 1,
                ...ejercicios[index]
            });
        }
    }

    const existingFoods = await listDocuments('alimentos');
    if (existingFoods.length === 0) {
        for (let index = 0; index < alimentos.length; index += 1) {
            await setDocument('alimentos', String(index + 1), {
                id: index + 1,
                ...alimentos[index]
            });
        }
    }

    await ensureCounterAtLeast('ejercicios', Math.max(existingExercises.length, ejercicios.length));
    await ensureCounterAtLeast('alimentos', Math.max(existingFoods.length, alimentos.length));
    await setDocument('meta', 'seed_state', {
        catalogSeeded: true,
        seededAt: new Date().toISOString()
    });
}

module.exports = {
    firebaseConfig,
    listDocuments,
    getDocument,
    setDocument,
    upsertDocument,
    deleteDocument,
    nextId,
    ensureCounterAtLeast,
    ensureCatalogSeeded
};
