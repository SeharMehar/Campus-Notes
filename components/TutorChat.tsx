'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, X, MessageCircle, Trash2 } from 'lucide-react';
import { track } from '@/lib/track';
import { bump } from '@/lib/progress';

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = ['Explain this module in simple words', 'Give me a real-life example', 'What are the most important points for the exam?', 'Quiz me on this module'];

/** Floating "Ask AI Tutor" chat. It only sees the notes of the module currently open. */
export default function TutorChat({ moduleId, courseId, moduleTitle }: { moduleId: string; courseId?: string; moduleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...messages, { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    track('tutor_message', { moduleId, courseId });
    bump('tutor');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, messages: history }),
      });
      if (!res.body) throw new Error('No response');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: answer }]);
      }
      if (!answer.trim()) throw new Error('Empty');
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Sorry, I could not answer that. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#04AA6D] px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-[#059862]">
          <MessageCircle className="h-5 w-5" /> Ask AI Tutor
        </button>
      )}

      {open && (
        <div className="no-print fixed inset-x-3 bottom-3 z-50 flex h-[min(620px,calc(100vh-1.5rem))] flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-300 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]">
          <div className="flex items-center justify-between bg-[#282A35] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#04AA6D]"><Bot className="h-4 w-4" /></span>
              <div className="leading-tight">
                <p className="text-sm font-bold">AI Tutor</p>
                <p className="max-w-[220px] truncate text-[11px] text-slate-300">{moduleTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && <button onClick={() => setMessages([])} title="Clear chat" className="rounded p-1.5 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>}
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div>
                <p className="mb-3 text-sm text-slate-700">Hi! Ask me anything about <b>{moduleTitle}</b>. I answer from your notes.</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="border border-slate-200 bg-white px-3 py-2 text-left text-[13px] font-semibold text-slate-700 transition hover:border-[#04AA6D] hover:text-[#04AA6D]">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[13.5px] ${m.role === 'user' ? 'bg-[#04AA6D] text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
                  {m.role === 'assistant' ? (
                    m.content ? <div className={`prose-ai text-[13.5px] ${busy && i === messages.length - 1 ? 'cursor-blink' : ''}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                    : <span className="cursor-blink text-slate-400">Thinking</span>
                  ) : m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." maxLength={500}
              className="min-w-0 flex-1 border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#04AA6D]" />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="w3-btn h-10 w-10 justify-center !p-0"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
