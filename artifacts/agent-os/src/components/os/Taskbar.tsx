import React from 'react';
import { format } from 'date-fns';
import { useOSStore, APPS, AppId } from '@/store/os-store';
import {
  SquareTerminal, Globe, Activity, Cpu, Code, Command,
  LayoutGrid, MonitorPlay, Bot, FolderOpen, Terminal, Brain,
} from 'lucide-react';
import { clsx } from 'clsx';

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'SquareTerminal': return <SquareTerminal size={18} />;
    case 'Globe':          return <Globe size={18} />;
    case 'Activity':       return <Activity size={18} />;
    case 'Cpu':            return <Cpu size={18} />;
    case 'Code':           return <Code size={18} />;
    case 'Bot':            return <Bot size={18} />;
    case 'FolderOpen':     return <FolderOpen size={18} />;
    case 'Terminal':       return <Terminal size={18} />;
    case 'Brain':          return <Brain size={18} />;
    default:               return <SquareTerminal size={18} />;
  }
};

export function Taskbar() {
  const [time, setTime] = React.useState(new Date());
  const {
    windows, openApp, toggleMinimize, activeWindow,
    agentPanelOpen, computerPanelOpen, toggleAgentPanel, toggleComputerPanel,
  } = useOSStore();

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-14 bg-background/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-3 z-[9999] relative overflow-x-auto">
      <div className="flex items-center gap-1 shrink-0">
        <button className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 hover:scale-105 transition-all glow-border mr-1">
          <Command size={18} />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

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
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group",
                isActive
                  ? 'bg-white/10 text-white'
                  : isRunning
                    ? 'bg-white/5 text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300',
              )}
              title={app.title}
            >
              {getIcon(app.icon)}
              {isRunning && (
                <div className={clsx(
                  'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all',
                  isActive ? 'bg-primary shadow-[0_0_6px_var(--color-primary)]' : 'bg-white/50',
                )} />
              )}
              {/* tooltip */}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {app.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleAgentPanel}
          className={clsx(
            'px-2 h-9 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border',
            agentPanelOpen
              ? 'bg-accent/20 text-accent border-accent/50 glow-border-accent'
              : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white',
          )}
        >
          <LayoutGrid size={14} />
          <span className="hidden md:inline">Agent Ctrl</span>
        </button>

        <button
          onClick={toggleComputerPanel}
          className={clsx(
            'px-2 h-9 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all border',
            computerPanelOpen
              ? 'bg-primary/20 text-primary border-primary/50 glow-border'
              : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white',
          )}
        >
          <MonitorPlay size={14} />
          <span className="hidden md:inline">OS View</span>
        </button>

        <div className="w-px h-8 bg-white/10" />

        <div className="px-2 h-9 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center font-mono text-sm text-gray-300 tabular-nums">
          {format(time, 'HH:mm:ss')}
        </div>
      </div>
    </div>
  );
}
