// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('App shell (smoke)', () => {
  it('renders the home screen with the product name and disclaimer', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Successor' })).toBeTruthy();
    expect(screen.getByText(/does not provide\s+financial, tax, legal/i)).toBeTruthy();
    expect(screen.getByText('No projects yet. Start one below.')).toBeTruthy();
  });

  it('creates a project end to end and lands on the project screen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new project' }));
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Hartwell Machine (FIXTURE)' } });
    fireEvent.change(screen.getByLabelText("The owner's name"), { target: { value: 'Ray (fictional)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    // The project screen shows the business name and the new knowledge entry point.
    expect(screen.getByRole('heading', { name: 'Hartwell Machine (FIXTURE)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review & add knowledge/i })).toBeTruthy();
  });
});

/**
 * Deletion caution flow (2026-07-17). Owner directive: the app must "clearly
 * identify and caution" whenever files are deleted. Deletion names the
 * project, warns about the backup, and stays disabled until the operator
 * attests to a verified exported copy. See 08-docs/CUSTODY.md and DECISIONS.md.
 */
describe('Deleting a project (custody protocol)', () => {
  const createProject = (name: string) => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new project' }));
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: name } });
    fireEvent.change(screen.getByLabelText("The owner's name"), { target: { value: 'Owner (fictional)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    fireEvent.click(screen.getByRole('button', { name: '← All projects' }));
  };

  it('requires the attestation checkbox before Delete enables, and cancel keeps the project', () => {
    createProject('Delete Test Co (FIXTURE)');
    fireEvent.click(screen.getByRole('button', { name: 'Delete from this computer…' }));
    // Clearly identifies what is being deleted, and cautions:
    expect(screen.getByText(/You are about to delete .Delete Test Co \(FIXTURE\)./)).toBeTruthy();
    expect(screen.getByText(/and its automatic backup/)).toBeTruthy();
    expect(screen.getByText(/make sure the file restores/)).toBeTruthy();
    // The destructive button is disabled until the operator attests:
    const del = screen.getByRole('button', { name: /^Delete .Delete Test Co/ }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    // Cancel walks away with nothing lost:
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Delete Test Co (FIXTURE)')).toBeTruthy();
    expect(window.localStorage.length).toBeGreaterThan(0);
  });

  it('attested deletion removes the working copy AND the backup slot', () => {
    createProject('Gone Co (FIXTURE)');
    // Open a project once so a save (and its backup) exists: creation saved it.
    const keysBefore = Object.keys(window.localStorage).filter((k) => k.startsWith('successor:'));
    expect(keysBefore.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Delete from this computer…' }));
    fireEvent.click(screen.getByLabelText(/I have a verified exported copy of Gone Co/));
    fireEvent.click(screen.getByRole('button', { name: /^Delete .Gone Co/ }));
    // Gone from the list, with a plain-language note:
    expect(screen.getByText('"Gone Co (FIXTURE)" was deleted from this computer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
    // Gone from storage - primary and backup both:
    const keysAfter = Object.keys(window.localStorage).filter((k) => k.startsWith('successor:project'));
    expect(keysAfter).toEqual([]);
  });
});
