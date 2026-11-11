// Graph model (paper §5.2.3 / Appendix A.1). Every node stores its layout
// parent; edges are derived. Operations are immutable by default: they create
// new sketch nodes rather than overwriting inputs.

export type OpType = 'modify' | 'merge' | 'diff' | 'extract';
export type NodeType = 'sketch' | OpType;
export type Status = 'idle' | 'running' | 'done' | 'error';

export interface SemanticVar {
  name: string;
  default: number;
  min: number;
  max: number;
  step: number;
}
export interface SemanticGroup {
  phrase: string;
  vars: SemanticVar[];
}

interface Base {
  id: string;
  parent: string | null;
  createdAt: number;
}

export interface SketchNode extends Base {
  type: 'sketch';
  num: number;
  code: string;
  origin: 'root' | 'duplicate' | 'generated';
  generating?: boolean;
  stream?: string;
  genError?: string;
  /** an ancestor operator was re-run after this sketch was produced */
  stale?: boolean;
}

export interface ModifyNode extends Base {
  type: 'modify';
  prompt: string;
  status: Status;
  error?: string;
  semantic?: SemanticGroup[];
  /** autocomplete suggestions pushed by the guided demo */
  suggestions?: string[];
}

export interface MergeNode extends Base {
  type: 'merge';
  otherId: string | null;
  prompt: string;
  status: Status;
  error?: string;
}

export interface DiffNode extends Base {
  type: 'diff';
  otherId: string | null;
  status: Status;
  summary?: string;
  error?: string;
}

export interface ExtractNode extends Base {
  type: 'extract';
  prompt: string;
  status: Status;
  error?: string;
}

export type GNode = SketchNode | ModifyNode | MergeNode | DiffNode | ExtractNode;
export type OpNode = ModifyNode | MergeNode | DiffNode | ExtractNode;

export interface Graph {
  nodes: Record<string, GNode>;
  nextNum: number;
}

export const emptyGraph = (): Graph => ({ nodes: {}, nextNum: 0 });
