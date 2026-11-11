// "Examples" tab starters (§4.1).
export interface Starter {
  name: string;
  code: string;
}

export const CONCENTRIC = `function setup() {
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
    circle(center.x, center.y, i * circleSize + spacing * (numCircles - i));
  }
  noLoop();
}
`;

export const BLANK = `function setup() {
  createCanvas(400, 400);
  background(255);
  strokeWeight(2);
  stroke(0);
}

function draw() {

}
`;

export const STARTERS: Starter[] = [
  { name: 'Concentric circles', code: CONCENTRIC },
  {
    name: 'Default (white dot)',
    code: `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(180);
  noStroke();
  fill(255);
  circle(width / 2, height / 2, 60);
}
`,
  },
  {
    name: 'Bouncing ball',
    code: `let x, y;
let speedX = 3;
let speedY = 2;

function setup() {
  createCanvas(400, 400);
  x = width / 2;
  y = height / 2;
}

function draw() {
  background(30);
  noStroke();
  fill(255, 120, 80);
  circle(x, y, 40);
  x += speedX;
  y += speedY;
  if (x < 20 || x > width - 20) speedX *= -1;
  if (y < 20 || y > height - 20) speedY *= -1;
}
`,
  },
  {
    name: 'Rotating line',
    code: `let angle = 0;
let r = 150;

function setup() {
  createCanvas(400, 400);
  background(240);
}

function draw() {
  translate(width / 2, height / 2);
  rotate(angle);
  stroke(0, 40);
  strokeWeight(2);
  line(0, 0, r, 0);
  angle += 0.05;
}
`,
  },
  {
    name: 'Noise field',
    code: `let scale = 0.01;
let cell = 10;

function setup() {
  createCanvas(400, 400);
  noStroke();
}

function draw() {
  for (let x = 0; x < width; x += cell) {
    for (let y = 0; y < height; y += cell) {
      let n = noise(x * scale, y * scale, frameCount * 0.01);
      fill(n * 255, 80, 200 - n * 120);
      rect(x, y, cell, cell);
    }
  }
}
`,
  },
  { name: 'Blank', code: BLANK },
];
