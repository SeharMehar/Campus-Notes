import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';
import bcrypt from 'bcryptjs';


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user: { id?: string; email: string; name?: string; role?: string } | null = null;

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envEmail && envPassword && cleanEmail === envEmail && password === envPassword) {
      user = { email: envEmail, name: 'Admin', role: 'ADMIN' };
    } else {
      const { data: dbUser } = await supabaseAdmin.from('users').select('*').eq('email', cleanEmail).maybeSingle();
      if (dbUser?.password_hash && await bcrypt.compare(password, dbUser.password_hash)) {
        user = { id: dbUser.id, email: dbUser.email, name: dbUser.name || 'Admin', role: dbUser.role || 'ADMIN' };
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken({ email: user.email, role: user.role || 'ADMIN', name: user.name }),
      sessionCookieOptions()
    );
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}


export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
