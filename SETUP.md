# Law Pal 🇬🇾 - Setup Guide

## Environment Variables Setup

This app requires a Google AI API key to power the AI Legal Assistant feature.

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### Step 2: Create .env File

1. In the project root directory, create a file named `.env`
2. Add your API key:

```bash
GOOGLE_AI_API_KEY=your_actual_api_key_here
```

**Important:** Never commit the `.env` file to version control! It's already in `.gitignore`.

### Step 3: Verify Setup

The app will automatically load the API key from your `.env` file. If the key is missing or invalid, you'll see an error message in the AI Legal Assistant chat.

## For Other Developers

If you're cloning this repository:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your own Google AI API key

3. Never share or commit your `.env` file

## Security Notes

- ✅ `.env` is gitignored and won't be committed
- ✅ `src/config/apikey.ts` is gitignored and won't be committed
- ✅ API keys are loaded at runtime from environment variables
- ❌ Never hardcode API keys in source files
- ❌ Never commit `.env` to version control

## Troubleshooting

**"API key not configured" error:**
- Make sure `.env` exists in the project root
- Check that `GOOGLE_AI_API_KEY` is set correctly
- Restart the Expo dev server after creating `.env`

**Key still not working:**
- Verify the key is valid in [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check for extra spaces or quotes in the `.env` file
- Make sure you're using the correct key (not a different Google API key)
