import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';
import bcrypt from 'bcryptjs';

/**
 * Admin login.
 * 1. Looks the user up in the `users` table and checks the bcrypt hash.
 * 2. If no such user exists, falls back to ADMIN_EMAIL / ADMIN_PASSWORD from .env (server-side only),
 *    so the project can be demonstrated before an admin row is created.
 * On success an httpOnly signed cookie is set; the analytics API uses it to protect admin data.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user: { id?: string; email: string; name?: string; role?: string } | null = null;

    const { data: dbUser } = await supabaseAdmin.from('users').select('*').eq('email', cleanEmail).maybeSingle();

    if (dbUser?.password_hash) {
      const ok = await bcrypt.compare(password, dbUser.password_hash);
      if (ok) user = { id: dbUser.id, email: dbUser.email, name: dbUser.name || 'Admin', role: dbUser.role || 'ADMIN' };
    } else {
      const envEmail = (process.env.ADMIN_EMAIL || 'admin@ptut.com').toLowerCase();
      const envPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (cleanEmail === envEmail && password === envPassword) {
        user = { email: envEmail, name: 'Admin', role: 'ADMIN' };
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

/** Logout: clears the session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
