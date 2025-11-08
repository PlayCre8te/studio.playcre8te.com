import { authHeader } from './auth.js';

// ===== Build marker (helps verify you're running THIS file) =====
export const __API_JS_BUILD = 'api.js#v-2025-09-22-om1';
if (typeof window !== 'undefined') {
  console.log('[api.js] loaded', __API_JS_BUILD);
}

// ===== API BASE URLS =====
export const SIGNIN_API        = 'https://hozj26o2e4.execute-api.us-east-2.amazonaws.com/prod';
export const MEDIA_API         = 'https://l7kt5ga8jk.execute-api.us-east-2.amazonaws.com/prod';
export const MEDIALIBRARY_API  = 'https://rs30cqq30m.execute-api.us-east-2.amazonaws.com/prod';
export const BRAND_API         = 'https://bf8fc5jjb2.execute-api.us-east-2.amazonaws.com/prod/';
export const BILLING_API       = 'https://9gvcxw2vjk.execute-api.us-east-2.amazonaws.com/prod'; // ✅ new

// ===== Utilities =====
export function apiJoin(base, path) {
  if (!base) throw new Error('Base URL missing');
  return base.endsWith('/') ? base + path.replace(/^\//, '') : base + '/' + path.replace(/^\//, '');
}

// ===== Centralized fetch =====
async function request(url, opts = {}) {
  const tokenHeaders = authHeader?.() || {};
  const hasBody = opts.body != null;

  const headers = {
    ...tokenHeaders,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };

  const finalOpts = {
    method: opts.method || 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers,
    body: opts.body,
  };

  const res = await fetch(url, finalOpts);
  const text = await res.text();

  if (!res.ok) {
    console.error('API error', res.status, text);
    throw new Error(`${res.status} ${res.statusText}`);
  }

  try { return JSON.parse(text); } catch { return text; }
}

// ===== API client =====
export const api = {
  // Media Library
  listMedia() {
    return request(`${MEDIALIBRARY_API}/media`);
  },
  patchAsset(assetId, body) {
    return request(`${MEDIALIBRARY_API}/media/${encodeURIComponent(assetId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  markAsUploaded(assetId) {
    return request(`${MEDIALIBRARY_API}/media/upload/${assetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assetId, uploaded: true }),
    });
  },

  // Brands
  listBrandsByOwner(sub) {
    const url = sub
      ? apiJoin(BRAND_API, `brand?owner=${encodeURIComponent(sub)}`)
      : apiJoin(BRAND_API, 'brand');
    return request(url);
  },
  createBrand(payload) {
    return request(apiJoin(BRAND_API, 'brand'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Billing (✅ NEW)
  listCreatorAccounts(creatorId) {
    return request(`${BILLING_API}/creators/${encodeURIComponent(creatorId)}/accounts`);
  },
  createConnectAccount(payload) {
    return request(`${BILLING_API}/billing/creators/connect/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createProduct(payload) {
    return request(`${BILLING_API}/billing/products`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Settings / Profile
  userInfo(id_token) {
    return request(`${SIGNIN_API}/userinfo`, {
      method: 'POST',
      body: JSON.stringify({ id_token }),
    });
  },
  updateBio(id_token, creatorbio) {
    return request(`${SIGNIN_API}/update-bio`, {
      method: 'POST',
      body: JSON.stringify({ id_token, creatorbio }),
    });
  },
  getAvatarUploadUrl(id_token) {
    return request(`${MEDIA_API}/get-upload-url`, {
      method: 'POST',
      body: JSON.stringify({ id_token }),
    });
  },
  processAvatar(id_token, key) {
    return request(`${MEDIA_API}/process-avatar`, {
      method: 'POST',
      body: JSON.stringify({ id_token, key }),
    });
  },
};

// ===== Expose to window =====
if (typeof window !== 'undefined') {
  if (!window.MEDIALIBRARY_API) window.MEDIALIBRARY_API = MEDIALIBRARY_API;
  if (!window.BRAND_API) window.BRAND_API = BRAND_API;
  if (!window.BILLING_API) window.BILLING_API = BILLING_API; // ✅ expose new API
  if (!window.api) window.api = api;
  window.__API_JS_BUILD = __API_JS_BUILD;
}
