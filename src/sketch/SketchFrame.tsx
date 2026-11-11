import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

// Each sketch runs in its own sandboxed iframe (§5.2.1). No allow-same-origin:
// generated code can never reach the app's DOM, storage, or API key.

const P5_URL = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js';

function buildDoc(code: string, frameId: string): string {
  const head = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;height:100%;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center}',
    'canvas{display:block;max-width:100%!important;max-height:100%!important;width:auto!important;height:auto!important}</style>',
    '<script>',
    `var __F=${JSON.stringify(frameId)};`,
    'function __post(m){try{parent.postMessage(Object.assign({__sb:1,frame:__F},m),"*")}catch(e){}}',
    'window.onerror=function(msg,src,line){__post({type:"error",message:String(msg),line:line&&window.__OFF?line-window.__OFF:null});};',
    'window.addEventListener("unhandledrejection",function(e){__post({type:"error",message:String(e.reason)})});',
    'window.addEventListener("message",function(e){var d=e.data||{};if(d.type==="pause"&&window.noLoop)noLoop();if(d.type==="play"&&window.loop)loop();});',
    '</script>',
    `<script src="${P5_URL}"></script>`,
    '<script>if(window.p5)p5.disableFriendlyErrors=true;</script>',
    '</head><body>',
  ];
  const before = head.join('\n') + '\n<script>\n';
  const offset = before.split('\n').length - 1;
  return `${before.replace('var __F=', `window.__OFF=${offset};var __F=`)}${code}\n</script></body></html>`;
}

export interface SketchFrameHandle {
  reset: () => void;
}

interface Props {
  code: string;
  frameId: string;
  paused: boolean;
  onError: (e: { message: string; line: number | null } | null) => void;
  debounceMs?: number;
}

export const SketchFrame = forwardRef<SketchFrameHandle, Props>(function SketchFrame(
  { code, frameId, paused, onError, debounceMs = 250 },
  ref,
) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [debounced, setDebounced] = useState(code);
  const [nonce, setNonce] = useState(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Reload on (debounced) keystroke for fast visual feedback.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(code), debounceMs);
    return () => clearTimeout(t);
  }, [code, debounceMs]);

  const srcDoc = useMemo(() => buildDoc(debounced, frameId), [debounced, frameId]);

  useEffect(() => {
    onErrorRef.current(null);
  }, [srcDoc, nonce]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.__sb !== 1 || d.frame !== frameId) return;
      if (d.type === 'error') onErrorRef.current({ message: d.message, line: d.line ?? null });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [frameId]);

  useEffect(() => {
    iframe.current?.contentWindow?.postMessage({ type: paused ? 'pause' : 'play' }, '*');
  }, [paused]);

  useImperativeHandle(ref, () => ({ reset: () => setNonce((n) => n + 1) }), []);

  return (
    <iframe
      key={nonce}
      ref={iframe}
      className="sketch-frame"
      title={`sketch-${frameId}`}
      sandbox="allow-scripts"
      allow="accelerometer; gyroscope"
      srcDoc={srcDoc}
      onLoad={() => paused && iframe.current?.contentWindow?.postMessage({ type: 'pause' }, '*')}
    />
  );
});
