import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square } from 'lucide-react';
import { useOSStore, AppId, APPS } from '@/store/os-store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WindowProps {
  id: AppId;
  children: React.ReactNode;
}

export function Window({ id, children }: WindowProps) {
  const { windows, closeApp, toggleMinimize, focusApp, activeWindow } = useOSStore();
  const win = windows[id];
  const config = APPS[id];
  const constraintsRef = useRef(null);

  if (!win.isOpen || win.isMinimized) return null;

  const isActive = activeWindow === id;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragHandle=".window-header"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      onMouseDown={() => focusApp(id)}
      style={{ 
        zIndex: win.zIndex,
        width: config.defaultSize.width,
        height: config.defaultSize.height,
        position: 'absolute',
        top: win.position.y,
        left: win.position.x
      }}
      className={cn(
        "flex flex-col bg-background/95 backdrop-blur-xl rounded-lg overflow-hidden border",
        isActive ? "border-primary shadow-[0_0_20px_rgba(0,212,255,0.15)]" : "border-white/10 shadow-xl",
        "transition-shadow duration-200"
      )}
    >
      <div 
        className={cn(
          "window-header flex items-center justify-between px-4 py-2 cursor-move border-b",
          isActive ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse" />
          <span className={cn("font-display text-sm tracking-wider", isActive ? "text-primary glow-text" : "text-muted-foreground")}>
            {config.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMinimize(id); }}
            className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors"
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); closeApp(id); }}
            className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative" onPointerDownCapture={(e) => e.stopPropagation()}>
        {children}
      </div>
    </motion.div>
  );
}
