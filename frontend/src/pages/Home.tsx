import { Link } from 'react-router-dom';

type FeatureCard = {
  title: string;
  description: string;
};

const featureCards: FeatureCard[] = [
  {
    title: 'Type-safe issuance',
    description: 'Every certificate payload is validated with strict TypeScript models.'
  },
  {
    title: 'Mobile-first verification',
    description: 'Responsive flows designed for inspectors, HR teams, and recipients.'
  },
  {
    title: 'Print-ready layouts',
    description: 'Certificate previews are optimized for exporting and printing.'
  }
];

export default function Home(): JSX.Element {
  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-500/10 sm:p-12">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Trusted credential verification
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          Issue, verify, and manage certificates in minutes.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          Kaystcx helps institutions create tamper-evident digital certificates with built-in verification
          and ready-to-print layouts for formal credential delivery.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/create"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Create Certificate
          </Link>
          <Link
            to="/verify"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            Verify Certificate
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
