# Token Key Mismatch Issue - Documentation

**Issue ID**: [Auth] Fix Token Key Mismatch Between Storage and Retrieval  
**Status**: ⚠️ Not Fixed - Documentation of Issue  
**Date**: March 25, 2026  
**Severity**: High - Breaks notification system authentication

## Problem Summary

The frontend has an inconsistency in how authentication tokens are stored and retrieved from localStorage, causing the notification system to fail authentication for logged-in users.

### Root Cause

1. **Token Storage** (Login.tsx):
   - Uses `tokenStorage.setAccessToken(res.accessToken)` 
   - Stores token under key: `'kaystcx_access_token'` (defined in api/tokens.ts)

2. **Token Retrieval** (Multiple files):
   - Uses `localStorage.getItem('token')`
   - Attempts to retrieve token under key: `'token'` (incorrect)
   - **Result**: Always gets `null`, fails authentication

## Affected Files

### 1. **NotificationContext.tsx** - 4 instances
- **Line 37**: `const token = localStorage.getItem('token');` in `fetchNotifications()`
- **Line 54**: `const token = localStorage.getItem('token');` in `useEffect()` 
- **Line 74**: `const token = localStorage.getItem('token');` in `markAsRead()`
- **Line 89**: `const token = localStorage.getItem('token');` in `markAllAsRead()`

**Impact**: Notification system cannot authenticate API requests to:
- Fetch notifications endpoint
- Subscribe to WebSocket connection
- Mark notifications as read
- Mark all notifications as read

### 2. **NotificationPreferences.tsx** - 1 instance
- **Line 53**: `const token = localStorage.getItem('token');` in `handleSave()`

**Impact**: Users cannot save notification preferences

## Technical Details

### Token Storage Definition (api/tokens.ts)

```typescript
const ACCESS_TOKEN_KEY = 'kaystcx_access_token';
const REFRESH_TOKEN_KEY = 'kaystcx_refresh_token';

export const tokenStorage = {
    getAccessToken: (): string | null => {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },
    setAccessToken: (token: string): void => {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },
    // ... other methods
};
```

**Key Insight**: A centralized `tokenStorage` utility already exists and should be used consistently across the application.

## Current Implementation Issues

### NotificationContext.tsx (Lines 31-103)

The context is using raw `localStorage.getItem('token')` calls instead of the standardized `tokenStorage` utility:

```typescript
// ❌ Current (Broken)
const token = localStorage.getItem('token');

// ✅ Should be
const token = tokenStorage.getAccessToken();
```

### NotificationPreferences.tsx (Line 53)

Similar inconsistency:

```typescript
// ❌ Current (Broken)  
const token = localStorage.getItem('token');

// ✅ Should be
const token = tokenStorage.getAccessToken();
```

## Solution

### Fix Strategy

**Use the standardized `tokenStorage` utility across all files** instead of directly accessing localStorage with inconsistent keys.

### Required Changes

#### 1. NotificationContext.tsx
- Import `tokenStorage` from `../api/tokens`
- Replace all 4 instances of `localStorage.getItem('token')` with `tokenStorage.getAccessToken()`
- Files affected:
  - Line 37 → fetchNotifications()
  - Line 54 → useEffect()
  - Line 74 → markAsRead()
  - Line 89 → markAllAsRead()

#### 2. NotificationPreferences.tsx
- Import `tokenStorage` from `../api/tokens`
- Replace line 53: `localStorage.getItem('token')` with `tokenStorage.getAccessToken()`
- File affected:
  - Line 53 → handleSave()

### Implementation Checklist

- [ ] Add import statement to NotificationContext.tsx: `import { tokenStorage } from '../api/tokens';`
- [ ] Replace 4 instances in NotificationContext.tsx
- [ ] Add import statement to NotificationPreferences.tsx: `import { tokenStorage } from '../api/tokens';`
- [ ] Replace 1 instance in NotificationPreferences.tsx
- [ ] Test notification system:
  - [ ] Login to application
  - [ ] Verify notifications load correctly
  - [ ] Verify WebSocket connection establishes
  - [ ] Test marking notifications as read
  - [ ] Test marking all as read
  - [ ] Test saving notification preferences
- [ ] Verify no console errors related to authentication

## Expected Behavior After Fix

1. ✅ Upon successful login, accessToken is stored under `'kaystcx_access_token'`
2. ✅ NotificationContext correctly retrieves the token using the same key
3. ✅ API requests to notification endpoints include valid Bearer token
4. ✅ WebSocket connection auth succeeds
5. ✅ Notification system functions for authenticated users

## Additional Notes

### Why Use tokenStorage?

Using the centralized `tokenStorage` utility provides:
- **Single source of truth**: Token keys defined in one place
- **Consistency**: All token access goes through the same interface
- **Maintainability**: Future changes to token storage only need updates in one file
- **Type safety**: Methods have proper TypeScript typing (returns `string | null`)
- **Encapsulation**: Abstraction layer between storage mechanism and code

### Related Components

Other components that correctly use tokenStorage (for reference):
- Login.tsx: Uses `tokenStorage.setAccessToken()` ✅
- App.tsx or other API call handlers may also need review

### Similar Issues to Watch For

Check for other direct `localStorage` access patterns:
- `localStorage.getItem('token')`
- `localStorage.getItem('refreshToken')`  
- `localStorage.getItem('accessToken')`

All should be routed through the `tokenStorage` utility for consistency.

## References

- **Token Utility**: [api/tokens.ts](src/api/tokens.ts)
- **NotificationContext**: [context/NotificationContext.tsx](src/context/NotificationContext.tsx)
- **NotificationPreferences**: [pages/NotificationPreferences.tsx](src/pages/NotificationPreferences.tsx)
- **Login Page**: [pages/Login.tsx](src/pages/Login.tsx)
