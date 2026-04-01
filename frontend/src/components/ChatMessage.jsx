import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ role, content }) => {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 mb-4 animate-fade-in`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">AI</span>
          </div>
        </div>
      )}

      <div className={`max-w-2xl ${isUser ? 'max-w-xl' : 'max-w-2xl'}`}>
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none'
              : 'bg-slate-700 text-gray-100 rounded-bl-none'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="prose prose-invert max-w-none text-sm prose-sm">
              <ReactMarkdown
                components={{
                  // Customize markdown rendering
                  h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-3 mb-2" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="font-bold mt-2 mb-1" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code className="bg-slate-800 px-2 py-1 rounded text-yellow-300" {...props} />
                    ) : (
                      <code className="bg-slate-800 block p-2 rounded my-2 overflow-x-auto" {...props} />
                    ),
                  pre: ({ node, ...props }) => <pre className="bg-slate-800 p-3 rounded my-2 overflow-x-auto" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-3 italic" {...props} />,
                  a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                  em: ({ node, ...props }) => <em className="italic" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy Button for Assistant Messages */}
        {!isUser && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">U</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
