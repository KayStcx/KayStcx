/**
 * Token management utility for the API layer
 * 
 * Security improvements:
 * - Access tokens stored in sessionStorage (cleared when tab closes)
 * - Refresh tokens handled server-side via httpOnly cookies (not accessible to JavaScript)
 */

export const tokenStorage = {
    getAccessToken: (): string | null => localStorage.getItem('accessToken'),
    setAccessToken: (token: string): void => localStorage.setItem('accessToken', token),
    getRefreshToken: (): string | null => localStorage.getItem('refreshToken'),
    setRefreshToken: (token: string): void => localStorage.setItem('refreshToken', token),
    clearTokens: (): void => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    hasAccessToken: (): boolean => !!localStorage.getItem('accessToken'),
  };
