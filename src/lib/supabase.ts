import { Board, Creator, Pin, PinComment } from "../types";

// SQL Script to create matching database tables in Supabase (informative only)
export const SUPABASE_SETUP_SQL = `-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  website TEXT,
  role VARCHAR(100),
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create PINS Table
CREATE TABLE IF NOT EXISTS public.pins (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  aspect_ratio VARCHAR(50) DEFAULT 'ratio-1-1',
  aspect_ratio_value NUMERIC DEFAULT 1.0,
  creator_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_creator_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create BOARDS Table
CREATE TABLE IF NOT EXISTS public.boards (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  creator_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create FOLLOWED creator link representation
CREATE TABLE IF NOT EXISTS public.follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 5. Create SAVED PINS representation
CREATE TABLE IF NOT EXISTS public.saved_pins (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id VARCHAR(255) REFERENCES public.pins(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pin_id)
);

-- 6. Create COMMENTS representation
CREATE TABLE IF NOT EXISTS public.comments (
  id VARCHAR(255) PRIMARY KEY,
  pin_id VARCHAR(255) REFERENCES public.pins(id) ON DELETE CASCADE,
  creator_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pins_created_at ON public.pins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_pin_created_at ON public.comments(pin_id, created_at DESC);

-- Create a public Supabase Storage bucket named "pin-images" in Storage.
-- The server stores uploaded files there and saves only the public URL in public.pins.image_url.`;

export interface PaginatedPins {
  pins: Pin[];
  nextCursor: string | null;
}

function authHeaders(authToken?: string) {
  return {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  const data = await res.json().catch(() => fallback);
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || "API call failed");
  }
  return data as T;
}

export async function dbGetCreators(): Promise<Creator[]> {
  try {
    const res = await fetch("/api/creators");
    return await readJson<Creator[]>(res, []);
  } catch (err) {
    console.error("Error fetching profiles from proxy:", err);
    return [];
  }
}

export async function dbUpsertProfile(creator: Creator, authToken?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ creator }),
    });
    await readJson(res, {});
    return true;
  } catch (err) {
    console.error("Error saving profile via proxy:", err);
    return false;
  }
}

export async function dbGetPins(options: { limit?: number; cursor?: string | null } = {}): Promise<PaginatedPins> {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(options.limit || 24));
    if (options.cursor) params.set("cursor", options.cursor);

    const res = await fetch(`/api/pins?${params.toString()}`);
    return await readJson<PaginatedPins>(res, { pins: [], nextCursor: null });
  } catch (err) {
    console.error("Error loading pins from proxy:", err);
    return { pins: [], nextCursor: null };
  }
}

export async function dbUpsertPin(pin: Pin, authToken?: string): Promise<Pin | null> {
  try {
    const res = await fetch("/api/pins", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ pin }),
    });
    const data = await readJson<{ pin: Pin }>(res, { pin });
    return data.pin;
  } catch (err) {
    console.error("Error creating pin via proxy:", err);
    return null;
  }
}

export async function dbUploadImage(dataUrl: string, fileName: string, authToken?: string): Promise<string | null> {
  try {
    const res = await fetch("/api/uploads/image", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ dataUrl, fileName }),
    });
    const data = await readJson<{ url: string }>(res, { url: "" });
    return data.url || null;
  } catch (err) {
    console.error("Error uploading image via proxy:", err);
    return null;
  }
}

export async function dbGetBoards(): Promise<Board[]> {
  try {
    const res = await fetch("/api/boards");
    return await readJson<Board[]>(res, []);
  } catch (err) {
    console.error("Error fetching boards from proxy:", err);
    return [];
  }
}

export async function dbUpsertBoard(board: Board, authToken?: string): Promise<Board | null> {
  try {
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ board }),
    });
    const data = await readJson<{ board: Board }>(res, { board });
    return data.board;
  } catch (err) {
    console.error("Error syncing board via proxy:", err);
    return null;
  }
}

export async function dbSavePinRelation(pinId: string, isSaved: boolean, authToken?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/save-relation", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ pinId, isSaved }),
    });
    await readJson(res, {});
    return true;
  } catch (err) {
    console.error("Error syncing save action via proxy:", err);
    return false;
  }
}

export async function dbFollowRelation(followingId: string, isFollowing: boolean, authToken?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/follow-relation", {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ followingId, isFollowing }),
    });
    await readJson(res, {});
    return true;
  } catch (err) {
    console.error("Error syncing follow state via proxy:", err);
    return false;
  }
}

export async function dbGetUserData(userId: string, authToken?: string) {
  try {
    const res = await fetch(`/api/user-data/${userId}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
    return await readJson<{ followedCreatorIds: string[]; savedPinIds: string[] }>(res, {
      followedCreatorIds: [],
      savedPinIds: [],
    });
  } catch (err) {
    console.error("Error loading specific user metadata via proxy:", err);
    return { followedCreatorIds: [], savedPinIds: [] };
  }
}

export async function dbGetComments(pinId: string): Promise<PinComment[]> {
  try {
    const res = await fetch(`/api/pins/${pinId}/comments`);
    return await readJson<PinComment[]>(res, []);
  } catch (err) {
    console.error("Error loading comments via proxy:", err);
    return [];
  }
}

export async function dbAddComment(pinId: string, text: string, authToken?: string): Promise<PinComment | null> {
  try {
    const res = await fetch(`/api/pins/${pinId}/comments`, {
      method: "POST",
      headers: authHeaders(authToken),
      body: JSON.stringify({ text }),
    });
    return await readJson<PinComment>(res, null as unknown as PinComment);
  } catch (err) {
    console.error("Error adding comment via proxy:", err);
    return null;
  }
}
