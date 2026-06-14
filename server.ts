import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "12mb" }));

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/^["']|["']$/g, "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "")
  .replace(/^["']|["']$/g, "")
  .trim();
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "")
  .replace(/^["']|["']$/g, "")
  .trim();
const SESSION_SECRET = (process.env.SESSION_SECRET || SUPABASE_KEY || GOOGLE_CLIENT_ID)
  .replace(/^["']|["']$/g, "")
  .trim();
const STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "pin-images").replace(/^["']|["']$/g, "").trim();

const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
const isGoogleAuthConfigured = GOOGLE_CLIENT_ID.length > 0;
const isSessionConfigured = SESSION_SECRET.length >= 32;

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log(`Supabase securely initialized server-side with URL: ${SUPABASE_URL}`);
} else {
  console.log("Supabase not configured yet. Running secure local fallback mode.");
}

type SessionClaims = {
  userId: string;
  email: string;
  googleSub: string;
  iat: number;
  exp: number;
};

type PinRecord = {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  aspectRatio?: string;
  aspectRatioValue?: number;
  tags?: string[];
  createdAt?: string;
};

type BoardRecord = {
  id?: string;
  name: string;
  pinIds?: string[];
  createdAt?: string;
};

type CreatorRecord = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  website?: string;
  role?: string;
  followersCount?: number;
  followingCount?: number;
  savesCount?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function rateLimit(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.method}:${req.path}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
      return;
    }

    bucket.count += 1;
    next();
  };
}

const publicApiRateLimit = rateLimit(60_000, 180);
const writeApiRateLimit = rateLimit(60_000, 60);
const authApiRateLimit = rateLimit(60_000, 20);
const uploadApiRateLimit = rateLimit(60 * 60_000, 40);

app.use("/api", publicApiRateLimit);

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

function signValue(value: string) {
  return base64UrlEncode(createHmac("sha256", SESSION_SECRET).update(value).digest());
}

function createSessionToken(claims: Omit<SessionClaims, "iat" | "exp">) {
  if (!isSessionConfigured) {
    throw new Error("SESSION_SECRET must be at least 32 characters for secure sign-in sessions.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = {
    ...claims,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

function verifySessionToken(token?: string): SessionClaims | null {
  if (!token || !isSessionConfigured) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signValue(encodedPayload);
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

function getBearerToken(req: Request) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

function requireAuth(req: Request, res: Response): SessionClaims | null {
  const claims = verifySessionToken(getBearerToken(req));
  if (!claims) {
    res.status(401).json({ error: "Authentication required. Please sign in with Google again." });
    return null;
  }
  return claims;
}

function requireSupabase(res: Response) {
  if (!supabase) {
    res.status(503).json({ error: "Supabase is not configured." });
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function idField(value: unknown, field: string, required = true) {
  const id = stringField(value, field, 100, required);
  if (!id) return "";
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`${field} contains invalid characters.`);
  return id;
}

function httpUrlField(value: unknown, field: string, max = 3000) {
  const url = stringField(value, field, max);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`${field} must be an http(s) URL. Upload local files to storage first.`);
  }
  return url;
}

function sanitizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : ""))
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => tag.slice(0, 32));
}

function numberField(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function mapCreator(d: any) {
  return {
    id: d.id,
    name: d.name,
    username: d.username,
    avatar: d.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150",
    bio: d.bio || "",
    website: d.website || "",
    role: d.role || "Creator",
    followersCount: d.followers_count || 0,
    followingCount: d.following_count || 0,
    savesCount: d.saves_count || 0,
  };
}

function mapPin(p: any, savedMap: Record<string, string[]> = {}) {
  return {
    id: p.id,
    title: p.title,
    description: p.description || "",
    imageUrl: p.image_url,
    aspectRatio: p.aspect_ratio || "ratio-1-1",
    aspectRatioValue: Number(p.aspect_ratio_value) || 1.0,
    creatorId: p.creator_id,
    originalCreatorId: p.original_creator_id,
    savedByCreatorIds: savedMap[p.id] || [],
    likesCount: p.likes_count || 0,
    tags: p.tags || [],
    createdAt: p.created_at,
  };
}

function mapBoard(b: any) {
  return {
    id: b.id,
    name: b.name,
    creatorId: b.creator_id,
    pinIds: b.pin_ids || [],
    createdAt: b.created_at,
  };
}

function validatePinInput(value: unknown, userId: string): PinRecord & { id: string } {
  if (!isRecord(value)) throw new Error("Pin payload is invalid.");

  return {
    id: idField(value.id || `pin_${Date.now()}_${randomBytes(4).toString("hex")}`, "pin.id"),
    title: stringField(value.title, "Pin title", 140),
    description: stringField(value.description || "", "Pin description", 1200, false),
    imageUrl: httpUrlField(value.imageUrl, "Pin image URL"),
    aspectRatio: stringField(value.aspectRatio || "3:4", "Pin aspect ratio", 20, false) || "3:4",
    aspectRatioValue: numberField(value.aspectRatioValue, 0.75, 0.1, 5),
    tags: sanitizeTags(value.tags),
    createdAt: stringField(value.createdAt || new Date().toISOString(), "Pin creation date", 60, false),
  };
}

function validateBoardInput(value: unknown): BoardRecord & { id: string } {
  if (!isRecord(value)) throw new Error("Board payload is invalid.");

  const pinIds = Array.isArray(value.pinIds)
    ? value.pinIds.map((pinId) => idField(pinId, "board.pinIds", false)).filter(Boolean).slice(0, 300)
    : [];

  return {
    id: idField(value.id || `board_${Date.now()}_${randomBytes(4).toString("hex")}`, "board.id"),
    name: stringField(value.name, "Board name", 80),
    pinIds,
    createdAt: stringField(value.createdAt || new Date().toISOString(), "Board creation date", 60, false),
  };
}

function validateCreatorInput(value: unknown, userId: string): CreatorRecord {
  if (!isRecord(value)) throw new Error("Profile payload is invalid.");
  const id = idField(value.id, "creator.id");
  if (id !== userId) throw new Error("You can only update your own profile.");

  return {
    id,
    name: stringField(value.name, "Profile name", 120),
    username: stringField(value.username, "Username", 80).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    avatar: httpUrlField(value.avatar, "Profile avatar", 3000),
    bio: stringField(value.bio || "", "Profile bio", 500, false),
    website: stringField(value.website || "", "Profile website", 200, false),
    role: stringField(value.role || "Creator", "Profile role", 80, false) || "Creator",
    followersCount: numberField(value.followersCount, 0, 0, 1_000_000),
    followingCount: numberField(value.followingCount, 0, 0, 1_000_000),
    savesCount: numberField(value.savesCount, 0, 0, 1_000_000),
  };
}

async function upsertCreatorProfile(creator: CreatorRecord) {
  if (!supabase) return;

  await supabase.from("profiles").upsert({
    id: creator.id,
    name: creator.name,
    username: creator.username,
    avatar: creator.avatar,
    bio: creator.bio || "",
    website: creator.website || "",
    role: creator.role || "Creator",
    followers_count: creator.followersCount || 0,
    following_count: creator.followingCount || 0,
    saves_count: creator.savesCount || 0,
  });
}

async function getSavedMap(pinIds?: string[]) {
  if (!supabase) return {};

  let query = supabase.from("saved_pins").select("user_id, pin_id");
  if (pinIds && pinIds.length > 0) {
    query = query.in("pin_id", pinIds);
  }

  const { data, error } = await query;
  const savedMap: Record<string, string[]> = {};
  if (!error && data) {
    data.forEach((row: any) => {
      if (!savedMap[row.pin_id]) savedMap[row.pin_id] = [];
      savedMap[row.pin_id].push(row.user_id);
    });
  }

  return savedMap;
}

async function ensureBoardOwnership(boardId: string, userId: string) {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("boards")
    .select("creator_id")
    .eq("id", boardId)
    .maybeSingle();

  if (error) throw error;
  return !data || data.creator_id === userId;
}

async function ensurePinOwnership(pinId: string, userId: string) {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("pins")
    .select("creator_id")
    .eq("id", pinId)
    .maybeSingle();

  if (error) throw error;
  return !data || data.creator_id === userId;
}

app.get("/api/config-status", (_req, res) => {
  res.json({
    isConfigured: isSupabaseConfigured,
    isGoogleAuthConfigured,
    isSessionConfigured,
    storageBucket: STORAGE_BUCKET,
  });
});

app.post("/api/auth/google", authApiRateLimit, async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: "Google sign-in is not configured." });
  }
  if (!isSessionConfigured) {
    return res.status(500).json({ error: "SESSION_SECRET must be configured before accepting sign-ins." });
  }

  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing Google credential." });
    }

    const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
    tokenInfoUrl.searchParams.set("id_token", credential);

    const tokenResponse = await fetch(tokenInfoUrl);
    if (!tokenResponse.ok) {
      return res.status(401).json({ error: "Google credential could not be verified." });
    }

    const tokenInfo = await tokenResponse.json();
    const isVerifiedEmail = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID || !tokenInfo.sub || !tokenInfo.email || !isVerifiedEmail) {
      return res.status(401).json({ error: "Google credential is not valid for this app." });
    }

    const usernameBase = String(tokenInfo.email).split("@")[0] || String(tokenInfo.name || "google_user");
    const username = `${usernameBase}_${String(tokenInfo.sub).slice(-6)}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const creator: CreatorRecord = {
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

    if (supabase) {
      await upsertCreatorProfile(creator);
    }

    const session = createSessionToken({
      userId: creator.id,
      email: String(tokenInfo.email),
      googleSub: String(tokenInfo.sub),
    });

    res.json({ creator, ...session });
  } catch (err: any) {
    console.warn("Google auth verification failed:", err.message || err);
    res.status(401).json({ error: "Google sign-in failed." });
  }
});

app.get("/api/creators", async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase!
      .from("profiles")
      .select("*")
      .order("followers_count", { ascending: false });

    if (error || !data) return res.json([]);
    res.json(data.map(mapCreator));
  } catch (err: any) {
    console.warn("Profiles fetching caught error:", err.message || err);
    res.json([]);
  }
});

app.post("/api/profile", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const creator = validateCreatorInput(req.body.creator, claims.userId);
    await upsertCreatorProfile(creator);
    res.json({ success: true, creator });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Profile could not be saved." });
  }
});

app.get("/api/pins", async (req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";

    let query = supabase!
      .from("pins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: pinsData, error: pinsError } = await query;
    if (pinsError || !pinsData) {
      return res.json({ pins: [], nextCursor: null });
    }

    const pageRows = pinsData.slice(0, limit);
    const savedMap = await getSavedMap(pageRows.map((p: any) => p.id));
    const pins = pageRows.map((p: any) => mapPin(p, savedMap));
    const nextCursor = pinsData.length > limit ? pins[pins.length - 1]?.createdAt || null : null;

    res.json({ pins, nextCursor });
  } catch (err: any) {
    console.warn("Pins fetching caught error:", err.message || err);
    res.json({ pins: [], nextCursor: null });
  }
});

app.post("/api/pins", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const pin = validatePinInput(req.body.pin, claims.userId);
    const createdAt = pin.createdAt || new Date().toISOString();
    const ownsPin = await ensurePinOwnership(pin.id, claims.userId);
    if (!ownsPin) {
      return res.status(403).json({ error: "You can only update your own pins." });
    }

    const { data, error } = await supabase!
      .from("pins")
      .upsert({
        id: pin.id,
        title: pin.title,
        description: pin.description || "",
        image_url: pin.imageUrl,
        aspect_ratio: pin.aspectRatio || "3:4",
        aspect_ratio_value: pin.aspectRatioValue || 0.75,
        creator_id: claims.userId,
        original_creator_id: claims.userId,
        likes_count: 0,
        tags: pin.tags || [],
        created_at: createdAt,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase!
      .from("saved_pins")
      .upsert({ user_id: claims.userId, pin_id: pin.id }, { onConflict: "user_id,pin_id" });

    res.json({ success: true, pin: mapPin(data, { [pin.id]: [claims.userId] }) });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Pin could not be saved." });
  }
});

app.post("/api/uploads/image", uploadApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const dataUrl = stringField(req.body.dataUrl, "Image", 12_000_000);
    const fileName = stringField(req.body.fileName || "upload", "File name", 160, false) || "upload";
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

    const { error } = await supabase!.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase!.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    res.json({ url: data.publicUrl, path: storagePath });
  } catch (err: any) {
    res.status(400).json({
      error:
        err.message ||
        `Image upload failed. Confirm the "${STORAGE_BUCKET}" Supabase Storage bucket exists and is public.`,
    });
  }
});

app.get("/api/boards", async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase!
      .from("boards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return res.json([]);
    res.json(data.map(mapBoard));
  } catch (err: any) {
    console.warn("Boards fetching caught error:", err.message || err);
    res.json([]);
  }
});

app.post("/api/boards", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const board = validateBoardInput(req.body.board);
    const ownsBoard = await ensureBoardOwnership(board.id, claims.userId);
    if (!ownsBoard) {
      return res.status(403).json({ error: "You can only update your own boards." });
    }

    const { data, error } = await supabase!
      .from("boards")
      .upsert({
        id: board.id,
        name: board.name,
        creator_id: claims.userId,
        pin_ids: board.pinIds || [],
        created_at: board.createdAt || new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    res.json({ success: true, board: mapBoard(data) });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Board could not be saved." });
  }
});

app.post("/api/save-relation", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const pinId = idField(req.body.pinId, "pinId");
    const isSaved = Boolean(req.body.isSaved);

    if (isSaved) {
      await supabase!
        .from("saved_pins")
        .upsert({ user_id: claims.userId, pin_id: pinId }, { onConflict: "user_id,pin_id" });
    } else {
      await supabase!.from("saved_pins").delete().match({ user_id: claims.userId, pin_id: pinId });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Save relation could not be updated." });
  }
});

app.post("/api/follow-relation", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const followingId = idField(req.body.followingId, "followingId");
    const isFollowing = Boolean(req.body.isFollowing);

    if (followingId === claims.userId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    if (isFollowing) {
      await supabase!
        .from("follows")
        .upsert({ follower_id: claims.userId, following_id: followingId }, { onConflict: "follower_id,following_id" });
    } else {
      await supabase!.from("follows").delete().match({ follower_id: claims.userId, following_id: followingId });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Follow relation could not be updated." });
  }
});

app.get("/api/user-data/:userId", async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const userId = idField(req.params.userId, "userId");
    if (userId !== claims.userId) {
      return res.status(403).json({ error: "You can only read your own saved user data." });
    }

    const { data: followsData, error: followsError } = await supabase!
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const { data: savedData, error: savedError } = await supabase!
      .from("saved_pins")
      .select("pin_id")
      .eq("user_id", userId);

    if (followsError || savedError) {
      return res.json({ followedCreatorIds: [], savedPinIds: [] });
    }

    res.json({
      followedCreatorIds: followsData ? followsData.map((f: any) => f.following_id) : [],
      savedPinIds: savedData ? savedData.map((s: any) => s.pin_id) : [],
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "User data could not be loaded." });
  }
});

app.get("/api/pins/:pinId/comments", async (req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const pinId = idField(req.params.pinId, "pinId");
    const { data: commentsData, error } = await supabase!
      .from("comments")
      .select("*")
      .eq("pin_id", pinId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !commentsData) return res.json([]);

    const creatorIds = Array.from(new Set(commentsData.map((comment: any) => comment.creator_id)));
    const { data: profiles } = creatorIds.length
      ? await supabase!.from("profiles").select("id, name, avatar").in("id", creatorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

    res.json(
      commentsData.map((comment: any) => {
        const profile: any = profileMap.get(comment.creator_id);
        return {
          id: comment.id,
          pinId: comment.pin_id,
          creatorId: comment.creator_id,
          creatorName: profile?.name || "Creator",
          creatorAvatar:
            profile?.avatar ||
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150",
          text: comment.text,
          createdAt: comment.created_at,
        };
      })
    );
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Comments could not be loaded." });
  }
});

app.post("/api/pins/:pinId/comments", writeApiRateLimit, async (req, res) => {
  if (!requireSupabase(res)) return;
  const claims = requireAuth(req, res);
  if (!claims) return;

  try {
    const pinId = idField(req.params.pinId, "pinId");
    const text = stringField(req.body.text, "Comment", 500);
    const id = `comment_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const createdAt = new Date().toISOString();

    const { error } = await supabase!.from("comments").insert({
      id,
      pin_id: pinId,
      creator_id: claims.userId,
      text,
      created_at: createdAt,
    });
    if (error) throw error;

    const { data: profile } = await supabase!
      .from("profiles")
      .select("name, avatar")
      .eq("id", claims.userId)
      .maybeSingle();

    res.json({
      id,
      pinId,
      creatorId: claims.userId,
      creatorName: profile?.name || "Creator",
      creatorAvatar:
        profile?.avatar ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150",
      text,
      createdAt,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Comment could not be saved." });
  }
});

const isVercel = !!process.env.VERCEL || !!process.env.NOW_REGION;

if (!isVercel) {
  const PORT = Number(process.env.PORT) || 3000;

  async function startStandaloneServer() {
    if (process.env.NODE_ENV !== "production") {
      console.log("Vite dev server middleware loaded.");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Serving static build files from dist.");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server started successfully on port ${PORT}`);
    });
  }

  startStandaloneServer().catch((error) => {
    console.error("Failed to start server:", error);
  });
}

export default app;
