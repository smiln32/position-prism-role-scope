// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import KnowledgeScreen from './KnowledgeScreen';
import { createEmptyModel } from './model';
import { addRelationship } from './capture';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

afterEach(cleanup);

const projectWith = (model = createEmptyModel('ui-test', { businessName: 'Fixture Co', ownerName: 'Owner' })): ProjectFile =>
  ({ formatVersion: PROJECT_FORMAT_VERSION, model, sessions: [] });

describe('KnowledgeScreen (component)', () => {
  it('shows "Not yet captured" for an empty section', () => {
    render(<KnowledgeScreen project={projectWith()} onSave={() => {}} onBack={() => {}} />);
    // Every section is empty on a fresh model.
    expect(screen.getAllByText('Not yet captured.').length).toBeGreaterThan(0);
  });

  it('adds a relationship through the form and saves it into the model', () => {
    const onSave = vi.fn();
    render(<KnowledgeScreen project={projectWith()} onSave={onSave} onBack={() => {}} />);

    fireEvent.click(screen.getByText('+ Add a relationship'));
    fireEvent.change(screen.getByLabelText('Who'), { target: { value: 'Valley Brothers' } });
    fireEvent.change(screen.getByLabelText('Why they matter'), { target: { value: 'only steel supplier we trust' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as ProjectFile;
    expect(saved.model.entities.relationships).toHaveLength(1);
    expect(saved.model.entities.relationships[0].who).toBe('Valley Brothers');
    expect(saved.model.entities.relationships[0].verified).toBe(true);
  });

  it('edits an existing entity field inline and saves the patch', () => {
    const seeded = addRelationship(
      createEmptyModel('ui-edit', { businessName: 'Fixture Co', ownerName: 'Owner' }),
      { who: 'Valley Brothers', whyTheyMatter: 'steel' },
    );
    const onSave = vi.fn();
    render(<KnowledgeScreen project={projectWith(seeded)} onSave={onSave} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('Why they matter'), {
      target: { value: 'only steel supplier that hits our tolerances' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as ProjectFile;
    expect(saved.model.entities.relationships[0].whyTheyMatter).toContain('tolerances');
    expect(saved.model.entities.relationships[0].id).toBe(seeded.entities.relationships[0].id);
  });

  it('toggles an item\'s verified state', () => {
    const seeded = addRelationship(
      createEmptyModel('ui-verify', { businessName: 'Fixture Co', ownerName: 'Owner' }),
      { who: 'Valley Brothers' },
    );
    const onSave = vi.fn();
    render(<KnowledgeScreen project={projectWith(seeded)} onSave={onSave} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /confirmed: valley brothers/i }));

    const saved = onSave.mock.calls[0][0] as ProjectFile;
    expect(saved.model.entities.relationships[0].verified).toBe(false);
  });

  it('scopes the add form to its own section', () => {
    render(<KnowledgeScreen project={projectWith()} onSave={() => {}} onBack={() => {}} />);
    // Opening the decisions form must not reveal relationship-only fields.
    fireEvent.click(screen.getByText('+ Add a decision'));
    const form = screen.getByRole('button', { name: 'Add' }).closest('.card')!;
    expect(within(form as HTMLElement).getByLabelText('Decision')).toBeTruthy();
    expect(within(form as HTMLElement).queryByLabelText('Who')).toBeNull();
  });
});
