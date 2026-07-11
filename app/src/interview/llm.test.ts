import { describe, it, expect } from 'vitest';
import { createEmptyModel, validateModel } from '../knowledge-model/model';
import { RuleBasedEngine } from './engine';
import {
  createAnthropicClient, LlmInterviewEngine,
  ANTHROPIC_URL, HAIKU_MODEL,
  type LlmClient, type LlmRequest, type LlmResponse,
} from './llm';

const profile = { businessName: 'Hartwell Machine & Tool (FIXTURE)', ownerName: 'Ray (fictional)' };

/** Fake client that returns scripted responses and records the request. */
function fakeClient(handler: (req: LlmRequest) => LlmResponse): LlmClient & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    async complete(req) { calls.push(req); return handler(req); },
  };
}

describe('createAnthropicClient (fetch transport)', () => {
  it('throws before any request when no key is set', async () => {
    let fetched = false;
    const client = createAnthropicClient(() => null, (async () => { fetched = true; return new Response(); }) as unknown as typeof fetch);
    await expect(client.complete({ maxTokens: 10, messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/no api key/i);
    expect(fetched).toBe(false);
  });

  it('reads the key fresh on each call and never caches it', async () => {
    const keys = ['k1', 'k2'];
    const seen: string[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      seen.push((init.headers as Record<string, string>)['x-api-key']);
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createAnthropicClient(() => keys.shift() ?? null, fetchImpl);
    await client.complete({ maxTokens: 10, messages: [{ role: 'user', content: 'a' }] });
    await client.complete({ maxTokens: 10, messages: [{ role: 'user', content: 'b' }] });
    expect(seen).toEqual(['k1', 'k2']);
  });

  it('sends the required headers, model, and forced tool_choice', async () => {
    let capturedUrl = '';
    let capturedBody: Record<string, unknown> = {};
    let capturedHeaders: Record<string, string> = {};
    const fetchImpl = (async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', input: { ok: true } }], stop_reason: 'tool_use' }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createAnthropicClient(() => 'secret', fetchImpl);

    const res = await client.complete({
      maxTokens: 50,
      system: 'sys',
      messages: [{ role: 'user', content: 'q' }],
      tool: { name: 't', description: 'd', inputSchema: { type: 'object' } },
    });

    expect(capturedUrl).toBe(ANTHROPIC_URL);
    expect(capturedHeaders['x-api-key']).toBe('secret');
    expect(capturedHeaders['anthropic-version']).toBe('2023-06-01');
    expect(capturedHeaders['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(capturedBody.model).toBe(HAIKU_MODEL);
    expect(capturedBody.system).toBe('sys');
    expect(capturedBody.tool_choice).toEqual({ type: 'tool', name: 't' });
    expect(res.toolInput).toEqual({ ok: true });
    expect(res.stopReason).toBe('tool_use');
  });

  it('surfaces API errors with status and detail', async () => {
    const fetchImpl = (async () => new Response('overloaded', { status: 529 })) as unknown as typeof fetch;
    const client = createAnthropicClient(() => 'k', fetchImpl);
    await expect(client.complete({ maxTokens: 10, messages: [{ role: 'user', content: 'x' }] }))
      .rejects.toThrow(/529/);
  });
});

describe('LlmInterviewEngine - question rewording', () => {
  it('rewords the question but keeps the rule-chosen area and track', async () => {
    const client = fakeClient(() => ({ text: '  "So, walk me through a normal day?"  ', stopReason: 'end_turn' }));
    const engine = new LlmInterviewEngine(client);
    const rules = new RuleBasedEngine();
    const memory = engine.createMemory();

    const base = rules.nextQuestion(memory, 'track-1');
    const q = await engine.nextQuestion(memory, 'track-1');

    expect(q.areaId).toBe(base.areaId);       // area unchanged - coverage stays deterministic
    expect(q.trackId).toBe(base.trackId);
    expect(q.question).toBe('So, walk me through a normal day?'); // surrounding quotes/space stripped
    expect(q.question).not.toBe(base.question);
  });

  it('falls back to the deterministic question text on model failure', async () => {
    const client = fakeClient(() => { throw new Error('network down'); });
    const engine = new LlmInterviewEngine(client);
    const rules = new RuleBasedEngine();
    const memory = engine.createMemory();

    const base = rules.nextQuestion(memory, 'track-1');
    const q = await engine.nextQuestion(memory, 'track-1');
    expect(q.question).toBe(base.question);
  });
});

describe('LlmInterviewEngine - ingest with structured extraction', () => {
  const answer = 'Every Friday I do the quote review myself, and I always call Valley Brothers first.';

  it('keeps the deterministic floor and adds inferred, unverified entities', async () => {
    const client = fakeClient((req) => {
      // Only the extraction call carries a tool.
      if (!req.tool) return { text: '', stopReason: 'end_turn' };
      return {
        text: '', stopReason: 'tool_use',
        toolInput: {
          processes: [{ name: 'Quote review', purpose: 'price aerospace work', frequency: 'weekly' }],
          decisions: [{ name: 'Pricing', howDecided: 'the owner reviews personally' }],
          relationships: [{ who: 'Valley Brothers', category: 'vendor', whyTheyMatter: 'steel supplier' }],
        },
      };
    });
    const engine = new LlmInterviewEngine(client);
    const memory = engine.createMemory();
    const model = createEmptyModel('llm-accept', profile);

    const r = await engine.ingestAnswer(memory, model, 'sess', 'track-1', answer);

    // Floor: the owner's exact words are a high-confidence, unverified Fact.
    const fact = r.model.entities.facts.find((f) => f.statement === answer);
    expect(fact).toBeTruthy();
    expect(fact!.confidence).toBe('high');

    // Structured entities are all inferred, low-confidence, unverified.
    expect(r.model.entities.processes).toHaveLength(1);
    expect(r.model.entities.decisions).toHaveLength(1);
    expect(r.model.entities.relationships).toHaveLength(1);
    for (const e of [...r.model.entities.processes, ...r.model.entities.decisions, ...r.model.entities.relationships]) {
      expect(e.verified).toBe(false);
      expect(e.confidence).toBe('low');
      expect(e.sources[0].kind).toBe('inferred');
    }
    expect(r.model.entities.relationships[0].category).toBe('vendor');
    expect(validateModel(r.model)).toEqual([]); // still valid against the frozen contract
  });

  it('drops proposed entities with no name and never fabricates one', async () => {
    const client = fakeClient((req) => req.tool
      ? { text: '', stopReason: 'tool_use', toolInput: { processes: [{ name: '   ' }, { purpose: 'orphan' }], decisions: [], relationships: [] } }
      : { text: '', stopReason: 'end_turn' });
    const engine = new LlmInterviewEngine(client);
    const r = await engine.ingestAnswer(engine.createMemory(), createEmptyModel('p', profile), 's', 'track-1', answer);
    expect(r.model.entities.processes).toHaveLength(0);
  });

  it('coerces an unknown relationship category to "other"', async () => {
    const client = fakeClient((req) => req.tool
      ? { text: '', stopReason: 'tool_use', toolInput: { processes: [], decisions: [], relationships: [{ who: 'Someone', category: 'nonsense' }] } }
      : { text: '', stopReason: 'end_turn' });
    const engine = new LlmInterviewEngine(client);
    const r = await engine.ingestAnswer(engine.createMemory(), createEmptyModel('p', profile), 's', 'track-1', answer);
    expect(r.model.entities.relationships[0].category).toBe('other');
  });

  it('returns the untouched floor when extraction fails', async () => {
    const client = fakeClient((req) => {
      if (req.tool) throw new Error('extraction failed');
      return { text: '', stopReason: 'end_turn' };
    });
    const engine = new LlmInterviewEngine(client);
    const r = await engine.ingestAnswer(engine.createMemory(), createEmptyModel('p', profile), 's', 'track-1', answer);
    expect(r.model.entities.facts.some((f) => f.statement === answer)).toBe(true); // floor intact
    expect(r.model.entities.processes).toHaveLength(0);                            // no invention
  });

  it('never calls the model for an empty answer', async () => {
    const client = fakeClient(() => ({ text: 'should not run', stopReason: 'end_turn' }));
    const engine = new LlmInterviewEngine(client);
    const r = await engine.ingestAnswer(engine.createMemory(), createEmptyModel('p', profile), 's', 'track-1', '   ');
    expect(client.calls).toHaveLength(0);
    expect(r.model.entities.facts).toHaveLength(0);
  });
});
