// Curated few-shot bank, tagged with the paper's transformation taxonomy (§5.1.5):
//   objects   — color, shape, form, texture, thickness, waviness, randomness
//   canvas    — size, orientation, movement, noisiness, symmetry, scale
//   relations — nesting, repetition/pattern, spacing, contrast, layers
// The paper retrieved crowd-sourced examples for the Dynamic Context (Fig. 12).
// We don't have their dataset, so this is a small hand-written stand-in with
// keyword retrieval.

import type { ChatMessage } from './openai.js';
import { START_TOKEN, END_TOKEN } from './prompts.js';

interface Example {
  category: 'objects' | 'canvas' | 'relations';
  keywords: string[];
  code: string;
  prompt: string;
  output: string;
}

const CIRCLES = `function setup() {
  createCanvas(400, 400);
  noFill();
}
function draw() {
  background(255);
  stroke(0);
  for (let i = 5; i > 0; i--) {
    circle(width / 2, height / 2, i * 60);
  }
  noLoop();
}`;

const EXAMPLES: Example[] = [
  {
    category: 'objects',
    keywords: ['wavy', 'wave', 'organic', 'hand-drawn', 'irregular', 'wobbly', 'texture', 'noise', 'rough', 'pencil'],
    code: CIRCLES,
    prompt: 'make the circles look hand-drawn and wobbly, like pencil lines overlapping',
    output: `//${START_TOKEN}
// Global parameters controlling the "hand-drawn" look
let numRings = 5;
let wobble = 12;        // how far each line strays from a perfect circle
let passes = 3;         // overlapping pencil strokes per ring
function setup() {
  createCanvas(400, 400);
  noFill();
}
function draw() {
  background(250);
  stroke(30, 30, 30, 90);
  strokeWeight(1.2);
  for (let r = 1; r <= numRings; r++) {
    for (let p = 0; p < passes; p++) {
      // each pass gets its own noise seed offset so strokes overlap imperfectly
      beginShape();
      for (let a = 0; a <= TWO_PI + 0.2; a += 0.08) {
        let n = noise(cos(a) + r, sin(a) + p * 3);
        let rad = r * 30 + map(n, 0, 1, -wobble, wobble);
        vertex(width / 2 + cos(a) * rad, height / 2 + sin(a) * rad);
      }
      endShape();
    }
  }
  noLoop();
}
//${END_TOKEN}`,
  },
  {
    category: 'canvas',
    keywords: ['move', 'animate', 'animation', 'pulse', 'rotate', 'spin', 'breathing', 'motion', 'orbit', 'mouse'],
    code: CIRCLES,
    prompt: 'make the rings pulse outward like ripples, faster when the mouse is near the center',
    output: `//${START_TOKEN}
// Ripple animation parameters
let numRings = 8;
let baseSpeed = 0.6;
let spacing = 30;
let t = 0;
function setup() {
  createCanvas(400, 400);
  noFill();
}
function draw() {
  background(255);
  // speed up as the mouse approaches the center
  let d = dist(mouseX, mouseY, width / 2, height / 2);
  let speed = baseSpeed + map(constrain(d, 0, 200), 0, 200, 2, 0);
  t += speed;
  for (let i = 0; i < numRings; i++) {
    // rings travel outward and wrap around
    let r = (i * spacing + t) % (numRings * spacing);
    // fade rings as they grow
    stroke(0, map(r, 0, numRings * spacing, 255, 0));
    circle(width / 2, height / 2, r * 2);
  }
}
//${END_TOKEN}`,
  },
  {
    category: 'relations',
    keywords: ['grid', 'repeat', 'pattern', 'tile', 'spacing', 'many', 'copies', 'nested', 'layers', 'symmetry'],
    code: CIRCLES,
    prompt: 'repeat the concentric circles as a tiled grid pattern with alternating colors',
    output: `//${START_TOKEN}
// Grid of concentric-circle tiles
let cols = 4;
let rings = 4;
let palette = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
function setup() {
  createCanvas(400, 400);
  noLoop();
}
function draw() {
  background(20);
  let cell = width / cols;
  noFill();
  strokeWeight(2);
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < cols; gy++) {
      // alternate the starting color per tile like a checkerboard
      let offset = (gx + gy) % palette.length;
      for (let r = rings; r > 0; r--) {
        stroke(palette[(r + offset) % palette.length]);
        circle(gx * cell + cell / 2, gy * cell + cell / 2, (r / rings) * cell * 0.9);
      }
    }
  }
}
//${END_TOKEN}`,
  },
];

/** Retrieve up to `k` examples whose keywords overlap the prompt. */
export function retrieveExamples(prompt: string, k = 1): ChatMessage[] {
  const p = prompt.toLowerCase();
  const scored = EXAMPLES.map((e) => ({ e, s: e.keywords.filter((w) => p.includes(w)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k);
  return scored.flatMap(({ e }) => [
    { role: 'user' as const, content: JSON.stringify({ code: e.code, variationPrompt: e.prompt }) },
    { role: 'assistant' as const, content: e.output },
  ]);
}
