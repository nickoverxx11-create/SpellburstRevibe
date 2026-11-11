// Vercel serverless entry: /api/modify, /api/merge, /api/extract, /api/diff,
// /api/autocomplete, /api/semantic, /api/health
import { handle } from '../server/handlers.js';

function opFrom(request: Request): string {
  const path = new URL(request.url).pathname;
  return path.replace(/^\/api\//, '').split('/')[0];
}

export async function POST(request: Request) {
  return handle(opFrom(request), request);
}

export async function GET(request: Request) {
  return handle(opFrom(request), request);
}
