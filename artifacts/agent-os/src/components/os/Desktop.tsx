import React from 'react';
import { useOSStore, APPS } from '@/store/os-store';
import { Taskbar } from './Taskbar';
import { Window } from './Window';
import { TerminalApp } from '../apps/TerminalApp';
import { HardwareMonitorApp } from '../apps/HardwareMonitorApp';
import { RouterApp } from '../apps/RouterApp';
import { BrowserApp } from '../apps/BrowserApp';
import { EditorApp } from '../apps/EditorApp';
import { AgentControlPanel } from '../panels/AgentControlPanel';
import { ComputerUsePanel } from '../panels/ComputerUsePanel';
import { SquareTerminal, Globe, Activity, Cpu, Code } from 'lucide-react';

const DesktopIcon = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => {
  const { openApp } = useOSStore();
  return (
    <button 
      onDoubleClick={() => openApp(id)}
      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors group w-24"
    >
      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-primary group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all">
        <Icon size={24} />
      </div>
      <span className="text-xs text-white font-medium text-center shadow-black drop-shadow-md">
        {label}
      </span>
    </button>
  );
};

export function Desktop() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex flex-col text-foreground select-none">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyberpunk-bg.png)` }}
      />
      
      {/* Cyberpunk CRT Effects */}
      <div className="absolute inset-0 z-[1] crt-overlay" />
      <div className="absolute inset-0 z-[1] scanline" />

      {/* Desktop Area */}
      <div className="flex-1 relative z-10 p-6 flex flex-col flex-wrap content-start gap-2">
        <DesktopIcon id="terminal" label="Terminal" icon={SquareTerminal} />
        <DesktopIcon id="browser" label="Browser" icon={Globe} />
        <DesktopIcon id="monitor" label="Sys Monitor" icon={Activity} />
        <DesktopIcon id="router" label="AI Router" icon={Cpu} />
        <DesktopIcon id="editor" label="Editor" icon={Code} />
      </div>

      {/* Windows */}
      <div className="absolute inset-0 z-20 pointer-events-none *:pointer-events-auto">
        <Window id="terminal"><TerminalApp /></Window>
        <Window id="monitor"><HardwareMonitorApp /></Window>
        <Window id="router"><RouterApp /></Window>
        <Window id="browser"><BrowserApp /></Window>
        <Window id="editor"><EditorApp /></Window>
      </div>

      {/* Side Panels */}
      <AgentControlPanel />
      <ComputerUsePanel />

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}
