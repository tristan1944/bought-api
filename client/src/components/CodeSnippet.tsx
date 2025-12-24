import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ChatbotConfig } from '../App';

interface CodeSnippetProps {
  config?: ChatbotConfig;
  compact?: boolean;
}

export function CodeSnippet({ config, compact }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snippet, setSnippet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch the canonical embed snippet generated from admin-api credentials (projectID, etc.)
  useEffect(() => {
    let cancelled = false;

    async function loadSnippet() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
          setSnippet('');
          setError('Log in to view your integration snippet.');
          return;
        }

        const res = await fetch('/api/chatbot/snippet', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          const msg = data?.error || 'Failed to load snippet.';
          const details = data?.details ? ` ${data.details}` : '';
          throw new Error(`${msg}${details}`.trim());
        }

        const snippetText = String(data?.snippet || '').trim();
        if (!snippetText) {
          throw new Error('Snippet is not available yet. Please complete purchase / wait for credentials assignment.');
        }

        if (!cancelled) {
          setSnippet(snippetText);
        }
      } catch (err: any) {
        if (!cancelled) {
          setSnippet('');
          setError(err?.message || 'Failed to load snippet.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSnippet();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep config in the signature for future use (branding/theme), even though the embed code
  // is generated server-side from your assigned Voiceflow project.
  void config;

  const codeToShow = loading
    ? 'Loading snippet...'
    : snippet ||
      error ||
      'Snippet not available. Please refresh, or contact support if this persists.';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeToShow);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <span className="text-xs text-gray-400">HTML</span>
          <button
            onClick={handleCopy}
            disabled={loading || !snippet}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre
          className={`p-4 overflow-x-auto text-xs text-gray-300 ${
            compact ? 'max-h-64 overflow-y-auto' : ''
          }`}
        >
          <code>{codeToShow}</code>
        </pre>
      </div>
    </div>
  );
}
