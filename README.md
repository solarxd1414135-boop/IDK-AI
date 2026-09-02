# The Toolkit

A small AI-powered app with four tools: write, analyze data, summarize, and ask questions of a document.

## How it's structured

- `src/App.jsx` — the frontend (the UI you already saw)
- `api/claude.js` — a serverless function that holds your Anthropic API key and forwards requests to Claude, so the key never reaches the browser

## Deploy for free with Vercel

1. **Get an Anthropic API key**
   Sign up at [console.anthropic.com](https://console.anthropic.com), add billing (usage is pay-as-you-go, typically a few cents per request), and create an API key.

2. **Put this project on GitHub**
   Create a new repo and push this folder to it. If you don't use git normally, GitHub's website lets you drag-and-drop upload the files directly into a new repo.

3. **Import it into Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up (free tier is enough).
   - Click "Add New Project" and import your GitHub repo.
   - Vercel auto-detects the Vite framework — leave the build settings as default.

4. **Add your API key as an environment variable**
   In the Vercel project settings, go to Environment Variables and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: the key you created in step 1

   Do this before your first deploy, or redeploy after adding it.

5. **Deploy**
   Click Deploy. Vercel builds the frontend and automatically turns `api/claude.js` into a live serverless endpoint at `/api/claude`. You'll get a URL like `your-project.vercel.app` that anyone can visit.

## Running it locally first (optional)

```
npm install
npm run dev
```

This runs the frontend, but `/api/claude` won't work locally unless you also run `vercel dev` (which needs the [Vercel CLI](https://vercel.com/docs/cli) and a `.env` file with `ANTHROPIC_API_KEY=your-key-here`).

## Costs to expect

- **Vercel hosting**: free tier covers this comfortably for personal projects.
- **Anthropic API**: pay-as-you-go, billed per request based on length. There's no free quota, so cost scales with how much people use your site. You can set a monthly spending cap in the Anthropic console to avoid surprises.
