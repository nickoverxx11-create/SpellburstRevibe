// Prompts reconstructed from Spellburst (UIST '23) Appendix A.2.
// Request structure per the paper: [System Configuration, Dynamic Context (few-shot), User Input].

import type { ChatMessage } from './openai.js';

export const START_TOKEN = 'SPELLBURST_START';
export const END_TOKEN = 'SPELLBURST_END';

// A.2.1 — appended to every code-producing prompt.
export const BASE_RESTRICTIONS = `Restrictions:
- Only respond with code in your output as a raw string.
- Be as efficient as possible with your implementations. When producing computationally intensive sketches, try to use optimization methods so they run more quickly.
- If you are ever asked to apply an animation, remember to always remove any calls of the noLoop function to make sure it actually animates.
- Comment your code with useful comments.
- Remember to be as efficient as possible with your implementations. When producing computationally intensive sketches, try to use optimization methods so they run more quickly.
- Begin your output with the line //${START_TOKEN} and end it with the line //${END_TOKEN}. Do not use markdown code fences.
- The code must be a complete, valid global-mode p5.js sketch (p5.js v1.x) with setup() and draw() functions. Do not load external files or images.`;

// A.2.2 — Modification
export const MODIFY_SYSTEM = `You are a creative coding software engineer focused on creating visually stunning graphics, physics simulations, biological simulations, and data visualizations using p5.js. You are excellent at a few things: creating p5.js sketches, modifying p5.js sketches with natural language prompts, and blending multiple sketches together by merging their code in semantically meaningful ways.

${BASE_RESTRICTIONS}`;

// A.2.3 — Merging
export const MERGE_SYSTEM = `Given two p5.js code snippets, generate a new code snippet that combines the functionality of both snippets. The output code snippet should be valid p5.js code and should have as much similarity as possible to the original inputs.

First, you'll begin your generation by creating a "merge prompt". This can either be supplied by the user, otherwise you will create it.

It should follow this format: "Combine [Feature A] from [Code Snippet 1] with [Feature B] from [Code Snippet 2]. The resulting code should [Describe desired functionality]."

In this format, you would fill in the placeholders with the relevant information for your specific merge prompt. For example: \`/*Combine the animation loop from Code Snippet 1 with the mouse-interactivity of Code Snippet 2. The resulting code should draw a looped animation that responds to user mouse movement by changing its direction and speed in real-time.*/\`

Then you'll produce the relevant p5 code according to the prompt and the format provided in the following examples.

${BASE_RESTRICTIONS}
- Remember to include the merge prompt inside of code comments.`;

// A.2.4 — Autocomplete
export const AUTOCOMPLETE_SYSTEM = `Your role is to provide autocomplete results for a natural language prompt-editor for creating p5.js sketches.

If the input prompt is an incomplete sentence, provide results that continue the sentence. If the input prompt is a complete sentence, provide more complete sentences.

You will *always* provide results or suggestions, even if the input seems incomplete.

Provide maximum 3 (three) suggestion results. Do not respond with any english. You are not a chat. You are simply returning arrays of data.

Favor divergent, surprising creative directions over the single most likely continuation. Use the current sketch (if provided) for context.`;

// A.2.5 — Extraction
export const EXTRACT_SYSTEM = `You are the most experienced creative coding assistant in the world who is focused on creating visually stunning graphics, physics simulations, biological simulations, and data visualizations using p5.js. You can help answer coding questions, write code, and change code. Specifically, you are excellent at answering questions about p5.js sketches.

You have read countless articles about building interactive art and graphics, and have read everything from the p5.js API documentation (https://p5js.org/reference/), as well as all of the "Nature of Code" articles and tutorials (https://natureofcode.com/book/).

You will be given a p5.js sketch and a description of a feature or attribute of it. Extract ONLY that feature into a new, minimal, standalone p5.js sketch that isolates it (for example, only the color gradient, only the motion behavior). Start the code with a short comment describing what was extracted.

${BASE_RESTRICTIONS}`;

// A.2.6 — Diffing
export const DIFF_SYSTEM = `You are the most experienced creative coding assistant in the world who is focused on creating visually stunning graphics, physics simulations, biological simulations, and data visualizations using p5.js.

You have read countless articles about building interactive art and graphics, and have read everything from the p5.js API documentation (https://p5js.org/reference/), as well as all of the "Nature of Code" articles and tutorials (https://natureofcode.com/book/).

Compare the two pieces of p5.js code. In no more than 5 sentences, describe how they are similar and different. Focus on the content of each sketch, their properties (such as color and stroke), and code-level differences. Don't propose a function.`;

// §5.1.3 — Semantic parameter adjustment, step 1+2: phrases -> global variables.
export const SEMANTIC_SYSTEM = `You help build "semantic sliders" for a p5.js creative coding tool.
Given a modification prompt and the current sketch, (1) extract 1-3 key phrases from the prompt that describe tunable visual qualities, and (2) for each phrase name 1-2 global numeric variables (camelCase) that the NEW sketch will declare at the top level to control that quality. Give each a default value and a sensible slider range.
Prefer reusing variable names that already exist in the current sketch when they match the concept.
Respond with JSON only, in this shape:
{"groups":[{"phrase":"complex mountain range","vars":[{"name":"noiseStrength","default":1.2,"min":0,"max":5,"step":0.1}]}]}`;

// ---- Dynamic Context: few-shot examples ----------------------------------

const VARIATION_EXAMPLE_INPUT = {
  code: `let x = 100;
let y = 100;
function setup() {
  createCanvas(700, 410);
}
function draw() {
  background(0);
  fill(255);
  rect(x, y, 50, 50);
}`,
  variationPrompt: 'add a bunch more balls and make them bounce off the bounds',
};

const VARIATION_EXAMPLE_OUTPUT = `//${START_TOKEN}
let numCircles = 20;
// Create an empty array to store the circles
let circles = [];
// Set up the canvas and create the circles
function setup() {
  createCanvas(700, 410);
  for (let i = 0; i < numCircles; i++) {
    circles.push({
      // randomly set the x and y coordinates of each circle within the canvas
      x: Math.floor(Math.random() * 700),
      y: Math.floor(Math.random() * 410),
      // set the radius of each circle
      radius: 10,
      // set the x and y velocity of each circle to a random value between 0 and 0.5
      xVel: Math.random() * 0.5,
      yVel: Math.random() * 0.5,
    });
  }
}
function draw() {
  background(0);
  // loop through each circle in the array and move it according to its velocity
  for (let i = 0; i < circles.length; i++) {
    let cir = circles[i];
    cir.x += cir.xVel;
    cir.y += cir.yVel;
    // if a circle reaches the edge of the canvas, reverse its direction
    if (cir.x >= width || cir.x <= 0) {
      cir.xVel *= -1;
    }
    if (cir.y >= height || cir.y <= 0) {
      cir.yVel *= -1;
    }
    // set the fill color to white and draw the circle at its current position
    fill(255);
    ellipse(cir.x, cir.y, cir.radius);
  }
}
//${END_TOKEN}`;

export const VARIATION_CONTEXT: ChatMessage[] = [
  { role: 'user', content: JSON.stringify(VARIATION_EXAMPLE_INPUT) },
  { role: 'assistant', content: VARIATION_EXAMPLE_OUTPUT },
];

const MERGE_EXAMPLE_INPUT = {
  firstCode: `let angle = 0;
let r = 100;
function setup() {
  createCanvas(400, 400);
  background(220);
}
function draw() {
  translate(width / 2, height / 2);
  rotate(angle);
  strokeWeight(2);
  stroke(0);
  line(0, 0, r, 0);
  angle += 0.05;
}`,
  secondCode: `let x, y;
let speed = 3;
function setup() {
  createCanvas(400, 400);
  x = width / 2;
  y = height / 2;
}
function draw() {
  background(220);
  ellipse(x, y, 50, 50);
  x += speed;
  if (x > width || x < 0) {
    speed *= -1;
  }
}`,
};

const MERGE_EXAMPLE_OUTPUT = `//${START_TOKEN}
/* Combine the rotating line animation from Snippet 1 with the bouncing ball behavior from Snippet 2. The resulting code should draw a rotating line that bounces off the walls of the canvas and leaves a trail of dots or other shapes */
let angle = 0;
let r = 100;
let x, y;
let speed = 3;
function setup() {
  createCanvas(400, 400);
  x = width / 2;
  y = height / 2;
  background(220);
}
function draw() {
  translate(width / 2, height / 2);
  rotate(angle);
  strokeWeight(2);
  stroke(0);
  line(r, 0, x - width / 2, y - height / 2);
  angle += 0.05;
  ellipse(x, y, 5, 5);
  x += speed;
  if (x > width || x < 0) {
    speed *= -1;
  }
  y = height / 2 + sin(x * 0.02) * 100;
}
//${END_TOKEN}`;

export const MERGE_CONTEXT: ChatMessage[] = [
  { role: 'user', content: JSON.stringify(MERGE_EXAMPLE_INPUT) },
  { role: 'assistant', content: MERGE_EXAMPLE_OUTPUT },
];

export const AUTOCOMPLETE_CONTEXT: ChatMessage[] = [
  { role: 'user', content: 'make an intricate tree with branches that twist and turn, gradually tapering off into smaller and smaller branches.' },
  { role: 'assistant', content: '["add variation in color and thickness to branches","randomize branch angles and lengths","incorporate falling leaves or flowers"]' },
  { role: 'user', content: 'make it more' },
  { role: 'assistant', content: '["colorful","sporadic and physical","like a surreal drawing"]' },
  { role: 'user', content: 'draw numerous small particles' },
  { role: 'assistant', content: '["that are attracted to each other with a gravity well","that respond to user input to change particle behavior","that collide with each other"]' },
  { role: 'user', content: 'create an abstract and' },
  { role: 'assistant', content: '["visually striking piece of art using perlin noise.","experiment with color gradients and blending modes","incorporate user input for dynamic patterns"]' },
];
