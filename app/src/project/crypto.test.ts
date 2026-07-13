import { describe, it, expect } from 'vitest';
import {
  deriveKey, encryptString, decryptString, isEnvelope,
  newSalt, toBase64, fromBase64,
} from './crypto';

describe('crypto primitives', () => {
  it('round-trips a string through derive/encrypt/decrypt', async () => {
    const salt = newSalt();
    const key = await deriveKey('correct horse battery staple', salt);
    const sealed = await encryptString('the vendor list is on the shared drive', key);
    expect(isEnvelope(sealed)).toBe(true);
    expect(sealed).not.toContain('vendor');
    expect(await decryptString(sealed, key)).toBe('the vendor list is on the shared drive');
  });

  it('a wrong passphrase fails to decrypt (auth tag rejects)', async () => {
    const salt = newSalt();
    const right = await deriveKey('right', salt);
    const wrong = await deriveKey('wrong', salt);
    const sealed = await encryptString('secret', right);
    await expect(decryptString(sealed, wrong)).rejects.toBeTruthy();
  });

  it('a different salt yields a different key for the same passphrase', async () => {
    const sealed = await encryptString('x', await deriveKey('pw', newSalt()));
    const otherKey = await deriveKey('pw', newSalt());
    await expect(decryptString(sealed, otherKey)).rejects.toBeTruthy();
  });

  it('uses a fresh IV so identical plaintext seals differently', async () => {
    const key = await deriveKey('pw', newSalt());
    const a = await encryptString('same', key);
    const b = await encryptString('same', key);
    expect(a).not.toBe(b);
    expect(await decryptString(a, key)).toBe('same');
    expect(await decryptString(b, key)).toBe('same');
  });

  it('rejects a malformed envelope', async () => {
    const key = await deriveKey('pw', newSalt());
    await expect(decryptString('not-an-envelope', key)).rejects.toThrow('Unrecognized');
    expect(isEnvelope('plain text')).toBe(false);
  });

  it('base64 round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });
});
