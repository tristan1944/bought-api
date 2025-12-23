import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChatbotConfig } from '../App';
import { ColorPicker } from './ColorPicker';
import { ImageUpload } from './ImageUpload';
import { CodeSnippet } from './CodeSnippet';
import { ProviderSearch } from './ProviderSearch';

interface ConfigurationPanelProps {
  config: ChatbotConfig;
  updateConfig: (updates: Partial<ChatbotConfig>) => void;
}

interface Section {
  id: string;
  title: string;
  isOpen: boolean;
}

export function ConfigurationPanel({ config, updateConfig }: ConfigurationPanelProps) {
  const [sections, setSections] = useState<Section[]>([
    { id: 'appearance', title: 'Appearance', isOpen: true },
    { id: 'integration', title: 'Integration', isOpen: false },
  ]);

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === id ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };

  const appearanceSection = sections.find(s => s.id === 'appearance');
  const integrationSection = sections.find(s => s.id === 'integration');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-1">Customize Your Chatbot</h2>
        <p className="text-gray-600">Configure the appearance and content of your chat widget</p>
      </div>

      <div className="space-y-4">
        {/* Appearance Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('appearance')}
            className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900">{appearanceSection?.title}</span>
            {appearanceSection?.isOpen ? (
              <ChevronUp className="size-5 text-gray-500" />
            ) : (
              <ChevronDown className="size-5 text-gray-500" />
            )}
          </button>
          
          {appearanceSection?.isOpen && (
            <div className="p-6 space-y-6">
              {/* Primary Color */}
              <div>
                <label className="block text-gray-700 mb-2">Primary Color</label>
                <ColorPicker
                  color={config.primaryColor}
                  onChange={(color) => updateConfig({ primaryColor: color })}
                />
              </div>

              {/* Agent Avatar */}
              <div>
                <label className="block text-gray-700 mb-2">Agent Avatar</label>
                <p className="text-sm text-gray-500 mb-3">Avatar shown in the banner and messages</p>
                <ImageUpload
                  value={config.agentAvatar}
                  onChange={(url) => updateConfig({ agentAvatar: url })}
                  label="Upload avatar"
                />
              </div>
            </div>
          )}
        </div>

        {/* Integration Section */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('integration')}
            className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900">{integrationSection?.title}</span>
            {integrationSection?.isOpen ? (
              <ChevronUp className="size-5 text-gray-500" />
            ) : (
              <ChevronDown className="size-5 text-gray-500" />
            )}
          </button>
          
          {integrationSection?.isOpen && (
            <div className="p-6 space-y-6">
              {/* Provider Search */}
              <div>
                <label className="block text-gray-700 mb-2">Platform</label>
                <p className="text-sm text-gray-500 mb-3">Select your website platform for integration guides</p>
                <ProviderSearch />
                <button className="mt-3 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                  Integration Guide
                </button>
              </div>

              {/* Code Snippet */}
              <div>
                <label className="block text-gray-700 mb-2">Integration Code</label>
                <p className="text-sm text-gray-500 mb-3">Copy this code and paste it before the closing &lt;/body&gt; tag</p>
                <CodeSnippet config={config} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}