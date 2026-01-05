type Env = {
  GOOGLE_AI_API_KEY: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateEntry>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const getClientId = (request: Request) => {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
};

const checkRateLimit = (clientId: string, windowMs: number, maxRequests: number) => {
  const now = Date.now();
  const entry = rateLimits.get(clientId);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(clientId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    if (!env.GOOGLE_AI_API_KEY) {
      return new Response('Server API key not configured', {
        status: 500,
        headers: corsHeaders,
      });
    }

    let body: {
      prompt?: string;
      model?: string;
      temperature?: number;
      topP?: number;
      topK?: number;
    } = {};

    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON body', {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response('Missing prompt', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const windowMs = Number(env.RATE_LIMIT_WINDOW_MS || '60000');
    const maxRequests = Number(env.RATE_LIMIT_MAX_REQUESTS || '20');
    const clientId = getClientId(request);

    if (!checkRateLimit(clientId, windowMs, maxRequests)) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: corsHeaders,
      });
    }

    const model = body.model || 'gemini-2.0-flash';
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: body.prompt }],
        },
      ],
      generationConfig: {
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
        topP: typeof body.topP === 'number' ? body.topP : 0.8,
        topK: typeof body.topK === 'number' ? body.topK : 40,
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`;
    const start = Date.now();

    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const upstreamJson = await upstream.json().catch(() => null);
    const durationMs = Date.now() - start;

    if (!upstream.ok) {
      console.log('[AI Proxy] Upstream error', upstream.status, durationMs);
      return new Response(
        JSON.stringify({
          error: upstreamJson?.error?.message || 'Upstream error',
          status: upstream.status,
        }),
        {
          status: upstream.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const text =
      upstreamJson?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('') || '';

    console.log('[AI Proxy] OK', { model, durationMs });

    return new Response(
      JSON.stringify({
        text,
        model,
        durationMs,
        usage: upstreamJson?.usageMetadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};
