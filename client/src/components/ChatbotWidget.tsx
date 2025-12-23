import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Volume2, RotateCw, Mic } from 'lucide-react';
import { ChatbotConfig } from '../App';

interface ChatbotWidgetProps {
  config: ChatbotConfig;
}

export function ChatbotWidget({ config }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-popup widget when component mounts
  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[420px] h-[700px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div 
            className="px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: config.primaryColor }}
          >
            <div className="flex items-center gap-3">
              {config.agentAvatar ? (
                <img 
                  src={config.agentAvatar} 
                  alt="Agent" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="size-5 text-white" />
                </div>
              )}
              <span className="text-white">{config.chatTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <Volume2 className="size-5" />
              </button>
              <button className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <RotateCw className="size-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-50">
            {/* Welcome Section - Avatar Only */}
            <div className="text-center mb-8">
              {config.agentAvatar ? (
                <img 
                  src={config.agentAvatar} 
                  alt="Agent" 
                  className="w-20 h-20 rounded-full object-cover mx-auto"
                />
              ) : (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: '#1f2937' }}
                >
                  <MessageCircle className="size-10 text-white" />
                </div>
              )}
            </div>

            {/* Chat Image */}
            {config.popupImage && (
              <div className="mb-6">
                <img 
                  src={config.popupImage} 
                  alt="Chat" 
                  className="w-full h-40 object-cover rounded-2xl"
                />
              </div>
            )}

            {/* Bot Messages */}
            <div className="space-y-3 mb-6">
              <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                <p className="text-gray-800">
                  Hi there! I'm an AI agent trained on docs, help articles, and other important content.
                </p>
              </div>
              <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                <p className="text-gray-800">How can I best help you today?</p>
              </div>
            </div>

            {/* Quick Action Buttons - REMOVED */}
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 bg-white">
            <div className="relative mb-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                className="w-full px-5 py-3.5 pr-24 border-2 rounded-full focus:outline-none text-gray-900 placeholder:text-gray-400"
                style={{ 
                  borderColor: config.primaryColor,
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Mic className="size-5 text-gray-500" />
                </button>
                <button 
                  className="p-2 rounded-full transition-colors disabled:opacity-40"
                  style={{ 
                    backgroundColor: message.trim() ? config.primaryColor : '#e5e7eb',
                  }}
                  disabled={!message.trim()}
                >
                  <Send className="size-5 text-white" />
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400">Powered by NapoleonGPT</p>
          </div>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: config.primaryColor }}
      >
        {isOpen ? (
          <X className="size-7" />
        ) : config.agentAvatar ? (
          <img 
            src={config.agentAvatar} 
            alt="Agent" 
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <MessageCircle className="size-7" />
        )}
      </button>
    </div>
  );
}