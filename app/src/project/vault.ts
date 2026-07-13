/**
 * Passphrase-protected storage (see DECISIONS.md, 2026-07-13).
 *
 * EncryptedStorage implements the existing StorageLike seam, so ProjectStore
 * and every screen keep working synchronously and unchanged. The trick: the
 * decrypted project entries are held in an in-memory Map (the session's
 * working copy), while localStorage keeps only ciphertext. Reads are the
 * in-memory Map; writes update the Map synchronously and then encrypt through
 * to the backing store on a serialized async queue.
 *
 * Threat addressed: data at rest. With the vault locked, anyone with the
 * machine or browser profile - via devtools, a file copy, etc. - sees only
 * ciphertext plus a non-secret salt. It does not defend an already-unlocked
 * running session (the app must operate on plaintext); that is inherent.
 *
 * The passphrase and derived key are memory-only and never persisted
 * (integrity rule 4). A forgotten passphrase cannot be recovered - the owner
 * is told to keep an exported (plaintext) backup.
 */

import type { StorageLike } from './store';
import {
  deriveKey, encryptString, decryptString, isEnvelope,
  newSalt, toBase64, fromBase64, KDF_ITERATIONS,
} from './crypto';

/** localStorage key holding the vault marker (salt + passphrase check). Plaintext; the salt is not secret. */
export const VAULT_KEY = 'successor:vault';
/** Prefix of the project entries the vault encrypts. Matches ProjectStore's PREFIX. */
const PROJECT_PREFIX = 'successor:project:';
/**
 * ProjectStore's durability backup slot (store.ts BACKUP_PREFIX). The vault
 * must manage these too, or backups would sit in plaintext at rest and would
 * not be loaded for recovery. Note it does NOT start with PROJECT_PREFIX, so
 * the two predicates are genuinely distinct.
 */
const BACKUP_PREFIX = 'successor:project-backup:';

/** A key holding project data the vault encrypts (a live project or its backup). */
function isManagedKey(k: string): boolean {
  return k.startsWith(PROJECT_PREFIX) || k.startsWith(BACKUP_PREFIX);
}
/** Known plaintext sealed under the key so a wrong passphrase is detected up front. */
const CHECK_TOKEN = 'successor-vault-ok';

interface VaultMarker {
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;   // base64
  check: string;  // sealed CHECK_TOKEN
}

/** True if this backing store already has passphrase protection configured. */
export function isVaultConfigured(backing: StorageLike): boolean {
  return backing.getItem(VAULT_KEY) !== null;
}

/** True if there are project entries present (used to decide "adopt existing data"). */
export function hasProjectEntries(backing: StorageLike): boolean {
  for (let i = 0; i < backing.length; i++) {
    const k = backing.key(i);
    if (k && isManagedKey(k)) return true;
  }
  return false;
}

/** Every key the vault manages: live projects and their durability backups. */
function projectKeys(backing: StorageLike): string[] {
  const keys: string[] = [];
  for (let i = 0; i < backing.length; i++) {
    const k = backing.key(i);
    if (k && isManagedKey(k)) keys.push(k);
  }
  return keys;
}

export class EncryptedStorage implements StorageLike {
  /** Decrypted project entries - the session's working copy. */
  private plain = new Map<string, string>();
  private writeChain: Promise<void> = Promise.resolve();
  private writeError: unknown = undefined;

  private backing: StorageLike;
  private cryptoKey: CryptoKey;

  private constructor(backing: StorageLike, cryptoKey: CryptoKey) {
    this.backing = backing;
    this.cryptoKey = cryptoKey;
  }

  /**
   * Turn on passphrase protection, adopting any existing plaintext projects.
   * Writes the marker first, then re-seals every project entry in place.
   * Interruptible safely: unlock() self-heals plaintext stragglers.
   */
  static async enable(backing: StorageLike, passphrase: string): Promise<EncryptedStorage> {
    if (isVaultConfigured(backing))
      throw new Error('This computer already has passphrase protection.');
    if (!passphrase) throw new Error('A passphrase is required.');

    const salt = newSalt();
    const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);
    const marker: VaultMarker = {
      version: 1,
      kdf: 'PBKDF2-SHA256',
      iterations: KDF_ITERATIONS,
      salt: toBase64(salt),
      check: await encryptString(CHECK_TOKEN, key),
    };

    const store = new EncryptedStorage(backing, key);
    // Read existing plaintext projects into the working copy.
    const existing = projectKeys(backing).map((k) => [k, backing.getItem(k)!] as const);
    for (const [k, v] of existing) store.plain.set(k, v);

    // Marker first (so an interrupted run is still recognized as a vault),
    // then seal each adopted entry.
    backing.setItem(VAULT_KEY, JSON.stringify(marker));
    for (const [k, v] of existing) {
      backing.setItem(k, await encryptString(v, key));
    }
    return store;
  }

  /** Unlock an existing vault. Throws a friendly error on a wrong passphrase. */
  static async unlock(backing: StorageLike, passphrase: string): Promise<EncryptedStorage> {
    const markerRaw = backing.getItem(VAULT_KEY);
    if (markerRaw === null)
      throw new Error('This computer has no passphrase-protected data.');
    let marker: VaultMarker;
    try {
      marker = JSON.parse(markerRaw) as VaultMarker;
    } catch {
      throw new Error('The passphrase settings on this computer are unreadable.');
    }

    const iterations = marker.iterations ?? KDF_ITERATIONS;
    const key = await deriveKey(passphrase, fromBase64(marker.salt), iterations);

    // Verify against the check token before touching any project data.
    let opened: string;
    try {
      opened = await decryptString(marker.check, key);
    } catch {
      throw new Error('That passphrase does not match.');
    }
    if (opened !== CHECK_TOKEN) throw new Error('That passphrase does not match.');

    const store = new EncryptedStorage(backing, key);
    await store.loadAll();
    return store;
  }

  /** Decrypt all project entries into the working copy. Self-heals plaintext stragglers. */
  private async loadAll(): Promise<void> {
    for (const k of projectKeys(this.backing)) {
      const value = this.backing.getItem(k)!;
      // A straggler left plaintext by an interrupted enable() is adopted as-is;
      // it gets sealed on its next write. A genuine decrypt failure (corruption)
      // is allowed to throw - fail loudly, never silently drop knowledge.
      this.plain.set(k, isEnvelope(value) ? await decryptString(value, this.cryptoKey) : value);
    }
  }

  // --- StorageLike (synchronous, over the in-memory working copy) ---

  getItem(key: string): string | null {
    return this.plain.has(key) ? this.plain.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.plain.set(key, value);
    this.enqueue(async () => this.backing.setItem(key, await encryptString(value, this.cryptoKey)));
  }

  removeItem(key: string): void {
    this.plain.delete(key);
    this.enqueue(async () => this.backing.removeItem(key));
  }

  key(index: number): string | null {
    return Array.from(this.plain.keys())[index] ?? null;
  }

  get length(): number {
    return this.plain.size;
  }

  // --- Lifecycle ---

  private enqueue(op: () => Promise<void>): void {
    this.writeChain = this.writeChain
      .then(op)
      .catch((e) => { this.writeError = e; });
  }

  /** Await all pending encrypted writes. Surfaces a stored write error once. */
  async flush(): Promise<void> {
    await this.writeChain;
    if (this.writeError !== undefined) {
      const e = this.writeError;
      this.writeError = undefined;
      throw e;
    }
  }

  /**
   * Turn off passphrase protection: flush pending writes, rewrite every project
   * entry as plaintext, and remove the marker. Owner-directed and explicit.
   */
  async disable(): Promise<void> {
    await this.flush();
    for (const [k, v] of this.plain) this.backing.setItem(k, v);
    this.backing.removeItem(VAULT_KEY);
  }

  /**
   * The still-sealed project entries as a portable JSON string. Lets a
   * locked-out owner preserve their ciphertext before resetting, so a reset
   * never destroys data (integrity rule 9). Readable later only with the
   * original passphrase.
   */
  static exportSealed(backing: StorageLike): string {
    const marker = backing.getItem(VAULT_KEY);
    const entries: Record<string, string> = {};
    for (const k of projectKeys(backing)) entries[k] = backing.getItem(k)!;
    return JSON.stringify({ kind: 'successor-sealed-vault', marker, entries }, null, 2);
  }
}
