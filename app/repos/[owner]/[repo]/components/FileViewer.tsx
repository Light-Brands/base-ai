'use client';

import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import { marked } from 'marked';

interface FileData {
  name: string;
  path: string;
  size: number;
  sha: string;
  content: string;
  encoding: string;
}

interface FileViewerProps {
  file: FileData;
  repoFullName: string;
  branch: string;
  onNavigate: (path: string, isFile?: boolean) => void;
}

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const PreviewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    jsonc: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'dockerfile',
    vue: 'html',
    svelte: 'html',
  };
  return languageMap[ext] || 'plaintext';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext);
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const binaryExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
  ];
  return binaryExtensions.includes(ext);
}

function isMarkdownFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ['md', 'mdx', 'markdown'].includes(ext);
}

export default function FileViewer({ file, repoFullName, branch, onNavigate }: FileViewerProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [decodedContent, setDecodedContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [renderedMarkdown, setRenderedMarkdown] = useState<string>('');

  const isMarkdown = isMarkdownFile(file.name);
  const fileUrl = `https://github.com/${repoFullName}/blob/${branch}/${file.path}`;

  useEffect(() => {
    if (file.encoding === 'base64' && !isImageFile(file.name) && !isBinaryFile(file.name)) {
      try {
        const decoded = atob(file.content);
        setDecodedContent(decoded);
      } catch {
        setDecodedContent('Unable to decode file content');
      }
    }
  }, [file]);

  useEffect(() => {
    if (codeRef.current && decodedContent && viewMode === 'code') {
      hljs.highlightElement(codeRef.current);
    }
  }, [decodedContent, viewMode]);

  // Render markdown when in preview mode
  useEffect(() => {
    if (isMarkdown && decodedContent && viewMode === 'preview') {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      const rendered = marked(decodedContent);
      if (typeof rendered === 'string') {
        setRenderedMarkdown(rendered);
      } else {
        rendered.then(setRenderedMarkdown);
      }
    }
  }, [decodedContent, viewMode, isMarkdown]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([decodedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parentPath = file.path.split('/').slice(0, -1).join('/');
  const lines = decodedContent.split('\n');
  const language = getLanguage(file.name);

  // Handle image files
  if (isImageFile(file.name)) {
    const dataUrl = `data:image/${file.name.split('.').pop()};base64,${file.content}`;
    return (
      <div className="file-viewer">
        <div className="file-viewer-header">
          <div className="file-viewer-info">
            <span className="file-viewer-name">{file.name}</span>
            <span className="file-viewer-size">{formatSize(file.size)}</span>
          </div>
        </div>
        <div className="file-viewer-image">
          <img src={dataUrl} alt={file.name} />
        </div>
      </div>
    );
  }

  // Handle binary files
  if (isBinaryFile(file.name)) {
    return (
      <div className="file-viewer">
        <div className="file-viewer-header">
          <div className="file-viewer-info">
            <span className="file-viewer-name">{file.name}</span>
            <span className="file-viewer-size">{formatSize(file.size)}</span>
          </div>
        </div>
        <div className="file-viewer-binary">
          <p>Binary file - preview not available</p>
          <p className="file-viewer-binary-size">{formatSize(file.size)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-viewer">
      <div className="file-viewer-header">
        <div className="file-viewer-info">
          <span className="file-viewer-name">{file.name}</span>
          <span className="file-viewer-meta">
            {lines.length} lines · {formatSize(file.size)}
          </span>
        </div>
        <div className="file-viewer-actions">
          {isMarkdown && (
            <div className="file-viewer-toggle">
              <button
                className={`file-viewer-toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
                onClick={() => setViewMode('code')}
                title="View code"
              >
                <CodeIcon />
                <span>Code</span>
              </button>
              <button
                className={`file-viewer-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Preview"
              >
                <PreviewIcon />
                <span>Preview</span>
              </button>
            </div>
          )}
          <button
            className="file-viewer-btn"
            onClick={handleCopyUrl}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? <CheckIcon /> : <LinkIcon />}
          </button>
          <button
            className="file-viewer-btn"
            onClick={handleDownload}
            title="Download file"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>
      {viewMode === 'preview' && isMarkdown ? (
        <div className="file-viewer-preview">
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        </div>
      ) : (
        <div className="file-viewer-content">
          <div className="file-viewer-line-numbers">
            {lines.map((_, i) => (
              <span key={i} className="file-viewer-line-number">
                {i + 1}
              </span>
            ))}
          </div>
          <pre className="file-viewer-code">
            <code ref={codeRef} className={`language-${language}`}>
              {decodedContent}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
