import React, { useState, useEffect } from 'react';
import { Folder, FileText, Plus, Trash2, Upload, Download, RefreshCw, ChevronRight } from 'lucide-react';

interface VirtualFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileManagerApp() {
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<'file' | 'directory' | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => { loadFiles(); }, [currentPath]);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/files?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      setFiles(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function createItem() {
    if (!newName.trim() || !creating) return;
    const fullPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
    try {
      await fetch(`${API}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          path: fullPath,
          type: creating,
          content: creating === 'file' ? `# ${newName}\nCreated at ${new Date().toLocaleString()}\n` : '',
        }),
      });
      setCreating(null);
      setNewName('');
      loadFiles();
    } catch { /* ignore */ }
  }

  async function deleteFile(file: VirtualFile) {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      await fetch(`${API}/files/${file.id}`, { method: 'DELETE' });
      if (selectedFile?.id === file.id) { setSelectedFile(null); setEditingContent(''); }
      loadFiles();
    } catch { /* ignore */ }
  }

  async function saveFile() {
    if (!selectedFile) return;
    try {
      await fetch(`${API}/files/${selectedFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
      });
      loadFiles();
    } catch { /* ignore */ }
  }

  function openFile(file: VirtualFile) {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
      return;
    }
    setSelectedFile(file);
    setEditingContent(file.content);
  }

  const pathParts = currentPath.split('/').filter(Boolean);

  // Filter to immediate children of currentPath only
  const childFiles = files.filter(f => {
    if (currentPath === '/') {
      return f.path.split('/').filter(Boolean).length === 1;
    }
    return f.path.startsWith(currentPath + '/') && f.path.split('/').filter(Boolean).length === currentPath.split('/').filter(Boolean).length + 1;
  });

  return (
    <div className="flex h-full bg-black/40 text-sm">
      {/* File Tree */}
      <div className="w-64 border-r border-cyan-500/20 flex flex-col bg-black/20">
        {/* Breadcrumbs */}
        <div className="p-2 border-b border-cyan-500/20 flex items-center gap-1 text-xs text-white/50 flex-wrap min-h-[32px]">
          <button onClick={() => setCurrentPath('/')} className="hover:text-cyan-400 transition-colors">~</button>
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={10} />
              <button
                onClick={() => setCurrentPath('/' + pathParts.slice(0, i + 1).join('/'))}
                className="hover:text-cyan-400 transition-colors"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 p-2 border-b border-cyan-500/20">
          <button onClick={() => setCreating('file')} title="New File" className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors">
            <FileText size={13} />
          </button>
          <button onClick={() => setCreating('directory')} title="New Folder" className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors">
            <Folder size={13} />
          </button>
          <button onClick={loadFiles} title="Refresh" className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors ml-auto">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* New item input */}
        {creating && (
          <div className="p-2 border-b border-cyan-500/20 flex gap-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createItem(); if (e.key === 'Escape') setCreating(null); }}
              placeholder={creating === 'file' ? 'filename.txt' : 'folder-name'}
              className="flex-1 bg-black/40 border border-cyan-500/30 rounded px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
            />
            <button onClick={createItem} className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-400 text-xs hover:bg-cyan-500/30">OK</button>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {childFiles.length === 0 && (
            <div className="text-xs text-white/30 text-center py-8">
              {loading ? 'Loading...' : 'Empty directory'}
            </div>
          )}
          {childFiles.map(file => (
            <div
              key={file.id}
              className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedFile?.id === file.id ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/5 text-white/70'}`}
              onClick={() => openFile(file)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {file.type === 'directory' ? (
                  <Folder size={13} className="text-yellow-400 shrink-0" />
                ) : (
                  <FileText size={13} className="text-blue-400 shrink-0" />
                )}
                <span className="text-xs truncate">{file.name}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteFile(file); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between bg-black/10">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-blue-400" />
                <span className="text-xs text-white/70 font-mono">{selectedFile.path}</span>
                <span className="text-[10px] text-white/30">({formatSize(selectedFile.size)})</span>
              </div>
              <button
                onClick={saveFile}
                className="text-xs px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                Save
              </button>
            </div>
            <textarea
              value={editingContent}
              onChange={e => setEditingContent(e.target.value)}
              className="flex-1 bg-transparent p-4 font-mono text-xs text-green-300 resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-white/30">
            <Folder size={48} className="text-white/10" />
            <p className="text-sm">Select a file to edit</p>
            <p className="text-xs">or create a new one with the toolbar</p>
          </div>
        )}
      </div>
    </div>
  );
}
