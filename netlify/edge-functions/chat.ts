const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return new Response('Server configuration error', { status: 500, headers: CORS_HEADERS });
  }

  let body: { model?: string; messages: unknown[] };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: CORS_HEADERS });
  }

  const upstream = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? 'gpt-4o-mini',
      messages: body.messages,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const error = await upstream.text();
    return new Response(error, { status: upstream.status, headers: CORS_HEADERS });
  }

  // OpenAI の SSE ストリームをそのままクライアントに転送
  return new Response(upstream.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
};

export const config = { path: '/api/chat' };
