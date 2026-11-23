import type { ReactNode } from 'react';
import Link from 'next/link';
import { Brand, PartnerLogos } from './Brand';
import ThemeToggle from './ThemeToggle';


export default function SiteHeader({ children, center }: { children?: ReactNode; center?: ReactNode }) {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 text-slate-800 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Brand />
        {center && <div className="hidden flex-1 justify-center px-5 md:flex">{center}</div>}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/progress" className="hidden rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-[#88432c] md:block">My progress</Link>
          {children}
          <ThemeToggle />
          <div className="hidden lg:block"><PartnerLogos size="sm" showDivider={false} /></div>
        </div>
      </div>
    </header>
  );
}
