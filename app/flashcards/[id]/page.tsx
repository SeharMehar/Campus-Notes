'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, Shuffle, Check, X as XIcon } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { markStudyDay } from '@/lib/progress';

interface Card { question: string; options: string[]; correct_option: number; explanation: string }

/** Flashcard study mode: built from the module's quiz questions. Front = question, back = answer + explanation. */
export default function FlashcardsPage() {
  const { id } = useParams<{ id: string }>();
  const moduleId = String(id);

  const [cards, setCards] = useState<Card[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Flashcards | CampusNotes';
    markStudyDay();
    (async () => {
      try {
        const res = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId }) });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error(data.error || 'No flashcards available for this module yet.');
        setCards(data.questions);
        setOrder(data.questions.map((_: Card, i: number) => i));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load flashcards.');
      } finally {
        setLoading(false);
      }
    })();
  }, [moduleId]);

  const go = useCallback((delta: number) => {
    setFlipped(false);
    setPos((p) => Math.min(order.length, Math.max(0, p + delta)));
  }, [order.length]);

  // keyboard: space = flip, arrows = move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const mark = (isKnown: boolean) => {
    const idx = order[pos];
    setKnown((prev) => { const n = new Set(prev); if (isKnown) n.add(idx); else n.delete(idx); return n; });
    go(1);
  };

  const shuffle = () => {
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
    setPos(0); setFlipped(false);
  };
  const restart = () => { setKnown(new Set()); setOrder(cards.map((_, i) => i)); setPos(0); setFlipped(false); };

  const done = order.length > 0 && pos >= order.length;
  const card = useMemo(() => (order.length && pos < order.length ? cards[order[pos]] : null), [cards, order, pos]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-800">
      <SiteHeader />
      <div className="bg-[#E7E9EB]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#04AA6D]">Study mode</p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Flashcards</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={shuffle} disabled={!cards.length} className="w3-btn w3-btn-dark text-sm"><Shuffle className="h-4 w-4" /> Shuffle</button>
            <button onClick={() => history.back()} className="w3-btn w3-btn-dark text-sm">❮ Back</button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {loading && <div className="h-72 animate-pulse bg-[#E7E9EB]" />}
        {error && !loading && (
          <div className="border-l-[5px] border-amber-500 bg-amber-50 p-6 text-slate-800">
            <p className="font-bold">{error}</p>
            <Link href="/" className="w3-btn mt-4 text-sm">❮ Back to tutorials</Link>
          </div>
        )}

        {!loading && !error && card && (
          <>
            <div className="mb-4 flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
              <span>Card {pos + 1} of {order.length}</span>
              <div className="h-2.5 max-w-xs flex-1 overflow-hidden rounded-full bg-[#E7E9EB]"><div className="h-full bg-[#04AA6D] transition-all" style={{ width: `${(pos / order.length) * 100}%` }} /></div>
              <span className="text-[#04AA6D]">{known.size} known</span>
            </div>

            <button onClick={() => setFlipped((f) => !f)} aria-label="Flip card" className="block w-full [perspective:1200px]">
              <div className={`relative h-80 w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#282A35] p-8 text-center text-white shadow-xl [backface-visibility:hidden]">
                  <span className="mb-4 text-xs font-bold uppercase tracking-widest text-[#2ee89e]">Question</span>
                  <p className="text-xl font-bold leading-8 md:text-2xl">{card.question}</p>
                  <span className="mt-6 text-xs text-slate-400">Click or press Space to flip</span>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#04AA6D] p-8 text-center text-white shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="mb-3 text-xs font-bold uppercase tracking-widest text-white/80">Answer</span>
                  <p className="text-xl font-bold leading-8 md:text-2xl">{card.options[card.correct_option]}</p>
                  {card.explanation && <p className="mt-4 max-w-xl text-sm leading-6 text-white/90">{card.explanation}</p>}
                </div>
              </div>
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => go(-1)} disabled={pos === 0} className="w3-btn w3-btn-dark text-sm">❮ Previous</button>
              <div className="flex gap-3">
                <button onClick={() => mark(false)} className="flex items-center gap-1.5 rounded bg-[#ea2027] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"><XIcon className="h-4 w-4" /> Still learning</button>
                <button onClick={() => mark(true)} className="w3-btn text-sm"><Check className="h-4 w-4" /> I know this</button>
              </div>
            </div>
          </>
        )}

        {!loading && !error && done && (
          <div className="bg-[#E7E9EB] p-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Deck complete!</h2>
            <p className="mt-2 text-lg text-slate-700">You know <b className="text-[#04AA6D]">{known.size}</b> of {cards.length} cards.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={restart} className="w3-btn text-sm"><RotateCcw className="h-4 w-4" /> Study again</button>
              <Link href={`/quiz/${moduleId}`} className="w3-btn w3-btn-dark text-sm">Take the quiz ❯</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
