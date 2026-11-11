// Lifecycle of an operator: user action -> request -> streamed p5.js -> new/updated sketch node.
import { extractCode, fetchSemantic, streamOp } from '../lib/api';
import type { SemanticGroup } from './types';
import { currentGraph, descendants, opChildSketch, useStore } from './store';

export interface Fallback {
  code?: string;
  semantic?: SemanticGroup[];
  summary?: string;
}

interface RunOptions {
  /** cached output used in demo mode when Live AI is off or the request fails */
  fallback?: Fallback;
  forceCached?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replay cached text as if it were streaming, so the demo looks the same offline. */
async function fakeStream(text: string, onText: (t: string) => void, ms = 1400) {
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    onText(text.slice(0, Math.round((text.length * i) / steps)));
    await sleep(ms / steps);
  }
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms))]);

export async function runOp(opId: string, opts: RunOptions = {}) {
  const store = useStore.getState();
  const graph = currentGraph();
  const op = graph.nodes[opId];
  if (!op || op.type === 'sketch') return;
  const source = op.parent ? graph.nodes[op.parent] : undefined;
  if (!source || source.type !== 'sketch') {
    store.update(opId, { status: 'error', error: 'This operator is not attached to a sketch.' });
    return;
  }
  const live = !opts.forceCached && (store.mode === 'explore' || store.liveAI);

  // ---- Diff: produces a summary on the operator, no new sketch -------------
  if (op.type === 'diff') {
    const other = op.otherId ? graph.nodes[op.otherId] : undefined;
    if (!other || other.type !== 'sketch') {
      store.update(opId, { status: 'error', error: 'Pick a sketch to compare with.' });
      return;
    }
    store.update(opId, { status: 'running', error: undefined, summary: '' });
    const onText = (t: string) => useStore.getState().update(opId, { summary: t });
    try {
      if (!live) throw new Error('cached');
      await withTimeout(streamOp('diff', { codeA: source.code, codeB: other.code }, onText), 60000);
    } catch (err) {
      if (opts.fallback?.summary) await fakeStream(opts.fallback.summary, onText, 900);
      else {
        useStore.getState().update(opId, { status: 'error', error: (err as Error).message });
        return;
      }
    }
    useStore.getState().update(opId, { status: 'done' });
    return;
  }

  // ---- Code-producing operators -------------------------------------------
  if (op.type === 'merge') {
    const other = op.otherId ? graph.nodes[op.otherId] : undefined;
    if (!other || other.type !== 'sketch') {
      store.update(opId, { status: 'error', error: 'Pick a second sketch to merge with.' });
      return;
    }
  }
  if ((op.type === 'modify' || op.type === 'extract') && !op.prompt.trim()) {
    store.update(opId, { status: 'error', error: 'Write a prompt first.' });
    return;
  }

  // Re-running updates the immediate child one layer deep (§5.2.3);
  // deeper descendants are flagged stale (our improvement).
  const existing = opChildSketch(graph, opId);
  let childId: string;
  if (existing) {
    childId = existing.id;
    for (const d of descendants(graph, childId)) if (d.type === 'sketch') store.update(d.id, { stale: true });
    store.update(childId, { generating: true, stream: '', genError: undefined, stale: false });
  } else {
    childId = store.addSketchChild(opId, '', 'generated');
    store.update(childId, { generating: true, stream: '' });
  }
  store.update(opId, { status: 'running', error: undefined });
  store.focus(childId);

  const onText = (t: string) => useStore.getState().update(childId, { stream: t });

  try {
    let raw: string;
    if (!live) throw new Error('cached');
    if (op.type === 'modify') {
      // §5.1.3 semantic sliders: map prompt phrases -> globals, then generate with that map.
      let semantic: SemanticGroup[] = [];
      try {
        semantic = await withTimeout(fetchSemantic(source.code, op.prompt), 20000);
      } catch {
        semantic = [];
      }
      useStore.getState().update(opId, { semantic });
      raw = await withTimeout(streamOp('modify', { code: source.code, prompt: op.prompt, semantic }, onText), 90000);
    } else if (op.type === 'merge') {
      const other = currentGraph().nodes[op.otherId!] as { code: string };
      raw = await withTimeout(
        streamOp('merge', { firstCode: source.code, secondCode: other.code, prompt: op.prompt }, onText),
        90000,
      );
    } else {
      raw = await withTimeout(streamOp('extract', { code: source.code, prompt: op.prompt }, onText), 90000);
    }
    const code = extractCode(raw);
    if (!/function\s+setup|function\s+draw/.test(code)) throw new Error('The model did not return a p5.js sketch.');
    useStore.getState().setCode(childId, code);
  } catch (err) {
    const fb = opts.fallback;
    if (fb?.code) {
      if (op.type === 'modify' && fb.semantic) useStore.getState().update(opId, { semantic: fb.semantic });
      await fakeStream(fb.code, onText);
      useStore.getState().setCode(childId, fb.code);
    } else {
      const msg = (err as Error).message;
      useStore.getState().update(childId, { generating: false, stream: undefined, genError: msg });
      useStore.getState().update(opId, { status: 'error', error: msg });
      return;
    }
  }
  useStore.getState().update(childId, { generating: false, stream: undefined });
  useStore.getState().update(opId, { status: 'done' });
}
