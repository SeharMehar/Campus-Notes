import { Brand, PartnerLogos } from './Brand';

export default function SiteFooter() {
  return (
    <footer className="bg-[#2e2420] text-slate-300">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="text-center md:text-left">
          <Brand light />
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-400">
            Free notes, AI summaries and practice quizzes for university students.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 md:items-end">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Proudly built at</span>
          <PartnerLogos size="lg" showDivider={false} />
          <span className="text-[11px] text-slate-400">Punjab Tianjin University of Technology · ASTC</span>
        </div>
      </div>
      <div className="bg-black/15 py-3 text-center text-[11px] text-slate-400">CampusNotes © 2026 · All rights reserved</div>
    </footer>
  );
}
