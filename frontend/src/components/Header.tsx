import { NavLink } from 'react-router-dom';

type NavItem = {
  label: string;
  to: string;
};

const navItems: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Verify', to: '/verify' },
  { label: 'Create', to: '/create' },
  { label: 'View', to: '/view' },
  { label: 'Dashboard', to: '/dashboard' }
];

export default function Header(): JSX.Element {
  return (
    <header className="no-print border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-slate-950 font-semibold">
            SC
          </div>
          <div>
            <p className="text-lg font-semibold">Kaystcx</p>
            <p className="text-xs text-slate-400">Certificate Verification System</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition-colors ${isActive ? 'text-primary' : 'hover:text-white'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-white/5 px-4 py-3 text-xs font-medium text-slate-400 md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={`${item.to}-mobile`}
            to={item.to}
            className={({ isActive }) =>
              `rounded-full px-3 py-1 transition-colors ${
                isActive ? 'bg-white/10 text-primary' : 'bg-white/5 text-slate-200'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}
