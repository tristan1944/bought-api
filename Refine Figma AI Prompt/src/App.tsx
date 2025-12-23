import { useState } from 'react';
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