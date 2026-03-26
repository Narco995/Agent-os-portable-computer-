import React from 'react';
import { useListAgents, useUnregisterAgent } from '@workspace/api-client-react';
import { Trash2, Activity, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function RouterApp() {
  const { data: agents, isLoading } = useListAgents({ query: { refetchInterval: 5000 } });
  const { mutate: unregister } = useUnregisterAgent();
  const queryClient = useQueryClient();

  const handleUnregister = (id: string) => {
    unregister({ agentId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      }
    });
  };

  if (isLoading) return <div className="p-6 text-primary animate-pulse font-mono">Scanning for connected agents...</div>;

  return (
    <div className="h-full bg-background p-6 flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-end pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-display text-white mb-1">Agent Router Network</h2>
          <p className="text-sm text-muted-foreground">Manage active AI connections</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display text-primary glow-text">{agents?.length || 0}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Links</div>
        </div>
      </div>

      {(!agents || agents.length === 0) ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground opacity-50">
          <WifiOff size={48} className="mb-4" />
          <p>No agents currently routed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="glow-border bg-black/40 p-4 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                  <Activity size={20} className="text-primary animate-pulse" />
                </div>
                <div>
                  <div className="font-semibold text-white">{agent.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1 flex gap-2">
                    <span>ID: {agent.id.substring(0, 8)}...</span>
                    <span>•</span>
                    <span className={agent.status === 'active' ? 'text-success' : 'text-warning'}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {agent.capabilities.map(cap => (
                      <span key={cap} className="text-[10px] px-2 py-0.5 bg-white/5 rounded border border-white/10 text-white/70">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleUnregister(agent.id)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Disconnect Agent"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
