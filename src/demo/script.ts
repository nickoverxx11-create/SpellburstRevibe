// The guided user journey: a re-enactment of "Ash" from paper §4.
import { canvasApi } from '../Canvas';
import { runOp } from '../graph/operations';
import { currentGraph, opChildSketch, useStore } from '../graph/store';
import type { SketchNode } from '../graph/types';
import { fetchAutocomplete } from '../lib/api';
import { findParams, setParam } from '../sketch/params';
import * as C from './cached';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const S = () => useStore.getState();

/** ids created along the way so later steps can refer to earlier sketches */
export const refs: Record<string, string> = {};
export const resetRefs = () => Object.keys(refs).forEach((k) => delete refs[k]);

async function typeInto(opId: string, text: string, ms = 1100) {
  const steps = Math.min(text.length, 40);
  for (let i = 1; i <= steps; i++) {
    S().update(opId, { prompt: text.slice(0, Math.round((text.length * i) / steps)) });
    await sleep(ms / steps);
  }
}

async function morphParam(sketchId: string, name: string, from: number, to: number, ms = 900) {
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const v = from + ((to - from) * i) / steps;
    const cur = currentGraph().nodes[sketchId] as SketchNode;
    S().setCode(sketchId, setParam(cur.code, name, Number.isInteger(from) && Number.isInteger(to) ? Math.round(v) : Math.round(v * 10) / 10));
    await sleep(ms / steps);
  }
}

const childOf = (opId: string) => opChildSketch(currentGraph(), opId)?.id ?? '';

export interface Step {
  title: string;
  /** what the presenter can say; shown to the audience as a caption */
  say: string;
  paper: string;
  run: () => Promise<void>;
}

export const STEPS: Step[] = [
  {
    title: 'Start from code',
    paper: '§4.1 · Fig. 4a–b',
    say: 'Ash has an idea about concentric circles. She creates a root sketch from code: each node pairs the p5.js source with its live output.',
    run: async () => {
      resetRefs();
      S().resetCanvas();
      refs.root = S().addRoot(C.C0);
      await sleep(150);
      S().select(refs.root, true);
      S().focus(refs.root);
    },
  },
  {
    title: 'Duplicate & edit by hand',
    paper: '§4.2 · Fig. 4c',
    say: 'Duplicate makes a child version instead of overwriting the original. Ash edits the copy directly to randomize line thickness: small, precise changes stay in code.',
    run: async () => {
      refs.thick = S().duplicate(refs.root);
      S().select(refs.thick, true);
      S().focus(refs.thick);
      await sleep(700);
      S().setCode(refs.thick, C.C1_THICKNESS);
    },
  },
  {
    title: 'Branch to explore colour separately',
    paper: '§4.2 · Fig. 4d',
    say: 'To explore colour independently of thickness, Ash branches from the root again. The graph keeps both lines of exploration side by side: no Git commands.',
    run: async () => {
      refs.color = S().duplicate(refs.root);
      S().select(refs.color, true);
      S().focus(refs.color);
      await sleep(700);
      S().setCode(refs.color, C.C3_COLOR);
    },
  },
  {
    title: 'Large creative jump with a prompt',
    paper: '§4.3 · Fig. 5a',
    say: 'For a big semantic jump Ash uses Modify with natural language. The source code plus her prompt go to the LLM, and a new animated sketch streams in as its own node.',
    run: async () => {
      S().closeCode();
      const op = S().addOp(refs.root, 'modify');
      S().focus(op);
      await typeInto(op, C.PROMPT_PLANETS);
      await runOp(op, { fallback: { code: C.C5_PLANETS } });
      refs.planets = childOf(op);
    },
  },
  {
    title: 'Autocomplete suggests divergent ideas',
    paper: '§4.3 · §5.1.2 · Fig. 5b',
    say: 'While she types the next prompt, autocomplete offers creative directions rather than the most likely words. She had not thought of rings, so she picks that one.',
    run: async () => {
      const op = S().addOp(refs.planets, 'modify');
      S().focus(op);
      await typeInto(op, C.PROMPT_MORE_PLANETS);
      let suggestions = C.SUGGESTIONS;
      if (S().liveAI) {
        try {
          const live = await fetchAutocomplete(C.PROMPT_MORE_PLANETS, C.C5_PLANETS);
          if (live.length) suggestions = live;
        } catch {
          /* keep cached */
        }
      }
      S().update(op, { suggestions });
      await sleep(2200);
      const pick = suggestions.find((x) => /ring/i.test(x)) ?? suggestions[0];
      S().update(op, { prompt: `${C.PROMPT_MORE_PLANETS} ${pick}`, suggestions: [] });
      await sleep(400);
      await runOp(op, { fallback: { code: C.C6_RINGS } });
      refs.rings = childOf(op);
    },
  },
  {
    title: 'Semantic sliders',
    paper: '§4.3.2 · §5.1.3 · Fig. 5c',
    say: 'Back at the root, a new branch turns the circles into a topographic map. Spellburst maps phrases of the prompt to global variables, so Ash can drag "complex mountain range" instead of hunting for code. (Try dragging the sliders!)',
    run: async () => {
      const op = S().addOp(refs.root, 'modify');
      S().focus(op);
      await typeInto(op, C.PROMPT_TOPO, 1400);
      await runOp(op, { fallback: { code: C.C7_TOPO, semantic: C.SEM_TOPO } });
      refs.topoOp = op;
      refs.topo = childOf(op);
    },
  },
  {
    title: 'Fine-grained control: tune parameters',
    paper: '§4.3.1 · Fig. 1c',
    say: 'Prompting is tedious for tiny tweaks. Ash duplicates the map and tunes numeric parameters directly. The preview updates on every change.',
    run: async () => {
      refs.dense = S().duplicate(refs.topo);
      S().select(refs.dense, true);
      S().focus(refs.dense);
      await sleep(600);
      // tune whichever numeric globals this sketch actually has (live output varies)
      const cur = currentGraph().nodes[refs.dense] as SketchNode;
      const params = findParams(cur.code).filter((p) => p.value !== 0);
      const [a, b] = params;
      if (a) await morphParam(refs.dense, a.name, a.value, Number.isInteger(a.value) ? Math.round(a.value * 1.66) : a.value * 1.66);
      if (b) await morphParam(refs.dense, b.name, b.value, Math.round(b.value * 0.75 * 10) / 10);
    },
  },
  {
    title: 'Semantic merge of two branches',
    paper: '§4.4 · §5.1.4 · Fig. 5d',
    say: 'Ash wants the planets from one branch with the mountain background from another. Merge asks the LLM to combine them by meaning, not line by line. With no instruction, it writes its own merge prompt as a code comment.',
    run: async () => {
      S().closeCode();
      const op = S().addOp(refs.rings, 'merge', { otherId: refs.topo });
      S().focus(op);
      await sleep(900);
      await runOp(op, { fallback: { code: C.C12_MERGE } });
      refs.merge = childOf(op);
    },
  },
  {
    title: 'Diff: what changed?',
    paper: '§4.4',
    say: 'Diff explains, in plain language and at code level, how two versions differ. Ash can turn the summary into a new prompt.',
    run: async () => {
      const op = S().addOp(refs.topo, 'diff', { otherId: refs.dense });
      S().focus(op);
      await sleep(600);
      await runOp(op, { fallback: { summary: C.DIFF_SUMMARY } });
    },
  },
  {
    title: 'Zoom out: the canvas is the history',
    paper: '§4.4 · Fig. 2–3',
    say: 'Zooming out, the whole exploration is visible as a tree: branches, prompts, merges and dead ends, all preserved. Now it is your turn: switch to Explore mode.',
    run: async () => {
      S().closeCode();
      S().select(null);
      await sleep(100);
      canvasApi.rf?.fitView({ duration: 900, padding: 0.12 });
    },
  },
];
