# Law Pal AI Proxy (Cloudflare Worker)

This Worker proxies Gemini requests so the API key never ships with the app.

## Setup

1) Install Wrangler:

```bash
npm install -g wrangler
```

2) Login:

```bash
wrangler login
```

3) Set the Gemini API key (secret):

```bash
wrangler secret put GOOGLE_AI_API_KEY
```

4) Deploy the Worker:

```bash
wrangler deploy
```

5) Copy the Worker URL and set it in your app:

```bash
EXPO_PUBLIC_AI_PROXY_URL=https://your-worker-url.workers.dev
```

## Rate Limits

Defaults (can be adjusted in `wrangler.toml`):

- `RATE_LIMIT_WINDOW_MS`: 60000
- `RATE_LIMIT_MAX_REQUESTS`: 20

