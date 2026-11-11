// Pre-baked results for the guided demo (used when "Live AI" is off or a live
// request fails), so the 15-minute walkthrough never stalls on the network.
import type { SemanticGroup } from '../graph/types';
export { CONCENTRIC as C0 } from '../sketch/examples';

export const C1_THICKNESS = `function setup() {
  createCanvas(400, 400);
  background(255);
  stroke(0);
  noFill();
}

function draw() {
  let numCircles = 5;
  let circleSize = 50;
  let spacing = 10;
  let center = createVector(width / 2, height / 2);
  for (let i = numCircles; i > 0; i--) {
    // edited by hand: randomize the line thickness of every ring
    strokeWeight(random(1, 9));
    circle(center.x, center.y, i * circleSize + spacing * (numCircles - i));
  }
  noLoop();
}
`;

export const C3_COLOR = `function setup() {
  createCanvas(400, 400);
  noFill();
}

function draw() {
  background(255);
  let numCircles = 5;
  let circleSize = 50;
  let spacing = 10;
  // edited by hand: warm gradient from the outer to the inner ring
  let warm = color(240, 110, 40);
  let light = color(255, 215, 160);
  strokeWeight(12);
  for (let i = numCircles; i > 0; i--) {
    stroke(lerpColor(warm, light, (numCircles - i) / (numCircles - 1)));
    circle(width / 2, height / 2, i * circleSize + spacing * (numCircles - i));
  }
  noLoop();
}
`;

export const PROMPT_PLANETS =
  'Pretend the circles are the orbit of planets of our solar system. Add some fake planets and a sun.';

export const C5_PLANETS = `// The concentric circles become planetary orbits around a sun
let planets = [];
let numPlanets = 5;

function setup() {
  createCanvas(400, 400);
  let colors = ['#9ca3af', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7'];
  for (let i = 0; i < numPlanets; i++) {
    planets.push({
      orbit: 60 + i * 32, // orbit radius
      size: random(8, 18), // planet diameter
      angle: random(TWO_PI), // random starting position
      speed: 0.03 / (1 + i * 0.6), // outer planets move slower
      col: colors[i % colors.length],
    });
  }
}

function draw() {
  background(0);
  translate(width / 2, height / 2);
  // faint orbit lines
  noFill();
  stroke(255, 60);
  for (let p of planets) circle(0, 0, p.orbit * 2);
  // the sun
  noStroke();
  fill(255, 220, 0);
  circle(0, 0, 50);
  // move and draw each planet along its orbit
  for (let p of planets) {
    p.angle += p.speed;
    fill(p.col);
    circle(cos(p.angle) * p.orbit, sin(p.angle) * p.orbit, p.size);
  }
}
`;

export const PROMPT_MORE_PLANETS = 'Add 10 more planets, and decrease the distance.';
export const SUGGESTIONS = ['Add rings to some of the planets', 'Add moons to the solar system', 'Decrease the planet sizes'];

export const C6_RINGS = `// 15 planets packed closer together; some of them have rings
let planets = [];
let numPlanets = 15;
let orbitGap = 11;

function setup() {
  createCanvas(400, 400);
  for (let i = 0; i < numPlanets; i++) {
    planets.push({
      orbit: 40 + i * orbitGap,
      size: random(5, 13),
      angle: random(TWO_PI),
      speed: 0.035 / (1 + i * 0.35),
      col: color(random(120, 255), random(80, 220), random(120, 255)),
      ringed: random() < 0.35, // roughly a third of the planets get rings
    });
  }
}

function draw() {
  background(0);
  translate(width / 2, height / 2);
  noFill();
  stroke(255, 35);
  for (let p of planets) circle(0, 0, p.orbit * 2);
  noStroke();
  fill(255, 220, 0);
  circle(0, 0, 44);
  for (let p of planets) {
    p.angle += p.speed;
    let x = cos(p.angle) * p.orbit;
    let y = sin(p.angle) * p.orbit;
    noStroke();
    fill(p.col);
    circle(x, y, p.size);
    if (p.ringed) {
      // a tilted ring around the planet
      noFill();
      stroke(255, 200, 150, 200);
      strokeWeight(1.5);
      ellipse(x, y, p.size * 2.2, p.size * 0.7);
      strokeWeight(1);
    }
  }
}
`;

export const PROMPT_TOPO =
  'Imagine the sketch is a topographic map. Use Perlin noise to make each circle appear like a mountain range with peaks and valleys from a top-down topographic map.';

export const C7_TOPO = `// Topographic map: every circle becomes a noisy contour line of a mountain
let numCircles = 24; // how many contour lines
let circleSize = 6; // spacing between contour lines
let noiseStrength = 1.2; // how rugged the mountain range is

function setup() {
  createCanvas(400, 400);
  noFill();
  noLoop();
}

function draw() {
  background(255);
  stroke(30);
  strokeWeight(1);
  translate(width / 2, height / 2);
  for (let i = 1; i <= numCircles; i++) {
    let r = i * circleSize;
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.05) {
      // sample noise around a circle so each contour closes smoothly
      let n = noise(1 + cos(a) * noiseStrength, 1 + sin(a) * noiseStrength, i * 0.04);
      let rr = r * map(n, 0, 1, 0.55, 1.35);
      vertex(cos(a) * rr, sin(a) * rr);
    }
    endShape(CLOSE);
  }
}
`;

export const SEM_TOPO: SemanticGroup[] = [
  { phrase: 'mountain range with peaks and valleys', vars: [{ name: 'noiseStrength', default: 1.2, min: 0, max: 4, step: 0.1 }] },
  {
    phrase: 'each circle',
    vars: [
      { name: 'numCircles', default: 24, min: 3, max: 60, step: 1 },
      { name: 'circleSize', default: 6, min: 2, max: 16, step: 0.5 },
    ],
  },
];

export const C12_MERGE = `/* Combine the planet system from Code Snippet 1 with the mountain range background from Code Snippet 2. The resulting sketch shows a planet system over a topographic background generated with Perlin noise. */
let numCircles = 24;
let circleSize = 8;
let noiseStrength = 1.2;
let planets = [];
let numPlanets = 15;
let orbitGap = 11;
let terrain; // contour background rendered once for speed

function setup() {
  createCanvas(400, 400);
  terrain = createGraphics(width, height);
  drawTerrain(terrain);
  for (let i = 0; i < numPlanets; i++) {
    planets.push({
      orbit: 40 + i * orbitGap,
      size: random(5, 13),
      angle: random(TWO_PI),
      speed: 0.035 / (1 + i * 0.35),
      col: color(random(150, 255), random(120, 230), random(150, 255)),
      ringed: random() < 0.35,
    });
  }
}

// Snippet 2: noisy contour lines, tinted to sit behind the planets
function drawTerrain(g) {
  g.background(12, 8, 18);
  g.noFill();
  g.translate(g.width / 2, g.height / 2);
  for (let i = 1; i <= numCircles; i++) {
    g.stroke(210, 90, 120, map(i, 1, numCircles, 230, 70));
    let r = i * circleSize;
    g.beginShape();
    for (let a = 0; a < TWO_PI; a += 0.05) {
      let n = noise(1 + cos(a) * noiseStrength, 1 + sin(a) * noiseStrength, i * 0.04);
      let rr = r * map(n, 0, 1, 0.55, 1.35);
      g.vertex(cos(a) * rr, sin(a) * rr);
    }
    g.endShape(CLOSE);
  }
}

// Snippet 1: sun and ringed planets animate on top of the terrain
function draw() {
  image(terrain, 0, 0);
  translate(width / 2, height / 2);
  noStroke();
  fill(255, 220, 0);
  circle(0, 0, 40);
  for (let p of planets) {
    p.angle += p.speed;
    let x = cos(p.angle) * p.orbit;
    let y = sin(p.angle) * p.orbit;
    noStroke();
    fill(p.col);
    circle(x, y, p.size);
    if (p.ringed) {
      noFill();
      stroke(255, 210, 160, 200);
      strokeWeight(1.5);
      ellipse(x, y, p.size * 2.2, p.size * 0.7);
      strokeWeight(1);
    }
  }
}
`;

export const DIFF_SUMMARY =
  'Both sketches draw the same Perlin-noise topographic map: closed contour lines whose radius is distorted by noise sampled around a circle. The second sketch is denser: numCircles rises from 24 to 40 and circleSize drops from 6 to 4.5, so the contour lines sit much closer together. Colors, stroke weight and the noise function are unchanged. At the code level only those two global constants differ; setup() and draw() are identical.';
