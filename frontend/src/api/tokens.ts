/**
 * Token management utility for the API layer
 * 
 * Security improvements:
 * - Access tokens stored in sessionStorage (cleared when tab closes)
 * - Refresh tokens handled server-side via httpOnly cookies (not accessible to JavaScript)
 */

const ACCESS_TOKEN_KEY = 'kaystcx_access_token';

export const tokenStorage = {
    getAccessToken: (): string | null => {
        return sessionStorage.getItem(ACCESS_TOKEN_KEY);
    },

    setAccessToken: (token: string): void => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    },

    clearTokens: (): void => {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    },

    hasAccessToken: (): boolean => {
        return !!sessionStorage.getItem(ACCESS_TOKEN_KEY);
    },
};
