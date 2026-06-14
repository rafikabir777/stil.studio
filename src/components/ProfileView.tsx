import { useState, MouseEvent } from "react";
import { Creator, Pin, Board } from "../types";
import { Link, Globe, Settings, MapPin, LogOut, CheckCircle } from "lucide-react";
import GridComponent from "./GridComponent";

interface ProfileViewProps {
  creator: Creator;
  pins: Pin[];
  boards: Board[];
  currentUser: Creator | null;
  creators: Creator[];
  onToggleFollow: (creatorId: string) => void;
  onPinClick: (pin: Pin) => void;
  onCreatorClick: (creatorId: string) => void;
  onSavePinClick: (pin: Pin, e: MouseEvent) => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  followedCreatorIds: string[];
  savedPinIds: string[];
  gridSize: number;
  gridPadding: number;
}

export default function ProfileView({
  creator,
  pins,
  boards,
  currentUser,
  creators,
  onToggleFollow,
  onPinClick,
  onCreatorClick,
  onSavePinClick,
  onOpenSignIn,
  onSignOut,
  followedCreatorIds,
  savedPinIds,
  gridSize,
  gridPadding,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"saves" | "boards">("saves");
  const isMe = currentUser?.id === creator.id;
  const isFollowed = followedCreatorIds.includes(creator.id);

  // Filter Pins saved or uploaded by this creator
  const creatorPins = pins.filter((p) => 
    p.savedByCreatorIds.includes(creator.id) || p.creatorId === creator.id
  );

  // Filter Boards belonging to this creator
  const creatorBoards = boards.filter((b) => b.creatorId === creator.id);

  // Handle active followers calculation
  const followersCountAdjusted = creator.followersCount + 
    (!isMe && isFollowed ? 1 : 0);

  return (
    <div id={`profile-page-${creator.id}`} className="min-h-screen bg-black text-zinc-100 pt-6 px-4 md:px-8 pb-32">
      
      {/* Header Profile Section exactly corresponding to Image 6 */}
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4 pt-8 pb-12">
        
        {/* Avatar block */}
        <div className="relative group">
          <img
            src={creator.avatar}
            alt={creator.name}
            referrerPolicy="no-referrer"
            className="h-28 w-28 rounded-full object-cover border-2 border-zinc-900 shadow-2xl transition duration-300"
          />
          {isMe && (
            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Settings className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Name and Verified badge (Savee style) */}
        <div className="space-y-1.5 focus:outline-none">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{creator.name}</h1>
            <CheckCircle className="h-4.5 w-4.5 text-zinc-400 fill-zinc-400 stroke-zinc-950" />
          </div>
          
          {/* Tagline descriptors as in Derrick C. Lee profile */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-zinc-400 font-medium">
            <span className="font-mono">@{creator.username}</span>
            {creator.role && (
              <>
                <span className="text-zinc-700 font-normal">•</span>
                <span>{creator.role}</span>
              </>
            )}
            {creator.website && (
              <>
                <span className="text-zinc-700 font-normal">•</span>
                <a 
                  href={`#https://${creator.website}`} 
                  className="hover:text-white flex items-center gap-1 hover:underline transition"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe className="h-3 w-3 shrink-0" />
                  {creator.website}
                </a>
              </>
            )}
          </div>
        </div>

        {/* Bio information */}
        {creator.bio && (
          <p className="max-w-md text-xs text-zinc-500 font-sans leading-relaxed">
            {creator.bio}
          </p>
        )}

        {/* Followers & saves counters exactly layout as in Image 6 */}
        <div className="flex items-center justify-center gap-8 py-3 px-6 bg-zinc-950 border border-zinc-900/60 rounded-2xl text-xs font-medium">
          <div className="text-center">
            <div className="text-white text-md font-semibold tracking-tight font-mono">{creatorPins.length}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Saves</div>
          </div>
          <div className="w-px h-6 bg-zinc-900" />
          <div className="text-center">
            <div className="text-white text-md font-semibold tracking-tight font-mono">{creatorBoards.length}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{creatorBoards.length === 1 ? 'Board' : 'Boards'}</div>
          </div>
          <div className="w-px h-6 bg-zinc-900" />
          <div className="text-center">
            <div className="text-white text-md font-semibold tracking-tight font-mono">{creator.followingCount}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Following</div>
          </div>
          <div className="w-px h-6 bg-zinc-900" />
          <div className="text-center">
            <div className="text-white text-md font-semibold tracking-tight font-mono">{followersCountAdjusted}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Followers</div>
          </div>
        </div>

        {/* Action button rows: signout vs follow */}
        <div className="pt-2 flex gap-2">
          {isMe ? (
            <button
              id="profile-btn-signout"
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-red-400 cursor-pointer transition active:scale-95 border border-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          ) : (
            <button
              id={`profile-btn-follow-${creator.id}`}
              onClick={() => {
                if (!currentUser) onOpenSignIn();
                else onToggleFollow(creator.id);
              }}
              className={`flex items-center gap-1 px-8 py-2 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95 ${
                isFollowed
                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-300"
                  : "bg-white text-zinc-950 hover:bg-zinc-150"
              }`}
            >
              {isFollowed ? "Following" : "Follow"}
            </button>
          )}
        </div>

      </div>

      {/* Tabs navigation */}
      <div className="max-w-5xl mx-auto border-t border-zinc-900 pt-2 flex justify-center text-sm font-medium">
        <div className="flex gap-1.5 p-1 bg-zinc-950 border border-zinc-900 rounded-xl">
          <button
            id="profile-tab-saves"
            onClick={() => setActiveTab("saves")}
            className={`px-6 py-2.5 rounded-lg text-xs tracking-wide cursor-pointer transition-all ${
              activeTab === "saves" 
                ? "bg-zinc-900 text-white font-semibold" 
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            Saves ({creatorPins.length})
          </button>
          <button
            id="profile-tab-boards"
            onClick={() => setActiveTab("boards")}
            className={`px-6 py-2.5 rounded-lg text-xs tracking-wide cursor-pointer transition-all ${
              activeTab === "boards" 
                ? "bg-zinc-900 text-white font-semibold" 
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            Boards ({creatorBoards.length})
          </button>
        </div>
      </div>

      {/* Primary collection Display based on tab */}
      <div className="max-w-5xl mx-auto pt-6">
        {activeTab === "saves" ? (
          <div>
            {creatorPins.length === 0 ? (
              <div className="text-center py-24 text-zinc-600 space-y-2">
                <p className="text-sm italic">This moodboard contains no saves yet.</p>
                <p className="text-xs">Browse the home feed or upload local layouts to pin inspiration.</p>
              </div>
            ) : (
              <GridComponent
                pins={creatorPins}
                creators={creators}
                boards={boards}
                gridSize={gridSize}
                gridPadding={gridPadding}
                currentUser={currentUser}
                onPinClick={onPinClick}
                onCreatorClick={onCreatorClick}
                onSavePinClick={onSavePinClick}
                savedPinIds={savedPinIds}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
            {creatorBoards.map((board) => {
              // Find sample pins for preview backgrounds
              const boardPins = pins.filter((p) => board.pinIds.includes(p.id));
              const coverImg = boardPins[0]?.imageUrl || "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=600";

              return (
                <div
                  key={board.id}
                  id={`board-card-${board.id}`}
                  className="group relative h-48 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 flex flex-col justify-end p-4 cursor-pointer hover:border-zinc-700 transition duration-300"
                  onClick={() => {
                    // Navigate to board detail
                  }}
                >
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={coverImg} 
                      alt={board.name} 
                      className="w-full h-full object-cover opacity-30 group-hover:scale-105 group-hover:opacity-40 transition duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="text-sm font-semibold text-white group-hover:underline">{board.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
                      {board.pinIds.length === 1 ? "1 Inspiration item" : `${board.pinIds.length} Inspiration items`}
                    </p>
                  </div>
                </div>
              );
            })}

            {creatorBoards.length === 0 && (
              <div className="col-span-full text-center py-24 text-zinc-650">
                <p className="text-sm italic">Create customized boards in the add panel to categorize your collections.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
