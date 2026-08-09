import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, RefreshCw, UserMinus, Camera, X } from "lucide-react";

export default function PlayerContextMenu({ player, slotCode, position, onClose, onAction }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!player) return null;

  const radius = 70; // Distance from center
  const actions = [
    { id: 'stats', icon: BarChart2, label: 'Stats', color: 'text-brand-400', bgHover: 'hover:bg-brand-500/20', borderHover: 'hover:border-brand-500/50' },
    { id: 'photo', icon: Camera, label: 'Change Photo', color: 'text-cyan-400', bgHover: 'hover:bg-cyan-500/20', borderHover: 'hover:border-cyan-500/50' },
    { id: 'swap', icon: RefreshCw, label: 'Swap', color: 'text-amber-400', bgHover: 'hover:bg-amber-500/20', borderHover: 'hover:border-amber-500/50' },
    { id: 'remove', icon: UserMinus, label: 'Remove', color: 'text-pulse-red', bgHover: 'hover:bg-pulse-red/20', borderHover: 'hover:border-pulse-red/50' }
  ];

  // Calculate positions: distribute evenly around a semi-circle or full circle
  // We'll place them at angles: -90 (top), -30 (top right), -150 (top left)
  // Or simply evenly spaced.
  const angleStep = 360 / actions.length;

  return (
    <AnimatePresence>
      <div 
        className="fixed z-50 flex items-center justify-center pointer-events-none"
        style={{ left: position.x, top: position.y }}
      >
        <div ref={menuRef} className="relative pointer-events-auto">
          {/* Center closing button */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onClose}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-pitch-900 border border-pitch-700 rounded-full flex items-center justify-center text-pitch-300 hover:text-white shadow-xl z-20 transition-colors"
          >
            <X size={16} />
          </motion.button>
          
          {/* Radial Buttons */}
          {actions.map((action, index) => {
            const angle = (index * angleStep - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const Icon = action.icon;
            
            return (
              <motion.button
                key={action.id}
                onClick={() => { onAction(action.id); onClose(); }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                animate={{ x, y, opacity: 1, scale: 1 }}
                exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-pitch-950/95 backdrop-blur-md border border-pitch-700 shadow-lg rounded-full flex items-center justify-center ${action.color} ${action.bgHover} ${action.borderHover} transition-colors group z-10`}
                title={action.label}
              >
                <Icon size={18} />
                <span className="absolute -bottom-6 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-pitch-900 px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </AnimatePresence>
  );
}
