type Stat = {
  label: string;
  value: string;
};

const stats: Stat[] = [
  { label: 'Certificates issued', value: '1,248' },
  { label: 'Pending verifications', value: '36' },
  { label: 'Active issuers', value: '12' }
];

export default function Dashboard(): JSX.Element {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Issuer Dashboard</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Track issuance activity, verification performance, and recent exports in one place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {[
              'Issued KX-2026-00023 to Jordan Lewis',
              'Exported 12 certificates for Q1 cohort',
              'Verification request received from ACME Labs'
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
          <h3 className="text-lg font-semibold text-white">Quick actions</h3>
          <div className="mt-4 space-y-3">
            {['Create new certificate', 'Invite issuer', 'Export PDF batch'].map((item) => (
              <button
                key={item}
                type="button"
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left text-sm text-white transition hover:border-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
