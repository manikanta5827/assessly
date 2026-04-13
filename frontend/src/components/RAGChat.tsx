import React, { useState, useRef, useEffect } from 'react';
import { useAssesslyStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RAGChatProps {
  onClose: () => void;
}

const RAGChat: React.FC<RAGChatProps> = ({ onClose }) => {
  const { result } = useAssesslyStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I've analyzed this candidate's code. Ask me anything about their implementation or how it matches your requirements." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !result) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const CHAT_URL = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace('/analyze', '/chat')}` 
        : 'http://localhost:3000/Prod/chat';

      const response = await axios.post(CHAT_URL, {
        assessmentId: result.assessmentId,
        history: messages.slice(1).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        message: userMessage
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 bg-black text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot size={24} />
          <h2 className="text-xl font-bold font-fustat">Assessly AI</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-black text-white' : 'bg-black/5 text-black'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-inter leading-relaxed ${m.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-black/5 text-black rounded-tl-none'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-black/5 text-black flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-black/5 p-4 rounded-2xl rounded-tl-none">
                <Loader2 className="animate-spin text-black/40" size={16} />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-6 border-t bg-white">
        <div className="flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about properties, patterns, or requirements..."
            className="rounded-xl border-black/10 h-12 font-inter"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-black text-white rounded-xl h-12 w-12 p-0 flex items-center justify-center"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RAGChat;
