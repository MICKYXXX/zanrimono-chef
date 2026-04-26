const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** SSE 形式のテキストから content を結合して返す */
function parseSseContent(text) {
  let content = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try {
      const chunk = JSON.parse(line.slice(6));
      content += chunk.choices?.[0]?.delta?.content ?? '';
    } catch {}
  }
  return content;
}

exports.handler = async (event) => {
  console.log('[chat] v4 invoked');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[chat] OPENAI_API_KEY is not set');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'OPENAI_API_KEY is not set' }),
    };
  }

  let reqBody;
  try {
    reqBody = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  let openaiRes;
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: reqBody.model ?? 'gpt-4o-mini',
        messages: reqBody.messages,
        stream: false,
      }),
    });
  } catch (err) {
    console.error('[chat] fetch failed:', err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach OpenAI' }),
    };
  }

  const rawText = await openaiRes.text();
  console.log('[chat] OpenAI status:', openaiRes.status, 'body[:100]:', rawText.slice(0, 100));

  // JSON として解析できない場合は SSE として処理する
  let responseBody;
  try {
    responseBody = JSON.parse(rawText);
  } catch {
    console.log('[chat] response is SSE, parsing manually');
    const content = parseSseContent(rawText);
    responseBody = { choices: [{ message: { content } }] };
  }

  return {
    statusCode: openaiRes.ok ? 200 : openaiRes.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(responseBody),
  };
};
