import React, { useEffect } from 'react';
import { Desktop } from '@/components/os/Desktop';
import { useWebSocket } from '@/hooks/use-websocket';

export default function Home() {
  const { isConnected } = useWebSocket();

  // Simple boot sequence state
  const [booting, setBooting] = React.useState(true);
  const [logs, setLogs] = React.useState<string[]>([]);

  useEffect(() => {
    const sequence = [
      "INITIALIZING CORE SYSTEM...",
      "LOADING KERNEL MODULES... OK",
      "MOUNTING VIRTUAL FILESYSTEM... OK",
      "ESTABLISHING NEURAL LINK...",
      "AGENT ROUTER DAEMON STARTED",
      "STARTING UI SERVER..."
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setLogs(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBooting(false), 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (booting) {
    return (
      <div className="h-screen w-screen bg-black text-primary font-mono p-8 flex flex-col justify-end pb-24">
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-2">{log}</div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Desktop />
      
      {/* WS Status Indicator (Global overlay) */}
      <div className="absolute top-4 right-4 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/10 text-xs font-mono">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success shadow-[0_0_8px_var(--color-success)]' : 'bg-destructive shadow-[0_0_8px_var(--color-destructive)]'}`} />
        <span className={isConnected ? 'text-success' : 'text-destructive'}>
          {isConnected ? 'WS_LINK: ONLINE' : 'WS_LINK: OFFLINE'}
        </span>
      </div>
    </>
  );
}
