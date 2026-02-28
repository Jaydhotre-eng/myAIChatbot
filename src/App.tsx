import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  User, 
  Bot, 
  Menu, 
  X, 
  Trash2,
  Settings,
  LogOut,
  Github,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sendMessageStream, type Message } from './services/geminiService';
// Edited 
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
console.log("API KEY:", apiKey);
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('gemini-chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    localStorage.setItem('gemini-chats', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: input.trim().slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        createdAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      sessionId = newSession.id;
    }

    const userMessage: Message = { role: 'user', text: input.trim() };
    setInput('');
    setIsLoading(true);

    // Update session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, messages: [...s.messages, userMessage] };
      }
      return s;
    }));

    try {
      const session = sessions.find(s => s.id === sessionId) || { messages: [] };
      const stream = sendMessageStream(session.messages, userMessage.text);
      
      let assistantText = '';
      
      // Add initial empty model message
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, { role: 'model', text: '' }] };
        }
        return s;
      }));

      for await (const chunk of stream) {
        assistantText += chunk;
        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            const newMessages = [...s.messages];
            newMessages[newMessages.length - 1] = { role: 'model', text: assistantText };
            return { ...s, messages: newMessages };
          }
          return s;
        }));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      const displayText =
        message === 'GEMINI_API_KEY is not set'
          ? 'API key not set. Add your Gemini API key to the .env file (see README or .env.example). Get a key at https://aistudio.google.com/apikey'
          : `Sorry, I encountered an error. Please check your API key and connection. (${message})`;
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { 
            ...s, 
            messages: [...s.messages, { role: 'model', text: displayText }] 
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-white text-zinc-900 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {!isSidebarOpen && window.innerWidth < 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed inset-0 bg-black/20 z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 260 : 0,
          opacity: isSidebarOpen ? 1 : 0
        }}
        className={cn(
          "bg-zinc-50 border-r border-zinc-200 flex flex-col z-30 relative overflow-hidden",
          !isSidebarOpen && "md:w-0"
        )}
      >
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group relative",
                currentSessionId === session.id ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate flex-1 text-left">{session.title}</span>
              <button
                onClick={(e) => deleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-300 rounded transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-zinc-200 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">
            <Settings size={16} />
            Settings
          </button>
          <div className="flex items-center gap-3 px-3 py-3 mt-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">User Account</p>
              <p className="text-xs text-zinc-500 truncate">Free Plan</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 flex items-center px-4 justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-zinc-900">Gemini Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <Github size={20} />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="text-indigo-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">How can I help you today?</h2>
              <p className="text-zinc-500 mb-8">
                I'm your Gemini-powered assistant. Ask me anything, from writing code to explaining complex topics.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  "Explain quantum computing in simple terms",
                  "Write a Python script to scrape a website",
                  "Help me plan a 3-day trip to Tokyo",
                  "Give me some creative writing prompts"
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="p-4 text-sm text-left border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
              {currentSession.messages.map((message, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-4 group",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'model' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                      <Bot size={18} />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                    message.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-zinc-100 text-zinc-900 rounded-tl-none border border-zinc-200"
                  )}>
                    <div className={cn(
                      "markdown-body",
                      message.role === 'user' && "text-white"
                    )}>
                      <Markdown>{message.text}</Markdown>
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-600 shrink-0 mt-1 shadow-sm">
                      <User size={18} />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && currentSession.messages[currentSession.messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 shrink-0" />
                  <div className="bg-zinc-100 h-12 w-24 rounded-2xl rounded-tl-none border border-zinc-200" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-zinc-200">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Gemini..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none max-h-48"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-2 bottom-2 p-2 rounded-xl transition-all",
                input.trim() && !isLoading 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              )}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 text-center mt-2">
            Gemini can make mistakes. Check important info.
          </p>
        </div>
      </main>
    </div>
  );
}
