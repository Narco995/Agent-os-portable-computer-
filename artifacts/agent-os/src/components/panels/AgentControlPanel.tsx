import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, List, Terminal, MousePointerClick, Image as ImageIcon } from 'lucide-react';
import { useOSStore } from '@/store/os-store';
import { useRegisterAgent, useListAgents, useExecuteCommand, useListCommands } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function AgentControlPanel() {
  const { agentPanelOpen, toggleAgentPanel } = useOSStore();
  const [tab, setTab] = useState<'register'|'commands'|'history'>('commands');
  
  const queryClient = useQueryClient();
  const { mutate: register, isPending: isRegistering } = useRegisterAgent();
  const { mutate: execute, isPending: isExecuting } = useExecuteCommand();
  const { data: agents } = useListAgents();
  const { data: commands } = useListCommands({ query: { refetchInterval: 3000 } });

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEndpoint, setRegEndpoint] = useState('');

  // Command Builder State
  const [cmdAgent, setCmdAgent] = useState('');
  const [cmdType, setCmdType] = useState('click');
  const [cmdPayload, setCmdPayload] = useState('{"x": 100, "y": 100}');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      { data: { name: regName, endpoint: regEndpoint, capabilities: ['click', 'type', 'screenshot'] } },
      { 
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
          setRegName('');
          setRegEndpoint('');
          setTab('commands');
        }
      }
    );
  };

  const handleExecute = () => {
    try {
      const payload = JSON.parse(cmdPayload);
      execute(
        { data: { type: cmdType as any, payload, agentId: cmdAgent || undefined } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/commands'] }) }
      );
    } catch (err) {
      alert("Invalid JSON payload");
    }
  };

  return (
    <AnimatePresence>
      {agentPanelOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 bottom-14 w-96 bg-background/95 backdrop-blur-2xl border-l border-white/10 z-[5000] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-display text-accent font-semibold flex items-center gap-2">
              <Terminal size={20} />
              Agent Control API
            </h2>
            <button onClick={toggleAgentPanel} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex p-2 gap-1 bg-black/20 border-b border-white/5">
            {[
              { id: 'commands', label: 'Execute', icon: Play },
              { id: 'register', label: 'Register', icon: Plus },
              { id: 'history', label: 'History', icon: List }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agent Name</label>
                  <input required value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent glow-border-accent transition-colors" placeholder="e.g. GPT-4 Worker" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Webhook Endpoint (Optional)</label>
                  <input value={regEndpoint} onChange={e => setRegEndpoint(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent transition-colors" placeholder="https://..." />
                </div>
                <button disabled={isRegistering} type="submit" className="w-full py-3 mt-4 bg-accent text-background font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50">
                  {isRegistering ? 'Registering...' : 'Register Agent'}
                </button>
              </form>
            )}

            {tab === 'commands' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Target Agent</label>
                  <select value={cmdAgent} onChange={e => setCmdAgent(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none appearance-none">
                    <option value="">System (Unassigned)</option>
                    {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Command Type</label>
                  <select value={cmdType} onChange={e => setCmdType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none appearance-none">
                    <option value="click">Click</option>
                    <option value="type">Type Text</option>
                    <option value="terminal">Terminal Command</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="open_app">Open App</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">JSON Payload</label>
                  <textarea value={cmdPayload} onChange={e => setCmdPayload(e.target.value)} className="w-full h-32 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none font-mono text-sm resize-none" />
                </div>
                <button onClick={handleExecute} disabled={isExecuting} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  <Play size={18} />
                  {isExecuting ? 'Executing...' : 'Fire Command'}
                </button>

                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setCmdType('screenshot'); setCmdPayload('{}'); handleExecute(); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex flex-col items-center gap-2 text-sm text-gray-300">
                      <ImageIcon size={20} /> Snapshot
                    </button>
                    <button onClick={() => { setCmdType('click'); setCmdPayload('{"x":500,"y":500}'); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex flex-col items-center gap-2 text-sm text-gray-300">
                      <MousePointerClick size={20} /> Click Center
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-3">
                {(!commands || commands.length === 0) ? (
                  <div className="text-center text-muted-foreground p-8">No commands executed yet.</div>
                ) : commands.map(cmd => (
                  <div key={cmd.id} className="bg-black/40 border border-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-primary text-sm">{cmd.type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        cmd.status === 'completed' ? 'bg-success/20 text-success' :
                        cmd.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                        'bg-warning/20 text-warning'
                      }`}>
                        {cmd.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">{JSON.stringify(cmd.payload)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
