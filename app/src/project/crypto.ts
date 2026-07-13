/**
 * Data-at-rest encryption primitives (see DECISIONS.md, 2026-07-13).
 *
 * WebCrypto only - no dependencies. A passphrase is stretched with PBKDF2
 * (SHA-256) into a 256-bit AES-GCM key; each value is sealed with a fresh
 * random IV. The passphrase and the derived key live only in memory for the
 * duration of a session and are never written anywhere (integrity rule 4:
 * never store credentials).
 *
 * This module has zero app dependencies so it can travel with the shared
 * knowledge-model package if that extraction happens later.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** PBKDF2 work factor. Recorded in each vault marker so it can evolve. */
export const KDF_ITERATIONS = 250_000;

const KEY_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_BYTES = 12;
const SALT_BYTES = 16;
/** Envelope tag - lets the format version independently of the project file. */
const ENVELOPE_V1 = 'v1';

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle)
    throw new Error('This browser does not support the Web Crypto API, which is required for passphrase protection.');
  return c.subtle;
}

/** Cryptographically strong random bytes. */
export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function newSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Derive an AES-GCM key from a passphrase and salt. Non-extractable. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await subtle().importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: KEY_ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Seal a string. The envelope is `v1:<base64 iv>:<base64 ciphertext>`; the IV
 * is fresh per call, and AES-GCM's auth tag is appended to the ciphertext by
 * the platform so tampering (or a wrong key) fails decryption loudly.
 */
export async function encryptString(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const ct = await subtle().encrypt(
    { name: KEY_ALGO, iv: iv as BufferSource }, key, enc.encode(plaintext),
  );
  return `${ENVELOPE_V1}:${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`;
}

/** True if a stored value looks like one of our sealed envelopes. */
export function isEnvelope(value: string): boolean {
  return value.startsWith(ENVELOPE_V1 + ':');
}

/** Open a sealed string. Throws if the envelope is malformed or the key is wrong. */
export async function decryptString(envelope: string, key: CryptoKey): Promise<string> {
  const parts = envelope.split(':');
  if (parts.length !== 3 || parts[0] !== ENVELOPE_V1)
    throw new Error('Unrecognized encrypted value.');
  const iv = fromBase64(parts[1]);
  const ct = fromBase64(parts[2]);
  const pt = await subtle().decrypt(
    { name: KEY_ALGO, iv: iv as BufferSource }, key, ct as BufferSource,
  );
  return dec.decode(pt);
}
