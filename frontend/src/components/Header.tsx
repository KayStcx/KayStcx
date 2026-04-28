import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { User } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api/types';

type NavItem = {
  label: string;
  to: string;
  icon?: React.ReactNode;
};

export default function Header(): JSX.Element {
  const { user } = useAuth();

  const isIssuerOrAdmin =
    user?.role === UserRole.ISSUER || user?.role === UserRole.ADMIN;

  const navItems: NavItem[] = [
    // Public
    { label: 'Home', to: '/' },
    { label: 'Verify', to: '/verify' },

    // Authenticated common
    ...(user ? ([{ label: 'Dashboard', to: '/dashboard' }] as NavItem[]) : []),

    // Role-based (must match routes protected in App.tsx / ProtectedRoute)
    ...(isIssuerOrAdmin
      ? ([
          { label: 'Issue', to: '/issue' },
          { label: 'Revoke', to: '/revoke' },
          { label: 'Wallet', to: '/wallet' },
          { label: 'Certificates', to: '/certificates' },
        ] as NavItem[])
      : user
        ? ([{ label: 'Wallet', to: '/wallet' }] as NavItem[])
        : []),

    // Profile (authenticated)
    ...(user
      ? ([
          {
            label: 'Profile',
            to: '/profile',
            icon: <User className="h-4 w-4" />,
          },
        ] as NavItem[])
      : []),
  ];

  return (
    <header className="no-print border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/90 dark:backdrop-blur transition-colors duration-250">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white dark:text-slate-950 font-semibold transition-colors duration-250">
            SC
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-250">
              StellarCert
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-400 transition-colors duration-250">
              Certificate Verification System
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors duration-250">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition-colors duration-250 ${isActive
                    ? 'text-primary dark:text-primary'
                    : 'hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="h-6 w-px bg-gray-300 dark:bg-slate-700 transition-colors duration-250"></div>
          <NotificationDropdown />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-200 dark:border-white/5 px-4 py-3 text-xs font-medium text-gray-600 dark:text-slate-400 md:hidden transition-colors duration-250">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {navItems.map((item) => (
              <NavLink
                key={`${item.to}-mobile`}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1 transition-colors duration-250 ${isActive
                    ? 'bg-gray-100 dark:bg-white/10 text-primary dark:text-primary'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
