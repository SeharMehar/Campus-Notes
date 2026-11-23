interface ModuleIllustrationProps {
  title: string;
  courseTitle?: string;
}

export default function ModuleIllustration({
  title,
  courseTitle,
}: ModuleIllustrationProps) {
  return (
    <figure
      aria-label={`Illustration for ${title}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-slate-50"
    >
      <div className="grid min-h-44 items-center gap-6 px-6 py-8 md:grid-cols-[1fr_180px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">
            Visual guide
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">{title}</p>
          {courseTitle && (
            <p className="mt-1 text-sm text-slate-500">{courseTitle}</p>
          )}
        </div>
        <svg
          viewBox="0 0 180 140"
          role="img"
          aria-label="Learning diagram"
          className="mx-auto h-36 w-44"
        >
          <rect x="18" y="24" width="144" height="92" rx="18" fill="#fff7ed" stroke="#b85c38" strokeWidth="3" />
          <circle cx="90" cy="70" r="28" fill="#b85c38" />
          <circle cx="90" cy="70" r="10" fill="#fff" />
          <path d="M90 42V20M90 98v22M62 70H40M118 70h22" stroke="#6d6055" strokeWidth="4" strokeLinecap="round" />
          <circle cx="90" cy="20" r="6" fill="#d08c4c" />
          <circle cx="90" cy="120" r="6" fill="#d08c4c" />
          <circle cx="40" cy="70" r="6" fill="#d08c4c" />
          <circle cx="140" cy="70" r="6" fill="#d08c4c" />
        </svg>
      </div>
    </figure>
  );
}
