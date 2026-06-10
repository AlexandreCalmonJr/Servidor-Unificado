import * as SecureStore from 'expo-secure-store';

const HASH_KEY = 'local_admin_password_hash';
const SALT_KEY = 'local_admin_password_salt';
const ITERATIONS_KEY = 'local_admin_password_iterations';
const DEFAULT_ITERATIONS = 12000;

function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
}

function utf8Bytes(text) {
    if (typeof TextEncoder !== 'undefined') {
        return Array.from(new TextEncoder().encode(String(text)));
    }
    const encoded = unescape(encodeURIComponent(String(text)));
    return Array.from(encoded, ch => ch.charCodeAt(0));
}

function sha256Hex(message) {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    const bytes = utf8Bytes(message);
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i -= 1) bytes.push((bitLength / (2 ** (i * 8))) & 0xff);

    const words = new Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
        for (let i = 0; i < 16; i += 1) {
            const j = offset + i * 4;
            words[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
        }
        for (let i = 16; i < 64; i += 1) {
            const s0 = rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
            const s1 = rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
            words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i += 1) {
            const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (h + s1 + ch + K[i] + words[i]) >>> 0;
            const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (s0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + temp1) >>> 0;
            d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
        }

        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }

    return H.map(value => value.toString(16).padStart(8, '0')).join('');
}

function randomHex(byteCount) {
    const bytes = new Uint8Array(byteCount);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < byteCount; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('');
}

function derivePasswordHash(password, salt, iterations = DEFAULT_ITERATIONS) {
    let digest = sha256Hex(`${salt}:${password}`);
    for (let i = 0; i < iterations; i += 1) {
        digest = sha256Hex(`${salt}:${i}:${digest}:${password}`);
    }
    return digest;
}

function constantTimeEqual(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    let diff = left.length ^ right.length;
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
        diff |= left.charCodeAt(i % left.length) ^ right.charCodeAt(i % right.length);
    }
    return diff === 0;
}

export async function hasLocalAdminPassword() {
    const [hash, salt] = await Promise.all([
        SecureStore.getItemAsync(HASH_KEY),
        SecureStore.getItemAsync(SALT_KEY),
    ]);
    return Boolean(hash && salt);
}

export async function setLocalAdminPassword(password) {
    const value = String(password || '');
    if (value.length < 8) {
        throw new Error('A senha local deve ter pelo menos 8 caracteres.');
    }
    const salt = randomHex(16);
    const hash = derivePasswordHash(value, salt, DEFAULT_ITERATIONS);
    await SecureStore.setItemAsync(SALT_KEY, salt);
    await SecureStore.setItemAsync(HASH_KEY, hash);
    await SecureStore.setItemAsync(ITERATIONS_KEY, String(DEFAULT_ITERATIONS));
}

export async function verifyLocalAdminPassword(password) {
    const [hash, salt, storedIterations] = await Promise.all([
        SecureStore.getItemAsync(HASH_KEY),
        SecureStore.getItemAsync(SALT_KEY),
        SecureStore.getItemAsync(ITERATIONS_KEY),
    ]);
    if (!hash || !salt) return false;
    const iterations = parseInt(storedIterations, 10) || DEFAULT_ITERATIONS;
    const candidate = derivePasswordHash(String(password || ''), salt, iterations);
    return constantTimeEqual(candidate, hash);
}
