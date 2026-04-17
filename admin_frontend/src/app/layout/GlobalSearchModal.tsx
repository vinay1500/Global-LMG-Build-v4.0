import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Command,
  CornerDownLeft,
  FileText,
  MessageSquare,
  Search,
  Users,
} from 'lucide-react';
import { DOCUMENTS, MATTERS, MESSAGE_THREADS, PLATFORM_USERS } from '../data/seedData';

type SearchResult = {
  id: string;
  subtitle: string;
  title: string;
  type: 'Client' | 'Document' | 'Matter' | 'Message';
};

type GlobalSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo<SearchResult[]>(() => {
    const textQuery = query.trim().toLowerCase();
    if (!textQuery) {
      return [];
    }

    const merged: SearchResult[] = [];

    PLATFORM_USERS.forEach((user) => {
      if (
        user.name.toLowerCase().includes(textQuery) ||
        user.email.toLowerCase().includes(textQuery) ||
        user.phone.toLowerCase().includes(textQuery)
      ) {
        merged.push({
          id: user.id,
          subtitle: `${user.email} • ${user.region || 'Region pending'}`,
          title: user.name,
          type: 'Client',
        });
      }
    });

    MATTERS.forEach((matter) => {
      if (
        matter.title.toLowerCase().includes(textQuery) ||
        matter.referenceCode.toLowerCase().includes(textQuery) ||
        matter.clientName.toLowerCase().includes(textQuery)
      ) {
        merged.push({
          id: matter.id,
          subtitle: `${matter.referenceCode} • ${matter.clientName}`,
          title: matter.title,
          type: 'Matter',
        });
      }
    });

    DOCUMENTS.forEach((document) => {
      if (
        document.name.toLowerCase().includes(textQuery) ||
        document.clientName.toLowerCase().includes(textQuery)
      ) {
        merged.push({
          id: document.id,
          subtitle: `${document.clientName}${document.matterTitle ? ` • ${document.matterTitle}` : ''}`,
          title: document.name,
          type: 'Document',
        });
      }
    });

    MESSAGE_THREADS.forEach((thread) => {
      if (
        thread.clientName.toLowerCase().includes(textQuery) ||
        thread.matterTitle.toLowerCase().includes(textQuery) ||
        thread.lastMessage.toLowerCase().includes(textQuery)
      ) {
        merged.push({
          id: thread.id,
          subtitle: thread.matterTitle || 'General inquiry',
          title: thread.clientName,
          type: 'Message',
        });
      }
    });

    return merged.slice(0, 15);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setSelectedIndex(0);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'Client':
        return Users;
      case 'Matter':
        return Briefcase;
      case 'Document':
        return FileText;
      case 'Message':
        return MessageSquare;
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#2C2B29]/60 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-[#E6E4DD]"
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center px-4 py-3 border-b border-[#E6E4DD]">
              <Search className="w-5 h-5 text-[#8C8981] mr-3" />
              <input
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-lg text-[#2C2B29] placeholder:text-[#A8A69F]"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSelectedIndex((previous) => Math.min(previous + 1, results.length - 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSelectedIndex((previous) => Math.max(previous - 1, 0));
                  } else if (event.key === 'Enter' && results[selectedIndex]) {
                    event.preventDefault();
                    handleSelect(results[selectedIndex]);
                  }
                }}
                placeholder="Search clients, matters, documents, messages..."
                type="text"
                value={query}
              />
              <span className="text-xs text-[#8C8981] bg-[#F4F1EA] px-2 py-1 rounded ml-2">ESC</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-[#8C8981] uppercase tracking-wider mb-2">
                    Suggestions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Arjun', 'LC-2024', 'invoice', 'document'].map((suggestion) => (
                      <button
                        className="text-xs bg-[#F4F1EA] hover:bg-[#E6E4DD] text-[#2C2B29] px-2.5 py-1.5 rounded transition"
                        key={suggestion}
                        onClick={() => setQuery(suggestion)}
                        type="button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-sm text-[#8C8981]">No results matched “{query}”.</div>
              ) : (
                <div className="p-2">
                  {results.map((result, index) => {
                    const Icon = getIcon(result.type);
                    return (
                      <button
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                          index === selectedIndex
                            ? 'bg-[#FCFBF8] border border-[#C19A5B]'
                            : 'border border-transparent hover:bg-[#F4F1EA]'
                        }`}
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        type="button"
                      >
                        <div className="w-8 h-8 rounded-md bg-[#F4F1EA] flex items-center justify-center text-[#5A7C96]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2C2B29] truncate">{result.title}</p>
                          <p className="text-xs text-[#8C8981] truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-[#A8A69F] tracking-wider">
                          {result.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-[#F4F1EA] px-4 py-2 border-t border-[#E6E4DD] flex items-center justify-between text-xs text-[#8C8981]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  <ArrowUp className="w-3 h-3" />
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  to select
                </span>
              </div>
              <span>Results: {results.length}</span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
