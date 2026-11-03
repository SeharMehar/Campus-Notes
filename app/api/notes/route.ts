import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch notes error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notes.' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      notes: data,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title =
      typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string'
        ? body.description.trim()
        : '';
    const subject =
      typeof body.subject === 'string' ? body.subject.trim() : '';
    const category =
      typeof body.category === 'string' ? body.category.trim() : '';
    const price = body.price;

    if (!title || !subject || !category || price === undefined || price === null || price === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, subject, category and price are required.',
        },
        { status: 400 }
      );
    }
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price must be a valid non-negative number.',
        },
        { status: 400 }
      );
    }
    const fileUrl =
      typeof body.file_url === 'string' && body.file_url.trim()
        ? body.file_url.trim()
        : null;

    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        title,
        description: description || null,
        subject,
        category,
        price: numericPrice,
        file_url: fileUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert note error:', error.message);

      return NextResponse.json(
        {
          success: false,
          error: 'Could not save the note. Check the database table structure.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Note saved successfully.',
        note: data,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request or internal server error.',
      },
      { status: 400 }
    );
  }
}
