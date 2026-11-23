import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AiConfigError, askClaude, extractJson } from '@/lib/ai';

export const maxDuration = 60;

const AI_WINDOW_MS = 60_000;
const MAX_AI_GENERATIONS = 8;
const aiGenerations = new Map<string, number[]>();

interface QuizQuestion {
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

function canGenerateAiQuiz(ip: string): boolean {
  const now = Date.now();
  const recent = (aiGenerations.get(ip) ?? []).filter((timestamp) => now - timestamp < AI_WINDOW_MS);
  if (recent.length >= MAX_AI_GENERATIONS) {
    aiGenerations.set(ip, recent);
    return false;
  }
  recent.push(now);
  aiGenerations.set(ip, recent);
  return true;
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function prepareQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return shuffle(questions).slice(0, 8).map((question) => {
    const options = shuffle(question.options.map((text, index) => ({ text, index })));
    return {
      ...question,
      options: options.map((option) => option.text),
      correct_option: options.findIndex((option) => option.index === question.correct_option),
    };
  });
}

function fallbackQuiz(moduleTitle: string, content: string): QuizQuestion[] {
  const topic = moduleTitle.replace(/^Module\s*\d+:\s*/i, '').trim() || 'this module';
  const hasDefinitions = /definition|principle|concept|means|is\s/i.test(content);
  const hasProcess = /process|steps?|stages?|procedure|workflow/i.test(content);
  const hasExamples = /example|for instance|such as/i.test(content);
  const hasComparison = /compare|difference|versus|whereas/i.test(content);

  return [
    { question: `What is the main purpose of studying ${topic}?`, options: ['To understand its key ideas and applications', 'To avoid all practical work', 'To memorise unrelated facts', 'To replace course textbooks'], correct_option: 0, explanation: `${topic} should be studied to understand its core ideas and practical applications.` },
    { question: `Which approach is most appropriate for reviewing ${topic}?`, options: ['Skim headings only', 'Connect definitions, examples, and applications', 'Ignore the explanation and focus only on names', 'Study without any structure'], correct_option: 1, explanation: 'Structured review connects concepts, examples, and applications for better understanding.' },
    { question: hasDefinitions ? `Which area should you identify first when learning ${topic}?` : `What should you identify first in a study session about ${topic}?`, options: ['The key terms and definitions', 'The final exam questions only', 'Unrelated software features', 'The page count'], correct_option: 0, explanation: 'Key terms and definitions provide the foundation for understanding the module.' },
    { question: hasProcess ? `How should a ${topic} process be studied?` : `How should you analyse a concept from ${topic}?`, options: ['As isolated facts', 'By understanding sequence, purpose, and outcome', 'Without examples', 'Only from memory'], correct_option: 1, explanation: 'Understanding purpose, sequence, and outcomes creates a complete view of the topic.' },
    { question: hasExamples ? `Why are examples important in ${topic}?` : `Why is application important when learning ${topic}?`, options: ['They demonstrate how knowledge is used', 'They remove the need for concepts', 'They make definitions irrelevant', 'They prove nothing can be applied'], correct_option: 0, explanation: 'Examples and applications help translate theoretical knowledge into practical understanding.' },
    { question: hasComparison ? `What helps clarify differences within ${topic}?` : `What helps show relationships between ideas in ${topic}?`, options: ['Comparison of concepts and contexts', 'Ignoring definitions', 'Reading without notes', 'Repeating the topic name'], correct_option: 0, explanation: 'Comparisons and relationships help students distinguish and connect important ideas.' },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId.trim() : '';
    if (!moduleId) return NextResponse.json({ error: 'moduleId is required.' }, { status: 400 });

    const { data: module, error } = await supabaseAdmin
      .from('modules')
      .select('id, title, content, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (error || !module) return NextResponse.json({ error: 'Module not found.' }, { status: 404 });

    const notes = typeof module.content === 'string' ? module.content.slice(0, 12000) : '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (notes.trim().length >= 50 && canGenerateAiQuiz(ip)) {
      try {
        const variation = Math.random().toString(36).slice(2, 9);
        const raw = await askClaude({
          system: `Create a fresh university-level practice quiz from the supplied module notes.
Reply with ONLY valid JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"correct_option":0,"explanation":"..."}]}
Create exactly 8 questions. Use only facts in the notes. Mix conceptual, comparison, and application questions; use a different scenario and phrasing on each attempt. Keep all four options plausible, concise, and distinct. correct_option is a zero-based index.`,
          prompt: `Attempt variation: ${variation}\nModule: ${module.title}\n\n<notes>${notes}</notes>`,
          maxTokens: 2200,
          timeoutMs: 25000,
        });
        const parsed = extractJson(raw) as { questions?: QuizQuestion[] };
        const questions = Array.isArray(parsed.questions) ? parsed.questions.filter((question) =>
          question && typeof question.question === 'string' && question.question.trim() &&
          Array.isArray(question.options) && question.options.length === 4 &&
          question.options.every((option) => typeof option === 'string') &&
          Number.isInteger(question.correct_option) && question.correct_option >= 0 && question.correct_option < 4 &&
          typeof question.explanation === 'string'
        ) : [];
        if (questions.length >= 4) {
          return NextResponse.json({ questions: prepareQuiz(questions), source: 'ai' });
        }
      } catch (generationError) {
        if (!(generationError instanceof AiConfigError)) console.error('Quiz generation failed:', generationError);
      }
    }

    const { data: quiz } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('module_id', moduleId)
      .maybeSingle();

    if (quiz?.id) {
      const { data: storedMcqs } = await supabaseAdmin
        .from('mcqs')
        .select('question, options, correct_option, explanation')
        .eq('quiz_id', quiz.id)
        .order('id', { ascending: true });

      const validStoredMcqs = (storedMcqs || []).filter((question) =>
        typeof question.question === 'string' &&
        question.question.trim().length > 0 &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every((option: unknown) => typeof option === 'string') &&
        Number.isInteger(question.correct_option) &&
        question.correct_option >= 0 &&
        question.correct_option < 4 &&
        typeof question.explanation === 'string'
      );

      if (validStoredMcqs.length > 0) {
        return NextResponse.json({
          questions: prepareQuiz(validStoredMcqs),
          source: 'mcq-bank',
        });
      }
    }

    return NextResponse.json({ questions: prepareQuiz(fallbackQuiz(module.title, notes)), source: 'fallback' });
  } catch {
    return NextResponse.json({ error: 'Unable to generate quiz.' }, { status: 500 });
  }
}
