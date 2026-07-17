import { describe, it, expect } from 'vitest';
import { AssistedExtraction, createAnthropicClient } from './llm';
import { RuleBasedEngine, type QA } from './engine';
import { createEmptyModel, validateModel } from '../knowledge-model/model';

/**
 * LIVE verification of assisted interviewing - the one step the archived
 * PR #3 never had. Runs the REAL client against the REAL Anthropic API, and
 * only when a key is present in the environment; skipped everywhere else
 * (CI, normal test runs). Costs a fraction of a cent per run, on the
 * operator's own key. To run (PowerShell):
 *
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."   # from your password manager
 *   npm test -- llm.live
 *   Remove-Item Env:ANTHROPIC_API_KEY      # forget it when done
 *
 * The key is read from the environment for this process only - consistent
 * with rule 11, nothing is written anywhere.
 */

// This test runs under vitest's node environment; the app itself is
// browser-only, so `process` is declared locally rather than adding node
// types to the whole project.
declare const process: { env: Record<string, string | undefined> } | undefined;

const KEY = typeof process !== 'undefined' ? process?.env.ANTHROPIC_API_KEY ?? '' : '';

describe.skipIf(!KEY)('LIVE: assisted extraction against the real API', () => {
  it('drafts a commitment from the Henderson answer, honestly attributed', async () => {
    const assist = new AssistedExtraction(createAnthropicClient(() => KEY));
    const engine = new RuleBasedEngine();
    const model = createEmptyModel('live', { businessName: 'Hartwell (FIXTURE)', ownerName: 'Ray (fictional)' });
    const memory = engine.createMemory();
    const qa: QA = {
      trackId: 'track-3', areaId: 'handshake',
      question: 'What agreements exist only on a handshake or a phone call - terms nobody could find in a file?',
      answer: 'Years back I told Henderson we would eat the freight on anything over ten cases. We shook on it in 2019 and never wrote it down. Nobody else knows the terms.',
      answeredAt: new Date().toISOString(),
    };

    const r = await assist.enrich(model, memory, qa);

    // The live model should find at least the Henderson commitment:
    expect(r.drafts).toBeGreaterThan(0);
    const com = r.model.entities.commitments.find((c) => /henderson/i.test(c.withWhom));
    expect(com, 'expected a commitment naming Henderson').toBeTruthy();
    expect(com!.verified).toBe(false);
    expect(com!.confidence).toBe('low');
    expect(com!.sources[0].kind).toBe('inferred');
    // Whatever came back, the model still validates and nothing was deleted:
    expect(validateModel(r.model)).toEqual([]);
    expect(r.model.entities.facts.length).toBe(model.entities.facts.length);
  }, 60_000);
});
