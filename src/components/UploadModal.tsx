import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from "react";
import { Pin, Board, Creator } from "../types";
import { Upload, Link2, Plus, Sparkles, Folder, Check, AlertCircle } from "lucide-react";
import { dbUploadImage } from "../lib/supabase";

interface UploadModalProps {
  boards: Board[];
  currentUser: Creator | null;
  authToken: string;
  onClose: () => void;
  onAddPin: (newPin: Pin, boardId?: string) => void;
  onAddBoard: (boardName: string) => void;
}

export default function UploadModal({
  boards,
  currentUser,
  authToken,
  onClose,
  onAddPin,
  onAddBoard,
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "board" | "pinterest">("upload");
  
  // Tab 1: Pin Upload state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("upload");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: Board State
  const [newBoardName, setNewBoardName] = useState("");
  const [boardSuccess, setBoardSuccess] = useState(false);

  // Tab 3: Pinterest Import State
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success">("idle");

  const userBoards = boards.filter((b) => b.creatorId === currentUser?.id);

  // File drag & drop handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageUrl(e.target.result as string); // base64 payload
        setFileName(file.name);
        setUploadError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !title || !currentUser || !authToken || isSubmitting) return;

    setIsSubmitting(true);
    setUploadError("");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    let storedImageUrl = imageUrl;
    try {
      storedImageUrl = imageUrl.startsWith("data:")
        ? (await dbUploadImage(imageUrl, fileName, authToken)) || ""
        : imageUrl;
    } catch (err: any) {
      setUploadError(err.message || "Image upload failed. Confirm your Supabase Storage bucket is configured.");
      setIsSubmitting(false);
      return;
    }

    if (!storedImageUrl) {
      setUploadError("Image upload failed. Confirm your Supabase Storage bucket is configured.");
      setIsSubmitting(false);
      return;
    }

    const newPin: Pin = {
      id: "pin_" + Date.now(),
      title,
      description,
      imageUrl: storedImageUrl,
      aspectRatio: "3:4",
      aspectRatioValue: 0.75, // default portrait
      creatorId: currentUser.id,
      originalCreatorId: currentUser.id,
      savedByCreatorIds: [currentUser.id],
      likesCount: 0,
      tags: tags.length ? tags : ["curated", "user_upload"],
      createdAt: new Date().toISOString(),
    };

    onAddPin(newPin, selectedBoardId || undefined);

    onClose();
    setIsSubmitting(false);
  };

  const handleCreateBoardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    onAddBoard(newBoardName);
    setNewBoardName("");
    setBoardSuccess(true);
    setTimeout(() => {
      setBoardSuccess(false);
      setActiveTab("upload"); // switch back so they can attach files to the newly created board
    }, 1500);
  };

  const handlePinterestImportSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pinterestUrl.trim()) return;

    setImportStatus("loading");

    // Dynamic list of high-end design assets we populate for the simulated pinterest scrape
    const mockDesignAssets = [
      "https://images.unsplash.com/photo-1618005198143-e5283464303b?auto=format&fit=crop&q=80&w=600", // red brutalist quote
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=600", // blue geometric
      "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?auto=format&fit=crop&q=80&w=600", // chromatic prism
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=600"  // monochrome fashion
    ];

    setTimeout(() => {
      // pick a random beautiful asset matching Pinterest mood
      const selectedImgUrl = mockDesignAssets[Math.floor(Math.random() * mockDesignAssets.length)];
      
      const newImportedPin: Pin = {
        id: "pin_imported_" + Date.now(),
        title: "Imported Pinterest Collection Inspiration",
        description: `Successfully analyzed and imported visual mood curation from requested link: ${pinterestUrl}`,
        imageUrl: selectedImgUrl,
        aspectRatio: "3:4",
        aspectRatioValue: 0.75,
        creatorId: currentUser?.id || "derrick_lee",
        originalCreatorId: "derrick_lee",
        savedByCreatorIds: [currentUser?.id || "derrick_lee"],
        likesCount: 142,
        tags: ["pinterest_import", "curation", "layout"],
        createdAt: new Date().toISOString()
      };

      onAddPin(newImportedPin);
      setImportStatus("success");
      setTimeout(() => {
        setImportStatus("idle");
        setPinterestUrl("");
        onClose();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div 
        id="upload-modal-container"
        className="w-full max-w-xl bg-[#0e0e0e] border border-zinc-900 rounded-3xl overflow-hidden text-zinc-100 shadow-2xl animate-in scale-in-95 duration-200"
      >
        {/* Navigation Tabs Header */}
        <div className="flex bg-[#121212] border-b border-zinc-900 text-xs text-zinc-400">
          <button
            id="tab-upload-pin"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-4 text-center cursor-pointer font-medium transition-all ${
              activeTab === "upload" 
                ? "bg-[#0e0e0e] text-white border-r border-[#0e0e0e]" 
                : "hover:bg-[#161616] hover:text-zinc-200"
            }`}
          >
            Upload image
          </button>
          <button
            id="tab-create-board"
            onClick={() => setActiveTab("board")}
            className={`flex-1 py-4 text-center cursor-pointer font-medium transition-all ${
              activeTab === "board" 
                ? "bg-[#0e0e0e] text-white border-x border-[#0e0e0e]" 
                : "hover:bg-[#161616] hover:text-zinc-200"
            }`}
          >
            New board
          </button>
          <button
            id="tab-import-pinterest"
            onClick={() => setActiveTab("pinterest")}
            className={`flex-1 py-4 text-center cursor-pointer font-medium transition-all ${
              activeTab === "pinterest" 
                ? "bg-[#0e0e0e] text-white border-l border-[#0e0e0e]" 
                : "hover:bg-[#161616] hover:text-zinc-200"
            }`}
          >
            Import from Pinterest
          </button>
        </div>

        {/* Modal body based on tab */}
        <div className="p-6 md:p-8 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {activeTab === "upload" && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Image Section */}
                <div 
                  id="drag-drop-zone"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 min-h-[220px] cursor-pointer text-center transition-all ${
                    dragActive 
                      ? "border-white bg-[#161616]" 
                      : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/85"
                  }`}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="absolute inset-0 p-2 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-zinc-100">Drag & drop your inspiration file</p>
                        <p className="text-[10px] text-zinc-500">PNG, JPG, HEIC, WebP up to 10MB</p>
                      </div>
                      <span className="inline-block px-3 py-1 text-[10px] font-semibold bg-zinc-900 hover:bg-zinc-800 rounded-full border border-zinc-800 text-zinc-300 transition mt-1">
                        Or select locally
                      </span>
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  {/* Or link URL */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Or Paste Direct URL</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-600">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <input
                        id="input-pin-url"
                        type="url"
                        value={imageUrl.startsWith("data:") ? "" : imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setImagePreview(e.target.value || null);
                        }}
                        disabled={imageUrl.startsWith("data:")}
                        placeholder="https://images.unsplash.com/photo..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition"
                      />
                    </div>
                    {imageUrl.startsWith("data:") && (
                      <button 
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setImagePreview(null);
                          setFileName("upload");
                        }}
                        className="text-[10px] text-zinc-400 underline mt-1.5 cursor-pointer block"
                      >
                        Clear local attachment
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Inspiration Title</label>
                    <input
                      id="input-pin-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Swiss Typography grid"
                      className="w-full bg-zinc-950 border border-[#1c1c1c] rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Curation Board</label>
                    <select
                      id="input-pin-board"
                      value={selectedBoardId}
                      onChange={(e) => setSelectedBoardId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-400 focus:outline-none focus:border-zinc-700 transition cursor-pointer"
                    >
                      <option value="">Select board (Optional)</option>
                      {userBoards.map((board) => (
                        <option key={board.id} value={board.id}>{board.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Extra details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Description (Notes)</label>
                  <textarea
                    id="input-pin-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe composition colors, typography grid, website..."
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-200 placeholder-zinc-750 focus:outline-none focus:border-zinc-700 transition h-16 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tags (Comma separated)</label>
                  <input
                    id="input-pin-tags"
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="brutalist, blue, font, abstract"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submit panel */}
              <div className="pt-4 border-t border-zinc-950 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-900 hover:bg-[#121212] transition cursor-pointer text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!imageUrl || !title || isSubmitting || !authToken}
                  className="px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Uploading..." : "Post Inspiration"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "board" && (
            <form onSubmit={handleCreateBoardSubmit} className="space-y-4 py-4 max-w-sm mx-auto text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Folder className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-medium text-white">Create a Curated Board</h3>
                <p className="text-xs text-zinc-500 leading-normal">Construct thematic folders like 'Geometric Prints', 'Swiss Typo', '90s Tech Catalog'.</p>
              </div>

              <div className="pt-2">
                <input
                  id="input-board-name"
                  type="text"
                  required
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Board Name (e.g. brutalist-arch)"
                  className="w-full text-center bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-250 placeholder-zinc-700 focus:outline-none focus:border-zinc-705 transition font-medium"
                />
              </div>

              {boardSuccess && (
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> Board Created successfully!
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-900 hover:bg-zinc-900 text-xs text-zinc-400 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition cursor-pointer"
                >
                  Create Board
                </button>
              </div>
            </form>
          )}

          {activeTab === "pinterest" && (
            <form onSubmit={handlePinterestImportSubmit} className="space-y-4 py-4 max-w-md mx-auto">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600/10 border border-red-500/20 text-red-500">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.372 0 12c.002 4.908 2.946 9.123 7.159 10.957-.1-.912-.19-2.316.039-3.32.208-.916 1.341-5.748 1.341-5.748s-.342-.689-.342-1.706c0-1.6.927-2.793 2.083-2.793.985 0 1.458.739 1.458 1.624 0 .988-.633 2.47-.958 3.843-.271 1.15.578 2.086 1.708 2.086 2.05 0 3.633-2.164 3.633-5.285 0-2.766-1.984-4.697-4.821-4.697-3.284 0-5.213 2.464-5.213 5.011 0 .991.381 2.057.859 2.637a.355.355 0 0 1 .082.342l-.317 1.293c-.052.208-.171.25-.39.15-1.458-.679-2.368-2.808-2.368-4.52 0-3.676 2.67-7.054 7.702-7.054 4.045 0 7.189 2.883 7.189 6.735 0 4.022-2.535 7.258-6.054 7.258-1.182 0-2.293-.615-2.67-1.336L9.67 19.863c-.378 1.45-1.402 3.266-2.086 4.385C8.618 24.646 10.278 25 12 25c6.63 0 12-5.372 12-12C24 5.37 18.63 0 12 0z"/>
                  </svg>
                </div>
                <h3 className="text-md font-medium text-white">Import pins from Pinterest</h3>
                <p className="text-xs text-zinc-500 leading-normal">Analyze and parse layout metadata, high-contrast imagery, and visual structure from public Pinterest links.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">Pinterest Pin or Board link</label>
                  <input
                    id="input-pinterest-url"
                    type="url"
                    required
                    value={pinterestUrl}
                    onChange={(e) => setPinterestUrl(e.target.value)}
                    placeholder="https://pinterest.com/pin/123456789/"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition font-mono"
                  />
                </div>

                {importStatus === "loading" && (
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center gap-2.5 text-xs text-zinc-400">
                    <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                    <span>Analyzing colors and typography structures...</span>
                  </div>
                )}

                {importStatus === "success" && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2.5 text-xs text-green-400 font-medium">
                    <Check className="h-4.5 w-4.5" />
                    <span>Inspirations integrated perfectly!</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-900 hover:bg-zinc-900 text-xs text-zinc-400 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importStatus === "loading" || !pinterestUrl}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-40"
                  >
                    Fetch Board
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
