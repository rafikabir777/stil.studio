import { useState, useEffect, useRef, MouseEvent } from "react";
import { AppState, Creator, Pin, Board } from "./types";
import { initialCreators, initialPins, initialBoards } from "./data/initialData";
import { Search, Plus, Home, Settings, Sliders, LogIn, ChevronLeft, Sparkles, Compass, Folder, Heart, User, CheckCircle, Database, Copy, Check } from "lucide-react";

// Supabase Cloud Integrations
import { 
  SUPABASE_SETUP_SQL,
  dbGetCreators, 
  dbUpsertProfile, 
  dbGetPins, 
  dbUpsertPin, 
  dbGetBoards, 
  dbUpsertBoard, 
  dbSavePinRelation, 
  dbFollowRelation, 
  dbGetUserData 
} from "./lib/supabase";

// Sub-components
import GridComponent from "./components/GridComponent";
import PinDetailModal from "./components/PinDetailModal";
import UploadModal from "./components/UploadModal";
import GoogleSignInPopup from "./components/GoogleSignInPopup";
import GridSettingsPopup from "./components/GridSettingsPopup";
import ProfileView from "./components/ProfileView";
import DatabaseInfoModal from "./components/DatabaseInfoModal";
import { getPersistedPins, persistPins } from "./lib/persistence";

const sortByNewest = <T extends { createdAt?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

const mergeById = <T extends { id: string; createdAt?: string }>(serverItems: T[], localItems: T[]) => {
  const merged = new Map<string, T>();
  localItems.forEach((item) => merged.set(item.id, item));
  serverItems.forEach((item) => merged.set(item.id, item));
  return sortByNewest(Array.from(merged.values()));
};

const setLocalStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`Unable to persist ${key} to localStorage. IndexedDB will keep large pin data.`, err);
  }
};

const getLocalStorageJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`Ignoring invalid saved state for ${key}:`, err);
    localStorage.removeItem(key);
    return fallback;
  }
};

export default function App() {
  // --- Persistent State Initialization ---
  const [currentUser, setCurrentUser] = useState<Creator | null>(() =>
    getLocalStorageJson<Creator | null>("savee_user", null)
  );

  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem("savee_auth_token") || "");

  const [creators, setCreators] = useState<Creator[]>(() =>
    getLocalStorageJson<Creator[]>("savee_creators", initialCreators)
  );

  const [pins, setPins] = useState<Pin[]>(() =>
    getLocalStorageJson<Pin[]>("savee_pins", initialPins)
  );

  const [boards, setBoards] = useState<Board[]>(() =>
    getLocalStorageJson<Board[]>("savee_boards", initialBoards)
  );

  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>(() =>
    getLocalStorageJson<string[]>("savee_followed", [])
  );

  const [savedPinIds, setSavedPinIds] = useState<string[]>(() =>
    getLocalStorageJson<string[]>("savee_saved_pins", ["pin_1", "pin_3", "pin_5"])
  );

  // Layout regulators
  const [gridSize, setGridSize] = useState<number>(() => {
    const saved = Number(getLocalStorageJson<string | number>("savee_grid_size", 3));
    return Number.isFinite(saved) && saved > 0 ? saved : 3;
  });

  const [gridPadding, setGridPadding] = useState<number>(() => {
    const saved = Number(getLocalStorageJson<string | number>("savee_grid_padding", 16));
    return Number.isFinite(saved) && saved >= 0 ? saved : 16;
  });

  // --- UI Layout state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  
  // Modals visibility
  const [showSignIn, setShowSignIn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGridSettings, setShowGridSettings] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Supabase Cloud Sync Effect ---
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [dbSyncedMsg, setDbSyncedMsg] = useState<string | null>(null);
  const [nextPinsCursor, setNextPinsCursor] = useState<string | null>(null);
  const [isLoadingMorePins, setIsLoadingMorePins] = useState(false);

  useEffect(() => {
    fetch("/api/config-status")
      .then((res) => res.json())
      .then((data) => {
        setIsSupabaseConfigured(data.isConfigured);
      })
      .catch((err) => console.error("Error loading config status:", err));
  }, []);

  useEffect(() => {
    getPersistedPins()
      .then((persistedPins) => {
        if (persistedPins.length > 0) {
          setPins((localPins) => mergeById(localPins, persistedPins));
        }
      })
      .catch((err) => {
        console.warn("Failed loading locally persisted pins from IndexedDB:", err);
      });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function initializeSupabaseData() {
      setSupabaseLoading(true);
      try {
        // Load profiles from Supabase
        let dbCreators = [];
        try {
          dbCreators = await dbGetCreators();
        } catch (e) {
          console.warn("Failed syncing creators with Supabase, using local fallback state:", e);
        }

        // Load pins from Supabase
        let dbPins = [];
        try {
          const pinPage = await dbGetPins({ limit: 24 });
          dbPins = pinPage.pins;
          setNextPinsCursor(pinPage.nextCursor);
        } catch (e) {
          console.warn("Failed syncing pins with Supabase, using local fallback state:", e);
        }

        // Load boards from Supabase
        let dbBoards = [];
        try {
          dbBoards = await dbGetBoards();
        } catch (e) {
          console.warn("Failed syncing boards with Supabase, using local fallback state:", e);
        }

        // Sync React local states without discarding local-only uploads.
        setCreators((localCreators) =>
          dbCreators.length > 0 ? mergeById(dbCreators, localCreators) : localCreators
        );
        setPins((localPins) =>
          dbPins.length > 0 ? mergeById(dbPins, localPins) : localPins
        );
        setBoards((localBoards) =>
          dbBoards.length > 0 ? mergeById(dbBoards, localBoards) : localBoards
        );

        // If a user is logged in, sync their specific follows and saved pin lists
        if (currentUser && authToken) {
          const { followedCreatorIds: dbFollows, savedPinIds: dbSaves } = await dbGetUserData(currentUser.id, authToken);
          setFollowedCreatorIds(dbFollows);
          setSavedPinIds(dbSaves);
        }
        setDbSyncedMsg("Synced live data from Supabase Cloud DB!");
        setTimeout(() => setDbSyncedMsg(null), 4000);
      } catch (err) {
        console.error("Failed to sync with Supabase:", err);
      } finally {
        setSupabaseLoading(false);
      }
    }

    initializeSupabaseData();
  }, [currentUser?.id, authToken, isSupabaseConfigured]);

  // Sync to local storage
  useEffect(() => {
    setLocalStorageItem("savee_user", currentUser ? JSON.stringify(currentUser) : "");
    setLocalStorageItem("savee_auth_token", authToken);
    setLocalStorageItem("savee_creators", JSON.stringify(creators));
    setLocalStorageItem("savee_pins", JSON.stringify(pins));
    setLocalStorageItem("savee_boards", JSON.stringify(boards));
    setLocalStorageItem("savee_followed", JSON.stringify(followedCreatorIds));
    setLocalStorageItem("savee_saved_pins", JSON.stringify(savedPinIds));
    setLocalStorageItem("savee_grid_size", gridSize.toString());
    setLocalStorageItem("savee_grid_padding", gridPadding.toString());

    persistPins(pins).catch((err) => {
      console.warn("Failed backing up pins to IndexedDB:", err);
    });
  }, [currentUser, authToken, creators, pins, boards, followedCreatorIds, savedPinIds, gridSize, gridPadding]);

  // --- Helper Action Handlers ---
  const requireAuthToken = () => {
    if (!currentUser || !authToken) {
      setShowSignIn(true);
      return null;
    }

    return authToken;
  };

  const handleSignIn = (newUser: Creator, token: string) => {
    setCurrentUser(newUser);
    setAuthToken(token);

    // Sync database with registered user details
    if (!creators.some((c) => c.id === newUser.id)) {
      setCreators((prev) => [newUser, ...prev]);
    }

    if (isSupabaseConfigured) {
      dbUpsertProfile(newUser, token);
    }

    setShowSignIn(false);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setAuthToken("");
    setCurrentProfileId(null);
    setSelectedBoardId(null);
    setSavedPinIds([]);
    setFollowedCreatorIds([]);
  };

  const handleToggleFollow = (creatorId: string) => {
    const token = requireAuthToken();
    if (!token || !currentUser) {
      setShowSignIn(true);
      return;
    }
    
    setFollowedCreatorIds((prev) => {
      const isFollowing = prev.includes(creatorId);
      const updated = isFollowing 
        ? prev.filter((id) => id !== creatorId) 
        : [...prev, creatorId];

      // Update following/follower count state in creators database too
      setCreators((prevCreators) => 
        prevCreators.map((c) => {
          if (c.id === creatorId) {
            const updatedCreator = {
              ...c,
              followersCount: c.followersCount + (isFollowing ? -1 : 1)
            };
            return updatedCreator;
          }
          return c;
        })
      );

      // Supabase follow relation update
      if (isSupabaseConfigured) {
        dbFollowRelation(creatorId, !isFollowing, token);
        // Also sync currentUser's followingCount live
        const updatedCurrentUser = {
          ...currentUser,
          followingCount: currentUser.followingCount + (isFollowing ? -1 : 1)
        };
        dbUpsertProfile(updatedCurrentUser, token);
      }

      return updated;
    });
  };

  const handleSavePin = (pinnedPin: Pin, e: MouseEvent) => {
    const token = requireAuthToken();
    if (!token || !currentUser) {
      setShowSignIn(true);
      return;
    }

    setSavedPinIds((prev) => {
      const alreadySaved = prev.includes(pinnedPin.id);
      const updatedSaved = alreadySaved 
        ? prev.filter((id) => id !== pinnedPin.id) 
        : [...prev, pinnedPin.id];

      // If user logs in and saves a pin, link current user's ID into the Pin object's savedByCreatorIds
      setPins((prevPins) => 
        prevPins.map((p) => {
          if (p.id === pinnedPin.id) {
            const hasId = p.savedByCreatorIds.includes(currentUser.id);
            return {
              ...p,
              savedByCreatorIds: hasId 
                ? p.savedByCreatorIds.filter((cid) => cid !== currentUser.id)
                : [...p.savedByCreatorIds, currentUser.id]
            };
          }
          return p;
        })
      );

      // Sync user saves association with Supabase
      if (isSupabaseConfigured) {
        dbSavePinRelation(pinnedPin.id, !alreadySaved, token);
      }

      return updatedSaved;
    });
  };

  const handleSaveToBoard = (pin: Pin, boardId: string) => {
    const token = requireAuthToken();
    if (!token || !currentUser) return;

    setBoards((prevBoards) => 
      prevBoards.map((b) => {
        if (b.id === boardId) {
          const alreadyInBoard = b.pinIds.includes(pin.id);
          const updatedBoard = {
            ...b,
            pinIds: alreadyInBoard 
              ? b.pinIds 
              : [...b.pinIds, pin.id]
          };
          if (isSupabaseConfigured) {
            dbUpsertBoard(updatedBoard, token);
          }
          return updatedBoard;
        }
        return b;
      })
    );

    // Make sure it is also saved to their global Save lists
    setSavedPinIds((prev) => {
      const alreadySaved = prev.includes(pin.id);
      if (!alreadySaved) {
        if (isSupabaseConfigured) {
          dbSavePinRelation(pin.id, true, token);
        }
        return [...prev, pin.id];
      }
      return prev;
    });
  };

  const handleAddPin = (newPin: Pin, boardId?: string) => {
    setPins((prev) => [newPin, ...prev]);
    const token = requireAuthToken();
    if (!token || !currentUser) return;

    if (isSupabaseConfigured) {
      dbUpsertPin(newPin, token).then((savedPin) => {
        if (savedPin) {
          setPins((prevPins) => prevPins.map((pin) => (pin.id === newPin.id ? savedPin : pin)));
        }
      });
    }

    if (boardId) {
      setBoards((prevBoards) =>
        prevBoards.map((board) => {
          if (board.id !== boardId || board.pinIds.includes(newPin.id)) {
            return board;
          }

          const updatedBoard = {
            ...board,
            pinIds: [...board.pinIds, newPin.id],
          };

          if (isSupabaseConfigured) {
            dbUpsertBoard(updatedBoard, token);
          }

          return updatedBoard;
        })
      );
    }

    // Automatically sync backboard layout count to user's creator saves count
    if (currentUser) {
      setCurrentUser((prevUser) => {
        if (!prevUser) return null;
        const updatedUser = {
          ...prevUser,
          savesCount: prevUser.savesCount + 1
        };
        if (isSupabaseConfigured) {
          dbUpsertProfile(updatedUser, token);
        }
        return updatedUser;
      });
    }
  };

  const handleAddBoard = (boardName: string) => {
    if (!currentUser) return;
    const token = requireAuthToken();
    if (!token) return;

    const newBoard: Board = {
      id: "board_" + Date.now(),
      name: boardName,
      creatorId: currentUser.id,
      pinIds: [],
      createdAt: new Date().toISOString()
    };

    setBoards((prev) => [...prev, newBoard]);

    if (isSupabaseConfigured) {
      dbUpsertBoard(newBoard, token);
    }
  };

  const handleLoadMorePins = async () => {
    if (!isSupabaseConfigured || !nextPinsCursor || isLoadingMorePins) return;

    setIsLoadingMorePins(true);
    try {
      const page = await dbGetPins({ limit: 24, cursor: nextPinsCursor });
      setPins((localPins) => mergeById(page.pins, localPins));
      setNextPinsCursor(page.nextCursor);
    } finally {
      setIsLoadingMorePins(false);
    }
  };


  const focusSearch = () => {
    searchInputRef.current?.focus();
  };

  // --- Filter and Search logic ---
  const getFilteredPins = () => {
    let list = pins;

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => 
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Filter by selected tag pillow
    if (selectedTag) {
      list = list.filter((p) => p.tags.includes(selectedTag));
    }

    // Filter by active board detail selection
    if (selectedBoardId) {
      const activeBoard = boards.find((b) => b.id === selectedBoardId);
      if (activeBoard) {
        list = list.filter((p) => activeBoard.pinIds.includes(p.id));
      }
    }

    return list;
  };

  const filteredPins = getFilteredPins();

  // Extract all unique tags in active pins
  const uniqueTags = Array.from(new Set(pins.flatMap((p) => p.tags))).slice(0, 8);

  const activeProfileCreator = creators.find((c) => c.id === currentProfileId);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Top Header menu exactly matching Savee style */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-950 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button 
            id="header-brand-logo"
            onClick={() => {
              setCurrentProfileId(null);
              setSelectedBoardId(null);
              setSelectedTag(null);
              setSearchQuery("");
            }}
            className="flex items-center gap-2 cursor-pointer font-semibold text-white tracking-tight"
          >
            <div className="h-7 w-7 rounded-sm bg-zinc-100 text-black flex items-center justify-center font-display font-bold tracking-tighter text-sm">
              S
            </div>
            <span className="text-sm font-display font-semibold tracking-tight hidden sm:inline">STIL . studio</span>
          </button>

          {/* Navigation Path Breadcrumbs */}
          {(currentProfileId || selectedBoardId || selectedTag) && (
            <div id="path-breadcrumbs" className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 font-medium font-sans">
              <ChevronLeft className="h-3.5 w-3.5" />
              <button 
                onClick={() => {
                  setCurrentProfileId(null);
                  setSelectedBoardId(null);
                  setSelectedTag(null);
                }} 
                className="hover:text-zinc-200 transition"
              >
                Feed
              </button>
              
              {currentProfileId && (
                <>
                  <span className="text-zinc-800">/</span>
                  <span className="text-zinc-300">Creator: @{activeProfileCreator?.username}</span>
                </>
              )}

              {selectedBoardId && (
                <>
                  <span className="text-zinc-800">/</span>
                  <span className="text-zinc-300">Board: {boards.find(b => b.id === selectedBoardId)?.name}</span>
                </>
              )}

              {selectedTag && (
                <>
                  <span className="text-zinc-800">/</span>
                  <span className="text-zinc-300">#{selectedTag}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Search block */}
        <div className="flex-1 max-w-xl relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="input-header-search"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Clear profile or tag searches if search queries values are entered to view results immediately
              if (currentProfileId) setCurrentProfileId(null);
              if (selectedBoardId) setSelectedBoardId(null);
            }}
            placeholder="Search typographic layouts, geometric compositions..."
            className="w-full bg-zinc-950 border border-zinc-900 rounded-full py-1.5 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800 transition font-sans"
          />
          {searchQuery && (
            <button 
              id="btn-clear-search"
              onClick={() => setSearchQuery("")} 
              className="absolute right-3 top-2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Top-right menu: Auth & Profile states */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Supabase Status Indicator/Button */}
          <button
            id="header-btn-database"
            onClick={() => setShowDbInfo(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
              isSupabaseConfigured
                ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-400 hover:bg-emerald-950/40"
                : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200"
            }`}
            title={isSupabaseConfigured ? "Database connected live" : "Setup real database sync"}
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isSupabaseConfigured ? "Connected" : "Local Sync"}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isSupabaseConfigured ? "bg-emerald-400" : "bg-zinc-500"}`} />
          </button>

          {currentUser ? (
            <button
              id="header-user-avatar"
              onClick={() => {
                setCurrentProfileId(currentUser.id);
                setSelectedBoardId(null);
              }}
              className="flex items-center gap-2 p-1 pl-2.5 pr-1 rounded-full bg-zinc-950 border border-zinc-900/60 hover:border-zinc-700/80 transition"
            >
              <span className="text-[10px] font-semibold text-zinc-400 hidden sm:inline">@{currentUser.username}</span>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="h-6 w-6 rounded-full object-cover border border-zinc-800"
              />
            </button>
          ) : (
            <button
              id="header-btn-login"
              onClick={() => setShowSignIn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Main page content area */}
      <main className="pb-24">
        
        {/* Render Profile View if an active profile selection holds */}
        {currentProfileId && activeProfileCreator ? (
          <div>
            {/* Back action */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 flex justify-start">
              <button
                id="btn-back-to-feed"
                onClick={() => {
                  setCurrentProfileId(null);
                  setSelectedBoardId(null);
                }}
                className="flex items-center gap-1.5 py-1 px-3 text-xs text-zinc-500 hover:text-zinc-200 transition hover:bg-zinc-950 rounded-lg cursor-pointer border border-zinc-900"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to Feed
              </button>
            </div>
            
            <ProfileView
              creator={activeProfileCreator}
              pins={pins}
              boards={boards}
              currentUser={currentUser}
              creators={creators}
              onToggleFollow={handleToggleFollow}
              onPinClick={setSelectedPin}
              onCreatorClick={(id) => {
                setCurrentProfileId(id);
                setSelectedBoardId(null);
              }}
              onSavePinClick={handleSavePin}
              onOpenSignIn={() => setShowSignIn(true)}
              onSignOut={handleSignOut}
              followedCreatorIds={followedCreatorIds}
              savedPinIds={savedPinIds}
              gridSize={gridSize}
              gridPadding={gridPadding}
            />
          </div>
        ) : (
          /* Render main feeds layout with tags pillows */
          <div className="space-y-4">
            
            {/* If user is logged out, show visual welcome header */}
            {!currentUser && !searchQuery && !selectedTag && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4 text-center space-y-3.5 animate-in fade-in slide-in-from-top-12 duration-500">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-zinc-800 rounded-full bg-zinc-950 text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                  <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                  Visual Moodboard Curators
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-white max-w-xl mx-auto leading-tight">
                  Curate pristine layouts, speed & typographic inspiration.
                </h2>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Join creators on STIL . studio to collect brutalist geometry and design artifacts. Connect using Google.
                </p>
                <div className="pt-2">
                  <button
                    id="welcome-btn-signup"
                    onClick={() => setShowSignIn(true)}
                    className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer transition active:scale-95 shadow-xl shadow-white/5"
                  >
                    Start Curating moodboards
                  </button>
                </div>
              </div>
            )}

            {/* Tag Selection Row */}
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
              <button
                id="tag-all"
                onClick={() => {
                  setSelectedTag(null);
                  setSelectedBoardId(null);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 ${
                  !selectedTag && !selectedBoardId
                    ? "bg-[#161616] text-white border border-zinc-850"
                    : "text-zinc-500 hover:text-zinc-300 bg-zinc-950/20"
                }`}
              >
                All Inspirations
              </button>

              {/* Unique Boards fast filter */}
              {boards.map((b) => {
                const isSelected = selectedBoardId === b.id;
                return (
                  <button
                    key={b.id}
                    id={`board-filter-${b.id}`}
                    onClick={() => {
                      setSelectedBoardId(isSelected ? null : b.id);
                      setSelectedTag(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 flex items-center gap-1 ${
                      isSelected
                        ? "bg-zinc-200 text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-300 bg-zinc-950"
                    }`}
                  >
                    <Folder className="h-3 w-3" />
                    {b.name}
                  </button>
                );
              })}

              <div className="w-px h-5 bg-zinc-900 shrink-0 mx-1" />

              {/* Core tags pillows */}
              {uniqueTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    id={`tag-filter-${tag}`}
                    onClick={() => {
                      setSelectedTag(isSelected ? null : tag);
                      setSelectedBoardId(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 ${
                      isSelected
                        ? "bg-white text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-300 bg-zinc-950"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>

            {/* Active filters feedback */}
            {(selectedTag || searchQuery || selectedBoardId) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between mt-2 pt-2 border-t border-zinc-950 text-xs text-zinc-500">
                <div className="flex items-center gap-1 bg-zinc-950 px-3 py-1 rounded-lg">
                  <span>Filtered to <strong>{filteredPins.length} results</strong></span>
                  {selectedTag && (
                    <span>under <strong>#{selectedTag}</strong></span>
                  )}
                  {searchQuery && (
                    <span>matching query <strong>"{searchQuery}"</strong></span>
                  )}
                  {selectedBoardId && (
                    <span>saved on board <strong>"{boards.find(b => b.id === selectedBoardId)?.name}"</strong></span>
                  )}
                </div>

                <button
                  id="btn-reset-filters"
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedBoardId(null);
                    setSearchQuery("");
                  }}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Main Visual grid layout */}
            {filteredPins.length === 0 ? (
              <div className="text-center py-32 text-zinc-650 space-y-2">
                <p className="text-sm italic">No matching curations found.</p>
                <p className="text-xs">Try selecting 'All Inspirations' or resetting search.</p>
              </div>
            ) : (
              <>
                <GridComponent
                  pins={filteredPins}
                  creators={creators}
                  boards={boards}
                  gridSize={gridSize}
                  gridPadding={gridPadding}
                  currentUser={currentUser}
                  onPinClick={setSelectedPin}
                  onCreatorClick={(id) => {
                    setCurrentProfileId(id);
                    setSelectedBoardId(null);
                  }}
                  onSavePinClick={handleSavePin}
                  savedPinIds={savedPinIds}
                />
                {isSupabaseConfigured && nextPinsCursor && !searchQuery && !selectedTag && !selectedBoardId && (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 flex justify-center">
                    <button
                      id="btn-load-more-pins"
                      onClick={handleLoadMorePins}
                      disabled={isLoadingMorePins}
                      className="px-5 py-2.5 rounded-full border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMorePins ? "Loading..." : "Load more inspirations"}
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </main>

      {/* Floating Bottom Navigation Pill (Exactly as seen in Savee reference screenshots) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
        <nav 
          id="floating-bottom-nav"
          className="flex items-center justify-between bg-zinc-950/70 border border-zinc-900/80 backdrop-blur-xl px-5 py-2 rounded-full w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-8 duration-500"
        >
          {/* Menu Item 1: Home Feed */}
          <button
            id="nav-btn-home"
            onClick={() => {
              setCurrentProfileId(null);
              setSelectedBoardId(null);
              setSelectedTag(null);
              setSearchQuery("");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-3 text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Home Feed"
          >
            <Home className="h-5 w-5" />
          </button>

          {/* Menu Item 2: Search */}
          <button
            id="nav-btn-search"
            onClick={focusSearch}
            className="p-3 text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Search Inspirations"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Menu Item 3: Add (Create / Upload) */}
          <button
            id="nav-btn-add"
            onClick={() => {
              if (!currentUser || !authToken) setShowSignIn(true);
              else setShowUpload(true);
            }}
            className="p-3 mx-1 bg-zinc-200 text-zinc-950 hover:bg-white hover:scale-110 active:scale-95 transition rounded-full cursor-pointer shadow-md"
            title="Add inspiration or New board"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Menu Item 4: Customize Grid (Image 8) */}
          <button
            id="nav-nav-layout"
            onClick={() => setShowGridSettings(true)}
            className="p-3 text-zinc-450 hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Customize Grid Layout"
          >
            <Sliders className="h-5 w-5 text-zinc-400" />
          </button>

          {/* Menu Item 5: Profile avatar shortcut */}
          <button
            id="nav-btn-profile"
            onClick={() => {
              if (!currentUser) {
                setShowSignIn(true);
              } else {
                setCurrentProfileId(currentUser.id);
                setSelectedBoardId(null);
              }
            }}
            className="p-1 rounded-full border border-zinc-800 hover:border-zinc-400 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
            title="Your Profile"
          >
            {currentUser ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <User className="h-4.5 w-4.5" />
              </div>
            )}
          </button>
        </nav>
      </div>

      {/* --- ALL OVERLAY MODALS --- */}

      {/* 1. Pin detailed modal */}
      {selectedPin && (
        <PinDetailModal
          pin={selectedPin}
          creators={creators}
          boards={boards}
          currentUser={currentUser}
          onClose={() => setSelectedPin(null)}
          onCreatorClick={(profileId) => {
            setCurrentProfileId(profileId);
            setSelectedBoardId(null);
          }}
          onToggleFollow={handleToggleFollow}
          onSaveToBoard={handleSaveToBoard}
          onOpenSignIn={() => setShowSignIn(true)}
          followedCreatorIds={followedCreatorIds}
          authToken={authToken}
        />
      )}

      {/* 2. Login/Signup Popup */}
      {showSignIn && (
        <GoogleSignInPopup
          onSignIn={handleSignIn}
          onClose={() => setShowSignIn(false)}
        />
      )}

      {/* 3. Upload Drawer/Modal */}
      {showUpload && (
        <UploadModal
          boards={boards}
          currentUser={currentUser}
          authToken={authToken}
          onClose={() => setShowUpload(false)}
          onAddPin={handleAddPin}
          onAddBoard={handleAddBoard}
        />
      )}

      {/* 4. Grid Settings Layout popup */}
      {showGridSettings && (
        <GridSettingsPopup
          gridSize={gridSize}
          gridPadding={gridPadding}
          onChangeSize={setGridSize}
          onChangePadding={setGridPadding}
          onClose={() => setShowGridSettings(false)}
        />
      )}

      {/* 5. Supabase Configuration guide modal */}
      {showDbInfo && (
        <DatabaseInfoModal
          isConfigured={isSupabaseConfigured}
          onClose={() => setShowDbInfo(false)}
        />
      )}

    </div>
  );
}
