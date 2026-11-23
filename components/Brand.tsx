import Link from 'next/link';


export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="CampusNotes home">
      {}
      <img src="/logos/campusnotes-mark.svg" alt="CampusNotes logo" className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
      <div className="leading-tight">
        <div className={`text-[19px] font-extrabold tracking-[-0.045em] sm:text-xl ${light ? 'text-white' : 'text-slate-800'}`}>
          Campus<span className={`${light ? 'text-[#f2dac7]' : 'text-[#b85c38]'}`}>Notes</span>
        </div>
        <div className={`mt-0.5 text-[8px] font-bold uppercase tracking-[0.17em] ${light ? 'text-slate-300' : 'text-slate-500'}`}>
          Learn. Practise. Progress.
        </div>
      </div>
    </Link>
  );
}


export function PartnerLogos({ size = 'md', showDivider = true }: { size?: 'sm' | 'md' | 'lg'; showDivider?: boolean }) {
  const h = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div className="flex items-center gap-2.5">
      {showDivider && <span className="hidden h-8 w-px bg-slate-200 sm:block" />}
      <span className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" title="Punjab Tianjin University of Technology">
        {}
        <img src="/logos/ptut.png" alt="PTUT – Punjab Tianjin University of Technology" className={`${h} w-auto`} />
      </span>
      <span className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" title="ASTC">
        {}
        <img src="/logos/astc.png" alt="ASTC logo" className={`${h} w-auto`} />
      </span>
    </div>
  );
}
