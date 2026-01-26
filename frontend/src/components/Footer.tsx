export default function Footer(): JSX.Element {
  return (
    <footer className="no-print border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Built for trusted credential issuance and instant verification.</p>
        <p>Kaystcx © 2026</p>
      </div>
    </footer>
  );
}
