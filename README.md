# STIL . studio

STIL . studio is a visual inspiration board app for collecting, organizing, and browsing image-based creative references.

The app is built for creators who want a clean place to save design inspiration, group posts into boards, and keep their visual archive available across sessions.

## What It Does

- Lets users sign in with Google
- Lets authenticated users upload image posts
- Stores uploaded images in cloud storage
- Saves posts, profiles, boards, follows, comments, and saved pins in a cloud database
- Shows a responsive visual feed
- Supports boards for organizing inspiration
- Supports saving posts and following creators
- Keeps a local fallback mode available when cloud services are unavailable

## Implemented

- Real Google sign-in
- Server-side Google credential verification
- Authenticated API writes
- Supabase database integration
- Supabase Storage image uploads
- Persistent posts after refresh
- Feed pagination
- Comment persistence
- Basic rate limiting and validation on API routes
- Vercel deployment support
- Passive connection status indicator

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vercel Serverless Functions
- Supabase Database
- Supabase Storage
- Google Identity Services

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm.cmd run dev
```

Build:

```bash
npm.cmd run build
```

Type-check:

```bash
npm.cmd run lint
```

## Notes

Environment variables are required for Google sign-in, Supabase, signed sessions, and image storage.
