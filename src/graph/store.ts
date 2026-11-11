import { create } from 'zustand';
import { emptyGraph, type GNode, type Graph, type OpType, type SketchNode } from './types';

export type Mode = 'demo' | 'explore';

const uid = () => Math.random().toString(36).slice(2, 8);
const STORAGE_KEY = 'spellburst-revibe:explore';

function loadExplore(): Graph {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const g = JSON.parse(raw) as Graph;
      // in-flight generations can't survive a reload
      for (const n of Object.values(g.nodes)) {
        if (n.type === 'sketch') {
          n.generating = false;
          n.stream = undefined;
        } else if (n.status === 'running') n.status = 'idle';
      }
      return g;
    }
  } catch {
    /* storage unavailable */
  }
  return emptyGraph();
}

interface State {
  mode: Mode;
  graphs: Record<Mode, Graph>;
  selectedId: string | null;
  codeOpen: boolean;
  maximizedId: string | null;
  focusId: string | null; // node the canvas should pan to
  liveAI: boolean;

  setMode: (m: Mode) => void;
  setLiveAI: (v: boolean) => void;
  select: (id: string | null, openCode?: boolean) => void;
  closeCode: () => void;
  maximize: (id: string | null) => void;
  focus: (id: string | null) => void;

  addRoot: (code: string) => string;
  duplicate: (sketchId: string) => string;
  addOp: (parentSketchId: string, type: OpType, init?: Partial<GNode>) => string;
  addSketchChild: (parentId: string, code: string, origin?: SketchNode['origin']) => string;
  update: (id: string, patch: Partial<GNode>) => void;
  setCode: (id: string, code: string) => void;
  remove: (id: string) => void;
  resetCanvas: () => void;
  replaceGraph: (g: Graph) => void;
}

export const useStore = create<State>((set, get) => {
  const g = () => get().graphs[get().mode];
  const commit = (next: Graph) => set((s) => ({ graphs: { ...s.graphs, [s.mode]: next } }));

  const newSketch = (parent: string | null, code: string, origin: SketchNode['origin']): SketchNode => {
    const graph = g();
    const node: SketchNode = {
      id: uid(),
      type: 'sketch',
      parent,
      createdAt: Date.now(),
      num: graph.nextNum,
      code,
      origin,
    };
    commit({ nodes: { ...graph.nodes, [node.id]: node }, nextNum: graph.nextNum + 1 });
    return node;
  };

  return {
    mode: 'demo',
    graphs: { demo: emptyGraph(), explore: loadExplore() },
    selectedId: null,
    codeOpen: false,
    maximizedId: null,
    focusId: null,
    liveAI: true,

    setMode: (mode) => set({ mode, selectedId: null, codeOpen: false, maximizedId: null }),
    setLiveAI: (liveAI) => set({ liveAI }),
    select: (id, openCode) => set((s) => ({ selectedId: id, codeOpen: openCode ?? s.codeOpen })),
    closeCode: () => set({ codeOpen: false }),
    maximize: (maximizedId) => set({ maximizedId }),
    focus: (focusId) => set({ focusId }),

    addRoot: (code) => newSketch(null, code, 'root').id,
    duplicate: (sketchId) => {
      const src = g().nodes[sketchId];
      if (!src || src.type !== 'sketch') return '';
      return newSketch(sketchId, src.code, 'duplicate').id;
    },
    addSketchChild: (parentId, code, origin = 'generated') => newSketch(parentId, code, origin).id,
    addOp: (parentSketchId, type, init = {}) => {
      const graph = g();
      const base = { id: uid(), parent: parentSketchId, createdAt: Date.now() };
      let node: GNode;
      if (type === 'modify') node = { ...base, type, prompt: '', status: 'idle' };
      else if (type === 'extract') node = { ...base, type, prompt: '', status: 'idle' };
      else if (type === 'merge') node = { ...base, type, otherId: null, prompt: '', status: 'idle' };
      else node = { ...base, type: 'diff', otherId: null, status: 'idle' };
      node = { ...node, ...init } as GNode;
      commit({ ...graph, nodes: { ...graph.nodes, [node.id]: node } });
      return node.id;
    },
    update: (id, patch) => {
      const graph = g();
      const n = graph.nodes[id];
      if (!n) return;
      commit({ ...graph, nodes: { ...graph.nodes, [id]: { ...n, ...patch } as GNode } });
    },
    setCode: (id, code) => {
      const graph = g();
      const n = graph.nodes[id];
      if (!n || n.type !== 'sketch') return;
      commit({ ...graph, nodes: { ...graph.nodes, [id]: { ...n, code, genError: undefined } } });
    },
    // §5.2.3: descendants of a deleted node are re-attached to its parent.
    remove: (id) => {
      const graph = g();
      const victim = graph.nodes[id];
      if (!victim) return;
      const nodes: Record<string, GNode> = {};
      for (const [k, n] of Object.entries(graph.nodes)) {
        if (k === id) continue;
        let next = n;
        if (n.parent === id) next = { ...next, parent: victim.parent } as GNode;
        if ((next.type === 'merge' || next.type === 'diff') && next.otherId === id) next = { ...next, otherId: null } as GNode;
        nodes[k] = next;
      }
      commit({ ...graph, nodes });
      set((s) => ({
        selectedId: s.selectedId === id ? null : s.selectedId,
        maximizedId: s.maximizedId === id ? null : s.maximizedId,
      }));
    },
    resetCanvas: () => {
      commit(emptyGraph());
      set({ selectedId: null, codeOpen: false, maximizedId: null });
    },
    replaceGraph: (graph) => {
      commit(graph);
      set({ selectedId: null, codeOpen: false, maximizedId: null });
    },
  };
});

// Persist the Explore canvas (per-viewer convenience; never required).
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.graphs.explore === prev.graphs.explore) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s.graphs.explore));
    } catch {
      /* ignore quota / private mode */
    }
  }, 400);
});

// ---- selectors / helpers ---------------------------------------------------

export const currentGraph = () => {
  const s = useStore.getState();
  return s.graphs[s.mode];
};

export function childrenOf(graph: Graph, id: string): GNode[] {
  return Object.values(graph.nodes)
    .filter((n) => n.parent === id)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function opChildSketch(graph: Graph, opId: string): SketchNode | undefined {
  return childrenOf(graph, opId).find((n): n is SketchNode => n.type === 'sketch');
}

export function nearestSketch(graph: Graph, id: string | null): SketchNode | undefined {
  let cur = id ? graph.nodes[id] : undefined;
  while (cur) {
    if (cur.type === 'sketch') return cur;
    cur = cur.parent ? graph.nodes[cur.parent] : undefined;
  }
  return undefined;
}

export function descendants(graph: Graph, id: string): GNode[] {
  const out: GNode[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of childrenOf(graph, cur)) {
      out.push(c);
      stack.push(c.id);
    }
  }
  return out;
}

export const sketches = (graph: Graph) =>
  Object.values(graph.nodes)
    .filter((n): n is SketchNode => n.type === 'sketch')
    .sort((a, b) => a.num - b.num);
