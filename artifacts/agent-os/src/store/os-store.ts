import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type AppId =
  | 'terminal' | 'browser' | 'monitor' | 'router' | 'editor'
  | 'aichat' | 'filemanager' | 'codeide' | 'memory' | 'tasks'
  | 'llmrouter' | 'agentforge';

export interface AppConfig {
  id: AppId;
  title: string;
  icon: string;
  defaultSize: { width: number; height: number };
  badge?: string;
}

export const APPS: Record<AppId, AppConfig> = {
  terminal:    { id: 'terminal',    title: 'Terminal',      icon: 'SquareTerminal', defaultSize: { width: 600, height: 400 } },
  browser:     { id: 'browser',     title: 'Browser',       icon: 'Globe',          defaultSize: { width: 800, height: 600 } },
  monitor:     { id: 'monitor',     title: 'Sys Monitor',   icon: 'Activity',       defaultSize: { width: 540, height: 480 } },
  router:      { id: 'router',      title: 'AI Router',     icon: 'Cpu',            defaultSize: { width: 700, height: 520 } },
  editor:      { id: 'editor',      title: 'Code Editor',   icon: 'Code',           defaultSize: { width: 600, height: 500 } },
  aichat:      { id: 'aichat',      title: 'AI Chat',       icon: 'Bot',            defaultSize: { width: 700, height: 550 } },
  filemanager: { id: 'filemanager', title: 'File Manager',  icon: 'FolderOpen',     defaultSize: { width: 720, height: 480 } },
  codeide:     { id: 'codeide',     title: 'Code IDE',      icon: 'Terminal',       defaultSize: { width: 750, height: 550 } },
  memory:      { id: 'memory',      title: 'Memory Vault',  icon: 'Brain',          defaultSize: { width: 680, height: 500 } },
  tasks:       { id: 'tasks',       title: 'Task Forge',    icon: 'ListChecks',     defaultSize: { width: 720, height: 520 } },
  llmrouter:   { id: 'llmrouter',   title: 'LLM Router',    icon: 'Zap',            defaultSize: { width: 760, height: 560 }, badge: 'v2' },
  agentforge:  { id: 'agentforge',  title: 'Agent Forge',   icon: 'FlaskConical',   defaultSize: { width: 800, height: 580 }, badge: 'NEW' },
};

export interface LLMProvider {
  name: string;
  model: string;
  priority: number;
  circuit_open: boolean;
  failure_count: number;
  cost_input_per_1m: number;
  cost_output_per_1m: number;
}

export const DEFAULT_PROVIDERS: LLMProvider[] = [
  { name: 'claude',  model: 'anthropic/claude-3.5-sonnet', priority: 100, circuit_open: false, failure_count: 0, cost_input_per_1m: 3.0,  cost_output_per_1m: 15.0 },
  { name: 'mistral', model: 'mistralai/mistral-large',     priority: 90,  circuit_open: false, failure_count: 0, cost_input_per_1m: 2.0,  cost_output_per_1m: 6.0  },
  { name: 'groq',    model: 'groq/llama-3.3-70b',          priority: 70,  circuit_open: false, failure_count: 0, cost_input_per_1m: 0.0,  cost_output_per_1m: 0.0  },
];

export interface AgentRun {
  id: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reasoningSteps: string[];
  toolsCalled: { tool: string; query?: string }[];
  finalAnswer: string;
  provider: string;
  tokensUsed: number;
  cost: number;
  startedAt: string;
  completedAt?: string;
}

interface WindowState {
  id: AppId;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  position: { x: number; y: number };
}

interface OSState {
  windows: Record<AppId, WindowState>;
  activeWindow: AppId | null;
  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  toggleMinimize: (id: AppId) => void;
  focusApp: (id: AppId) => void;

  agentPanelOpen: boolean;
  computerPanelOpen: boolean;
  toggleAgentPanel: () => void;
  toggleComputerPanel: () => void;

  providers: LLMProvider[];
  activeProvider: string;
  setProviders: (p: LLMProvider[]) => void;
  setActiveProvider: (name: string) => void;

  agentRuns: AgentRun[];
  activeRunId: string | null;
  addAgentRun: (run: AgentRun) => void;
  updateAgentRun: (id: string, partial: Partial<AgentRun>) => void;
  setActiveRun: (id: string | null) => void;

  engineConnected: boolean;
  engineUrl: string;
  setEngineConnected: (v: boolean) => void;
  setEngineUrl: (url: string) => void;

  totalCost: number;
  addCost: (c: number) => void;
}

let nextZIndex = 10;

export const useOSStore = create<OSState>()(
  devtools(
    (set) => ({
      windows: Object.keys(APPS).reduce((acc, key) => ({
        ...acc,
        [key as AppId]: {
          id: key as AppId,
          isOpen: false,
          isMinimized: false,
          zIndex: 0,
          position: { x: 80 + Math.random() * 120, y: 60 + Math.random() * 80 },
        },
      }), {} as Record<AppId, WindowState>),

      activeWindow: null,

      openApp: (id) => set((s) => {
        const win = s.windows[id];
        if (win.isOpen && !win.isMinimized) {
          return { windows: { ...s.windows, [id]: { ...win, zIndex: ++nextZIndex } }, activeWindow: id };
        }
        return {
          windows: { ...s.windows, [id]: { ...win, isOpen: true, isMinimized: false, zIndex: ++nextZIndex } },
          activeWindow: id,
        };
      }),

      closeApp: (id) => set((s) => ({
        windows: { ...s.windows, [id]: { ...s.windows[id], isOpen: false } },
        activeWindow: s.activeWindow === id ? null : s.activeWindow,
      })),

      toggleMinimize: (id) => set((s) => ({
        windows: { ...s.windows, [id]: { ...s.windows[id], isMinimized: !s.windows[id].isMinimized } },
      })),

      focusApp: (id) => set((s) => ({
        windows: { ...s.windows, [id]: { ...s.windows[id], zIndex: ++nextZIndex } },
        activeWindow: id,
      })),

      agentPanelOpen: false,
      computerPanelOpen: false,
      toggleAgentPanel: () => set((s) => ({ agentPanelOpen: !s.agentPanelOpen })),
      toggleComputerPanel: () => set((s) => ({ computerPanelOpen: !s.computerPanelOpen })),

      providers: DEFAULT_PROVIDERS,
      activeProvider: 'claude',
      setProviders: (providers) => set({ providers }),
      setActiveProvider: (name) => set({ activeProvider: name }),

      agentRuns: [],
      activeRunId: null,
      addAgentRun: (run) => set((s) => ({ agentRuns: [run, ...s.agentRuns].slice(0, 50) })),
      updateAgentRun: (id, partial) => set((s) => ({
        agentRuns: s.agentRuns.map((r) => r.id === id ? { ...r, ...partial } : r),
      })),
      setActiveRun: (id) => set({ activeRunId: id }),

      engineConnected: false,
      engineUrl: 'http://localhost:8000',
      setEngineConnected: (v) => set({ engineConnected: v }),
      setEngineUrl: (url) => set({ engineUrl: url }),

      totalCost: 0,
      addCost: (c) => set((s) => ({ totalCost: s.totalCost + c })),
    }),
    { name: 'agent-os-store' }
  )
);
