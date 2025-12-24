import { useEffect, useState } from 'react';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { UserProfileMenu } from './components/UserProfileMenu';

export interface ChatbotConfig {
  primaryColor: string;
  headerImage: string;
  agentAvatar: string;
  popupImage: string;
  bannerTitle: string;
  bannerDescription: string;
  chatTitle: string;
}

export default function App() {
  const [config, setConfig] = useState<ChatbotConfig>({
    primaryColor: '#6366f1',
    headerImage: '',
    agentAvatar: '',
    popupImage: '',
    bannerTitle: 'Welcome to our chat!',
    bannerDescription: 'Our team typically replies in a few minutes.',
    chatTitle: 'Chat with us',
  });

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // If Stripe redirects here with a session_id, confirm it using the stored JWT.
  // This is a best-effort fallback in case webhooks are delayed.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const sessionId = params.get('session_id');
      if (!sessionId) return;

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      fetch('/api/stripe/confirm-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      })
        .catch(() => {})
        .finally(() => {
          // Remove session_id from URL after processing
          try {
            params.delete('session_id');
            const newUrl =
              window.location.pathname +
              (params.toString() ? `?${params.toString()}` : '') +
              (window.location.hash || '');
            window.history.replaceState({}, document.title, newUrl);
          } catch (e) {
            // ignore
          }
        });
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-8 py-4 flex items-center justify-between">
          <h1 className="text-gray-900">AI Chatbot Configuration</h1>
          <UserProfileMenu />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Configuration Panel - Left */}
        <div className="w-[480px] bg-white border-r border-gray-200 overflow-y-auto">
          <ConfigurationPanel config={config} updateConfig={updateConfig} />
        </div>

        {/* Preview Panel - Right */}
        <div className="flex-1 overflow-y-auto">
          <PreviewPanel config={config} />
        </div>
      </div>
    </div>
  );
}