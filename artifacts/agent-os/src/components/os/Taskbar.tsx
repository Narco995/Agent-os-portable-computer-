import React from 'react';
import {
  SquareTerminal, Globe, Activity, Cpu, Code,
  Bot, FolderOpen, Terminal, Brain, ListChecks,
  Zap, FlaskConical, PanelRight, Monitor
} from 'lucide-react';
import { useOSStore, AppId, APPS } from '@/store/os-store';

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

export function Taskbar() {
  const { windows, openApp, focusApp, toggleMinimize, agentPanelOpen, computerPanelOpen, toggleAgentPanel, toggleComputerPanel, engineConnected, totalCost } = useOSStore();

  const openWindows = (Object.values(windows) as any[]).filter((w) => w.isOpen);

  return (
    <div
      className="relative z-50 h-14 flex items-center px-3 gap-2 border-t shrink-0"
      style={{
        background: 'rgba(5,5,16,0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(0,212,255,0.12)',
      }}
    >
      {/* OS Logo */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg mr-1 shrink-0"
        style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}
      >
        <Monitor size={14} style={{ color: 'var(--neon-cyan)' }} />
        <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--neon-cyan)' }}>AGENT·OS</span>
        <span className="text-[8px] font-mono" style={{ color: 'rgba(0,212,255,0.4)' }}>v2</span>
      </div>

      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
        {openWindows.length === 0 && (
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Double-click desktop icons to open apps
          </span>
        )}
        {openWindows.map((w) => {
          const Icon = APP_ICONS[w.id] ?? Code;
          const app = APPS[w.id as AppId];
          const badge = app?.badge;
          return (
            <button
              key={w.id}
              onClick={() => {
                if (w.isMinimized) {
                  focusApp(w.id);
                } else {
                  toggleMinimize(w.id);
                }
              }}
              onDoubleClick={() => openApp(w.id)}
              title={app?.title}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all shrink-0 relative"
              style={{
                background: w.isMinimized ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.1)',
                border: `1px solid ${w.isMinimized ? 'rgba(255,255,255,0.08)' : 'rgba(0,212,255,0.25)'}`,
                color: w.isMinimized ? 'rgba(255,255,255,0.4)' : 'var(--neon-cyan)',
                maxWidth: '130px',
              }}
            >
              <Icon size={12} />
              <span className="text-[10px] font-medium truncate">{app?.title}</span>
              {badge && (
                <span
                  className="text-[7px] px-1 rounded font-bold leading-none"
                  style={{ background: badge === 'NEW' ? 'rgba(0,255,136,0.2)' : 'rgba(0,212,255,0.2)', color: badge === 'NEW' ? 'rgba(0,255,136,0.9)' : 'var(--neon-cyan)' }}
                >
                  {badge}
                </span>
              )}
              {/* Active indicator dot */}
              {!w.isMinimized && (
                <div
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--neon-cyan)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right side: cost, panels */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Session cost */}
        <div
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded"
          style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)' }}
        >
          <span className="text-[8px] font-mono" style={{ color: 'rgba(0,255,136,0.5)' }}>$</span>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(0,255,136,0.7)' }}>
            {totalCost.toFixed(4)}
          </span>
        </div>

        {/* Engine dot */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: engineConnected ? 'var(--neon-green)' : 'rgba(255,165,0,0.8)',
              boxShadow: `0 0 4px ${engineConnected ? 'var(--neon-green)' : 'rgba(255,165,0,0.8)'}`,
            }}
          />
          <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {engineConnected ? 'API' : 'OFF'}
          </span>
        </div>

        {/* Panel toggles */}
        <button
          onClick={toggleComputerPanel}
          className="p-2 rounded-lg transition-all"
          title="Computer Use Panel"
          style={{
            background: computerPanelOpen ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${computerPanelOpen ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: computerPanelOpen ? 'rgba(168,85,247,0.9)' : 'rgba(255,255,255,0.4)',
          }}
        >
          <Monitor size={14} />
        </button>

        <button
          onClick={toggleAgentPanel}
          className="p-2 rounded-lg transition-all"
          title="Agent Control Panel"
          style={{
            background: agentPanelOpen ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${agentPanelOpen ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: agentPanelOpen ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.4)',
          }}
        >
          <PanelRight size={14} />
        </button>
      </div>
    </div>
  );
}
