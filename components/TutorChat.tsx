'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, Bot, Send, X, MessageCircle, Trash2, Sparkles } from 'lucide-react';
import { track } from '@/lib/track';
import { bump } from '@/lib/progress';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  'Explain this module simply',
  'Give me a real-life example',
  'What should I revise for the exam?',
  'Quiz me on this topic',
];


export default function TutorChat({ moduleId, courseId, moduleTitle }: { moduleId: string; courseId?: string; moduleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history: Msg[] = [...messages.filter((message) => !message.error), { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    track('tutor_message', { moduleId, courseId });
    bump('tutor');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, messages: history }),
      });

      if (!response.ok) {
        const detail = (await response.text()).trim();
        throw new Error(detail || `The tutor request failed (${response.status}). Please try again.`);
      }
      if (!response.body) throw new Error('The tutor returned no response. Please try again.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: answer }]);
      }

      answer += decoder.decode();
      if (!answer.trim()) throw new Error('The tutor returned an empty answer. Please try again.');
      setMessages([...history, { role: 'assistant', content: answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The tutor is unavailable right now. Please try again.';
      setMessages([...history, { role: 'assistant', content: message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#88432c] px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#6f3024]"
        >
          <MessageCircle className="h-5 w-5" /> Ask AI Tutor
        </button>
      )}

      {open && (
        <section
          className="tutor-chat-panel no-print fixed inset-x-3 bottom-3 z-50 flex h-[min(680px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[410px]"
          aria-label="AI Tutor chat"
        >
          <header className="flex items-center justify-between bg-[#2e2420] px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f5e7da]">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold">CampusNotes Tutor</p>
                <p className="mt-1 max-w-[230px] truncate text-[11px] text-orange-100/75">{moduleTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  title="Clear chat"
                  aria-label="Clear chat"
                  className="rounded-xl p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close tutor"
                className="rounded-xl p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="tutor-chat-messages flex-1 space-y-4 overflow-y-auto bg-[#fbf8f3] p-4 sm:p-5" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <div className="tutor-chat-intro mb-4 rounded-2xl border border-orange-900/10 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-[#a45232]">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Study companion</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    Ask about <b>{moduleTitle}</b>. I’ll use this module’s notes to help explain the topic.
                  </p>
                </div>
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Try asking</p>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:border-orange-800/30 hover:text-[#a45232]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[89%] rounded-2xl px-4 py-3 text-[13px] leading-6 ${
                    message.error
                      ? 'border border-amber-200 bg-amber-50 text-amber-950'
                      : message.role === 'user'
                        ? 'rounded-br-md bg-[#b85c38] text-white'
                        : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  {message.error && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5" /> Tutor couldn’t answer
                    </div>
                  )}
                  {message.role === 'assistant' ? (
                    message.content
                      ? <div className={`prose-ai text-[13px] ${busy && index === messages.length - 1 ? 'cursor-blink' : ''}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
                      : <span className="cursor-blink text-slate-400">Thinking</span>
                  ) : message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3.5"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about this module…"
              aria-label="Ask the AI tutor"
              maxLength={500}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-700 focus:bg-white"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#88432c] text-white transition hover:bg-[#6f3024] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
