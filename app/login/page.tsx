// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Credentials Check
    if (
      (email === 'admin@ptut' || email === 'admin@campusnotes.com' || email === 'admin') &&
      password === 'admin123'
    ) {
      const adminUser = { email: 'admin@ptut', role: 'ADMIN' };
      localStorage.setItem('user', JSON.stringify(adminUser));
      router.push('/admin');
      return;
    }

    // Standard Student Login Fallback
    if (email && password) {
      const studentUser = { email, role: 'STUDENT' };
      localStorage.setItem('user', JSON.stringify(studentUser));
      router.push('/');
      return;
    }

    setError('براہ کرم صحیح ای میل اور پاسورڈ درج کریں۔');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col justify-between">
      <header className="border-b-2 border-teal-500/20 px-6 py-3 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl text-teal-600 tracking-tight">CampusNotes</span>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto px-6 py-12">
        <div className="border-2 border-teal-500/30 rounded-3xl p-8 bg-white shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-black">Sign In</h1>
            <p className="text-xs text-gray-500 font-semibold mt-1">Access Admin Portal or Student Profile</p>
          </div>

          {error && (
            <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email / Username</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-teal-600" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ptut"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-teal-200 rounded-xl text-xs text-black bg-white focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-teal-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-teal-200 rounded-xl text-xs text-black bg-white focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-500 text-white font-bold text-xs py-3 rounded-xl hover:bg-teal-600 transition shadow-md mt-2"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-teal-100 text-center">
            <p className="text-[11px] font-semibold text-teal-800 bg-teal-50 p-2.5 rounded-xl border border-teal-200">
              🔑 <b>Admin Credentials:</b><br />
              Email: <code className="font-bold">admin@ptut</code> | Password: <code className="font-bold">admin123</code>
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs font-bold text-gray-400 border-t border-teal-500/10">
        CampusNotes Portal
      </footer>
    </div>
  );
}