// Find and rewrite top-level numeric globals ("magic constants", §3.2.1) so they
// can be tuned with sliders without an LLM round-trip.

export interface Param {
  name: string;
  value: number;
}

const DECL = /^(let|var|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)\s*;?/gm;

export function findParams(code: string): Param[] {
  const out: Param[] = [];
  const seen = new Set<string>();
  for (const m of code.matchAll(DECL)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    out.push({ name: m[2], value: parseFloat(m[3]) });
  }
  return out;
}

export function getParam(code: string, name: string): number | undefined {
  return findParams(code).find((p) => p.name === name)?.value;
}

export function setParam(code: string, name: string, value: number): string {
  const re = new RegExp(`^((?:let|var|const)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*)(-?(?:\\d+\\.?\\d*|\\.\\d+)(?:e-?\\d+)?)`, 'm');
  return code.replace(re, (_, head) => `${head}${fmt(value)}`);
}

export function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
}

/** A reasonable slider range when the LLM didn't give one. */
export function guessRange(v: number): { min: number; max: number; step: number } {
  if (Number.isInteger(v)) {
    const max = Math.max(10, Math.abs(v) * 3);
    return { min: v < 0 ? -max : 0, max, step: 1 };
  }
  const max = Math.max(1, Math.abs(v) * 3);
  return { min: v < 0 ? -max : 0, max, step: max / 100 };
}
