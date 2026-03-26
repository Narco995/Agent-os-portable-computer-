import React, { useState, useRef, useEffect } from 'react';
import { useExecuteCommand } from '@workspace/api-client-react';

interface Log {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string;
}

export function TerminalApp() {
  const [logs, setLogs] = useState<Log[]>([
    { id: 1, type: 'output', text: 'Agent OS Terminal v1.0.0' },
    { id: 2, type: 'output', text: 'Type "help" for available commands.' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  
  const { mutateAsync: execute } = useExecuteCommand();

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setLogs(prev => [...prev, { id: Date.now(), type: 'input', text: `$ ${trimmed}` }]);
    
    if (trimmed === 'clear') {
      setLogs([]);
      setInput('');
      return;
    }
    
    if (trimmed === 'help') {
      setLogs(prev => [...prev, { 
        id: Date.now(), type: 'output', 
        text: 'Available local commands: clear, help, echo. Other commands sent to OS API.' 
      }]);
      setInput('');
      return;
    }

    try {
      const res = await execute({
        data: {
          type: 'terminal',
          payload: { command: trimmed }
        }
      });
      
      setLogs(prev => [...prev, { 
        id: Date.now(), 
        type: res.success ? 'output' : 'error', 
        text: res.error || JSON.stringify(res.result) || 'Command executed' 
      }]);
    } catch (err: any) {
      setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: err.message || 'Execution failed' }]);
    }
    
    setInput('');
  };

  return (
    <div className="h-full bg-[#050508] p-4 font-mono text-sm flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
        {logs.map(log => (
          <div 
            key={log.id} 
            className={`${
              log.type === 'input' ? 'text-white' : 
              log.type === 'error' ? 'text-destructive glow-text-destructive' : 
              'text-success glow-text-success'
            } break-all`}
          >
            {log.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 mt-2 text-success">
        <span>$</span>
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommand(input);
          }}
          className="flex-1 bg-transparent outline-none border-none text-white focus:ring-0 p-0 m-0"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
