import { ChatbotWidget } from './ChatbotWidget';
import { ChatbotConfig } from '../App';

interface PreviewPanelProps {
  config: ChatbotConfig;
}

export function PreviewPanel({ config }: PreviewPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <h2 className="text-gray-900 mb-1">Live Preview</h2>
        <p className="text-gray-600">See your chatbot widget in real-time</p>
      </div>
      
      <div className="flex-1 p-8">
        <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-300 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
          </div>
          
          {/* Browser mockup */}
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[600px] overflow-hidden">
            {/* Browser header */}
            <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-gray-300 rounded px-3 py-1 text-xs text-gray-500">
                  https://yourwebsite.com
                </div>
              </div>
            </div>
            
            {/* Browser content */}
            <div className="h-[calc(100%-40px)] bg-white p-8">
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6 mx-auto" />
                <div className="h-4 bg-gray-100 rounded w-4/6 mx-auto" />
                <div className="mt-8 h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200" />
              </div>
            </div>
            
            {/* Chatbot Widget */}
            <ChatbotWidget config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}
