import React from 'react';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface CodeBlockProps {
  code: string;
  lang: string;
  onCopy: (text: string) => void;
}

function CodeBlock({ code, lang, onCopy }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    onCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Simple keyword highlighting
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'this', 'super', 'extends', 'of', 'in', 'switch', 'case', 'break', 'default', 'delete', 'void'],
    python:     ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'pass', 'break', 'continue', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'del', 'raise', 'global', 'nonlocal'],
    bash:       ['echo', 'cd', 'ls', 'cat', 'grep', 'sed', 'awk', 'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'export', 'local', 'readonly', 'source', 'exit'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'import', 'export', 'from', 'async', 'await', 'interface', 'type', 'enum', 'namespace', 'declare', 'abstract', 'implements', 'extends', 'public', 'private', 'protected', 'readonly', 'static', 'any', 'unknown', 'never', 'void', 'boolean', 'number', 'string', 'object'],
  };

  function highlight(src: string, language: string): string {
    let out = escapeHtml(src);
    const kws = keywords[language] ?? keywords['javascript'];

    // Strings
    out = out.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, '<span class="tok-str">$1$2$1</span>');
    // Comments
    out = out.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, '<span class="tok-comment">$1</span>');
    // Numbers
    out = out.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    // Keywords
    if (kws.length) {
      const kw_re = new RegExp(`\\b(${kws.join('|')})\\b`, 'g');
      out = out.replace(kw_re, '<span class="tok-kw">$1</span>');
    }
    // Functions calls
    out = out.replace(/\b(\w+)\s*(?=\()/g, '<span class="tok-fn">$1</span>');

    return out;
  }

  const normalizedLang = lang?.toLowerCase() ?? 'code';
  const highlighted = highlight(code, normalizedLang);

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-white/10 bg-black/70">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-[10px] font-mono text-cyan-500/80 uppercase tracking-widest">{normalizedLang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-white/40 hover:text-white/80 transition-colors px-2 py-0.5 rounded border border-white/10 hover:border-white/30"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="p-3 overflow-x-auto text-xs font-mono leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

export interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  const [copiedText, setCopiedText] = React.useState('');

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedText(text);
  }

  // Parse the markdown into React nodes
  function parse(raw: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let key = 0;

    // Split by code blocks first (they take priority)
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        nodes.push(...parseInlineBlocks(raw.slice(lastIndex, match.index), key));
        key += 100;
      }

      const lang = match[1] ?? '';
      const code = match[2] ?? '';
      nodes.push(<CodeBlock key={key++} code={code.trim()} lang={lang} onCopy={handleCopy} />);
      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < raw.length) {
      nodes.push(...parseInlineBlocks(raw.slice(lastIndex), key));
    }

    return nodes;
  }

  function parseInlineBlocks(text: string, baseKey: number): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;
    let k = baseKey;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line
      if (!line.trim()) { nodes.push(<br key={k++} />); i++; continue; }

      // Heading
      const h3 = line.match(/^### (.+)/); if (h3) { nodes.push(<h3 key={k++} className="text-sm font-semibold text-white mt-3 mb-1">{inlineFormat(h3[1])}</h3>); i++; continue; }
      const h2 = line.match(/^## (.+)/);  if (h2) { nodes.push(<h2 key={k++} className="text-base font-bold text-white mt-4 mb-1.5">{inlineFormat(h2[1])}</h2>); i++; continue; }
      const h1 = line.match(/^# (.+)/);   if (h1) { nodes.push(<h1 key={k++} className="text-lg font-bold text-white mt-4 mb-2">{inlineFormat(h1[1])}</h1>); i++; continue; }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) { nodes.push(<hr key={k++} className="border-white/15 my-3" />); i++; continue; }

      // Blockquote
      if (line.startsWith('>')) {
        const bqLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          bqLines.push(lines[i].slice(1).trim());
          i++;
        }
        nodes.push(
          <blockquote key={k++} className="border-l-2 border-cyan-500/50 pl-3 py-0.5 my-2 text-white/60 italic text-sm">
            {bqLines.join(' ')}
          </blockquote>
        );
        continue;
      }

      // Unordered list
      if (/^[-*+] /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*+] /.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+] /, ''));
          i++;
        }
        nodes.push(
          <ul key={k++} className="list-none my-1.5 space-y-0.5 pl-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-white/80 text-sm">
                <span className="text-cyan-400 mt-0.5 shrink-0">▸</span>
                <span>{inlineFormat(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\d+\. /.test(line)) {
        const items: string[] = [];
        let num = 1;
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
        }
        nodes.push(
          <ol key={k++} className="list-none my-1.5 space-y-0.5 pl-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-white/80 text-sm">
                <span className="text-cyan-400/70 font-mono text-xs mt-0.5 w-4 shrink-0">{idx + 1}.</span>
                <span>{inlineFormat(item)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Table
      if (line.includes('|') && lines[i + 1]?.includes('---')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        if (tableLines.length >= 2) {
          const headers = tableLines[0].split('|').filter(h => h.trim());
          const rows = tableLines.slice(2).map(row => row.split('|').filter(c => c.trim()));
          nodes.push(
            <div key={k++} className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>{headers.map((h, j) => <th key={j} className="border border-white/20 px-2 py-1 text-left font-semibold text-cyan-400 bg-white/5">{h.trim()}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/3">
                      {row.map((cell, ci) => <td key={ci} className="border border-white/10 px-2 py-1 text-white/70">{cell.trim()}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Paragraph
      nodes.push(<p key={k++} className="text-sm text-white/85 leading-relaxed mb-1.5">{inlineFormat(line)}</p>);
      i++;
    }

    return nodes;
  }

  function inlineFormat(text: string): React.ReactNode {
    // Split on inline code first
    const parts = text.split(/(`[^`]+`)/);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return <code key={i} className="bg-black/50 border border-white/10 rounded px-1 py-0.5 font-mono text-xs text-green-300">{part.slice(1, -1)}</code>;
      }
      // Apply bold, italic, links to non-code parts
      return <RichText key={i} text={part} />;
    });
  }

  return (
    <div className={`md-content ${className}`}>
      {parse(content)}
    </div>
  );
}

function RichText({ text }: { text: string }) {
  // Bold
  if (/\*\*[^*]+\*\*/.test(text) || /\*[^*]+\*/.test(text) || /\[[^\]]+\]\([^)]+\)/.test(text)) {
    const segments: React.ReactNode[] = [];
    let remaining = text;
    let k = 0;

    while (remaining) {
      // Bold
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Italic
      const italicMatch = remaining.match(/\*([^*]+)\*/);
      // Link
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

      // Find earliest match
      const candidates = [
        boldMatch   ? { idx: remaining.indexOf(boldMatch[0]),   type: 'bold',   match: boldMatch   } : null,
        italicMatch ? { idx: remaining.indexOf(italicMatch[0]), type: 'italic', match: italicMatch } : null,
        linkMatch   ? { idx: remaining.indexOf(linkMatch[0]),   type: 'link',   match: linkMatch   } : null,
      ].filter(Boolean) as { idx: number; type: string; match: RegExpMatchArray }[];

      if (candidates.length === 0) break;
      candidates.sort((a, b) => a.idx - b.idx);
      const first = candidates[0];

      if (first.idx > 0) {
        segments.push(<span key={k++}>{remaining.slice(0, first.idx)}</span>);
      }

      if (first.type === 'bold') {
        segments.push(<strong key={k++} className="font-semibold text-white">{first.match[1]}</strong>);
        remaining = remaining.slice(first.idx + first.match[0].length);
      } else if (first.type === 'italic') {
        segments.push(<em key={k++} className="italic text-white/90">{first.match[1]}</em>);
        remaining = remaining.slice(first.idx + first.match[0].length);
      } else if (first.type === 'link') {
        segments.push(
          <a key={k++} href={first.match[2]} target="_blank" rel="noopener noreferrer"
             className="text-cyan-400 underline hover:text-cyan-300 transition-colors">
            {first.match[1]}
          </a>
        );
        remaining = remaining.slice(first.idx + first.match[0].length);
      }
    }

    if (remaining) segments.push(<span key={k++}>{remaining}</span>);
    return <>{segments}</>;
  }

  return <>{text}</>;
}
