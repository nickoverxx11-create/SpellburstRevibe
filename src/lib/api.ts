import type { SemanticGroup } from '../graph/types';

const START = 'SPELLBURST_START';
const END = 'SPELLBURST_END';

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** POST and stream plain-text back, calling onText with the accumulated text. */
export async function streamOp(op: string, body: unknown, onText: (t: string) => void, signal?: AbortSignal) {
  const res = await fetch(`/api/${op}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(await errorText(res));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    const now = performance.now();
    if (now - last > 60) {
      onText(text);
      last = now;
    }
  }
  onText(text);
  return text;
}

export async function jsonOp<T>(op: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/${op}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

export const fetchSemantic = (code: string, prompt: string) =>
  jsonOp<{ groups: SemanticGroup[] }>('semantic', { code, prompt }).then((r) => r.groups);

export const fetchAutocomplete = (prompt: string, code: string, signal?: AbortSignal) =>
  jsonOp<{ suggestions: string[] }>('autocomplete', { prompt, code }, signal).then((r) => r.suggestions);

/** Pull the sketch out of the START/END token envelope (falls back to fences / raw). */
export function extractCode(raw: string): string {
  let s = raw;
  const a = s.indexOf(START);
  if (a >= 0) {
    s = s.slice(a + START.length);
    const b = s.indexOf(END);
    if (b >= 0) s = s.slice(0, b);
  } else {
    const fence = s.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
    if (fence) s = fence[1];
  }
  // drop a dangling "//" left before the END token
  s = s.replace(/\/\/\s*$/, '');
  return s.replace(/^\s*\n/, '').trimEnd() + '\n';
}

/** Show partial streamed code without the envelope while it is still arriving. */
export function previewStream(raw: string): string {
  const a = raw.indexOf(START);
  let s = a >= 0 ? raw.slice(a + START.length) : raw;
  const b = s.indexOf(END);
  if (b >= 0) s = s.slice(0, b);
  return s.replace(/^\s*\n/, '').replace(/```(javascript|js)?/g, '');
}
