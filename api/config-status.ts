import type { Request, Response } from "express";

function cleanEnv(value?: string) {
  return (value || "").replace(/^["']|["']$/g, "").trim();
}

export default function handler(_req: Request, res: Response) {
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);
  const sessionSecret = cleanEnv(process.env.SESSION_SECRET);
  const storageBucket = cleanEnv(process.env.SUPABASE_STORAGE_BUCKET) || "pin-images";

  res.status(200).json({
    isConfigured: Boolean(supabaseUrl && supabaseKey),
    isGoogleAuthConfigured: Boolean(googleClientId),
    isSessionConfigured: sessionSecret.length >= 32,
    storageBucket,
    checks: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      supabaseUrlLooksValid: /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl),
      hasSupabaseKey: Boolean(supabaseKey),
      hasGoogleClientId: Boolean(googleClientId),
      googleClientIdLooksValid: googleClientId.endsWith(".apps.googleusercontent.com"),
      hasSessionSecret: Boolean(sessionSecret),
    },
  });
}
