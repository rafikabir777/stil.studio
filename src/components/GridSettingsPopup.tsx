import { Settings2, Minus, Plus } from "lucide-react";

interface GridSettingsPopupProps {
  gridSize: number; // e.g. column count or width multiplier
  gridPadding: number; // space in px
  onChangeSize: (size: number) => void;
  onChangePadding: (padding: number) => void;
  onClose: () => void;
}

export default function GridSettingsPopup({
  gridSize,
  gridPadding,
  onChangeSize,
  onChangePadding,
  onClose,
}: GridSettingsPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        id="grid-settings-modal"
        className="w-full max-w-sm rounded-[24px] bg-[#1a1a1a] border border-zinc-800 text-zinc-100 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Settings2 className="h-5 w-5 text-zinc-400" />
          <h2 className="text-md font-medium tracking-tight text-white text-center">Customize your grid</h2>
        </div>

        <div className="space-y-6">
          {/* Size Regulator */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400 px-1">
              <span>Grid Columns</span>
              <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded text-white">{gridSize} cols</span>
            </div>
            <div className="flex items-center gap-3">
              <Minus className="h-4.5 w-4.5 text-zinc-600 shrink-0" />
              <input
                id="slider-grid-size"
                type="range"
                min="2"
                max="6"
                step="1"
                value={gridSize}
                onChange={(e) => onChangeSize(Number(e.target.value))}
                className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <Plus className="h-4.5 w-4.5 text-zinc-600 shrink-0" />
            </div>
          </div>

          {/* Padding Regulator */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400 px-1">
              <span>Padding / Gap</span>
              <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded text-white">{gridPadding}px</span>
            </div>
            <div className="flex items-center gap-3">
              <Minus className="h-4.5 w-4.5 text-zinc-600 shrink-0" />
              <input
                id="slider-grid-padding"
                type="range"
                min="0"
                max="40"
                step="4"
                value={gridPadding}
                onChange={(e) => onChangePadding(Number(e.target.value))}
                className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <Plus className="h-4.5 w-4.5 text-zinc-600 shrink-0" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-950 flex justify-end">
          <button
            id="grid-settings-apply"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer transition active:scale-98"
          >
            Apply Layout
          </button>
        </div>
      </div>
    </div>
  );
}
