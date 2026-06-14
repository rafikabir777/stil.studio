import type { Request, Response } from "express";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

function cleanEnv(value?: string) {
  return (value || "").replace(/^["']|["']$/g, "").trim();
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signValue(value: string, secret: string) {
  return base64UrlEncode(createHmac("sha256", secret).update(value).digest());
}

function createSessionToken(claims: { userId: string; email: string; googleSub: string }, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...claims,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);
  const sessionSecret = cleanEnv(process.env.SESSION_SECRET || supabaseKey || googleClientId);

  if (!googleClientId) {
    return res.status(400).json({ error: "Google sign-in is not configured." });
  }

  if (sessionSecret.length < 32) {
    return res.status(500).json({ error: "SESSION_SECRET must be configured before accepting sign-ins." });
  }

  try {
    const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential." });
    }

    const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
    tokenInfoUrl.searchParams.set("id_token", credential);

    const tokenResponse = await fetch(tokenInfoUrl);
    if (!tokenResponse.ok) {
      const verificationError = await tokenResponse.text().catch(() => "");
      console.warn("Google token verification failed:", tokenResponse.status, verificationError);
      return res.status(401).json({
        error: "Google credential could not be verified.",
        detail: `Google verification returned ${tokenResponse.status}.`,
      });
    }

    const tokenInfo = await tokenResponse.json();
    const isVerifiedEmail = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

    if (tokenInfo.aud !== googleClientId || !tokenInfo.sub || !tokenInfo.email || !isVerifiedEmail) {
      return res.status(401).json({ error: "Google credential is not valid for this app." });
    }

    const usernameBase = String(tokenInfo.email).split("@")[0] || String(tokenInfo.name || "google_user");
    const username = `${usernameBase}_${String(tokenInfo.sub).slice(-6)}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const creator = {
      id: `google_${tokenInfo.sub}`,
      name: tokenInfo.name || usernameBase,
      username,
      avatar:
        tokenInfo.picture ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150",
      bio: "Curation & inspiration catalog. Moodboards enthusiast.",
      website: "",
      role: "Creator",
      followersCount: 0,
      followingCount: 0,
      savesCount: 0,
    };

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { error } = await supabase.from("profiles").upsert({
        id: creator.id,
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar,
        bio: creator.bio,
        website: creator.website,
        role: creator.role,
        followers_count: creator.followersCount,
        following_count: creator.followingCount,
        saves_count: creator.savesCount,
      });

      if (error) {
        console.warn("Google profile upsert failed:", error.message);
        return res.status(500).json({ error: "Creator profile could not be saved." });
      }
    }

    const session = createSessionToken(
      {
        userId: creator.id,
        email: String(tokenInfo.email),
        googleSub: String(tokenInfo.sub),
      },
      sessionSecret
    );

    return res.status(200).json({ creator, ...session });
  } catch (err: any) {
    console.warn("Google auth verification failed:", err.message || err);
    return res.status(500).json({ error: "Google sign-in failed." });
  }
}
