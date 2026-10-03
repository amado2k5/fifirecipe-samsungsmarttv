import { API_ORIGIN } from '../config';
import type {
  Chapter,
  EndpointTemplates,
  Feed,
  ImageInfo,
  KidsCard,
  KidsRecipeDetail,
  RecipeCard,
  RecipeFile,
  TvManifest,
  VideoFile,
} from './types';

const DEFAULT_ENDPOINTS: EndpointTemplates = {
  index: '/data/tv/index/{lang}.json',
  feed: '/data/tv/feed/{lang}.json',
  chapters: '/data/tv/chapters/{lang}.json',
  kids: '/data/tv/kids/{lang}.json',
  recipe: '/data/recipes/{id}.json',
  i18n: '/data/i18n/{lang}.json',
  search: '/data/search/{lang}.json',
  videos: '/data/videos/{id}.json',
  kidsRecipe: '/data/kids/{lang}/{id}.json',
  images: '/data/tv/images.json',
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** In-memory (session) cache only — the product is online-only. */
const cache = new Map<string, Promise<unknown>>();

let manifest: TvManifest | null = null;
let endpoints: EndpointTemplates = DEFAULT_ENDPOINTS;

function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(encodeURIComponent(v));
  return out;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new ApiError(`GET ${url} -> ${res.status}`, res.status);
  return (await res.json()) as T;
}

function cached<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetchJson<T>(url);
    p.catch(() => cache.delete(url)); // failed fetches are not cached, so retry works
    cache.set(url, p);
  }
  return p;
}

/** Versioned GET — appends ?v=<manifest version> once the manifest is loaded. */
export function getJson<T>(path: string, fresh = false): Promise<T> {
  const version = manifest?.version;
  const url = API_ORIGIN + path + (version ? `?v=${encodeURIComponent(version)}` : '');
  if (fresh) cache.delete(url);
  return cached<T>(url);
}

export function get<T>(endpoint: keyof EndpointTemplates, vars: Record<string, string> = {}, fresh = false): Promise<T> {
  return getJson<T>(fill(endpoints[endpoint] ?? DEFAULT_ENDPOINTS[endpoint], vars), fresh);
}

/** Resolves a site-relative asset path (e.g. /recipe-images/x.jpg) or external URL. */
export function assetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : API_ORIGIN + path;
}

export async function loadManifest(): Promise<TvManifest> {
  manifest = await fetchJson<TvManifest>(`${API_ORIGIN}/data/tv/manifest.json`);
  endpoints = { ...DEFAULT_ENDPOINTS, ...manifest.endpoints };
  return manifest;
}

export function getManifest(): TvManifest | null {
  return manifest;
}

export const api = {
  index: (lang: string) => get<RecipeCard[]>('index', { lang }),
  feed: (lang: string) => get<Feed>('feed', { lang }),
  /** Bypasses the session cache: the server returns a new random home layout per request. */
  freshFeed: (lang: string) => get<Feed>('feed', { lang }, true),
  chapters: (lang: string) => get<Chapter[]>('chapters', { lang }),
  kids: (lang: string) => get<KidsCard[]>('kids', { lang }),
  recipe: (id: string) => get<RecipeFile>('recipe', { id }),
  videos: (id: string) => get<VideoFile>('videos', { id }),
  search: (lang: string) => get<Record<string, string>>('search', { lang }),
  kidsRecipe: (lang: string, id: string) => get<KidsRecipeDetail>('kidsRecipe', { lang, id }),
  images: () => get<Record<string, ImageInfo>>('images'),
};

/** Clears the session cache (used by the Retry path on the error screen). */
export function clearCache() {
  cache.clear();
}
