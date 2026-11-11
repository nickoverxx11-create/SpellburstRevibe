// One handler per Spellburst operator (§5.2.2: "routes for modifying, merging,
// extracting, and auto-completing code"), plus diff and semantic mapping.
// Used by api/[op].ts on Vercel and by the Vite dev middleware locally.

import { chat, chatStream, FAST_MODEL, MODEL, type ChatMessage } from './openai.js';
import {
  AUTOCOMPLETE_CONTEXT,
  AUTOCOMPLETE_SYSTEM,
  DIFF_SYSTEM,
  EXTRACT_SYSTEM,
  MERGE_CONTEXT,
  MERGE_SYSTEM,
  MODIFY_SYSTEM,
  SEMANTIC_SYSTEM,
  VARIATION_CONTEXT,
} from './prompts.js';
import { retrieveExamples } from './examples.js';

const MAX_CODE = 24_000; // guard against runaway payloads

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const textStream = (stream: ReadableStream<Uint8Array>) =>
  new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' },
  });

const str = (v: unknown, max = MAX_CODE) => (typeof v === 'string' ? v.slice(0, max) : '');

interface SemanticVar { name: string; default: number; min: number; max: number; step: number }
interface SemanticGroup { phrase: string; vars: SemanticVar[] }

async function modify(b: any) {
  const code = str(b.code);
  const prompt = str(b.prompt, 2000);
  if (!prompt) return json({ error: 'prompt is required' }, 400);
  const groups: SemanticGroup[] | undefined = Array.isArray(b.semantic) ? b.semantic : undefined;
  const input: Record<string, unknown> = { code, variationPrompt: prompt };
  if (groups?.length) {
    input.semanticMap = groups;
    input.instruction =
      'Declare every variable listed in semanticMap as a top-level `let name = <default number>;` at the very top of the code (before setup), and make the related visual qualities depend on those variables so changing them visibly changes the sketch.';
  }
  const messages: ChatMessage[] = [
    { role: 'system', content: MODIFY_SYSTEM },
    ...VARIATION_CONTEXT,
    ...retrieveExamples(prompt, 1),
    { role: 'user', content: JSON.stringify(input) },
  ];
  return textStream(await chatStream(messages, { model: MODEL() }));
}

async function semantic(b: any) {
  const prompt = str(b.prompt, 2000);
  if (!prompt) return json({ groups: [] });
  const out = await chat(
    [
      { role: 'system', content: SEMANTIC_SYSTEM },
      { role: 'user', content: JSON.stringify({ prompt, currentCode: str(b.code, 6000) }) },
    ],
    { model: FAST_MODEL(), json: true, temperature: 0.3, maxTokens: 600 },
  );
  try {
    const parsed = JSON.parse(out);
    const groups: SemanticGroup[] = (parsed.groups ?? [])
      .filter((g: any) => g && typeof g.phrase === 'string' && Array.isArray(g.vars))
      .map((g: any) => ({
        phrase: g.phrase,
        vars: g.vars
          .filter((v: any) => /^[A-Za-z_$][\w$]*$/.test(v?.name ?? ''))
          .map((v: any) => {
            const def = Number(v.default) || 0;
            const min = Number.isFinite(+v.min) ? +v.min : Math.min(0, def);
            const max = Number.isFinite(+v.max) && +v.max > min ? +v.max : Math.max(def * 2, min + 1);
            const step = Number(v.step) > 0 ? Number(v.step) : (max - min) / 100;
            return { name: v.name, default: def, min, max, step };
          }),
      }))
      .filter((g: SemanticGroup) => g.vars.length);
    return json({ groups: groups.slice(0, 3) });
  } catch {
    return json({ groups: [] });
  }
}

async function merge(b: any) {
  const input: Record<string, unknown> = { firstCode: str(b.firstCode), secondCode: str(b.secondCode) };
  const userPrompt = str(b.prompt, 2000).trim();
  if (userPrompt) input.mergePrompt = userPrompt;
  const messages: ChatMessage[] = [
    { role: 'system', content: MERGE_SYSTEM },
    ...MERGE_CONTEXT,
    { role: 'user', content: JSON.stringify(input) },
  ];
  return textStream(await chatStream(messages, { model: MODEL() }));
}

async function extract(b: any) {
  const prompt = str(b.prompt, 2000);
  if (!prompt) return json({ error: 'prompt is required' }, 400);
  const messages: ChatMessage[] = [
    { role: 'system', content: EXTRACT_SYSTEM },
    { role: 'user', content: JSON.stringify({ code: str(b.code), extract: prompt }) },
  ];
  return textStream(await chatStream(messages, { model: MODEL() }));
}

async function diff(b: any) {
  const messages: ChatMessage[] = [
    { role: 'system', content: DIFF_SYSTEM },
    {
      role: 'user',
      content: `Sketch A:\n${str(b.codeA)}\n\n---\n\nSketch B:\n${str(b.codeB)}`,
    },
  ];
  return textStream(await chatStream(messages, { model: MODEL(), temperature: 0.4, maxTokens: 500 }));
}

async function autocomplete(b: any) {
  const prompt = str(b.prompt, 1000);
  const code = str(b.code, 3000);
  const system = code
    ? `${AUTOCOMPLETE_SYSTEM}\n\nThe prompt will be applied to this sketch:\n${code}`
    : AUTOCOMPLETE_SYSTEM;
  const out = await chat([{ role: 'system', content: system }, ...AUTOCOMPLETE_CONTEXT, { role: 'user', content: prompt }], {
    model: FAST_MODEL(),
    temperature: 1,
    maxTokens: 200,
  });
  const match = out.match(/\[[\s\S]*\]/);
  let suggestions: string[] = [];
  try {
    suggestions = match ? JSON.parse(match[0]) : [];
  } catch {
    suggestions = [];
  }
  return json({
    suggestions: suggestions
      .filter((s) => typeof s === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  });
}

const ROUTES: Record<string, (b: any) => Promise<Response>> = {
  modify,
  semantic,
  merge,
  extract,
  diff,
  autocomplete,
};

export async function handle(op: string, request: Request): Promise<Response> {
  if (op === 'health') {
    return json({ ok: true, model: MODEL(), fastModel: FAST_MODEL(), hasKey: Boolean(process.env.OPENAI_API_KEY) });
  }
  const route = ROUTES[op];
  if (!route) return json({ error: `unknown operation "${op}"` }, 404);
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await request.json();
    return await route(body);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
