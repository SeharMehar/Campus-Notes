import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const moduleId = request.nextUrl.searchParams.get('moduleId')?.trim();
  if (!moduleId) return NextResponse.json({ error: 'moduleId is required.' }, { status: 400 });
  const { data: quiz, error: quizError } = await supabaseAdmin.from('quizzes').select('id').eq('module_id', moduleId).maybeSingle();
  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });
  if (!quiz) return NextResponse.json({ quizId: '', mcqs: [] });
  const { data: mcqs, error: mcqError } = await supabaseAdmin.from('mcqs').select('*').eq('quiz_id', quiz.id).order('id', { ascending: true });
  if (mcqError) return NextResponse.json({ error: mcqError.message }, { status: 500 });
  return NextResponse.json({ quizId: quiz.id, mcqs: mcqs || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const moduleId = String(body.moduleId || '').trim();
    const mcqId = typeof body.mcqId === 'string' ? body.mcqId.trim() : '';
    const question = String(body.question || '').trim();
    const options = Array.isArray(body.options) ? body.options.map((value: unknown) => String(value || '').trim()) : [];
    const correctOption = Number(body.correctOption);
    const explanation = String(body.explanation || '').trim();
    if (!moduleId || !question || options.length !== 4 || options.some((option: string) => !option) || !Number.isInteger(correctOption) || correctOption < 0 || correctOption > 3) {
      return NextResponse.json({ error: 'Valid module, question, four options, and correct option are required.' }, { status: 400 });
    }

    let quizId = typeof body.quizId === 'string' ? body.quizId.trim() : '';
    if (!quizId) {
      const { data: existingQuiz } = await supabaseAdmin.from('quizzes').select('id').eq('module_id', moduleId).maybeSingle();
      quizId = existingQuiz?.id || '';
    }
    if (!quizId) {
      const { data: module } = await supabaseAdmin.from('modules').select('title').eq('id', moduleId).maybeSingle();
      const { data: createdQuiz, error: quizError } = await supabaseAdmin.from('quizzes').insert([{ id: randomUUID(), module_id: moduleId, subject: module?.title || 'Module Quiz' }]).select('id').maybeSingle();
      if (quizError || !createdQuiz) return NextResponse.json({ error: quizError?.message || 'Unable to create quiz.' }, { status: 500 });
      quizId = createdQuiz.id;
    }

    if (mcqId) {
      const { error } = await supabaseAdmin.from('mcqs').update({ question, options, correct_option: correctOption, explanation }).eq('id', mcqId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from('mcqs').insert([{ id: randomUUID(), quiz_id: quizId, question, options, correct_option: correctOption, explanation }]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, quizId });
  } catch {
    return NextResponse.json({ error: 'Unable to save MCQ.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const mcqId = request.nextUrl.searchParams.get('id')?.trim();
  if (!mcqId) return NextResponse.json({ error: 'MCQ id is required.' }, { status: 400 });
  const { error } = await supabaseAdmin.from('mcqs').delete().eq('id', mcqId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
