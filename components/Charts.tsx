'use client';


export function AreaChart({
  data,
  color = '#b85c38',
  height = 220,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const W = 640;
  const H = height;
  const pad = { l: 36, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / niceMax) * innerH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)} ${pad.t + innerH} L${x(0).toFixed(1)} ${pad.t + innerH} Z` : '';
  const ticks = [0, 1, 2, 3, 4].map((t) => (niceMax / 4) * t);
  const step = Math.ceil(data.length / 7);
  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.12" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.55">{Math.round(t)}</text>
        </g>
      ))}
      {area && <path d={area} fill={`url(#${gradId})`} />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2">
            <title>{`${d.label}: ${d.value}`}</title>
          </circle>
          {i % step === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.55">{d.label.slice(5)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function BarList({
  rows,
  color = '#b85c38',
  empty = 'No data yet',
}: {
  rows: { label: string; sub?: string; value: number; suffix?: string }[];
  color?: string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label + (r.sub ?? '')}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-800">{r.label}{r.sub && <span className="ml-2 text-xs font-normal text-slate-400">{r.sub}</span>}</span>
            <span className="shrink-0 font-bold text-slate-900">{r.value}{r.suffix}</span>
          </div>
          <div className="h-2.5 bg-slate-100"><div className="h-full transition-all duration-700" style={{ width: `${(r.value / max) * 100}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-40 w-40 -rotate-90"
          role="img"
          aria-label={`${centerValue} ${centerLabel}. ${slices.map((slice) => `${slice.label}: ${slice.value}`).join(', ')}`}
        >
          <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="18" />
          {total > 0 &&
            slices.map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{centerValue}</span>
          <span className="text-[11px] font-semibold text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-700"><span className="h-3 w-3" style={{ background: s.color }} />{s.label}</span>
            <span className="font-bold text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
