import { create } from 'zustand';

export type AppId = 'terminal' | 'browser' | 'monitor' | 'router' | 'editor';

export interface AppConfig {
  id: AppId;
  title: string;
  icon: string;
  defaultSize: { width: number; height: number };
}

export const APPS: Record<AppId, AppConfig> = {
  terminal: { id: 'terminal', title: 'Terminal', icon: 'SquareTerminal', defaultSize: { width: 600, height: 400 } },
  browser: { id: 'browser', title: 'Browser', icon: 'Globe', defaultSize: { width: 800, height: 600 } },
  monitor: { id: 'monitor', title: 'System Monitor', icon: 'Activity', defaultSize: { width: 500, height: 350 } },
  router: { id: 'router', title: 'AI Agent Router', icon: 'Cpu', defaultSize: { width: 700, height: 500 } },
  editor: { id: 'editor', title: 'Code Editor', icon: 'Code', defaultSize: { width: 600, height: 500 } },
};

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
  agentPanelOpen: boolean;
  computerPanelOpen: boolean;
  
  openApp: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  toggleMinimize: (id: AppId) => void;
  focusApp: (id: AppId) => void;
  toggleAgentPanel: () => void;
  toggleComputerPanel: () => void;
}

let nextZIndex = 10;

export const useOSStore = create<OSState>((set) => ({
  windows: Object.keys(APPS).reduce((acc, key) => ({
    ...acc,
    [key as AppId]: { id: key as AppId, isOpen: false, isMinimized: false, zIndex: 0, position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 } }
  }), {} as Record<AppId, WindowState>),
  
  activeWindow: null,
  agentPanelOpen: false,
  computerPanelOpen: false,

  openApp: (id) => set((state) => {
    const win = state.windows[id];
    nextZIndex++;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isOpen: true, isMinimized: false, zIndex: nextZIndex }
      },
      activeWindow: id
    };
  }),

  closeApp: (id) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], isOpen: false }
    },
    activeWindow: state.activeWindow === id ? null : state.activeWindow
  })),

  toggleMinimize: (id) => set((state) => {
    const win = state.windows[id];
    const newMinimized = !win.isMinimized;
    if (!newMinimized) nextZIndex++;
    
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isMinimized: newMinimized, zIndex: !newMinimized ? nextZIndex : win.zIndex }
      },
      activeWindow: !newMinimized ? id : (state.activeWindow === id ? null : state.activeWindow)
    };
  }),

  focusApp: (id) => set((state) => {
    if (state.activeWindow === id) return state;
    nextZIndex++;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], zIndex: nextZIndex, isMinimized: false }
      },
      activeWindow: id
    };
  }),

  toggleAgentPanel: () => set(state => ({ agentPanelOpen: !state.agentPanelOpen })),
  toggleComputerPanel: () => set(state => ({ computerPanelOpen: !state.computerPanelOpen })),
}));
