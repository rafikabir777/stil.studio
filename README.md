# STIL . studio

STIL . studio is a visual inspiration board app for saving, organizing, and browsing image-based posts. It uses a Vite + React frontend, Vercel serverless API routes, Google sign-in, Supabase tables, and Supabase Storage for uploaded images.

## Features

- Google sign-in with server-side ID token verification
- Signed app sessions for authenticated API writes
- Supabase-backed profiles, pins, boards, follows, saved pins, and comments
- Supabase Storage uploads for local image files
- Paginated feed loading
- Local browser fallback while cloud configuration is unavailable
- Responsive masonry-style inspiration grid

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Express
- Vercel Serverless Functions
- Supabase Database and Storage
- Google Identity Services

## Project Structure

```txt
api/
  auth/google.ts        Standalone Google sign-in API route
  config-status.ts      Lightweight deployment/config diagnostic route
  uploads/image.ts      Standalone Supabase Storage upload route
  index.ts              Catch-all Express API entry for other API routes

src/
  components/           React UI components
  data/                 Starter local seed data
  lib/                  API helpers and local persistence helpers
  App.tsx               Main app shell and state orchestration
  main.tsx              React entry point
  types.ts              Shared app types

server.ts               Express app used by local dev and catch-all Vercel API
vercel.json             Vercel routing rules
vite.config.ts          Vite config
```

## Environment Variables

Create a local `.env` file from `.env.example`.

```txt
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=pin-images

VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

SESSION_SECRET=use-a-random-32-plus-character-secret
```

Important:

- Never commit `.env`.
- Never commit Google `client_secret_*.json` files.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server environments such as Vercel.
- `VITE_GOOGLE_CLIENT_ID` is public by design and is needed by the browser build.

## Supabase Setup

1. Create a Supabase project.
2. Run the project SQL from `src/lib/supabase.ts` in the Supabase SQL editor.
3. Create a public Storage bucket named:

```txt
pin-images
```

4. Add the Supabase values to Vercel environment variables.

The app stores uploaded local images in Supabase Storage, then saves the resulting public image URL on each pin.

## Google Sign-In Setup

Create a Google OAuth 2.0 Client ID for a **Web application**.

Add these to **Authorized JavaScript origins**:

```txt
http://localhost:3000
https://your-vercel-domain.vercel.app
```

Add any Vercel preview domains or custom domains you plan to use.

This app uses Google Identity Services in the browser and verifies the returned ID token on the server. Supabase's OAuth Server toggle is not required for this flow.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm.cmd run dev
```

On Windows PowerShell, `npm run dev` may be blocked by execution policy. Use `npm.cmd run dev`.

## Build

```bash
npm.cmd run build
```

Type-check:

```bash
npm.cmd run lint
```

## Vercel Deployment

Recommended Vercel settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The important route order is in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/config-status", "destination": "/api/config-status.ts" },
    { "source": "/api/auth/google", "destination": "/api/auth/google.ts" },
    { "source": "/api/uploads/image", "destination": "/api/uploads/image.ts" },
    { "source": "/api/:path*", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The standalone routes must come before the catch-all API route.

## Deployment Check

After deploying, open:

```txt
https://your-domain.vercel.app/api/config-status
```

Expected result:

```json
{
  "isConfigured": true,
  "isGoogleAuthConfigured": true,
  "isSessionConfigured": true,
  "storageBucket": "pin-images"
}
```

If the homepage status dot is green, the app can reach the backend configuration route.

## Troubleshooting

`FUNCTION_INVOCATION_FAILED` on `/api/config-status`:

- Confirm `api/config-status.ts` is committed.
- Confirm `vercel.json` routes `/api/config-status` before `/api/:path*`.
- Redeploy Vercel after pushing.

Google sign-in fails:

- Confirm `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` match exactly.
- Confirm your Vercel domain is in Google Cloud Authorized JavaScript origins.
- Confirm `SESSION_SECRET` is set and at least 32 characters.

Image upload says bucket not found:

- Create a public Supabase Storage bucket named `pin-images`.
- Confirm `SUPABASE_STORAGE_BUCKET=pin-images` in Vercel.

Posts disappear after refresh:

- Confirm Supabase tables exist.
- Confirm Vercel has `SUPABASE_URL` and a valid Supabase key.
- Confirm `/api/config-status` returns configured JSON.

## GitHub Upload Notes

Commit these:

```txt
api/
src/
.env.example
.gitignore
README.md
index.html
metadata.json
package.json
package-lock.json
server.ts
tsconfig.json
vercel.json
vite.config.ts
```

Do not commit these:

```txt
.env
dist/
node_modules/
client_secret_*.json
*.apps.googleusercontent.com.json
```
