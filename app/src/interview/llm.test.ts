import { describe, it, expect, vi } from 'vitest';
import {
  AssistedExtraction, createAnthropicClient, EXTRACT_TOOL,
  ASSIST_MODEL, ANTHROPIC_URL, MAX_FLAGS_PER_ANSWER,
  type LlmClient, type LlmResponse,
} from './llm';
import { RuleBasedEngine, type QA } from './engine';
import { createEmptyModel, validateModel } from '../knowledge-model/model';

/**
 * Assisted interviewing (2026-07-17, DECISIONS.md). The port of archived PR #3
 * as an enrichment layer: the rules floor is saved before any network call,
 * drafts are inferred/low/unverified across all seven entity types, and
 * clarification flags become gaps + queued follow-up threads, capped.
 */

const QA_FIXTURE: QA = {
  trackId: 'track-3', areaId: 'handshake',
  question: 'What agreements exist only on a handshake or a phone call?',
  answer: 'Years back I told Henderson we would eat the freight on anything over ten cases, and Big Mike lets us park the second trailer at his yard over winter.',
  answeredAt: '2026-07-17T00:00:00.000Z',
};

const fakeClient = (toolInput: unknown): LlmClient => ({
  complete: async (): Promise<LlmResponse> => ({ text: '', toolInput, stopReason: 'tool_use' }),
});

const base = () => {
  const engine = new RuleBasedEngine();
  return { model: createEmptyModel('llm-t', { businessName: 'B', ownerName: 'O' }), memory: engine.createMemory() };
};

describe('AssistedExtraction.enrich', () => {
  it('drafts entities across all seven types, each inferred/low/unverified', async () => {
    const { model, memory } = base();
    const assist = new AssistedExtraction(fakeClient({
      processes: [{ name: 'Month-end close', frequency: 'monthly' }],
      decisions: [{ name: 'Taking a new vendor', howDecided: 'Gut plus references' }],
      relationships: [{ who: 'Big Mike', category: 'vendor', whyTheyMatter: 'Winter trailer parking' }],
      commitments: [
        { withWhom: 'Henderson', whatWasPromised: 'free freight over ten cases', direction: 'owed-by-business', writtenDown: false },
        { withWhom: 'Big Mike', whatWasPromised: 'winter trailer parking', direction: 'owed-to-business', writtenDown: false },
      ],
      systems: [{ name: 'QuickBooks', accessHeldBy: 'Ray and Denise' }],
      judgments: [{ heuristic: 'If a vendor calls twice in a week, something is wrong.' }],
      history: [{ whatHappened: 'The 2019 freight dispute', when: '2019' }],
      clarifications: [],
    }));
    const r = await assist.enrich(model, memory, QA_FIXTURE);
    expect(r.drafts).toBe(8);
    expect(r.model.entities.commitments.length).toBe(2);
    expect(r.model.entities.commitments[0].withWhom).toBe('Henderson');
    const all = [
      ...r.model.entities.processes, ...r.model.entities.decisions,
      ...r.model.entities.relationships, ...r.model.entities.commitments,
      ...r.model.entities.systems, ...r.model.entities.judgments, ...r.model.entities.history,
    ];
    for (const e of all) {
      expect(e.sources[0].kind).toBe('inferred');
      expect(e.confidence).toBe('low');
      expect(e.verified).toBe(false);
      expect(e.sources[0].detail).toContain('track-3:handshake');
    }
    expect(validateModel(r.model)).toEqual([]);
    // Inputs untouched (pure):
    expect(model.entities.commitments.length).toBe(0);
  });

  it('clarification flags become gaps AND queued follow-up threads, capped', async () => {
    const { model, memory } = base();
    const assist = new AssistedExtraction(fakeClient({
      processes: [], decisions: [], relationships: [], commitments: [],
      systems: [], judgments: [], history: [],
      clarifications: [
        { question: 'Is anything owed to Big Mike in return for the parking?', why: 'Direction of the arrangement is unstated' },
        { question: 'Does anyone besides you know the Henderson terms?' },
        { question: 'Roughly how much does the freight concession cost per year?' },
        { question: 'A fourth question that must be dropped by the cap' },
      ],
    }));
    const r = await assist.enrich(model, memory, QA_FIXTURE);
    expect(r.flags).toBe(MAX_FLAGS_PER_ANSWER);
    expect(r.model.entities.gaps.length).toBe(3);
    expect(r.model.entities.gaps[0].status).toBe('queued');
    expect(r.model.entities.gaps[0].sources[0].kind).toBe('inferred');
    // Threads queue on the SAME track/area, so the next sitting asks them:
    expect(r.memory.pendingThreads.length).toBe(3);
    expect(r.memory.pendingThreads[0].trackId).toBe('track-3');
    expect(r.memory.pendingThreads.map((t) => t.question)).not.toContain(
      'A fourth question that must be dropped by the cap');
  });

  it('the next question asked IS a queued clarification flag', async () => {
    const engine = new RuleBasedEngine();
    const { model, memory } = base();
    const assist = new AssistedExtraction(fakeClient({
      processes: [], decisions: [], relationships: [], commitments: [],
      systems: [], judgments: [], history: [],
      clarifications: [{ question: 'Is anything owed to Big Mike in return?' }],
    }));
    const r = await assist.enrich(model, memory, QA_FIXTURE);
    const q = engine.nextQuestion(r.memory, 'track-3');
    expect(q.isFollowUp).toBe(true);
    expect(q.question).toBe('Is anything owed to Big Mike in return?');
  });

  it('an empty extraction returns the inputs unchanged (no timestamp churn)', async () => {
    const { model, memory } = base();
    const assist = new AssistedExtraction(fakeClient({
      processes: [], decisions: [], relationships: [], commitments: [],
      systems: [], judgments: [], history: [], clarifications: [],
    }));
    const r = await assist.enrich(model, memory, QA_FIXTURE);
    expect(r.model).toBe(model);
    expect(r.memory).toBe(memory);
    expect(r.drafts + r.flags).toBe(0);
  });

  it('a client failure propagates - the caller keeps the saved floor', async () => {
    const { model, memory } = base();
    const assist = new AssistedExtraction({
      complete: async () => { throw new Error('network down'); },
    });
    await expect(assist.enrich(model, memory, QA_FIXTURE)).rejects.toThrow('network down');
  });

  it('nameless/malformed entries are skipped, valid siblings kept', async () => {
    const { model, memory } = base();
    const assist = new AssistedExtraction(fakeClient({
      processes: [{ purpose: 'no name - dropped' }, { name: 'Real process' }],
      decisions: [], relationships: [{ who: '' }], commitments: [],
      systems: [], judgments: [], history: [], clarifications: [{ question: '   ' }],
    }));
    const r = await assist.enrich(model, memory, QA_FIXTURE);
    expect(r.drafts).toBe(1);
    expect(r.flags).toBe(0);
    expect(r.model.entities.processes[0].name).toBe('Real process');
  });
});

describe('createAnthropicClient', () => {
  it('sends the documented request shape and parses the forced tool_use', async () => {
    const doFetch = vi.fn(async () => new Response(JSON.stringify({
      content: [{ type: 'tool_use', input: { ok: true } }],
      stop_reason: 'tool_use',
    }), { status: 200 }));
    const client = createAnthropicClient(() => 'sk-ant-test', doFetch as unknown as typeof fetch);
    const res = await client.complete({
      maxTokens: 1024, tool: EXTRACT_TOOL,
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(res.toolInput).toEqual({ ok: true });
    const [url, init] = doFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ANTHROPIC_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBeTruthy();
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(ASSIST_MODEL);
    expect(body.tool_choice).toEqual({ type: 'tool', name: EXTRACT_TOOL.name });
    expect(body.tools[0].input_schema.required).toContain('commitments');
    expect(body.tools[0].input_schema.required).toContain('clarifications');
  });

  it('refuses to call out without a key', async () => {
    const doFetch = vi.fn();
    const client = createAnthropicClient(() => null, doFetch as unknown as typeof fetch);
    await expect(client.complete({ maxTokens: 10, messages: [] })).rejects.toThrow('No API key');
    expect(doFetch).not.toHaveBeenCalled();
  });

  it('surfaces API errors with status', async () => {
    const doFetch = vi.fn(async () => new Response('{"error":"bad"}', { status: 401 }));
    const client = createAnthropicClient(() => 'sk-ant-test', doFetch as unknown as typeof fetch);
    await expect(client.complete({ maxTokens: 10, messages: [{ role: 'user', content: 'x' }] }))
      .rejects.toThrow('401');
  });
});
