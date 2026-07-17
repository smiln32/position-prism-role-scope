// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import KnowledgeScreen from './KnowledgeScreen';
import { createEmptyModel } from './model';
import { addRelationship, addProcess } from './capture';
import type { ProcessEntity } from './schema';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';
import { RuleBasedEngine } from '../interview/engine';

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

  it('adds, edits, and removes items in a process step list inline', () => {
    const seeded = addProcess(
      createEmptyModel('ui-list', { businessName: 'Fixture Co', ownerName: 'Owner' }),
      { name: 'Quote review', steps: ['pull drawings', 'check tolerances'] },
    );
    const onSave = vi.fn();
    render(<KnowledgeScreen project={projectWith(seeded)} onSave={onSave} onBack={() => {}} />);

    const steps = (call: number) =>
      ((onSave.mock.calls[call][0] as ProjectFile).model.entities.processes[0] as ProcessEntity)
        .steps.map((s) => s.description);

    // Add a step by typing into the field and pressing Enter.
    const addInput = screen.getByLabelText('Add to Steps');
    fireEvent.change(addInput, { target: { value: 'set price' } });
    fireEvent.keyDown(addInput, { key: 'Enter' });
    expect(steps(0)).toEqual(['pull drawings', 'check tolerances', 'set price']);

    // Edit a step in place (commit on blur).
    const item = screen.getByLabelText('Item: pull drawings');
    fireEvent.change(item, { target: { value: 'pull the latest drawings' } });
    fireEvent.blur(item);
    expect(steps(1)[0]).toBe('pull the latest drawings');

    // Remove a step.
    fireEvent.click(screen.getByRole('button', { name: 'Remove item: check tolerances' }));
    expect(steps(2)).toEqual(['pull drawings']); // renumbered by the pure function
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

/**
 * P1 (2026-07-16). The provenance fix is only real if the UI actually threads
 * the choice through - a correct capture.ts wired to a default-only screen would
 * still record every operator entry as the owner's own. See DECISIONS.md.
 */
describe('KnowledgeScreen: who is entering this', () => {
  const openAndAddCommitment = (withWhom: string) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Add a commitment' }));
    fireEvent.change(screen.getByLabelText('With whom'), { target: { value: withWhom } });
    // The submit button inside the open Add form is labelled just "Add".
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  };

  it('defaults to the owner, and records owner provenance', () => {
    let saved: ProjectFile | null = null;
    render(<KnowledgeScreen project={projectWith()} onSave={(p) => { saved = p; }} onBack={() => {}} />);
    // No jest-dom in this harness - assert the DOM property directly.
    expect((screen.getByLabelText(/The owner, in their own words/) as HTMLInputElement).checked).toBe(true);
    openAndAddCommitment('Henderson');
    const c = saved!.model.entities.commitments[0];
    expect(c.sources[0].detail).toBe('Entered directly by the owner');
    expect(c.verified).toBe(true);
  });

  it('records operator provenance once the operator is selected', () => {
    let saved: ProjectFile | null = null;
    render(<KnowledgeScreen project={projectWith()} onSave={(p) => { saved = p; }} onBack={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Someone else, writing up what the owner said/));
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: 'J. Smith' } });
    openAndAddCommitment('Henderson');
    const c = saved!.model.entities.commitments[0];
    expect(c.sources[0].kind).toBe('inferred');
    expect(c.sources[0].detail).toContain('Structured by J. Smith');
    expect(c.sources[0].detail).not.toContain('Entered directly by the owner');
    expect(c.verified).toBe(false);
    expect(c.confidence).toBe('medium');
  });

  it('warns the operator that their entries need the owner\'s confirmation', () => {
    render(<KnowledgeScreen project={projectWith()} onSave={() => {}} onBack={() => {}} />);
    expect(screen.queryByText(/your interpretation, not the owner/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Someone else, writing up what the owner said/));
    expect(screen.getByText(/your interpretation, not the owner/)).toBeTruthy();
  });
});

/**
 * Operator polish (2026-07-17, DECISIONS.md): the operator's name survives
 * between sittings on the project file, and the structuring workbench lets an
 * entry record exactly which verbatim answer it was drawn from.
 */
describe('KnowledgeScreen: operator workbench', () => {
  const enterOperatorMode = (name?: string) => {
    fireEvent.click(screen.getByLabelText(/Someone else, writing up what the owner said/));
    if (name !== undefined) {
      const input = screen.getByLabelText(/Your name/);
      fireEvent.change(input, { target: { value: name } });
      fireEvent.blur(input);
    }
  };

  it('persists the operator name onto the project on blur', () => {
    const project = projectWith();
    let saved: ProjectFile | null = null;
    render(<KnowledgeScreen project={project} onSave={(p) => { saved = p; }} onBack={() => {}} />);
    enterOperatorMode('J. Smith');
    expect(saved!.operatorName).toBe('J. Smith');
    // App-level bookkeeping only - the model is untouched by the name save:
    expect(saved!.model).toBe(project.model);
  });

  it('seeds the name from the project when flipping to operator mode', () => {
    const project = { ...projectWith(), operatorName: 'J. Smith' };
    render(<KnowledgeScreen project={project} onSave={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByLabelText(/Someone else, writing up what the owner said/));
    expect((screen.getByLabelText(/Your name/) as HTMLInputElement).value).toBe('J. Smith');
  });

  it('the transcript picker threads the chosen answer into the entry source', () => {
    // A project with one captured interview answer to structure from:
    const engine = new RuleBasedEngine();
    const memory = engine.createMemory();
    let model = createEmptyModel('wb', { businessName: 'B Co', ownerName: 'O' });
    const r = engine.ingestAnswer(memory, model, 's1', 'track-3',
      'Years back I told Henderson we would eat the freight on anything over ten cases.');
    model = r.model;
    const project: ProjectFile = { formatVersion: PROJECT_FORMAT_VERSION, model, sessions: [], interviewMemory: r.memory };
    const factId = model.entities.facts[0].id;

    let saved: ProjectFile | null = null;
    render(<KnowledgeScreen project={project} onSave={(p) => { saved = p; }} onBack={() => {}} />);
    enterOperatorMode('J. Smith');
    // Open the workbench, find the answer, select it as the source:
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    // The verbatim answer appears in the workbench AND in the facts section:
    expect(screen.getAllByText(/eat the freight/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: 'Use as source' }));
    expect(screen.getByText(/Structuring from:/)).toBeTruthy();
    // Add a commitment; its provenance names operator AND the source fact:
    fireEvent.click(screen.getByRole('button', { name: '+ Add a commitment' }));
    fireEvent.change(screen.getByLabelText('With whom'), { target: { value: 'Henderson' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const c = saved!.model.entities.commitments[0];
    expect(c.sources[0].detail).toContain('Structured by J. Smith');
    expect(c.sources[0].detail).toContain(factId);
    expect(c.verified).toBe(false);
  });

  it('the workbench is not shown in owner mode', () => {
    render(<KnowledgeScreen project={projectWith()} onSave={() => {}} onBack={() => {}} />);
    expect(screen.queryByText('Structure from the transcript')).toBeNull();
  });
});
