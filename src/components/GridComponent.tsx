import { MouseEvent } from "react";
import { Pin, Creator, Board } from "../types";
import { FolderPlus, Heart } from "lucide-react";

interface GridComponentProps {
  pins: Pin[];
  creators: Creator[];
  boards: Board[];
  gridSize: number;
  gridPadding: number;
  currentUser: Creator | null;
  onPinClick: (pin: Pin) => void;
  onCreatorClick: (creatorId: string) => void;
  onSavePinClick: (pinnedPin: Pin, e: MouseEvent) => void;
  savedPinIds: string[]; // Pin IDs that the current user has saved
}

export default function GridComponent({
  pins,
  creators,
  gridSize,
  gridPadding,
  onPinClick,
  onCreatorClick,
  onSavePinClick,
  savedPinIds,
}: GridComponentProps) {
  
  // Distribute pins across columns for high-fidelity Masonry layout
  const getColumns = () => {
    const columns: Pin[][] = Array.from({ length: gridSize }, () => []);
    pins.forEach((pin, index) => {
      columns[index % gridSize].push(pin);
    });
    return columns;
  };

  const columns = getColumns();

  const getCreatorForPin = (pin: Pin) => {
    return creators.find((c) => c.id === pin.creatorId) || creators.find(c => c.id === "derrick_lee")!;
  };

  return (
    <div 
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gap: `${gridPadding}px`,
      }}
    >
      {columns.map((columnPins, colIndex) => (
        <div key={colIndex} className="flex flex-col" style={{ gap: `${gridPadding}px` }}>
          {columnPins.map((pin) => {
            const pinCreator = getCreatorForPin(pin);
            const isSavedByMe = savedPinIds.includes(pin.id);

            return (
              <div
                key={pin.id}
                id={`pin-card-${pin.id}`}
                className="group relative overflow-hidden rounded-xl bg-zinc-950 border border-zinc-900 transition-all duration-300 hover:shadow-xl cursor-zoom-in"
                onClick={() => onPinClick(pin)}
              >
                {/* Save Icon indicator (Tick in corner as seen in screenshots) */}
                {isSavedByMe && (
                  <div className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Main image */}
                <img
                  src={pin.imageUrl}
                  alt={pin.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {/* Dark Hover Overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4 z-5">
                  
                  {/* Top line of overlay */}
                  <div className="flex justify-end">
                    <button
                      id={`save-btn-${pin.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSavePinClick(pin, e);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition active:scale-95 ${
                        isSavedByMe 
                          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" 
                          : "bg-white text-zinc-950 hover:bg-zinc-100"
                      }`}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      {isSavedByMe ? "Saved" : "Save"}
                    </button>
                  </div>

                  {/* Bottom line: Title and Profile clickable info */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium leading-snug text-white line-clamp-2">
                      {pin.title}
                    </h3>
                    
                    <div 
                      className="flex items-center gap-2 cursor-pointer pt-1 border-t border-zinc-800/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreatorClick(pinCreator.id);
                      }}
                    >
                      <img
                        src={pinCreator.avatar}
                        alt={pinCreator.name}
                        referrerPolicy="no-referrer"
                        className="h-5.5 w-5.5 rounded-full object-cover border border-zinc-800"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200 hover:underline">
                          {pinCreator.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          @{pinCreator.username}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
