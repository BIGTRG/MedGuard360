/**
 * Outbound HTTP client base URLs for prior-auth-service.
 * The engine uses native fetch with these constants; this module
 * centralises them so tests and other consumers can override via env.
 */

export const STATE_CONFIG_BASE_URL =
  process.env.STATE_CONFIG_SERVICE_URL ?? 'http://state-config-service:3018';

export const PA_NLP_MATCHER_BASE_URL =
  process.env.PA_NLP_MATCHER_URL ?? 'http://pa-nlp-matcher:8006';
