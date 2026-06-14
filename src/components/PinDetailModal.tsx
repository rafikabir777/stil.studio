import { useEffect, useState, FormEvent } from "react";
import { Pin, Creator, Board, PinComment } from "../types";
import { X, FolderPlus, Download, Link, UserPlus, UserCheck, MessageSquare, Plus } from "lucide-react";
import { dbAddComment, dbGetComments } from "../lib/supabase";

interface PinDetailModalProps {
  pin: Pin;
  creators: Creator[];
  boards: Board[];
  currentUser: Creator | null;
  onClose: () => void;
  onCreatorClick: (creatorId: string) => void;
  onToggleFollow: (creatorId: string) => void;
  onSaveToBoard: (pin: Pin, boardId: string) => void;
  onOpenSignIn: () => void;
  followedCreatorIds: string[];
  authToken: string;
}

export default function PinDetailModal({
  pin,
  creators,
  boards,
  currentUser,
  onClose,
  onCreatorClick,
  onToggleFollow,
  onSaveToBoard,
  onOpenSignIn,
  followedCreatorIds,
  authToken,
}: PinDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"saves" | "comments">("saves");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<PinComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showBoardDrawer, setShowBoardDrawer] = useState(false);

  const originalCreator = creators.find((c) => c.id === pin.originalCreatorId) || creators[0];
  const uploaderCreator = creators.find((c) => c.id === pin.creatorId) || creators[0];

  useEffect(() => {
    let isMounted = true;
    setCommentsLoading(true);
    setCommentError("");

    dbGetComments(pin.id)
      .then((loadedComments) => {
        if (isMounted) setComments(loadedComments);
      })
      .catch(() => {
        if (isMounted) setCommentError("Comments could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setCommentsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pin.id]);

  // List of other users who "saved" this pin (randomly select from mock database for realism)
  const savedByCreators = creators.filter((c) => 
    pin.savedByCreatorIds.includes(c.id) || 
    (pin.id === "pin_1" && ["jinho_moon", "derrick_lee", "ldx9adrian"].includes(c.id))
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCommentDate = (createdAt: string) => {
    const timestamp = new Date(createdAt).getTime();
    if (!Number.isFinite(timestamp)) return "Just now";

    const diffMs = Date.now() - timestamp;
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser || !authToken) {
      onOpenSignIn();
      return;
    }

    setCommentError("");
    const newComment = await dbAddComment(pin.id, commentText, authToken);
    if (!newComment) {
      setCommentError("Comment could not be saved. Please try again.");
      return;
    }

    setComments([newComment, ...comments]);
    setCommentText("");
  };

  // Find boards belonging to current user
  const userBoards = boards.filter((b) => b.creatorId === currentUser?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 md:p-6 overflow-y-auto">
      {/* Container Card */}
      <div 
        id="pin-detail-container"
        className="relative w-full max-w-5xl bg-[#0d0d0d] border border-zinc-900 rounded-none md:rounded-3xl overflow-hidden text-zinc-100 flex flex-col md:flex-row min-h-screen md:min-h-0 md:max-h-[90vh] shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-300"
      >
        {/* Close button */}
        <button
          id="pin-detail-close"
          onClick={onClose}
          className="absolute top-4 left-4 z-25 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white hover:scale-105 transition active:scale-95 cursor-pointer border border-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left column: Absolute Gorgeous Visual Hero */}
        <div className="w-full md:w-3/5 bg-black flex items-center justify-center p-4 md:p-8 min-h-[40vh] md:min-h-0 overflow-hidden md:max-h-[90vh]">
          <img
            src={pin.imageUrl}
            alt={pin.title}
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[80vh] md:max-h-[75vh] object-contain rounded-xl shadow-lg border border-zinc-900"
          />
        </div>

        {/* Right column: Action panel & Curations info */}
        <div className="w-full md:w-2/5 border-t md:border-t-0 md:border-l border-zinc-900 flex flex-col h-full md:h-[90vh] md:max-h-[90vh]">
          
          {/* Top Panel Actions: Save & Links */}
          <div className="p-6 border-b border-zinc-900 flex justify-between items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                id="pin-btn-save-to"
                onClick={() => {
                  if (!currentUser) onOpenSignIn();
                  else setShowBoardDrawer(!showBoardDrawer);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold hover:scale-103 transition cursor-pointer ${
                  showBoardDrawer ? "bg-zinc-800 text-zinc-200" : "bg-white text-zinc-950"
                }`}
              >
                <FolderPlus className="h-4 w-4" />
                Add to Board
              </button>
              
              <button
                id="pin-btn-copy"
                onClick={handleCopyLink}
                className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white hover:scale-105 transition cursor-pointer border border-zinc-800"
                title="Copy link"
              >
                {copied ? (
                  <span className="text-xs text-green-400 font-semibold px-1">Copied</span>
                ) : (
                  <Link className="h-4.5 w-4.5" />
                )}
              </button>
            </div>

            <a
              id="pin-btn-download"
              href={pin.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white hover:scale-105 transition cursor-pointer border border-zinc-800"
              title="View full resolutuon"
            >
              <Download className="h-4.5 w-4.5" />
            </a>
          </div>

          {/* Sub Board Drawer (Drop-down or absolute slider on right col) */}
          {showBoardDrawer && (
            <div className="px-6 py-4 bg-[#141414] border-b border-zinc-900 flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-zinc-400">Your boards</span>
                <span className="text-[10px] text-zinc-500">Pick to save</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {userBoards.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-1">No custom boards. Create one in profile first.</p>
                ) : (
                  userBoards.map((board) => {
                    const alreadySaved = board.pinIds.includes(pin.id);
                    return (
                      <button
                        key={board.id}
                        id={`board-select-${board.id}`}
                        onClick={() => {
                          onSaveToBoard(pin, board.id);
                          setShowBoardDrawer(false);
                        }}
                        className="w-full flex justify-between items-center px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40 text-left text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-medium text-zinc-300">{board.name}</span>
                        {alreadySaved ? (
                          <span className="text-[10px] text-zinc-500 italic bg-zinc-900 px-2 py-0.5 rounded">Saved</span>
                        ) : (
                          <span className="text-[10px] text-blue-400 font-semibold">Save here</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Core scrollable metadata section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & description */}
            <div className="space-y-2">
              <h1 className="text-xl font-medium leading-tight tracking-tight text-white">{pin.title}</h1>
              {pin.description && (
                <p className="text-sm text-zinc-400 leading-relaxed font-sans">{pin.description}</p>
              )}
            </div>

            {/* Original Creator Row */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  onCreatorClick(uploaderCreator.id);
                  onClose();
                }}
              >
                <img
                  src={uploaderCreator.avatar}
                  alt={uploaderCreator.name}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                />
                <div>
                  <div className="text-xs text-zinc-500 leading-none">Curated by</div>
                  <div className="text-sm font-medium hover:underline text-white mt-1">{uploaderCreator.name}</div>
                  <div className="text-xs text-zinc-400 font-mono">@{uploaderCreator.username}</div>
                </div>
              </div>

              {/* Follow Button */}
              {uploaderCreator.id !== currentUser?.id && (
                <button
                  id={`follow-btn-modal-${uploaderCreator.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!currentUser) onOpenSignIn();
                    else onToggleFollow(uploaderCreator.id);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition active:scale-95 flex items-center gap-1 ${
                    followedCreatorIds.includes(uploaderCreator.id)
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                      : "bg-zinc-200 text-zinc-950 hover:bg-white"
                  }`}
                >
                  {followedCreatorIds.includes(uploaderCreator.id) ? (
                    <>
                      <UserCheck className="h-3 w-3" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Tabs for saves list vs Comments */}
            <div className="space-y-4">
              <div className="flex border-b border-zinc-900 text-sm">
                <button
                  id="tab-saves"
                  onClick={() => setActiveTab("saves")}
                  className={`flex-1 pb-3 text-center cursor-pointer transition-all ${
                    activeTab === "saves" 
                      ? "border-b-2 border-white text-white font-medium" 
                      : "text-zinc-400 font-normal hover:text-zinc-200"
                  }`}
                >
                  Saved By ({savedByCreators.length + (currentUser && !pin.savedByCreatorIds.includes(currentUser.id) ? 0 : 0)})
                </button>
                <button
                  id="tab-comments"
                  onClick={() => setActiveTab("comments")}
                  className={`flex-1 pb-3 text-center cursor-pointer transition-all ${
                    activeTab === "comments" 
                      ? "border-b-2 border-white text-white font-medium" 
                      : "text-zinc-400 font-normal hover:text-zinc-200"
                  }`}
                >
                  Comments ({comments.length})
                </button>
              </div>

              {/* Saves tab list of builders */}
              {activeTab === "saves" && (
                <div className="space-y-3 pt-1">
                  {savedByCreators.map((creator) => {
                    const isMe = creator.id === currentUser?.id;
                    const isFollowed = followedCreatorIds.includes(creator.id);

                    return (
                      <div
                        key={creator.id}
                        id={`saver-row-${creator.id}`}
                        className="flex items-center justify-between py-2 border-b border-zinc-900/40 last:border-0"
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            onCreatorClick(creator.id);
                            onClose();
                          }}
                        >
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover border border-zinc-800"
                          />
                          <div>
                            <div className="text-xs font-semibold text-zinc-200 hover:underline">
                              {creator.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">@{creator.username}</div>
                          </div>
                        </div>

                        {/* Follow state for other savers */}
                        {!isMe && (
                          <button
                            id={`follow-saver-${creator.id}`}
                            onClick={() => {
                              if (!currentUser) onOpenSignIn();
                              else onToggleFollow(creator.id);
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition ${
                              isFollowed
                                ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                                : "bg-zinc-200 text-zinc-950 hover:bg-white"
                            }`}
                          >
                            {isFollowed ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {savedByCreators.length === 0 && (
                    <p className="text-xs text-zinc-500 italic py-4 text-center">Be the first to save this inspiration.</p>
                  )}
                </div>
              )}

              {/* Comments tab with list and input */}
                  {activeTab === "comments" && (
                <div className="space-y-4 pt-1">
                  {commentError && (
                    <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      {commentError}
                    </p>
                  )}

                  {/* Form to submit */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      id="comment-input"
                      type="text"
                      placeholder="Add an inspiration thought..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      id="comment-submit"
                      type="submit"
                      className="px-3 rounded-xl bg-zinc-200 hover:bg-white text-zinc-950 font-medium text-xs cursor-pointer transition active:scale-95"
                    >
                      Post
                    </button>
                  </form>

                  {/* Comments list */}
                  <div className="space-y-3.5 max-h-[25vh] overflow-y-auto pr-1">
                    {commentsLoading && (
                      <p className="text-xs text-zinc-500 italic py-2">Loading comments...</p>
                    )}
                    {!commentsLoading && comments.length === 0 && (
                      <p className="text-xs text-zinc-500 italic py-2">No comments yet.</p>
                    )}
                    {comments.map((comment) => (
                      <div key={comment.id} className="text-xs flex gap-3 pb-3 border-b border-zinc-900/30">
                        <img
                          src={comment.creatorAvatar}
                          alt={comment.creatorName}
                          className="h-7 w-7 rounded-full object-cover mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-200">{comment.creatorName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{formatCommentDate(comment.createdAt)}</span>
                          </div>
                          <p className="text-zinc-400 font-sans leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags section */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Curation tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {pin.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-md text-zinc-400 hover:text-white cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
