import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const buttonStyle =
    variant === "danger"
      ? "bg-pulse-red hover:bg-red-600 text-white font-bold"
      : variant === "warning"
      ? "bg-amber-500 hover:bg-amber-600 text-black font-bold"
      : "bg-brand-500 hover:bg-brand-400 text-pitch-950 font-bold";

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-pitch-900 border border-pitch-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pitch-800 bg-pitch-950/60">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-pulse-red' : 'text-amber-400'}`} />
            <h3 className="font-display font-bold text-base uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-pitch-400 hover:text-white p-1 rounded-lg bg-pitch-800/50 hover:bg-pitch-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-sm text-pitch-300 leading-relaxed">
          {message}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-pitch-800 bg-pitch-950/40">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-pitch-300 hover:text-white hover:bg-pitch-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${buttonStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
