import React, { useState } from 'react';
import { Save, Play, FileCode } from 'lucide-react';

export function EditorApp() {
  const [code, setCode] = useState(`// Welcome to OS Editor
function initAgent() {
  console.log("Connecting to core...");
  const status = checkSystems();
  return status === "OK";
}

initAgent();`);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="bg-[#2d2d2d] flex items-center px-4 py-2 border-b border-black/50 gap-4">
        <div className="flex items-center gap-2 text-gray-300">
          <FileCode size={16} className="text-primary" />
          <span className="text-sm font-mono">agent_script.js</span>
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#3d3d3d] hover:bg-[#4d4d4d] text-gray-200 text-xs transition-colors">
          <Save size={14} /> Save
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-xs transition-colors">
          <Play size={14} /> Run
        </button>
      </div>
      <div className="flex-1 relative font-mono text-sm">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full bg-transparent text-gray-300 p-4 resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
