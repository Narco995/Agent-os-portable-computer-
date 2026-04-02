import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Camera } from 'lucide-react';
import { useOSStore } from '@/store/os-store';
import { useGetScreenshot } from '@workspace/api-client-react';

export function ComputerUsePanel() {
  const { computerPanelOpen, toggleComputerPanel } = useOSStore();
  const { data: screenshot, refetch, isFetching } = useGetScreenshot({
    query: { queryKey: ['/api/system/screenshot'], refetchInterval: 5000, enabled: computerPanelOpen }
  });

  return (
    <AnimatePresence>
      {computerPanelOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute left-0 top-0 bottom-14 w-[450px] bg-background/95 backdrop-blur-2xl border-r border-white/10 z-[5000] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-display text-primary font-semibold flex items-center gap-2">
              <Camera size={20} />
              Computer Vision
            </h2>
            <button onClick={toggleComputerPanel} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white">Live Feed</h3>
              <button 
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-foreground hover:bg-primary px-2 py-1 rounded transition-colors"
              >
                <RefreshCcw size={12} className={isFetching ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            
            <div className="aspect-video bg-black rounded-xl border border-white/10 overflow-hidden relative group">
              {screenshot?.dataUrl ? (
                <img src={screenshot.dataUrl} alt="OS Screen" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2">
                  <Camera size={32} className="opacity-50" />
                  <span className="text-sm">No Signal</span>
                </div>
              )}
              
              {/* Overlay Grid for targeting */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-3">Vision Metadata</h3>
              <div className="bg-black/50 rounded-lg p-3 border border-white/5 font-mono text-xs text-gray-400 space-y-2">
                <div className="flex justify-between"><span>Resolution:</span> <span className="text-white">{screenshot?.width || 1920}x{screenshot?.height || 1080}</span></div>
                <div className="flex justify-between"><span>Format:</span> <span className="text-white">image/jpeg</span></div>
                <div className="flex justify-between"><span>Last Sync:</span> <span className="text-white">{screenshot?.timestamp ? new Date(screenshot.timestamp).toLocaleTimeString() : 'N/A'}</span></div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-3">Task Queue</h3>
              <div className="bg-white/5 rounded-lg border border-white/10 p-4 text-center text-sm text-gray-500">
                No active tasks. Use the Agent API to dispatch complex workflows.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
