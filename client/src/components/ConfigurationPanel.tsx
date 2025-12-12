import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default color
  const DEFAULT_COLOR = '#6366f1';

  // Check if customization is complete (color customized and at least one image uploaded)
  const isCustomizationComplete = () => {
    const colorCustomized = config.primaryColor !== DEFAULT_COLOR;
    const hasImage = !!(config.agentAvatar || config.headerImage || config.popupImage);
    return colorCustomized && hasImage;
  };

  const handleFinalize = async () => {
    if (!isCustomizationComplete()) {
      setFinalizeMessage({
        type: 'error',
        text: 'Please customize the color and upload at least one image before finalizing.',
      });
      setTimeout(() => setFinalizeMessage(null), 3000);
      return;
    }

    setIsFinalizing(true);
    setFinalizeMessage(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/customizations/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setFinalizeMessage({
          type: 'success',
          text: 'Customization submitted! An admin will review and activate your chatbot shortly.',
        });
        setTimeout(() => setFinalizeMessage(null), 5000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize customization');
      }
    } catch (error: any) {
      setFinalizeMessage({
        type: 'error',
        text: error.message || 'Failed to finalize customization. Please try again.',
      });
      setTimeout(() => setFinalizeMessage(null), 5000);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Save customization to admin-api when config changes
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
          return; // User not logged in
        }

        const response = await fetch('/api/customizations/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            primaryColor: config.primaryColor,
            agentAvatar: config.agentAvatar,
            headerImage: config.headerImage,
            popupImage: config.popupImage,
            bannerImage: config.headerImage, // Using headerImage as banner
          }),
        });

        if (response.ok) {
          console.log('Customization saved successfully');
        } else {
          const error = await response.json();
          console.error('Failed to save customization:', error);
        }
      } catch (error) {
        console.error('Error saving customization:', error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config.primaryColor, config.agentAvatar, config.headerImage, config.popupImage]);

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

        {/* Done Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {finalizeMessage && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                finalizeMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {finalizeMessage.text}
            </div>
          )}
          <button
            onClick={handleFinalize}
            disabled={!isCustomizationComplete() || isFinalizing}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              isCustomizationComplete() && !isFinalizing
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isFinalizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <Check className="size-5" />
                <span>Done</span>
              </>
            )}
          </button>
          {!isCustomizationComplete() && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Customize the color and upload at least one image to enable
            </p>
          )}
        </div>
      </div>
    </div>
  );
}