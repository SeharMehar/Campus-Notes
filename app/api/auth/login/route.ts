import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email aur password dono required hain.' },
        { status: 400 }
      );
    }

    // 1. Fetch user from custom public.users table
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (dbError || !user) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    // 2. Verify Bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    // 3. Login successful - Return user profile data & role
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin User',
        role: user.role || 'ADMIN',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Server error during login execution.' },
      { status: 500 }
    );
  }
}