import { describe, it, expect } from 'vitest';
import { EncryptedStorage, VAULT_KEY, isVaultConfigured, hasProjectEntries } from './vault';
import { isEnvelope } from './crypto';
import {
  ProjectStore, startSession, PROJECT_FORMAT_VERSION,
  type ProjectFile, type StorageLike,
} from './store';
import { createEmptyModel } from '../knowledge-model/model';

/** In-memory Storage backend, identical to the one ProjectStore's own tests use. */
function fakeStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

function project(id: string, name: string): ProjectFile {
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    model: createEmptyModel(id, {
      businessName: name,
      ownerName: 'Owner (fixture)',
    }),
    sessions: [],
  };
}

/** Collect the raw backing values under the project prefix. */
function rawProjectValues(disk: StorageLike): string[] {
  const out: string[] = [];
  for (let i = 0; i < disk.length; i++) {
    const k = disk.key(i);
    if (k && k.startsWith('successor:project:')) out.push(disk.getItem(k)!);
  }
  return out;
}

describe('EncryptedStorage vault', () => {
  it('enable() adopts existing plaintext projects and seals them at rest', async () => {
    const disk = fakeStorage();
    // Owner already has a plaintext project (the pre-upgrade state).
    new ProjectStore(disk).save(project('p1', 'Hartwell (fixture)'));
    expect(hasProjectEntries(disk)).toBe(true);
    expect(isVaultConfigured(disk)).toBe(false);

    const vault = await EncryptedStorage.enable(disk, 'strong-pass');
    await vault.flush();

    // Marker written; every project value on disk is now ciphertext.
    expect(isVaultConfigured(disk)).toBe(true);
    const raw = rawProjectValues(disk);
    expect(raw.length).toBe(1);
    expect(raw.every(isEnvelope)).toBe(true);
    expect(raw[0]).not.toContain('Hartwell');

    // But the app, reading through the vault, still sees the real project.
    expect(new ProjectStore(vault).load('p1').model.profile.businessName)
      .toBe('Hartwell (fixture)');
  });

  it('ProjectStore works end-to-end over the vault (save/load/list/export)', async () => {
    const disk = fakeStorage();
    const vault = await EncryptedStorage.enable(disk, 'pw');
    const store = new ProjectStore(vault);

    let p = project('p1', 'Acme (fixture)');
    p = startSession(p, 'First sitting').project;
    store.save(p);
    await vault.flush();

    expect(store.list()).toEqual([
      expect.objectContaining({ projectId: 'p1', businessName: 'Acme (fixture)', sessionCount: 1 }),
    ]);
    const loaded = store.load('p1');
    expect(loaded.sessions[0].label).toBe('First sitting');
    // Nothing readable leaked to disk.
    expect(rawProjectValues(disk).every(isEnvelope)).toBe(true);
    expect(JSON.stringify(rawProjectValues(disk))).not.toContain('Acme');
  });

  it('unlock() in a fresh instance restores exactly what was sealed', async () => {
    const disk = fakeStorage();
    {
      const vault = await EncryptedStorage.enable(disk, 'pw');
      const store = new ProjectStore(vault);
      store.save(project('p1', 'Round Trip Co (fixture)'));
      await vault.flush();
    }
    // Fresh session: everything in memory is gone; only the encrypted disk remains.
    const reopened = await EncryptedStorage.unlock(disk, 'pw');
    expect(new ProjectStore(reopened).load('p1').model.profile.businessName)
      .toBe('Round Trip Co (fixture)');
  });

  it('unlock() rejects a wrong passphrase without touching project data', async () => {
    const disk = fakeStorage();
    const vault = await EncryptedStorage.enable(disk, 'right-pass');
    new ProjectStore(vault).save(project('p1', 'Secret Co (fixture)'));
    await vault.flush();

    await expect(EncryptedStorage.unlock(disk, 'wrong-pass'))
      .rejects.toThrow('does not match');
    // The correct passphrase still works afterward.
    const ok = await EncryptedStorage.unlock(disk, 'right-pass');
    expect(new ProjectStore(ok).load('p1')).toBeTruthy();
  });

  it('writes-through are serialized: last write wins on disk', async () => {
    const disk = fakeStorage();
    const vault = await EncryptedStorage.enable(disk, 'pw');
    const store = new ProjectStore(vault);
    store.save(project('p1', 'V1 (fixture)'));
    store.save(project('p1', 'V2 (fixture)'));
    store.save(project('p1', 'V3 (fixture)'));
    await vault.flush();

    const reopened = await EncryptedStorage.unlock(disk, 'pw');
    expect(new ProjectStore(reopened).load('p1').model.profile.businessName)
      .toBe('V3 (fixture)');
  });

  it('disable() rewrites plaintext and removes the marker', async () => {
    const disk = fakeStorage();
    const vault = await EncryptedStorage.enable(disk, 'pw');
    new ProjectStore(vault).save(project('p1', 'Plain Again (fixture)'));
    await vault.flush();

    await vault.disable();
    expect(isVaultConfigured(disk)).toBe(false);
    // Disk is readable plaintext JSON again; ProjectStore over raw disk works.
    expect(rawProjectValues(disk).some(isEnvelope)).toBe(false);
    expect(new ProjectStore(disk).load('p1').model.profile.businessName)
      .toBe('Plain Again (fixture)');
  });

  it('enable() refuses when a vault already exists', async () => {
    const disk = fakeStorage();
    await EncryptedStorage.enable(disk, 'pw');
    await expect(EncryptedStorage.enable(disk, 'pw2')).rejects.toThrow('already');
  });

  it('exportSealed() preserves the ciphertext and marker for a locked-out owner', async () => {
    const disk = fakeStorage();
    const vault = await EncryptedStorage.enable(disk, 'pw');
    new ProjectStore(vault).save(project('p1', 'Backup Me (fixture)'));
    await vault.flush();

    const dump = JSON.parse(EncryptedStorage.exportSealed(disk));
    expect(dump.kind).toBe('successor-sealed-vault');
    expect(dump.marker).toBe(disk.getItem(VAULT_KEY));
    expect(Object.keys(dump.entries)).toContain('successor:project:p1');
    expect(isEnvelope(dump.entries['successor:project:p1'])).toBe(true);
  });
});
