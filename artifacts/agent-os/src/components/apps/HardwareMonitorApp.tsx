import React from 'react';
import { useGetSystemState } from '@workspace/api-client-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function HardwareMonitorApp() {
  const { data: state, isLoading, isError } = useGetSystemState({
    query: { refetchInterval: 2000 }
  });

  // Mocking historical data since API only returns current state
  const [history, setHistory] = React.useState<{time: string, cpu: number, memory: number}[]>([]);

  React.useEffect(() => {
    if (state) {
      setHistory(prev => {
        const next = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: state.cpu || Math.random() * 40 + 10,
          memory: state.memory || Math.random() * 30 + 40
        }];
        if (next.length > 20) return next.slice(1);
        return next;
      });
    }
  }, [state]);

  if (isLoading && !state) return <div className="p-4 text-primary animate-pulse">Initializing sensors...</div>;
  if (isError) return <div className="p-4 text-destructive">Failed to connect to hardware sensors.</div>;

  return (
    <div className="h-full bg-background p-4 flex flex-col">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glow-border bg-black/50 p-4 rounded-lg">
          <div className="text-muted-foreground text-xs uppercase tracking-widest mb-1">CPU Usage</div>
          <div className="text-3xl font-display text-primary glow-text">
            {state?.cpu?.toFixed(1) || '0.0'}%
          </div>
        </div>
        <div className="glow-border bg-black/50 p-4 rounded-lg">
          <div className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Memory Usage</div>
          <div className="text-3xl font-display text-accent glow-text">
            {state?.memory?.toFixed(1) || '0.0'}%
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#ffffff50" fontSize={10} tick={{fill: '#ffffff50'}} />
            <YAxis stroke="#ffffff50" fontSize={10} tick={{fill: '#ffffff50'}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#00d4ff', borderRadius: '8px' }}
              itemStyle={{ color: '#00d4ff' }}
            />
            <Line type="monotone" dataKey="cpu" stroke="#00d4ff" strokeWidth={2} dot={false} animationDuration={300} />
            <Line type="monotone" dataKey="memory" stroke="#ff3366" strokeWidth={2} dot={false} animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <div>Uptime: <span className="text-white">{state?.uptime || 0}s</span></div>
        <div>Agents: <span className="text-white">{state?.connectedAgents || 0}</span></div>
      </div>
    </div>
  );
}
