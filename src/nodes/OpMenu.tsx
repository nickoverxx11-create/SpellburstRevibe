import { useStore } from '../graph/store';
import type { OpType } from '../graph/types';
import { IconDiff, IconDuplicate, IconExtract, IconMerge, IconModify } from '../lib/icons';

const ITEMS: { key: OpType | 'duplicate'; label: string; icon: JSX.Element }[] = [
  { key: 'modify', label: 'Modify', icon: <IconModify /> },
  { key: 'duplicate', label: 'Duplicate', icon: <IconDuplicate /> },
  { key: 'merge', label: 'Merge', icon: <IconMerge /> },
  { key: 'diff', label: 'Diff', icon: <IconDiff /> },
  { key: 'extract', label: 'Extract', icon: <IconExtract /> },
];

export function applyMenu(sketchId: string, key: OpType | 'duplicate'): string {
  const s = useStore.getState();
  if (key === 'duplicate') {
    const id = s.duplicate(sketchId);
    s.select(id, true);
    s.focus(id);
    return id;
  }
  const id = s.addOp(sketchId, key);
  s.focus(id);
  return id;
}

export function OpMenu({ sketchId, onPick }: { sketchId: string; onPick?: () => void }) {
  return (
    <div className="op-menu nodrag nopan">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={`op-menu-item op-${it.key}`}
          onClick={(e) => {
            e.stopPropagation();
            applyMenu(sketchId, it.key);
            onPick?.();
          }}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
