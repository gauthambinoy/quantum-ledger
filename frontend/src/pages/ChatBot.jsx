import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, RotateCcw, Loader } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import api from '../utils/api';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadHistory();
    loadSuggestedQuestions();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const response = await api.get('/chat/history');
      if (response.data && Array.isArray(response.data)) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadSuggestedQuestions = async () => {
    try {
      const response = await api.get('/chat/suggested-questions');
      if (response.data && Array.isArray(response.data)) {
        setSuggestedQuestions(response.data.slice(0, 4));
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSendMessage = async (message = null) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isLoading) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        message: messageToSend,
        include_portfolio: false
      });

      if (response.data && response.data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.response
        }]);
        // Clear suggestions after first message
        if (messages.length === 0) {
          setSuggestedQuestions([]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear conversation history? This cannot be undone.')) return;

    try {
      await api.delete('/chat/history');
      setMessages([]);
      loadSuggestedQuestions();
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-slate-700 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">QuantumLedger AI</h1>
              <p className="text-blue-100 text-sm">Your intelligent investment advisor</p>
            </div>
          </div>
          {!isEmpty && (
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Clear history"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isEmpty ? (
          // Empty State with Suggestions
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-4">
              <MessageCircle className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to QuantumLedger AI</h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Ask me anything about market analysis, portfolio optimization, price predictions, and investment strategies.
            </p>

            {suggestedQuestions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q.question)}
                    className="p-3 text-left bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-blue-400 rounded-lg transition-all text-gray-300 hover:text-white text-sm"
                  >
                    <p className="font-medium mb-1">{q.question}</p>
                    <p className="text-xs text-gray-400 capitalize">{q.category}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Messages List
          <>
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center p-4 rounded-lg bg-slate-700/30 border border-slate-600 max-w-xs">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-gray-400 text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 bg-slate-800/50 backdrop-blur px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about markets, predictions, portfolio... (Press Enter to send)"
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-slate-700 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputValue.trim()}
            className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
