import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ChatbotConfig } from '../App';

interface CodeSnippetProps {
  config: ChatbotConfig;
}

export function CodeSnippet({ config }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    return `<script>
  window.chatbotConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="https://cdn.yourchatbot.com/widget.js"></script>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode());
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
        <pre className="p-4 overflow-x-auto text-xs text-gray-300">
          <code>{generateCode()}</code>
        </pre>
      </div>
    </div>
  );
}
