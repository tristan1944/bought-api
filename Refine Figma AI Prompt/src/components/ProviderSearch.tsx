import { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';

const providers = [
  { id: 'wordpress', name: 'WordPress', icon: '📝' },
  { id: 'shopify', name: 'Shopify', icon: '🛍️' },
  { id: 'wix', name: 'Wix', icon: '🎨' },
  { id: 'squarespace', name: 'Squarespace', icon: '⬛' },
  { id: 'webflow', name: 'Webflow', icon: '💧' },
  { id: 'react', name: 'React', icon: '⚛️' },
  { id: 'vue', name: 'Vue.js', icon: '💚' },
  { id: 'html', name: 'HTML/JavaScript', icon: '🌐' },
];

export function ProviderSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(providers[7]); // Default to HTML
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center gap-3 hover:border-gray-400 transition-colors"
      >
        <span className="text-xl">{selected.icon}</span>
        <span className="flex-1 text-gray-900">{selected.name}</span>
        <Search className="size-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search platforms..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelected(provider);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{provider.icon}</span>
                <span className="flex-1 text-sm text-gray-900">{provider.name}</span>
                {selected.id === provider.id && (
                  <Check className="size-4 text-indigo-600" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No platforms found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
