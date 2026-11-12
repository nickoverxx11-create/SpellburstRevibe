import type { InputHTMLAttributes } from 'react';

// Range input that behaves on mice AND touchpads inside React Flow:
// - `nopan nodrag nowheel` keep the canvas from hijacking the drag
//   (otherwise the pane's pan gesture and the slider fight over the pointer,
//   and tap-to-drag touchpads leave the slider "stuck" following the cursor);
// - while dragging, sketch iframes ignore the pointer so a release over a
//   preview can't be swallowed by the iframe;
// - a window-level pointerup/blur always ends the drag.

let active = false;
function endDrag() {
  if (!active) return;
  active = false;
  document.body.classList.remove('sb-slider-drag');
  window.removeEventListener('pointerup', endDrag, true);
  window.removeEventListener('pointercancel', endDrag, true);
  window.removeEventListener('blur', endDrag);
}
function startDrag() {
  if (active) return;
  active = true;
  document.body.classList.add('sb-slider-drag');
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  window.addEventListener('blur', endDrag);
}

export function RangeSlider({ className = '', onPointerDown, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      {...rest}
      className={`range nodrag nopan nowheel ${className}`}
      onPointerDown={(e) => {
        startDrag();
        onPointerDown?.(e);
      }}
      onLostPointerCapture={endDrag}
    />
  );
}
