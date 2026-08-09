import React, { useState } from "react";
import { CirclePlus, X, Palette } from "lucide-react";

export default function AddColorModal({ isOpen, onClose, onAddColor }) {
  const [selectedColor, setSelectedColor] = useState("#4ade80");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedColor) {
      onAddColor(selectedColor);
      onClose();
    }
  };

  const presetSuggestions = [
    "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
    "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#ffffff"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-pitch-900 border border-brand-500/40 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pitch-800 bg-pitch-950/60">
          <div className="flex items-center gap-2 text-white">
            <Palette className="h-5 w-5 text-brand-400" />
            <h3 className="font-display font-bold text-base uppercase tracking-wide">
              Pick a Colour
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-pitch-400 hover:text-white p-1 rounded-lg bg-pitch-800/50 hover:bg-pitch-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2 items-center">
            <label className="text-xs uppercase tracking-wider font-bold text-pitch-400">
              Colour Picker
            </label>
            <div className="flex items-center gap-3 w-full justify-center bg-pitch-950 p-4 rounded-xl border border-pitch-700">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16 h-16 rounded-xl border-2 border-white/20 cursor-pointer bg-transparent"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-mono uppercase text-white font-bold">{selectedColor}</span>
                <span className="text-[10px] text-pitch-400">Click circle to pick custom shade</span>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-pitch-500 tracking-wider">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {presetSuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full border transition-all ${
                    selectedColor === c ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="mt-2 w-full bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg"
          >
            <CirclePlus className="h-4 w-4" />
            Add Colour
          </button>
        </form>
      </div>
    </div>
  );
}
