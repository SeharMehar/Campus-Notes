'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Lock, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { Brand, PartnerLogos } from '@/components/Brand';
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
    
    // clear old messages first
    setErrorMsg('');
    setSuccessMsg(''); 

    const cleanEmail = email.trim().toLowerCase();

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
    <div className="grid min-h-screen font-sans lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hero-bg relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative"><Brand light /></div>
        <div className="relative max-w-md">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-100">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Welcome back
          </span>
          <h2 className="text-4xl font-black leading-tight">Manage courses, notes and quizzes in one place.</h2>
          <p className="mt-4 text-sm leading-7 text-teal-50/90">Sign in to upload modules, edit notes and keep the CampusNotes library up to date for every student.</p>
        </div>
        <div className="relative">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-100">An initiative by</p>
          <PartnerLogos size="lg" showDivider={false} />
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col bg-slate-50">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <div className="lg:hidden"><Brand /></div>
          <button onClick={() => router.push('/')} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-teal-50">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <div className="mb-6 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><ShieldCheck className="h-6 w-6" /></span>
              <h1 className="text-2xl font-black text-slate-900">Sign In</h1>
              <p className="mt-1 text-xs text-slate-500">Access Admin Portal or Student Profile</p>
            </div>

            {errorMsg && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs text-red-600">{errorMsg}</div>}
            {successMsg && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm font-semibold text-green-700">{successMsg}</div>}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Email / Username</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-200 transition hover:opacity-90 disabled:opacity-50">
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        <div className="py-5 text-center lg:hidden"><PartnerLogos size="sm" showDivider={false} /></div>
        <p className="pb-5 text-center text-xs text-slate-400">CampusNotes · Punjab Tianjin University of Technology</p>
      </div>
    </div>
  );
}
