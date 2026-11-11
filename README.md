# Spellburst — revibe

A re-implementation of **Spellburst: A Node-based Interface for Exploratory Creative Coding with Natural Language Prompts** (Angert, Suzara, Han, Pondoc, Subramonyam — UIST ’23). The original code was never released, so this follows the paper (§4–5, Appendix A).

## Run locally

```bash
npm install
cp .env.example .env.local   # put your OPENAI_API_KEY in it
npm run dev                  # http://localhost:5173
```

## Two modes

- **Guided demo**: a 10-step re-enactment of “Ash” from §4 (root sketch → duplicate → branch → prompt jump → autocomplete → semantic sliders → parameter tuning → semantic merge → diff → zoom out). Each step runs live. With **Live AI** off, it uses pre-baked results (instant, works offline). Live requests also fall back to them on failure.
- **Explore**: a free canvas for the audience. It is saved in the browser and can be exported or imported as JSON.

## Paper features → code

| Paper | Where |
|---|---|
| Sketch / operator / menu nodes, auto-laid-out version tree (§4, §5.2.3) | `src/graph/*`, `src/nodes/*` |
| Immutable ops; re-run updates the child one layer deep; delete re-attaches children | `src/graph/operations.ts`, `store.ts` |
| Modify / Merge / Extract / Diff / Autocomplete prompts (A.2), START/END token envelope, few-shot context | `server/prompts.ts`, `server/handlers.ts` |
| Example retrieval for Dynamic Context (Fig. 12), taxonomy-tagged | `server/examples.ts` |
| Semantic sliders: phrase → global-variable map, then generation (§5.1.3) | `/api/semantic` + `SemanticSliders` |
| Sketches in sandboxed iframes, reload on keystroke (§5.2.1) | `src/sketch/SketchFrame.tsx` |

Additions beyond the paper (answers to §6–7 limitations): **Fix with AI** for runtime errors, **stale** markers on descendants after a re-run, optional merge instructions, “use diff as prompt”, parameter sliders for any top-level numeric global, export/import.

## Deploy (Vercel)

`api/[op].ts` is a single serverless function that wraps `server/handlers.ts`. The Vite frontend builds to `dist/`.

1. Push to GitHub and import the repo in Vercel (framework preset: Vite).
2. Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `OPENAI_FAST_MODEL`) under *Settings → Environment Variables*. Never commit the key.

Models default to `gpt-4.1` (generation) and `gpt-4.1-mini` (autocomplete, slider mapping).
