// /creator/index.js
import { ensureAuth, getAuthToken, logout } from './lib/auth.js';
import { bus } from './lib/eventBus.js';

// Map each route to its HTML partial + JS module
const routes = {
  dashboard: {
    html: () => fetch('./sections/dashboard/dashboard.html').then(r => r.text()),
    js:   () => import('./sections/dashboard/dashboard.js'),
  },
  media: {
    html: () => fetch('./sections/media/media.html').then(r => r.text()),
    js:   () => import('./sections/media/media.js'),
  },
  brands: {
    html: () => fetch('./sections/brands/brands.html').then(r => r.text()),
    js:   () => import('./sections/brands/brands.js'),
  },
  products: {
    html: () => fetch('./sections/products/products.html').then(r => r.text()),
    js:   () => import('./sections/products/products.js'),
  },
  subscribers: {
    html: () => fetch('./sections/subscribers/subscribers.html').then(r => r.text()),
    js:   () => import('./sections/subscribers/subscribers.js'),
  },
  analytics: {
    html: () => fetch('./sections/analytics/analytics.html').then(r => r.text()),
    js:   () => import('./sections/analytics/analytics.js'),
  },
  earnings: {
    html: () => fetch('./sections/earnings/earnings.html').then(r => r.text()),
    js:   () => import('./sections/earnings/earnings.js'),
  },
  addons: {
    html: () => fetch('./sections/addons/addons.html').then(r => r.text()),
    js:   () => import('./sections/addons/addons.js'),
  },
  billing: {
    html: () => fetch('./sections/billing/billing.html').then(r => r.text()),
    js:   () => import('./sections/billing/billing.js'),
  },
  settings: {
    html: () => fetch('./sections/settings/settings.html').then(r => r.text()),
    js:   () => import('./sections/settings/settings.js'),
  },
  help: {
    html: () => fetch('./sections/help/help.html').then(r => r.text()),
    js:   () => import('./sections/help/help.js'),
  },
};

const app = document.getElementById('app');
let current = null;
let navToken = 0;

async function show(route) {
  if (!routes[route]) route = 'dashboard';
  const myToken = ++navToken;

  // teardown previous section
  if (current?.destroy) { try { current.destroy(); } catch (e) { console.warn(e); } }
  app.innerHTML = '';

  // fetch this section's HTML
  const html = await routes[route].html();
  if (myToken !== navToken) return; // user navigated again
  app.innerHTML = html;

  // load and init JS
  const mod = await routes[route].js();
  if (myToken !== navToken) return;
  current = mod;
  await mod.init?.({ app, bus });
}

// global UI hooks that should always exist
document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
  const menu = document.getElementById('mobileMenu');
  menu?.classList.toggle('hidden');
});
document.getElementById('logoutBtn')?.addEventListener('click', logout);

// auth gate
await ensureAuth();

// light “top avatar” fetch on boot (from your code)
(async function loadTopAvatarOnly(){
  const token = getAuthToken();
  if (!token) return;
  const SIGNIN_API = 'https://hozj26o2e4.execute-api.us-east-2.amazonaws.com/prod';
  try {
    const res = await fetch(`${SIGNIN_API}/userinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: localStorage.getItem('id_token') })
    });
    const data = await res.json();
    if (res.ok && data.creatorAvatar?.hd) {
      const el = document.getElementById('avatarHDThumb');
      if (el) el.src = data.creatorAvatar.hd;
    }
  } catch(e) { console.error('Top avatar fetch failed:', e); }
})();

// hash routing
window.addEventListener('hashchange', () => show(location.hash.slice(1)));
show(location.hash.slice(1) || 'dashboard');
