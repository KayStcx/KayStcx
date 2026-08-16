import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Header from './Header';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api/types';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./NotificationDropdown', () => ({
  default: () => <div>Notifications</div>,
}));

vi.mock('./ThemeToggle', () => ({
  default: () => <button type="button">Theme</button>,
}));

const mockAuthUser = (user: { role: UserRole } | null) => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    setUser: vi.fn(),
    isAuthenticated: !!user,
    isLoading: false,
    clearAuth: vi.fn(),
    login: vi.fn(),
  } as never);
};

describe('Header mobile navigation', () => {
  beforeEach(() => {
    mockAuthUser(null);
  });

  it('opens and closes a slide-out mobile navigation drawer', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Header role-based navigation', () => {
  it('shows admin-only navigation items to admins', () => {
    mockAuthUser({ role: UserRole.ADMIN });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Issue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Revoke').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Certificates').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wallet').length).toBeGreaterThan(0);
  });

  it('hides admin-only navigation items from recipients', () => {
    mockAuthUser({ role: UserRole.RECIPIENT });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Revoke')).not.toBeInTheDocument();
    expect(screen.queryByText('Certificates')).not.toBeInTheDocument();
    // Recipients still see the wallet link.
    expect(screen.getAllByText('Wallet').length).toBeGreaterThan(0);
  });

  it('shows only public links to unauthenticated visitors', () => {
    mockAuthUser(null);
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verify').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Wallet')).not.toBeInTheDocument();
    expect(screen.queryByText('Issue')).not.toBeInTheDocument();
  });
});
