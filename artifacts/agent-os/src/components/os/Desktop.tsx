import React, { useEffect } from 'react';
import { useOSStore, APPS } from '@/store/os-store';
import { Taskbar } from './Taskbar';
import { Window } from './Window';
import { TerminalApp } from '../apps/TerminalApp';
import { HardwareMonitorApp } from '../apps/HardwareMonitorApp';
import { RouterApp } from '../apps/RouterApp';
import { BrowserApp } from '../apps/BrowserApp';
import { EditorApp } from '../apps/EditorApp';
import { AIChatApp } from '../apps/AIChatApp';
import { FileManagerApp } from '../apps/FileManagerApp';
import { CodeIDEApp } from '../apps/CodeIDEApp';
import { MemoryApp } from '../apps/MemoryApp';
import { TasksApp } from '../apps/TasksApp';
import { LLMRouterApp } from '../apps/LLMRouterApp';
import { AgentForgeApp } from '../apps/AgentForgeApp';
import { AgentControlPanel } from '../panels/AgentControlPanel';
import { ComputerUsePanel } from '../panels/ComputerUsePanel';
import { useEnginePoller } from '@/hooks/use-engine';
import {
  SquareTerminal, Globe, Activity, Cpu, Code,
  Bot, FolderOpen, Terminal, Brain, ListChecks,
  Zap, FlaskConical,
} from 'lucide-react';

const APP_ICONS: Record<string, React.ElementType> = {
  terminal:    SquareTerminal,
  browser:     Globe,
  monitor:     Activity,
  router:      Cpu,
  editor:      Code,
  aichat:      Bot,
  filemanager: FolderOpen,
  codeide:     Terminal,
  memory:      Brain,
  tasks:       ListChecks,
  llmrouter:   Zap,
  agentforge:  FlaskConical,
};

function DesktopIcon({ id, label, badge }: { id: any; label: string; badge?: string }) {
  const { openApp } = useOSStore();
  const Icon = APP_ICONS[id] ?? Code;
  return (
    <button
      onDoubleClick={() => openApp(id)}
      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/10 transition-colors group w-24 relative"
    >
      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-primary group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all relative">
        <Icon size={24} />
        {badge && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[7px] px-1 py-0.5 rounded font-bold leading-none"
            style={{ background: badge === 'NEW' ? 'rgba(0,255,136,0.9)' : 'rgba(0,212,255,0.9)', color: '#000' }}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs text-white font-medium text-center shadow-black drop-shadow-md">
        {label}
      </span>
    </button>
  );
}

// Engine status dot in top-right corner
function EngineStatus() {
  const { engineConnected } = useOSStore();
  return (
    <div
      className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: 'rgba(0,0,0,0.5)',
        border: `1px solid ${engineConnected ? 'rgba(0,255,136,0.2)' : 'rgba(255,165,0,0.2)'}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: engineConnected ? 'var(--neon-green)' : 'rgba(255,165,0,0.8)',
          boxShadow: `0 0 5px ${engineConnected ? 'var(--neon-green)' : 'rgba(255,165,0,0.8)'}`,
          animation: engineConnected ? 'pulse 2s infinite' : 'none',
        }}
      />
      <span className="text-[9px] font-mono" style={{ color: engineConnected ? 'rgba(0,255,136,0.7)' : 'rgba(255,165,0,0.7)' }}>
        {engineConnected ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}
      </span>
    </div>
  );
}

export function Desktop() {
  // Start engine health polling
  useEnginePoller();

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex flex-col text-foreground select-none">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyberpunk-bg.png)` }}
      />

      {/* CRT Effects */}
      <div className="absolute inset-0 z-[1] crt-overlay" />
      <div className="absolute inset-0 z-[1] scanline" />

      {/* Engine status */}
      <EngineStatus />

      {/* Desktop Icons */}
      <div className="flex-1 relative z-10 p-6 flex flex-col flex-wrap content-start gap-2">
        <DesktopIcon id="terminal"    label="Terminal" />
        <DesktopIcon id="browser"     label="Browser" />
        <DesktopIcon id="monitor"     label="Sys Monitor" />
        <DesktopIcon id="router"      label="AI Router" />
        <DesktopIcon id="editor"      label="Editor" />
        <DesktopIcon id="aichat"      label="AI Chat" />
        <DesktopIcon id="filemanager" label="Files" />
        <DesktopIcon id="codeide"     label="Code IDE" />
        <DesktopIcon id="memory"      label="Memory" />
        <DesktopIcon id="tasks"       label="Task Forge" />
        <DesktopIcon id="llmrouter"   label="LLM Router" badge="v2" />
        <DesktopIcon id="agentforge"  label="Agent Forge" badge="NEW" />
      </div>

      {/* Windows */}
      <div className="absolute inset-0 z-20 pointer-events-none *:pointer-events-auto">
        <Window id="terminal"><TerminalApp /></Window>
        <Window id="monitor"><HardwareMonitorApp /></Window>
        <Window id="router"><RouterApp /></Window>
        <Window id="browser"><BrowserApp /></Window>
        <Window id="editor"><EditorApp /></Window>
        <Window id="aichat"><AIChatApp /></Window>
        <Window id="filemanager"><FileManagerApp /></Window>
        <Window id="codeide"><CodeIDEApp /></Window>
        <Window id="memory"><MemoryApp /></Window>
        <Window id="tasks"><TasksApp /></Window>
        <Window id="llmrouter"><LLMRouterApp /></Window>
        <Window id="agentforge"><AgentForgeApp /></Window>
      </div>

      {/* Side Panels */}
      <AgentControlPanel />
      <ComputerUsePanel />

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}
