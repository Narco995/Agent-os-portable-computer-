import React from 'react';
import { format } from 'date-fns';
import { useOSStore, APPS, AppId } from '@/store/os-store';
import { SquareTerminal, Globe, Activity, Cpu, Code, Command, LayoutGrid, MonitorPlay } from 'lucide-react';
import { clsx } from 'clsx';

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'SquareTerminal': return <SquareTerminal size={20} />;
    case 'Globe': return <Globe size={20} />;
    case 'Activity': return <Activity size={20} />;
    case 'Cpu': return <Cpu size={20} />;
    case 'Code': return <Code size={20} />;
    default: return <SquareTerminal size={20} />;
  }
};

export function Taskbar() {
  const [time, setTime] = React.useState(new Date());
  const { windows, openApp, toggleMinimize, activeWindow, agentPanelOpen, computerPanelOpen, toggleAgentPanel, toggleComputerPanel } = useOSStore();

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-14 bg-background/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 z-[9999] relative">
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 hover:scale-105 transition-all glow-border">
          <Command size={22} />
        </button>
        
        <div className="w-px h-8 bg-white/10 mx-2" />
        
        {Object.values(APPS).map((app) => {
          const win = windows[app.id];
          const isActive = activeWindow === app.id;
          const isRunning = win.isOpen;
          
          return (
            <button
              key={app.id}
              onClick={() => {
                if (!isRunning) openApp(app.id);
                else toggleMinimize(app.id);
              }}
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                isActive ? "bg-white/10 text-white" : isRunning ? "bg-white/5 text-gray-400 hover:text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              )}
              title={app.title}
            >
              {getIcon(app.icon)}
              {isRunning && (
                <div className={clsx(
                  "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all",
                  isActive ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : "bg-white/50"
                )} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={toggleAgentPanel}
          className={clsx(
            "px-3 h-10 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all border",
            agentPanelOpen 
              ? "bg-accent/20 text-accent border-accent/50 glow-border-accent" 
              : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
          )}
        >
          <LayoutGrid size={16} />
          <span className="hidden sm:inline">Agent Ctrl</span>
        </button>

        <button 
          onClick={toggleComputerPanel}
          className={clsx(
            "px-3 h-10 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all border",
            computerPanelOpen 
              ? "bg-primary/20 text-primary border-primary/50 glow-border" 
              : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
          )}
        >
          <MonitorPlay size={16} />
          <span className="hidden sm:inline">OS View</span>
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        <div className="px-3 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center font-mono text-sm text-gray-300">
          {format(time, 'HH:mm')}
        </div>
      </div>
    </div>
  );
}
