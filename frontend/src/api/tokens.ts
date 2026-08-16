/**
 * Token management utility for the API layer.
 *
 * Security model:
 * - Access tokens are short-lived and stored in `sessionStorage`, so they are
 *   cleared when the tab closes and are less persistent than localStorage.
 * - Refresh tokens are long-lived. The long-term target is to keep them out of
 *   JavaScript entirely by issuing them as `httpOnly` cookies from the server
 *   (see the `@deprecated` methods below). Until the backend cookie flow lands,
 *   the refresh token is kept in localStorage so the client can call
 *   `/auth/refresh`; treat it as XSS-sensitive and migrate off it as soon as
 *   the server sets the cookie.
 */

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const tokenStorage = {
  getAccessToken: (): string | null =>
    sessionStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string): void =>
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token),

  /**
   * @deprecated Refresh tokens should be handled server-side via httpOnly
   * cookies and must not be readable from JavaScript. These helpers remain only
   * for backward compatibility with the current body-based `/auth/refresh`
   * flow; remove them once the backend switches to cookie-based refresh.
   */
  getRefreshToken: (): string | null =>
    localStorage.getItem(REFRESH_TOKEN_KEY),
  /**
   * @deprecated See {@link tokenStorage.getRefreshToken}.
   */
  setRefreshToken: (token: string): void =>
    localStorage.setItem(REFRESH_TOKEN_KEY, token),

  clearTokens: (): void => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  hasAccessToken: (): boolean => !!sessionStorage.getItem(ACCESS_TOKEN_KEY),
};
