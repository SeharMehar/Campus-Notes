import type { ReactNode } from 'react';
import Link from 'next/link';
import { Brand, PartnerLogos } from './Brand';
import ThemeToggle from './ThemeToggle';

/** W3Schools-style dark top bar: project logo left, PTUT + ASTC logos right. */
export default function SiteHeader({ children, center }: { children?: ReactNode; center?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-[#282A35] text-white shadow-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Brand light />
        {center && <div className="hidden flex-1 justify-center md:flex">{center}</div>}
        <div className="flex items-center gap-3">
          <Link href="/progress" className="hidden rounded px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 md:block">My Progress</Link>
          {children}
          <ThemeToggle />
          <div className="hidden lg:block"><PartnerLogos size="sm" showDivider={false} /></div>
        </div>
      </div>
    </header>
  );
}
