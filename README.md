<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3eb180cf-c269-4a02-8703-d62cb8a9f910

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set the values you need.
3. For real Google sign-in, create a Google OAuth 2.0 Web Client ID and set:
   `VITE_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"`
4. Set `SESSION_SECRET` to a random 32+ character secret for signed server sessions.
5. In Google Cloud Console, add your app origins to Authorized JavaScript origins, for example:
   `http://localhost:3000` and your deployed domain.
6. In Supabase, run the SQL from the database modal and create a public Storage bucket named `pin-images`.
7. Run the app:
   `npm run dev`

## Production notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel server environment variables.
- `VITE_GOOGLE_CLIENT_ID` must be available during the Vercel build.
- Uploaded local images are stored in Supabase Storage and pins store only the resulting public URL.
- API writes require a signed session token returned by Google sign-in.
