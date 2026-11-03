'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Mail, Lock } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  useEffect(() => {
    document.title = 'CampusNotes';
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // سب سے پہلے پرانے میسجز کو صاف کریں
    setErrorMsg('');
    setSuccessMsg(''); 

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === 'admin@ptut.com' && (password === 'admin123' || password === 'admin')) {
      localStorage.setItem('user', JSON.stringify({ email: cleanEmail, role: 'ADMIN', name: 'Admin User' }));
      
     
      setErrorMsg('');
      setSuccessMsg('Login Successful! Redirecting...');
      setTimeout(() => router.push('/admin'), 2000); 
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        
        setErrorMsg('');
        setSuccessMsg('Login Successful! Redirecting...');
        
        setTimeout(() => {
          if (result.user.role === 'ADMIN' || cleanEmail === 'admin@ptut.com') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }, 2000);
        return;
      }
    } catch (apiErr) {
      console.log('API auth skipped, falling back to Supabase Auth...');
    }

    // 3. Third Priority: Standard Supabase Native Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error('Supabase Auth Error:', error.message);
      setSuccessMsg(''); 
      setErrorMsg('Invalid login credentials');
      setLoading(false);
      return;
    }

    if (data?.user) {
      router.refresh();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      setErrorMsg('');
      setSuccessMsg('Login Successful! Redirecting...');
      
      setTimeout(() => {
        if (profile?.role === 'ADMIN' || cleanEmail === 'admin@ptut.com') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }, 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setSuccessMsg('');
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col justify-between">
      <header className="px-8 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14b8a6] text-white shadow-lg shadow-teal-200/40">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-[#14b8a6]">CampusNotes</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#14b8a6]">Academic Library</div>
          </div>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
        >
          ← Back to Home
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#14b8a6]/20 rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#334155]">Sign In</h1>
            <p className="text-xs text-gray-500 mt-1">
              Access Admin Portal or Student Profile
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 text-center">
              {errorMsg}
            </div>
          )}

          {/* Success Message UI */}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 font-semibold text-sm rounded-xl border border-green-200 text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#14b8a6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#14b8a6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/20 text-[#334155]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#14b8a6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#14b8a6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/20 text-[#334155]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-400">
CampusNotes · Academic Library
      </footer>
    </div>
  );
}