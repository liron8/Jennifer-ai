'use client';

/**
 * Ask Jenifer — AI Chat Page
 * Streaming chat interface powered by Vercel AI SDK v6 useChat() hook
 * connected to /api/ai/chat endpoint.
 */

import { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send01, Stars01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { useUser } from '@/hooks/useUser';
import { cx } from '@/utils/cx';
import { KnowledgeBaseSidebar } from './_components/knowledge-base-sidebar';

const SUGGESTIONS = [
  'What meetings do I have today?',
  'Summarize my pending approvals',
  'What are my highest priority tasks?',
  'Show me upcoming key dates this month',
];

export default function AskJeniferPage() {
  const { profile } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const hasMessages = messages.length > 0;

  // Extract text content from message parts
  const getMessageText = (message: (typeof messages)[number]): string => {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
    {/* Main chat area */}
    <div className="flex flex-1 flex-col min-w-0">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* Empty state — centered greeting + suggestions */
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 mb-5">
              <Stars01 className="h-7 w-7 text-brand-600" />
            </div>
            <h1 className="text-display-xs font-semibold text-primary mb-2">
              Hi {firstName}, how can I help?
            </h1>
            <p className="text-tertiary text-center max-w-md mb-8">
              Ask me anything about your schedule, tasks, contacts, or approvals.
              I can also generate meeting briefs and email drafts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-xl border border-secondary bg-primary px-4 py-3 text-left text-sm text-secondary hover:bg-primary_hover hover:border-brand-300 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">
            {messages.map((message) => {
              const text = getMessageText(message);
              if (!text && message.role === 'assistant') return null;

              return (
                <div
                  key={message.id}
                  className={cx(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                      <Stars01 className="h-4 w-4 text-brand-600" />
                    </div>
                  )}
                  <div
                    className={cx(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-secondary text-primary'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-primary prose-strong:text-primary prose-a:text-brand-600 prose-pre:bg-tertiary prose-pre:rounded-lg prose-code:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{text}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                  <Stars01 className="h-4 w-4 text-brand-600" />
                </div>
                <div className="rounded-2xl bg-secondary px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-tertiary animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-tertiary animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-tertiary animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-error-secondary bg-error-primary/5 px-4 py-3 text-sm text-error-primary">
                <span className="flex-1">Something went wrong. Please try again.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area — pinned to bottom */}
      <div className="border-t border-secondary bg-primary px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jenifer anything..."
            className="flex-1 rounded-xl border border-secondary bg-primary px-4 py-3 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            disabled={isLoading}
          />
          <Button
            type="submit"
            isDisabled={!input.trim() || isLoading}
            size="md"
            className="shrink-0"
          >
            <Send01 className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-quaternary">
          Jenifer can make mistakes. Always verify important information.
        </p>
      </div>
    </div>

    {/* Knowledge Base Sidebar */}
    <KnowledgeBaseSidebar />
    </div>
  );
}
