export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  website?: string;
  role?: string;
  followersCount: number;
  followingCount: number;
  savesCount: number;
  isFollowedByMe?: boolean;
}

export interface Board {
  id: string;
  name: string;
  creatorId: string;
  pinIds: string[];
  createdAt: string;
}

export interface Pin {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  aspectRatio: string; // e.g. "ratio-1-1", "ratio-3-4", "ratio-16-9", etc. OR float numeric as ratio
  aspectRatioValue: number; // e.g., 0.75, 1, 1.5
  creatorId: string; // who uploaded it
  originalCreatorId: string; // who first uploaded it
  savedByCreatorIds: string[]; // List of creator IDs who saved this pin
  likesCount: number;
  tags: string[];
  createdAt: string;
}

export interface PinComment {
  id: string;
  pinId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  text: string;
  createdAt: string;
}

export interface AppState {
  currentUser: Creator | null;
  creators: Creator[];
  pins: Pin[];
  boards: Board[];
  followedCreatorIds: string[]; // list of creator IDs the current user follows
  gridSize: number; // slider value for size (cols count/max-width)
  gridPadding: number; // slider value for padding (gap length in pixels)
}
