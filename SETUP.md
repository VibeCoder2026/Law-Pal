# Law Pal GY - Setup Guide

## Environment Variables Setup

The AI Legal Assistant now uses a **Cloudflare Worker proxy** so the Gemini API key never ships with the app.

### Step 1: Deploy the AI Proxy (Cloudflare Worker)

See `server/ai-proxy/README.md` for full setup steps. Quick summary:

1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Set secret: `wrangler secret put GOOGLE_AI_API_KEY`
4. Deploy: `wrangler deploy`

### Step 2: Create .env File

1. In the project root, create a file named `.env`
2. Add your Worker URL:

```bash
EXPO_PUBLIC_AI_PROXY_URL=https://your-worker-url.workers.dev
```

**Important:** Never commit the `.env` file to version control! It's already in `.gitignore`.

### Step 3: Verify Setup

If the proxy URL is missing or invalid, the AI chat will show a clear error message.

## For Other Developers

If you're cloning this repository:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your Worker URL

## Security Notes

- ✅ `.env` is gitignored and won't be committed
- ✅ Gemini API key lives **only** in Cloudflare Worker secrets
- ✅ Mobile app never ships with the API key

## Troubleshooting

**"AI proxy URL not configured" error:**
- Make sure `.env` exists in the project root
- Check that `EXPO_PUBLIC_AI_PROXY_URL` is set correctly
- Restart the Expo dev server after creating `.env`

**AI proxy returns errors:**
- Verify the Worker is deployed and reachable
- Check the Worker secret: `wrangler secret put GOOGLE_AI_API_KEY`
