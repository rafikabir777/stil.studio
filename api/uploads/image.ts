import type { Request, Response } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

type SessionClaims = {
  userId: string;
  email: string;
  googleSub: string;
  iat: number;
  exp: number;
};

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

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function signValue(value: string, secret: string) {
  return base64UrlEncode(createHmac("sha256", secret).update(value).digest());
}

function verifySessionToken(token: string, secret: string): SessionClaims | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || secret.length < 32) return null;

  const expectedSignature = signValue(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const claims = JSON.parse(base64UrlDecode(encodedPayload)) as SessionClaims;
    if (!claims.userId || !claims.email || !claims.googleSub || !claims.exp) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

function stringField(value: unknown, field: string, max: number, required = true) {
  if (typeof value !== "string") {
    if (!required) return "";
    throw new Error(`${field} is required.`);
  }

  const trimmed = value.trim();
  if (required && !trimmed) throw new Error(`${field} is required.`);
  if (trimmed.length > max) throw new Error(`${field} is too long.`);
  return trimmed;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);
  const sessionSecret = cleanEnv(process.env.SESSION_SECRET || supabaseKey || googleClientId);
  const storageBucket = cleanEnv(process.env.SUPABASE_STORAGE_BUCKET) || "pin-images";

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: "Supabase is not configured." });
  }

  const authHeader = req.headers.authorization || "";
  const token = Array.isArray(authHeader) ? "" : authHeader.replace(/^Bearer\s+/i, "");
  const claims = verifySessionToken(token, sessionSecret);
  if (!claims) {
    return res.status(401).json({ error: "Authentication required. Please sign in with Google again." });
  }

  try {
    const dataUrl = stringField(req.body?.dataUrl, "Image", 12_000_000);
    const fileName = stringField(req.body?.fileName || "upload", "File name", 160, false) || "upload";
    const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-zA-Z0-9+/=]+)$/);

    if (!match) {
      return res.status(400).json({ error: "Only PNG, JPEG, WebP, and GIF uploads are supported." });
    }

    const contentType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");
    const maxBytes = 8 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: "Image is too large. Please upload an image under 8MB." });
    }

    const extension = contentType === "image/jpeg" || contentType === "image/jpg" ? "jpg" : contentType.split("/")[1];
    const safeName = fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60);
    const storagePath = `${claims.userId}/${Date.now()}-${randomBytes(6).toString("hex")}-${safeName || "image"}.${extension}`;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.storage.from(storageBucket).upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.warn("Supabase image upload failed:", error.message);
      return res.status(400).json({
        error: `Image upload failed: ${error.message}. Confirm the "${storageBucket}" Supabase Storage bucket exists and is public.`,
      });
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
    return res.status(200).json({ url: data.publicUrl, path: storagePath });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || `Image upload failed. Confirm the "${storageBucket}" Supabase Storage bucket exists and is public.`,
    });
  }
}
