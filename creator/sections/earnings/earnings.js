// ==============================
// Earnings (single-brand, robust)
// ==============================

// creator/sections/earnings.js

// Ensure Billing API is available (kept local so we don't rely on api.js cache)
(function ensureBillingApi() {
  if (!globalThis.BILLING_API) {
    // <-- paste your API Gateway base URL here if window.BILLING_API is not set elsewhere
    globalThis.BILLING_API = "https://9gvcxw2vjk.execute-api.us-east-2.amazonaws.com/prod";
  }
})();

// Auth helpers reused across your app
function getIdToken() {
  try {
    return (typeof getAuthToken === 'function')
      ? getAuthToken()
      : (localStorage.getItem('id_token') || localStorage.getItem('access_token') || '');
  } catch { return ''; }
}
function getSub() {
  try {
    const id = localStorage.getItem('id_token') || '';
    if (!id.includes('.')) return '';
    return JSON.parse(atob(id.split('.')[1] || ''))?.sub || '';
  } catch { return ''; }
}

// Thin fetch wrapper (no cookies)
async function req(path, opts = {}) {
  const token = getIdToken();
  const headers = {
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const base = (globalThis.BILLING_API || '').replace(/\/+$/, '');
  const url  = `${base}/${String(path).replace(/^\/+/, '')}`;

  const res = await fetch(url, {
    method: opts.method || 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// Render the simple one-account panel
async function renderOneAccountPanel() {
  const panel  = document.getElementById('earningsPanel');
  const status = document.getElementById('earningsStatus');
  const tbody  = document.getElementById('earningsAccounts');
  const btn    = document.getElementById('earningsStartOnboarding');

  if (!panel || !status || !tbody || !btn) return;

  const sub = getSub();
  const token = getIdToken();

  if (!token || !sub) {
    status.textContent = 'You are not signed in. Please sign in to manage payouts.';
    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-not-allowed');
    return;
  }

  async function refreshAccounts() {
    status.textContent = 'Loading…';
    tbody.innerHTML = '';

    try {
      const data = await req(`/creators/${encodeURIComponent(sub)}/accounts`);
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      if (!items.length) {
        tbody.innerHTML = `<tr><td class="py-2 pr-4 text-gray-300" colspan="4">No Connect account yet.</td></tr>`;
      } else {
        const a = items[0]; // single-account policy
        tbody.innerHTML = `
          <tr class="border-t border-gray-800">
            <td class="py-2 pr-4 font-mono">${a.accountId || ''}</td>
            <td class="py-2 pr-4">${a.chargesEnabled ? '✅' : '❌'}</td>
            <td class="py-2 pr-4">${a.payoutsEnabled ? '✅' : '❌'}</td>
            <td class="py-2 pr-4 text-gray-400">${a.updatedAt ? new Date(a.updatedAt).toLocaleString() : '—'}</td>
          </tr>
        `;
      }
      status.textContent = '';
    } catch (e) {
      console.error(e);
      status.textContent = 'Failed to load account.';
      tbody.innerHTML = `<tr><td class="py-2 pr-4 text-red-400" colspan="4">Load failed.</td></tr>`;
    }
  }

  // Button: start/continue onboarding (works for first-time or incomplete)
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('opacity-60');
    status.textContent = 'Creating onboarding link…';
    try {
      const refreshUrl = location.origin + '/creator/#/earnings?state=refresh';
      const returnUrl  = location.origin + '/creator/#/earnings?state=return';
      const r = await req('/billing/creators/connect/start', {
        method: 'POST',
        body: { creatorId: sub, refreshUrl, returnUrl }
      });
      if (r?.onboardingUrl) {
        window.location.href = r.onboardingUrl;
        return;
      }
      alert('Could not get onboarding URL.');
    } catch (err) {
      console.error(err);
      alert('Failed to start onboarding.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-60');
      status.textContent = '';
      // fresh pull (in case account was created)
      refreshAccounts();
    }
  });

  // Initial load
  refreshAccounts();
}

// ===== your section lifecycle (kept tiny, no SPA router assumptions) =====
let cleanup = [];
export async function init() {
  // This file only uses IDs in earnings.html; no need for `app` root param
  await renderOneAccountPanel();
}
export function destroy(){ cleanup.forEach(fn => fn()); cleanup = []; }
