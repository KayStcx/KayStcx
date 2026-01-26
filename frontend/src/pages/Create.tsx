export default function Create(): JSX.Element {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Create a Certificate</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Build a new certificate template with structured data and a print-ready preview.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <form className="grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recipient Name
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                placeholder="Jordan Lewis"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Program / Course
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                placeholder="Blockchain Fundamentals"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Issue Date
                </label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Certificate ID
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-primary"
                  placeholder="KX-2026-00023"
                />
              </div>
            </div>
            <button
              type="button"
              className="mt-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Generate Certificate
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="certificate-text text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Certificate of Completion</p>
              <h3 className="mt-4 text-2xl font-bold text-white">Jordan Lewis</h3>
              <p className="mt-3 text-sm text-slate-300">
                has successfully completed the Blockchain Fundamentals program.
              </p>
              <p className="mt-6 text-xs text-slate-400">Issued Jan 12, 2026 · ID KX-2026-00023</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Print layout is optimized with dedicated print styles.
          </p>
        </div>
      </div>
    </section>
  );
}
