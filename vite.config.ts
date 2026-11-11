import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Local dev bridge: serves /api/:op with the same handler that Vercel runs
 * from api/[op].ts, so `npm run dev` works without the Vercel CLI.
 */
function localApi(): Plugin {
  return {
    name: 'spellburst-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const op = req.url.slice('/api/'.length).split('?')[0];
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const mod = await server.ssrLoadModule('/server/handlers.ts');
          const response: Response = await mod.handle(op, request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_FAST_MODEL']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  return { plugins: [react(), localApi()] };
});
