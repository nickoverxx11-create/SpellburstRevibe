// Minimal OpenAI Chat Completions client (fetch-based, no SDK) with streaming.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const MODEL = () => process.env.OPENAI_MODEL || 'gpt-4.1';
export const FAST_MODEL = () => process.env.OPENAI_FAST_MODEL || 'gpt-4.1-mini';

interface ChatOptions {
  model?: string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}

function key(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY is not set on the server.');
  return k;
}

function body(messages: ChatMessage[], opts: ChatOptions, stream: boolean) {
  return JSON.stringify({
    model: opts.model ?? MODEL(),
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
    stream,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  });
}

async function post(payload: string): Promise<Response> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key()}` },
    body: payload,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }
  return res;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const res = await post(body(messages, opts, false));
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** Returns a ReadableStream of plain-text deltas (SSE already decoded). */
export async function chatStream(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ReadableStream<Uint8Array>> {
  const res = await post(body(messages, opts, true));
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        let emitted = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
              emitted = true;
            }
          } catch {
            /* ignore keep-alive / partial lines */
          }
        }
        if (emitted) return;
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
