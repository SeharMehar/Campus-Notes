import Link from 'next/link';

/** CampusNotes project logo + wordmark. */
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="CampusNotes home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/campusnotes.svg" alt="CampusNotes logo" className="h-12 w-12 drop-shadow-md" />
      <div className="leading-tight">
        <div className={`text-xl font-black tracking-tight ${light ? 'text-white' : 'text-[#082a4d]'}`}>
          Campus<span className={`${light ? 'text-[#2ee89e]' : 'text-green-600'}`}>Notes</span>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${light ? 'text-sky-200' : 'text-[#035492]'}`}>
          Academic Library
        </div>
      </div>
    </Link>
  );
}

/** PTUT + ASTC logos, shown inside soft white chips so they stay readable on any background. */
export function PartnerLogos({ size = 'md', showDivider = true }: { size?: 'sm' | 'md' | 'lg'; showDivider?: boolean }) {
  const h = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div className="flex items-center gap-2.5">
      {showDivider && <span className="hidden h-8 w-px bg-slate-200 sm:block" />}
      <span className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" title="Punjab Tianjin University of Technology">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/ptut.png" alt="PTUT – Punjab Tianjin University of Technology" className={`${h} w-auto`} />
      </span>
      <span className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" title="ASTC">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/astc.png" alt="ASTC logo" className={`${h} w-auto`} />
      </span>
    </div>
  );
}
