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

describe('Header mobile navigation', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      setUser: vi.fn(),
      setProfile: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
      loadProfile: vi.fn(),
      clearAuth: vi.fn(),
      login: vi.fn(),
    } as never);
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
  const renderHeaderWithUser = (user: { id: string; role: UserRole } | null) => {
    vi.mocked(useAuth).mockReturnValue({
      user: user as never,
      profile: null,
      setUser: vi.fn(),
      setProfile: vi.fn(),
      isAuthenticated: !!user,
      isLoading: false,
      loadProfile: vi.fn(),
      clearAuth: vi.fn(),
      login: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
  };

  it('shows only public links when the user is unauthenticated', () => {
    renderHeaderWithUser(null);

    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Verify' }).length).toBeGreaterThan(0);

    expect(screen.queryAllByRole('link', { name: 'Dashboard' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Issue' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Wallet' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Profile' })).toHaveLength(0);
  });

  it('shows admin navigation items for admin users', () => {
    renderHeaderWithUser({ id: 'admin-1', role: UserRole.ADMIN });

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Issue' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Revoke' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Wallet' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Certificates' }).length).toBeGreaterThan(0);
  });

  it('shows issuer navigation items for issuer users', () => {
    renderHeaderWithUser({ id: 'issuer-1', role: UserRole.ISSUER });

    expect(screen.getAllByRole('link', { name: 'Issue' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Revoke' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Certificates' }).length).toBeGreaterThan(0);
  });

  it('hides issuer and admin items for recipient users', () => {
    renderHeaderWithUser({ id: 'recipient-1', role: UserRole.RECIPIENT });

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Wallet' }).length).toBeGreaterThan(0);

    expect(screen.queryAllByRole('link', { name: 'Issue' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Revoke' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Certificates' })).toHaveLength(0);
  });

  it('hides issuer and admin items for verifier users', () => {
    renderHeaderWithUser({ id: 'verifier-1', role: UserRole.VERIFIER });

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Wallet' }).length).toBeGreaterThan(0);

    expect(screen.queryAllByRole('link', { name: 'Issue' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Revoke' })).toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: 'Certificates' })).toHaveLength(0);
  });

  it('points navigation links to the correct routes', () => {
    renderHeaderWithUser({ id: 'issuer-1', role: UserRole.ISSUER });

    expect(screen.getAllByRole('link', { name: 'Home' })[0]).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: 'Verify' })[0]).toHaveAttribute('href', '/verify');
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toHaveAttribute('href', '/dashboard');
    expect(screen.getAllByRole('link', { name: 'Issue' })[0]).toHaveAttribute('href', '/issue');
    expect(screen.getAllByRole('link', { name: 'Revoke' })[0]).toHaveAttribute('href', '/revoke');
    expect(screen.getAllByRole('link', { name: 'Wallet' })[0]).toHaveAttribute('href', '/wallet');
    expect(screen.getAllByRole('link', { name: 'Certificates' })[0]).toHaveAttribute('href', '/certificates');
  });
});
