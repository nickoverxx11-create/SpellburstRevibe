// Structured auto-layout (§4.4): the canvas is a direct visualization of the
// version tree, laid out left-to-right with d3-hierarchy. No manual dragging.
import { hierarchy, tree } from 'd3-hierarchy';
import type { Edge, Node } from '@xyflow/react';
import type { Graph } from './types';

export const COL = 400; // horizontal distance between generations
export const ROW = 450; // vertical distance between siblings

interface TreeItem {
  id: string;
  kind: string;
  children: TreeItem[];
}

/** Stable key that only changes when the tree structure changes. */
export function structureKey(graph: Graph): string {
  return Object.values(graph.nodes)
    .map((n) => {
      const extra = n.type === 'merge' || n.type === 'diff' ? `~${n.otherId ?? ''}` : '';
      const busy = n.type === 'sketch' && n.generating ? '*' : '';
      return `${n.id}:${n.parent ?? ''}:${n.type}${extra}${busy}`;
    })
    .sort()
    .join('|');
}

export function layout(graph: Graph): { nodes: Node[]; edges: Edge[] } {
  const all = Object.values(graph.nodes).sort((a, b) => a.createdAt - b.createdAt);
  const items = new Map<string, TreeItem>();
  for (const n of all) items.set(n.id, { id: n.id, kind: n.type, children: [] });
  const root: TreeItem = { id: '__root', kind: 'root', children: [] };
  for (const n of all) {
    const item = items.get(n.id)!;
    const parent = n.parent ? items.get(n.parent) : undefined;
    (parent ?? root).children.push(item);
  }
  // Every leaf sketch ends in an operations menu (Fig. 4c / Fig. 6 "Menu" nodes).
  for (const n of all) {
    if (n.type !== 'sketch' || n.generating) continue;
    const item = items.get(n.id)!;
    if (item.children.length === 0) item.children.push({ id: `menu:${n.id}`, kind: 'menu', children: [] });
  }

  const h = hierarchy(root);
  tree<TreeItem>().nodeSize([ROW, COL])(h);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  h.each((d) => {
    if (d.data.id === '__root') return;
    const isMenu = d.data.kind === 'menu';
    nodes.push({
      id: d.data.id,
      type: d.data.kind,
      position: { x: (d.depth - 1) * COL, y: d.x ?? 0 },
      data: { id: isMenu ? d.data.id.slice(5) : d.data.id },
      draggable: false,
      connectable: false,
      selectable: !isMenu,
    });
    const parent = d.parent;
    if (parent && parent.data.id !== '__root') {
      const fromSketch = parent.data.kind === 'sketch';
      edges.push({
        id: `${parent.data.id}=>${d.data.id}`,
        source: parent.data.id,
        target: d.data.id,
        type: fromSketch && !isMenu ? 'branch' : 'default',
        data: { sketchId: parent.data.id },
        className: isMenu ? 'edge-menu' : undefined,
      });
    }
  });
  // Secondary inputs of merge / diff operators (not part of the tree).
  for (const n of all) {
    if ((n.type === 'merge' || n.type === 'diff') && n.otherId && graph.nodes[n.otherId]) {
      edges.push({
        id: `${n.otherId}~>${n.id}`,
        source: n.otherId,
        target: n.id,
        targetHandle: 'second',
        type: 'default',
        className: `edge-secondary edge-${n.type}`,
        animated: true,
      });
    }
  }
  return { nodes, edges };
}
