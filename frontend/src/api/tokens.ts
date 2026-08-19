/**
 * Token management utility for the API layer.
 *
 * Security model:
 * - The access token lives in this utility so the API client can attach it as
 *   a `Bearer` header.
 * - Refresh tokens are issued and rotated by the backend as an HttpOnly,
 *   SameSite cookie. They are not accessible to JavaScript at all and must
 *   not be persisted to `localStorage`/`sessionStorage`/cookies from the
 *   client side. The `/auth/refresh` endpoint reads the cookie
 *   automatically — the client only has to send the request with
 *   `credentials: "include"`.
 *
 * The previous implementation kept a `refreshToken` mirror in
 * `localStorage`. That mirror contradicted the comment above and made the
 * refresh token vulnerable to XSS. Issue #11 (frontend "F1") closed that
 * gap. As a defense-in-depth measure, on module load we eagerly delete any
 * legacy `refreshToken` entry that older bundles may still have written.
 */

const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";

if (typeof localStorage !== "undefined") {
  try {
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    /* ignore — private mode or storage disabled */
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem("accessToken"),
  setAccessToken: (token: string): void =>
    localStorage.setItem("accessToken", token),
  clearTokens: (): void => {
    // Refresh tokens live in HttpOnly cookies managed by the backend; this
    // helper only knows about the access token it actually owns.
    localStorage.removeItem("accessToken");
    // Belt-and-suspenders purge of any leftover client-side refresh tokens.
    try {
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
  hasAccessToken: (): boolean => !!localStorage.getItem("accessToken"),
};
