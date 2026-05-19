/**
 * Typed API client — thin wrapper around the existing api-client.
 * New pages can import from here for a simpler, token-optional interface,
 * or use the full api-client directly for refresh-token support.
 */

export { api, ApiError, login, logout } from './api-client';
