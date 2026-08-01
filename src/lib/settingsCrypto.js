// Password-based symmetric encryption for the settings export, using only
// the browser's built-in Web Crypto API — no new npm dependency. AES-GCM
// gives authenticated encryption for free, so a wrong password (or a
// corrupted/tampered file) fails decryption loudly instead of silently
// returning garbage.
const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt) {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

export async function decryptJson({ salt, iv, ciphertext }, password) {
  const key = await deriveKey(password, fromBase64(salt));
  let plainBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  } catch {
    throw new Error('Senha incorreta ou arquivo corrompido.');
  }
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}
