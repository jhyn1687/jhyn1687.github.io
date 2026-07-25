// Site chrome rather than a section, so it's hardcoded here instead of living in
// the `sections` table. Its main job is to be the one place `/AGENTS.md` is
// actually linked from — nothing else on the site points at it, and no major
// crawler probes for it by convention, so an unlinked file is an unread one.
export function Footer() {
  return (
    <footer className="mx-auto flex max-w-2xl flex-col gap-1 px-6 pt-8 pb-10 text-sm text-ctp-overlay1">
      <span>© {new Date().getFullYear()} tony yuan</span>
      {/* w-fit so the hover target is the text, not the full column width. */}
      <a
        href="/AGENTS.md"
        className="w-fit transition-colors hover:text-ctp-teal"
      >
        /AGENTS.md
      </a>
    </footer>
  );
}
