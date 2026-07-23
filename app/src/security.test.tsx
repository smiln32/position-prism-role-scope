// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

function createProject(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Start a new project' }));
  fireEvent.change(screen.getByLabelText('Business name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("The owner's name"), { target: { value: 'Owner (fictional)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
}

function rawStorageDump(): string {
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)!;
    if (k.startsWith('successor:project:')) out.push(window.localStorage.getItem(k)!);
  }
  return out.join('\n');
}

describe('passphrase protection (data at rest)', () => {
  it('enables protection, encrypts on disk, locks, and unlocks', async () => {
    render(<App />);
    createProject('Vault Co (FIXTURE)');

    // Plaintext on disk before protection is on.
    expect(rawStorageDump()).toContain('Vault Co (FIXTURE)');

    // Back to home and turn on protection.
    fireEvent.click(screen.getByRole('button', { name: '← All projects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set a passphrase' }));
    fireEvent.change(screen.getByLabelText('Choose a passphrase'), { target: { value: 'open-sesame-42' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'open-sesame-42' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on protection' }));

    await screen.findByRole('heading', { name: 'This computer is protected' });

    // On disk it is now ciphertext: the marker exists and no plaintext leaks.
    expect(window.localStorage.getItem('successor:vault')).not.toBeNull();
    const dump = rawStorageDump();
    expect(dump).not.toContain('Vault Co (FIXTURE)');
    expect(dump).toContain('v1:'); // sealed envelope

    // Lock, then a fresh mount must show the lock gate.
    fireEvent.click(screen.getByRole('button', { name: 'Lock now' }));
    cleanup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'This computer is locked' })).toBeTruthy();

    // Wrong passphrase is rejected.
    fireEvent.change(screen.getByLabelText('Passphrase'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await screen.findByText(/does not match/i);

    // Correct passphrase unlocks and the project is back.
    fireEvent.change(screen.getByLabelText('Passphrase'), { target: { value: 'open-sesame-42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByText('Vault Co (FIXTURE)')).toBeTruthy());
  });

  it('removing protection returns plaintext storage', async () => {
    render(<App />);
    createProject('Plain Co (FIXTURE)');
    fireEvent.click(screen.getByRole('button', { name: '← All projects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set a passphrase' }));
    fireEvent.change(screen.getByLabelText('Choose a passphrase'), { target: { value: 'passphrase-1' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'passphrase-1' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on protection' }));
    await screen.findByRole('heading', { name: 'This computer is protected' });

    // window.confirm is auto-approved in jsdom by stubbing.
    const original = window.confirm;
    window.confirm = () => true;
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Remove protection' }));
      await waitFor(() => expect(window.localStorage.getItem('successor:vault')).toBeNull());
    } finally {
      window.confirm = original;
    }
    expect(rawStorageDump()).toContain('Plain Co (FIXTURE)');
  });
});
