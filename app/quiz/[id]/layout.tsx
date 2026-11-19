import { Suspense, type ReactNode } from 'react';

export const instant = false;

export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-teal-700">Loading quiz...</div>}>
      {children}
    </Suspense>
  );
}
