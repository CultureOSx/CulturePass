import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { QueryClient, QueryFunction } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getExplicitApiUrl } from '@/lib/config';

/**
 * CulturePassAU Sydney Query Client v2.0
 * Sydney API + Kerala diaspora optimized
 */

// Module-level token store — set by AuthProvider via setAccessToken().
// This avoids calling useAuth() outside a React component (hook rule violation).
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '') + '/';
}

/**
 * Sydney-first API base URL resolution:
 * EXPO_PUBLIC_API_URL → explicit prod config
 * localhost:5050      → local dev
 * EXPO_PUBLIC_DOMAIN  → Replit/Vercel preview
 * window.location     → web fallback
 *
 * FIX: Replit check was inverted — `!host.includes('replit')` returned the
 * localhost URL when running ON Replit and the Replit URL when NOT on Replit.
 */
export function getApiUrl(): string {
  const explicit = getExplicitApiUrl();
  if (explicit) return normalizeBaseUrl(explicit);

  if (Platform.OS !== 'web') {
    return normalizeBaseUrl('http://localhost:5050');
  }

  // Web: if running on Replit, use the public domain
  if (typeof window !== 'undefined' && window.location.host.includes('replit')) {
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    if (host) return normalizeBaseUrl(`https://${host}`);
    return normalizeBaseUrl(window.location.origin);
  }

  // Local dev web
  return normalizeBaseUrl('http://localhost:5050');
}

function normalizeRoute(route: string): string {
  return route.startsWith('/') ? route.slice(1) : route;
}

function routeForBase(baseUrl: string, route: string): string {
  const cleanedRoute = normalizeRoute(route);
  const basePath = new URL(baseUrl).pathname.replace(/\/+$/, '');
  const baseHasApiPrefix = basePath.endsWith('/api');
  const routeHasApiPrefix = cleanedRoute.startsWith('api/');

  if (baseHasApiPrefix && routeHasApiPrefix) {
    return cleanedRoute.slice(4);
  }

  return cleanedRoute;
}

export function buildApiUrl(route: string): string {
  const baseUrl = getApiUrl();
  const normalizedRoute = routeForBase(baseUrl, route);
  return new URL(normalizedRoute, baseUrl).toString();
}

// FIX: exported as a proper class so callers can do `instanceof ApiError`
// to distinguish API failures from network errors. Previously throwIfResNotOk
// threw a plain Error with a manually grafted `.status` — type-unsafe and
// incompatible with the `instanceof ApiError` check in auth.tsx.
export class ApiError extends Error {
  status: number;
  response: string;

  constructor(status: number, message: string, response: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

async function throwIfResNotOk(res: Response): Promise<void> {
  if (res.ok) return;

  let errorText = res.statusText;
  try {
    errorText = await res.text();
  } catch {}

  // FIX: throw ApiError instead of a plain Error with grafted properties
  throw new ApiError(res.status, `${res.status}: ${errorText} (${res.url})`, errorText);
}

/**
 * Auth-aware API request. Reads token from module-level store (set by AuthProvider)
 * rather than calling useAuth() which would violate React hook rules.
 */
const API_TIMEOUT_MS = 30_000;

export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  route: string,
  data?: unknown,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  const url = new URL(buildApiUrl(route));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  // expo/fetch uses FetchRequestInit which rejects null signal — strip it out.
  const { signal: callerSignal, ...safeOptions } = options as RequestInit & { signal?: AbortSignal | null };

  const signal = callerSignal ?? AbortSignal.timeout(API_TIMEOUT_MS);

  const res = await fetch(url.toString(), {
    ...safeOptions,
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
    credentials: 'include',
    signal,
  } as Parameters<typeof fetch>[1]);

  await throwIfResNotOk(res);
  return res;
}

// In-process request cache (5 min TTL)
const _cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function apiRequestCached(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  route: string,
  data?: unknown
): Promise<unknown> {
  const cacheKey = `${method}:${route}:${JSON.stringify(data ?? {})}`;
  const cached = _cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const res = await apiRequest(method, route, data);
  const json = await res.json();

  _cache.set(cacheKey, { data: json, timestamp: Date.now() });
  return json;
}

type UnauthorizedBehavior = 'returnNull' | 'throw' | 'redirect';

export const getQueryFn: <T>(
  options: { on401: UnauthorizedBehavior }
) => QueryFunction<T> = ({ on401 }) => async ({ queryKey }) => {
  // FIX: joining all queryKey segments with '/' produced broken URLs for
  // keys like ['/api/events', userId] → '/api/events/123' which is fine,
  // but keys like ['/api/events?city=sydney'] would be double-encoded.
  // Use only the first segment as the route (the canonical pattern in this
  // codebase) and ignore subsequent segments which are cache-key metadata.
  const route = String(queryKey[0]);

  const res = await fetch(buildApiUrl(route), {
    headers: _accessToken ? { Authorization: `Bearer ${_accessToken}` } : undefined,
    credentials: 'include',
  });

  if (res.status === 401) {
    if (on401 === 'returnNull') return null as any;
    if (on401 === 'redirect') {
      router.replace('/(onboarding)/login');
      return null as any;
    }
    // 'throw' falls through to throwIfResNotOk below
  }

  await throwIfResNotOk(res);
  return res.json();
};

/**
 * No retry on 4xx — only retry transient network/server errors.
 * FIX: also matches ApiError (the new typed class) in addition to plain Error.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;

  if (error instanceof ApiError) {
    return error.status < 400 || error.status >= 500;
  }

  if (error instanceof Error) {
    const match = error.message.match(/^(\d{3}):/);
    if (match && parseInt(match[1]) >= 400 && parseInt(match[1]) < 500) {
      return false;
    }
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: shouldRetry,
      refetchOnWindowFocus: Platform.OS === 'web',
      refetchInterval: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 2,
      onMutate: async () => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    },
  },
});

export function invalidateSydneyQueries() {
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey.some(
        (key) =>
          String(key).toLowerCase().includes('sydney') ||
          String(key).toLowerCase().includes('event')
      ),
  });
}

export function invalidateUserQueries(userId: string) {
  queryClient.invalidateQueries({ queryKey: ['user', userId] });
  queryClient.invalidateQueries({ queryKey: ['profile', userId] });
}

export function preheatSydneyData() {
  queryClient.prefetchQuery({
    queryKey: ['sydneyEvents'],
    queryFn: () => apiRequestCached('GET', 'api/events?city=sydney'),
  });
}