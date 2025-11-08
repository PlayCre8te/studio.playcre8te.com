// ==== SAFE HEADER (do not edit your working block below) =====================
let __brandApp = null;
let __brand_getById_orig = document.getElementById.bind(document);

// ---- GLOBAL helper: resolveLandscapeUrl (strict first, then resilient fallback) ----
window.resolveLandscapeUrl = function resolveLandscapeUrl(item) {
  const pick = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object' && typeof v.url === 'string') return v.url.trim();
    return '';
  };

  // 1) STRICT: the DB-provided path we want most
  let url =
    pick(item?.mediaUrl?.artwork?.primary?.landscape) || '';

  // 2) Known alternates you already support
  if (!url) {
    url =
      pick(item?.landscape) ||
      pick(item?.urls?.landscape) ||
      pick(item?.mediaUrl?.landscape) ||
      pick(item?.artwork?.primary?.landscape) ||
      pick(item?.artwork?.landscape) ||
      pick(item?.thumbnails?.landscape) ||
      '';
  }


  // 3) SMART FALLBACK: find the first URL-like string anywhere in the object
  if (!url) {
    url = (function findFirstImageUrl(obj) {
      let found = '';
      const seen = new Set();
      const isUrlish = (s) => /^(https?:)?\/\//i.test(s);
      const looksImage = (s) => /\.(png|webp|jpg|jpeg|svg|gif)$/i.test(s) || /image\/(png|webp|jpeg|gif|svg)/i.test(s);

      function norm(s) { return s.startsWith('//') ? 'https:' + s : s; }

      function walk(o) {
        if (!o || found) return;
        if (typeof o === 'string') {
          const s = o.trim();
          if (isUrlish(s) && looksImage(s)) { found = norm(s); }
          return;
        }
        if (typeof o !== 'object') return;
        if (seen.has(o)) return;
        seen.add(o);

        // Prefer keys that *sound* like an image first
        const entries = Object.entries(o);
        entries.sort((a, b) => {
          const ak = /landscape|image|artwork|thumb|url/i.test(a[0]) ? -1 : 0;
          const bk = /landscape|image|artwork|thumb|url/i.test(b[0]) ? -1 : 0;
          return ak - bk;
        });
        for (const [,v] of entries) { walk(v); if (found) break; }
      }
      walk(obj);
      return found;
    })(item) || '';
  }

  // Normalize protocol-less URLs ("//cdn...") → "https://cdn..."
  if (url && url.startsWith('//')) url = 'https:' + url;

  // Only http(s) is allowed
  if (url && !/^https?:\/\//i.test(url)) return '';

  return url;
};

// Install a one-time CSS fix so images can't collapse in the picker
// ---- Inline picker thumbnail sizing (once) ----
(function ensurePickerImgCSS() {
  if (document.getElementById('pcPickerFix')) return;
  const style = document.createElement('style');
  style.id = 'pcPickerFix';
  style.textContent = `
    /* Force thumbnails to have a visible height inside the inline picker */
    #pcInlineMediaPicker img.pc-thumb {
      display: block !important;
      width: 100% !important;
      height: 180px !important;
      object-fit: cover !important;
      background: #111 !important;
      max-width: none !important;
      max-height: none !important;
    }
  `;
  document.head.appendChild(style);
})();


// Prevent crashes during module import if elements aren’t in DOM yet
(function installSafeGetByIdDuringImport() {
  const NOOP = () => {};
  const NOOP_EL = {
    addEventListener: NOOP,
    removeEventListener: NOOP,
    classList: { add: NOOP, remove: NOOP, toggle: NOOP },
    setAttribute: NOOP,
    removeAttribute: NOOP,
    querySelector: () => null,
    querySelectorAll: () => [],
    style: {}
  };
  document.getElementById = function(id) {
    return __brand_getById_orig(id) || NOOP_EL;
  };
})();

// Provide globals your block expects if not already present
if (!globalThis.getAuthToken) {
  globalThis.getAuthToken = () =>
    localStorage.getItem('access_token') || localStorage.getItem('id_token') || '';
}
if (!globalThis.getUserSub) {
  globalThis.getUserSub = function () {
    const t = localStorage.getItem('id_token');
    if (!t) return null;
    try { return JSON.parse(atob(t.split('.')[1]))?.sub || null; } catch { return null; }
  };
}
if (!globalThis.escapeHtml) {
  globalThis.escapeHtml = (s) => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Match media.js pattern: define BRAND_API only if not already defined
if (typeof globalThis.BRAND_API === 'undefined') {
  globalThis.BRAND_API = 'https://bf8fc5jjb2.execute-api.us-east-2.amazonaws.com/prod/';
}

// 🚫 Do NOT auto-derive MEDIALIBRARY_API from BRAND_API.
// ✅ Must be set explicitly (in api.js or via <script> in HTML).
//    e.g. window.MEDIALIBRARY_API = 'https://rs30cqq30m.execute-api.us-east-2.amazonaws.com/prod';


// 🔧 apiJoin shim
if (typeof globalThis.apiJoin !== 'function') {
  globalThis.apiJoin = function(base, path) {
    if (!base) throw new Error('BRAND_API is not defined');
    const p = String(path || '').replace(/^\//, '');
    return base.endsWith('/') ? base + p : base + '/' + p;
  };
}


// --- SHIM: ensure a global showSection exists so your block can extend it ---
if (typeof globalThis.showSection !== 'function') {
  globalThis.showSection = function noopShowSection() {};
}

// --- bootstrap globals so resolveMediaApiBase can always find them ---
(function ensureMediaLibraryGlobal(){
  const w = (typeof window !== 'undefined') ? window : globalThis;

  // If api.js set a base URL somewhere structured, you can read it here too if needed.
  // Example: if your api.js exposes api.baseUrls.media, uncomment the next line:
  // if (!w.MEDIALIBRARY_API && w.api?.baseUrls?.media) w.MEDIALIBRARY_API = w.api.baseUrls.media;

  // Mirror onto globalThis so code using either window.* or globalThis.* works.
  if (!globalThis.MEDIALIBRARY_API && w.MEDIALIBRARY_API) {
    globalThis.MEDIALIBRARY_API = w.MEDIALIBRARY_API;
  }

  // Populate common aliases some code paths probe
  if (!w.MEDIA_LIBRARY_API && w.MEDIALIBRARY_API) w.MEDIA_LIBRARY_API = w.MEDIALIBRARY_API;
  if (!w.MediaLibraryApi  && w.MEDIALIBRARY_API) w.MediaLibraryApi  = w.MEDIALIBRARY_API;
  if (!w.MediaApiBase     && w.MEDIALIBRARY_API) w.MediaApiBase     = w.MEDIALIBRARY_API;
})();

// --- MediaPicker plumbing (global) — 1-based slots to match your DOM IDs ---
if (!globalThis.MediaPicker) {
  globalThis.MediaPicker = { active:false, brandId:null, slot:null, onPick:null };
}

// ✅ Single global closer (idempotent)
if (!globalThis.closeInlineMediaPicker) {
  globalThis.closeInlineMediaPicker = function closeInlineMediaPicker() {
    const el = document.getElementById('pcInlineMediaPicker');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try {
      if (globalThis.MediaPicker) {
        globalThis.MediaPicker.active = false;
        globalThis.MediaPicker.onPick  = null;
        globalThis.MediaPicker.slot    = null;
        globalThis.MediaPicker.brandId = null;
      }
    } catch {}
  };
}



if (!globalThis.openHeroImageLibrary) {
  globalThis.openHeroImageLibrary = function(brandId, slot1Based) {
    try {
      const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
      if (!token) { alert('Please sign in to pick from your media library.'); return; }

      // Flag picker mode so we keep the same contract
      globalThis.MediaPicker.active  = true;
      globalThis.MediaPicker.brandId = brandId;
      globalThis.MediaPicker.slot    = slot1Based;

      // When the user clicks "Select" in the inline picker
      globalThis.MediaPicker.onPick = function({ assetId, url, slot }) {
        try {
          const oneBased = Number(slot || slot1Based) || 1;
          const idx = Math.max(0, Math.min(2, oneBased - 1));

          const d = ensureDraft(brandId);
          if (!d.appearance.heroBanners) d.appearance.heroBanners = [{},{},{}];
          const cell = d.appearance.heroBanners[idx] || (d.appearance.heroBanners[idx] = {});
          cell.imgUrl  = url || '';
          cell.assetId = assetId || '';

          // Update tiny thumb and keep preview in sync
          try { setBannerImagePreview(oneBased, url || ''); } catch {}
          try { refreshPreviewLinks(); } catch {}

          // Re-render appearance *in place* (no shell switch)
          try { rerenderAppearanceInPlace(brandId, document); } catch {}

        } finally {
          // Close picker + clear callback
          window.closeInlineMediaPicker();
          globalThis.MediaPicker.active = false;
          globalThis.MediaPicker.onPick = null;
        }
      };

      // ✅ Open the inline overlay picker (modal stays open)
      showInlineMediaPicker({ brandId, slot1Based });

    } catch (e) {
      console.error('openHeroImageLibrary failed:', e);
      alert('❌ Could not open media library.');
    }
  };
}

// If Media Library relies on getAssetId and it might be missing, provide a tolerant fallback.
if (typeof globalThis.getAssetId !== 'function') {
  globalThis.getAssetId = (item) => item?.assetId || item?.id || item?.mediaId || item?.fileId || '';
}



// Idempotent guarded editor opener: do NOT switch to Brand Settings while Create Brand drawer is open
// Safe even if this file is evaluated more than once.
(function () {
  if (!('openBrandEditorGuarded' in globalThis)) {
    globalThis.openBrandEditorGuarded = function (brandId) {
      if (typeof toggleBrandModal === 'function' && toggleBrandModal.__mode === 'create') {
        // We're currently in the Create Brand flow; ignore attempts to open Brand Settings.
        return;
      }
      return toggleBrandEditor(true, brandId, 'edit');
    };
  }
})();

// Early no-throw placeholder; later replaced by the real one.
if (typeof globalThis !== 'undefined' && typeof globalThis.normalizeFromItem !== 'function') {
  globalThis.normalizeFromItem = function (it) { return it; };
}

// ============================================================================


// ==== YOUR WORKING BLOCK STARTS BELOW — DO NOT EDIT IT =======================

const WIZARD_STEPS = [
  { key: 'appearance',   label: 'Appearance' },
  { key: 'platforms',    label: 'Platforms' },
  { key: 'monetization', label: 'Moneti­zation' },
  { key: 'content',      label: 'Content' },
  { key: 'launch',       label: 'Launch' }
];

let __brandsCache = []; // last loaded list
let __wizard = {
  open: false,
  brandId: null,
  step: 'appearance',
  // mock per-brand UI-only data (not persisted)
  draftByBrand: {} // { [brandId]: { appearance:{}, platforms:{}, monetization:{}, content:{} } }
};

// === BRAND EDITOR LITE STATE (reuses your draft shape) =====================
const __brandEditor = {
  open: false,          // is the editor visible
  mode: 'edit',         // 'create' | 'edit'
  brandId: null         // which brand we are editing
};

function slugify(s = '') {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // spaces → dashes
    .replace(/[^a-z0-9-]/g, '-')    // non alnum → dash
    .replace(/-+/g, '-')            // collapse dashes
    .replace(/^-|-$/g, '');         // trim ends
}

// ✅ Helper used by both click and submit (prevents full page reload)
async function createBrandFromForm(form, submitBtn) {
  const token = getAuthToken();
  if (!token) { alert('Please sign in'); return; }

  const fd = new FormData(form);
  const displayName = (fd.get('displayName') || '').toString().trim();
  const slugRaw     = (fd.get('slug') || '').toString().trim();
  const description = (fd.get('description') || '').toString();
  const isPublicEl  = form.querySelector('input[name="isPublic"]');
  const isPublic    = !!(isPublicEl && isPublicEl.checked);
  const visibilityLevel = (fd.get('visibilityLevel') || 'public').toString();

  if (!displayName) { alert('Display Name is required.'); return; }
  const slug = slugify(slugRaw || displayName);

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }

  try {
    const createUrl = apiJoin(BRAND_API, 'brand');
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ displayName, slug, description, isPublic, visibilityLevel })
    });

    if (!res.ok) {
      let t = ''; try { t = await res.text(); } catch {}
      if (res.status === 409) alert('❌ Slug already exists. Please choose another.');
      else alert('❌ Create failed (' + res.status + ') ' + t);
      return;
    }

    // ⬇️ Centralized close + refresh (also unlocks scroll, re-shows button, resets state)
    if (typeof restoreCreateBrandUI === 'function') {
      await restoreCreateBrandUI();
    } else {
      // Fallback just in case restoreCreateBrandUI isn’t available
      toggleBrandModal(false);
      try { await loadBrands(); } catch(e2) { console.warn('post-create loadBrands failed', e2); }
    }
    alert('✅ Brand created!');

    // Best-effort open editor (replacing previous openWizard)
    // (after refresh so the new card exists in the DOM)
    const cards = document.querySelectorAll('#brandList [data-brand-id]');
    const lastId = cards[cards.length - 1]?.getAttribute('data-brand-id');
    if (lastId) {
      // open Brand Editor instead of Wizard
      toggleBrandEditor(true, lastId, 'edit');
      // If you ever need to revert to wizard: openWizard(lastId, 'appearance');
    }

  } catch (err) {
    console.error('create brand error:', err);
    alert('❌ Something went wrong creating your brand.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create'; }
  }
}


// ---- Create Brand modal layout shim (mirror Brand Settings scroll behavior) ----
function _ensureCreateModalLayout() {
  const modal = document.getElementById('modalCreateBrand');
  if (!modal) return;

  // Panel = first child (your centered card)
  const panel = modal.querySelector(':scope > div');
  if (panel) {
    panel.classList.add('flex', 'flex-col', 'max-h-[90vh]', 'min-h-0', 'overflow-hidden');
  }

  // Form = flex column with min-h-0 so children can shrink & scroll
  const form = document.getElementById('formCreateBrand');
  if (form) {
    form.classList.add('flex-1', 'flex', 'flex-col', 'min-h-0');

    // BODY scroll area: you already have `.overflow-y-auto`; add min-h-0 so it can scroll
    // (works whether it's the same element from your markup or enhanced by JS)
    const scrollArea =
      form.querySelector('.overflow-y-auto') ||
      form.querySelector('.pc-modal-scroll');

    if (scrollArea) {
      scrollArea.classList.add('min-h-0');
      // smooth iOS scroll
      scrollArea.style.webkitOverflowScrolling = 'touch';
      // prevent the scroll area from being clipped by accidental parents
      scrollArea.style.contain = 'layout paint size';
    }
  }
}

function bindCreateFlowControls(scope) {
  const basicsBtn = scope.querySelector('#btnBasicsApply');
  const basicsStatus = scope.querySelector('#basicsStatus');
  const domainBtn = scope.querySelector('#btnConfirmGenerateDomain');
  const domainStatus = scope.querySelector('#domainStatus');
  const proposedEl = scope.querySelector('#proposedDomain');
  const domainRow = scope.querySelector('#domainRow');
  const domainValue = scope.querySelector('#domainValue');
  const copyDomainBtn = scope.querySelector('#copyDomainBtn');
  const publishBtn = scope.querySelector('#btnConfirmPublishGlobal');

  const form = scope.querySelector('#formCreateBrand');

  // ---------- NEW: tiny progress HUD helpers ----------
  function createProgressHUD() {
    let el = document.getElementById('pcCreateProgressHUD');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'pcCreateProgressHUD';
    el.className = 'fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center';
    el.innerHTML = `
      <div class="rounded-xl bg-gray-900 text-gray-100 px-5 py-4 ring-1 ring-white/10 shadow-2xl flex items-center gap-3">
        <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>
        <div id="pcCreateProgressMsg" class="text-sm">Working…</div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }
  function setProgressMessage(msg) {
    const m = document.getElementById('pcCreateProgressMsg');
    if (m) m.textContent = msg;
  }
  function closeProgressHUD() {
    const el = document.getElementById('pcCreateProgressHUD');
    if (el) el.remove();
  }

  const disableAppearanceButtons = (disabled) => {
    const toDisable = [
      scope.querySelector('#wzApplyPreview'),
      scope.querySelector('#wzUploadLogoBtn'),
      scope.querySelector('#wzConfirmPublish')
    ].filter(Boolean);
    toDisable.forEach(b => { b.disabled = !!disabled; b.classList.toggle('opacity-50', !!disabled); });
  };

  const updateProposed = () => {
    const slug = (form.querySelector('input[name="slug"]')?.value || '').trim() || 'your-brand';
    if (proposedEl) proposedEl.textContent = `${slug}.playcre8te.tv`;
  };
  form.querySelector('input[name="slug"]')?.addEventListener('input', updateProposed);
  updateProposed();

  const state = (toggleBrandModal.__createFlow ||= { brandId: null, applied: false, slug: '', domainOk: false });
  disableAppearanceButtons(!state.domainOk);

  // =============== 1) APPLY (create brand basics) =================
  if (basicsBtn && !basicsBtn.__pcBound) {
    basicsBtn.addEventListener('click', async () => {
      const token = getAuthToken();
      if (!token) { alert('Please sign in'); return; }

      const fd = new FormData(form);
      const displayName = (fd.get('displayName') || '').toString().trim();
      const slugRaw     = (fd.get('slug') || '').toString().trim();
      const description = (fd.get('description') || '').toString();
      const isPublic    = !!form.querySelector('input[name="isPublic"]')?.checked;
      const visibilityLevel = (fd.get('visibilityLevel') || 'public').toString();

      if (!displayName || !slugRaw) { alert('Brand Name and Slug are required.'); return; }

      const slug = (typeof slugify === 'function') ? slugify(slugRaw) : slugRaw.toLowerCase();

      try {
        basicsBtn.disabled = true;
        if (basicsStatus) basicsStatus.textContent = 'Validating & creating…';

        const res = await fetch(apiJoin(BRAND_API, 'brand'), {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ displayName, slug, description, isPublic, visibilityLevel })
        });

        if (!res.ok) {
          const msg = await res.text().catch(()=> '');
          if (res.status === 409) { alert('❌ Slug already exists. Please choose another.'); }
          else alert('❌ Create failed (' + res.status + ') ' + msg);
          return;
        }

        const payload = await res.json().catch(()=> ({}));
        const brandId = payload?.brandId || payload?.id || null;

        state.brandId = brandId;
        state.applied = true;
        state.slug = slug;

        if (domainBtn) domainBtn.disabled = !brandId;
        if (basicsStatus) basicsStatus.textContent = 'Applied ✓';

        try { await loadBrands(); } catch {}

      } catch (err) {
        console.error(err);
        alert('❌ Something went wrong applying Brand Basics.');
      } finally {
        basicsBtn.disabled = false;
      }
    });
    basicsBtn.__pcBound = true;
  }

  // =============== 2) CONFIRM & GENERATE DOMAIN =================
  if (domainBtn && !domainBtn.__pcBound) {
    domainBtn.addEventListener('click', async () => {
      if (!state.applied || !state.brandId) {
        alert('Please Apply Brand Basics first.');
        return;
      }
      try {
        domainBtn.disabled = true;
        if (domainStatus) domainStatus.textContent = 'Generating…';
        const { domain } = await requestDomainGeneration(state.brandId);

        state.domainOk = !!domain;

        if (domainRow && domain) domainRow.classList.remove('hidden');
        if (domainValue && domain) domainValue.textContent = domain;

        if (copyDomainBtn && domain && !copyDomainBtn.__pcBound) {
          copyDomainBtn.addEventListener('click', async () => {
            try { await navigator.clipboard?.writeText(domain); }
            catch { prompt('Copy domain', domain); }
          });
          copyDomainBtn.__pcBound = true;
        }

        if (domainStatus) domainStatus.textContent = domain ? '✓ Domain created' : 'Done';

        // Rebind Appearance with real brand id
        try {
          bindBrandEditorAppearance(state.brandId, scope, { allowPersist: true });
        } catch (e) { console.warn('rebind appearance failed', e); }

        // Migrate any pending logo from TEMP draft -> real brand draft
        try {
          const tempDraft = __wizard?.draftByBrand?.['__new__'];
          if (tempDraft?.appearance && (tempDraft.appearance.logoFile || tempDraft.appearance.logoUrl)) {
            const realDraft = ensureDraft(state.brandId);
            if (!realDraft.appearance) realDraft.appearance = {};
            if (!realDraft.appearance.logoFile && tempDraft.appearance.logoFile) {
              realDraft.appearance.logoFile = tempDraft.appearance.logoFile;
              tempDraft.appearance.logoFile = null;
            }
            if (!realDraft.appearance.logoUrl && tempDraft.appearance.logoUrl) {
              realDraft.appearance.logoUrl = tempDraft.appearance.logoUrl;
            }
            rerenderAppearanceInPlace(state.brandId, scope);
          }
        } catch (e) { console.warn('logo draft migrate failed (non-blocking)', e); }

        disableAppearanceButtons(false);

        if (publishBtn) {
          publishBtn.disabled = !(state.domainOk && state.brandId);
        }

        try { await loadBrands(); } catch {}
      } catch (err) {
        console.error(err);
        if (domainStatus) domainStatus.textContent = 'Failed';
        alert('❌ Could not generate domain. See console for details.');
      } finally {
        domainBtn.disabled = false;
        setTimeout(() => { if (domainStatus) domainStatus.textContent = ''; }, 1500);
      }
    });
    domainBtn.__pcBound = true;
  }

  // =============== 3) CONFIRM & PUBLISH (GLOBAL) =================
  if (publishBtn && !publishBtn.__pcBound) {
    publishBtn.addEventListener('click', async () => {
      if (publishBtn.__pcBusy) return; // prevent double-clicks
      if (!state.applied || !state.brandId) {
        alert('Please Apply Brand Basics first.');
        return;
      }
      if (!state.domainOk) {
        alert('Please generate your domain before publishing.');
        return;
      }

      const hud = createProgressHUD();
      publishBtn.__pcBusy = true;
      publishBtn.disabled = true;
      const originalText = publishBtn.textContent;
      publishBtn.textContent = 'Working…';

      try {
        // Find a pending logo file (real draft first, then TEMP draft)
        const realDraft = ensureDraft(state.brandId);
        let pendingLogoFile = realDraft?.appearance?.logoFile || null;

        if (!pendingLogoFile) {
          const tempDraft = __wizard?.draftByBrand?.['__new__'];
          if (tempDraft?.appearance?.logoFile) {
            pendingLogoFile = tempDraft.appearance.logoFile;
            realDraft.appearance.logoFile = pendingLogoFile; // move
            if (tempDraft.appearance.logoUrl && !realDraft.appearance.logoUrl) {
              realDraft.appearance.logoUrl = tempDraft.appearance.logoUrl;
            }
            tempDraft.appearance.logoFile = null;
          }
        }

        // If we have a file, upload + process BEFORE publishing (with progress messages)
        if (pendingLogoFile) {
          setProgressMessage('Finalizing brand setup...');
          const idToken = getAuthToken();
          const priorVersion = (getBrandById(state.brandId) || {}).logo?.version || null;

          const presign = await requestLogoUploadUrl(state.brandId, idToken, pendingLogoFile);
          await uploadWithPresign(presign, pendingLogoFile);

          setProgressMessage('Creating brand... This may take a moment. Please do not close this window.');
          const logo = await pollBrandLogo(state.brandId, idToken, priorVersion, 60000);

          const idx = __brandsCache.findIndex(b => (b.brandId || b.id) === state.brandId);
          if (idx >= 0 && logo) __brandsCache[idx] = { ...__brandsCache[idx], logo };

          const processedPreview =
            (logo && (selectCardMark(logo, 64) || selectNavbarLogo(logo, 32) || (logo.primary||[])[0])) ||
            realDraft.appearance.logoUrl;

          realDraft.appearance.logoFile = null;
          realDraft.appearance.logoUrl  = processedPreview;

          try { await saveBrandConfigViaPost(state.brandId, {}); } catch (e) { console.warn('config rebuild after logo update failed (non-blocking)', e); }
        }

        // Save latest appearance config (existing behavior)
        const applyPreview = scope.querySelector('#wzApplyPreview');
        if (applyPreview && !applyPreview.disabled) {
          setProgressMessage('Saving theme…');
          applyPreview.click();
        }

        // Publish to CDN (existing behavior)
        setProgressMessage('Publishing…');
        await publishBrandConfig(state.brandId);

        setProgressMessage('All done ✓');

        // Final confirmation (existing success UX)
        alert('🟢 Brand successfully created. Please complete setup in Brand Settings');

      } catch (e) {
        console.error(e);
        closeProgressHUD();
        alert('❌ Brand Creation Failed — Please try again or contact support.');
        return; // bail early so we don't run the close/cleanup block twice
      } finally {
        // Cleanup + close as before
        publishBtn.disabled = false;
        publishBtn.textContent = originalText || 'Confirm & Publish';
        publishBtn.__pcBusy = false;

        closeProgressHUD();

        const wizard = document.getElementById('brandWizard');
        if (wizard) wizard.classList.add('hidden');
        document.documentElement.style.overflow = '';

        try { await loadBrands(); } catch {}
        const openBtn = document.getElementById('btnCreateBrand');
        if (openBtn) openBtn.classList.remove('hidden');

        toggleBrandModal.__createFlow = { brandId: null, applied: false, slug: '', domainOk: false };
      }
    });
    publishBtn.__pcBound = true;
  }

  // =============== 4) Cancel closes + refreshes list =================
  const cancelBtn = scope.querySelector('[data-close-wizard]');
  if (cancelBtn && !cancelBtn.__pcBound) {
    cancelBtn.addEventListener('click', async () => {
      const wizard = document.getElementById('brandWizard');
      if (wizard) wizard.classList.add('hidden');
      document.documentElement.style.overflow = '';
      const openBtn = document.getElementById('btnCreateBrand');
      if (openBtn) openBtn.classList.remove('hidden');
      try { await loadBrands(); } catch {}
      toggleBrandModal.__createFlow = { brandId: null, applied: false, slug: '', domainOk: false };
    });
    cancelBtn.__pcBound = true;
  }

  if (domainBtn) domainBtn.disabled = !(state.applied && state.brandId);
  if (publishBtn) publishBtn.disabled = !(state.domainOk && state.brandId);
}


function restoreCreateBrandUI() {
  // 1) Unlock page scroll
  document.documentElement.style.overflow = '';

  // 2) Close the Brand Editor if it's open (single-source-of-truth close)
  try {
    if (typeof toggleBrandEditor === 'function' && __brandEditor && __brandEditor.open) {
      toggleBrandEditor(false);
    }
  } catch (e) { console.warn('toggleBrandEditor(false) failed (non-blocking)', e); }

  // 3) Hide the wizard shell (defensive)
  const wizard = document.getElementById('brandWizard');
  if (wizard) wizard.classList.add('hidden');

  // 4) Hide the legacy create modal (defensive)
  const legacy = document.getElementById('modalCreateBrand');
  if (legacy) legacy.classList.add('hidden');

  // 5) Re-show the main open button
  const openBtn = document.getElementById('btnCreateBrand');
  if (openBtn) openBtn.classList.remove('hidden');

  // 6) Reset the create form and scratch state
  const f = document.getElementById('formCreateBrand');
  if (f && typeof f.reset === 'function') f.reset();

  if (typeof toggleBrandModal === 'function') {
    toggleBrandModal.__createFlow = { brandId: null, applied: false, slug: '', domainOk: false };
  }

  // 7) Refresh the brand list (best-effort)
  try { return Promise.resolve(loadBrands()); } catch { /* noop */ }
}


/**
 * CREATE FLOW (dark theme): lets creators set Appearance during Create.
 * - Before "Apply": preview only (no persist, no upload/publish)
 * - After "Apply": full controls (logo upload, persist tokens, Confirm & Publish)
 * Reuses your existing bindBrandEditorAppearance/bindBrandEditorPlatforms logic.
 */

function toggleBrandModal(open) {
  const openBtn = document.getElementById('btnCreateBrand');
  if (!openBtn) return;

  // ---------- single close path (for ANY shell) ----------
  if (!open) {
    if (typeof restoreCreateBrandUI === 'function') {
      restoreCreateBrandUI();
    } else {
      // Fallback if restoreCreateBrandUI is ever unavailable
      const wizard = document.getElementById('brandWizard');
      if (wizard) wizard.classList.add('hidden');
      const legacy = document.getElementById('modalCreateBrand');
      if (legacy) legacy.classList.add('hidden');
      document.documentElement.style.overflow = '';
      openBtn.classList.remove('hidden');
      const f = document.getElementById('formCreateBrand');
      if (f && typeof f.reset === 'function') f.reset();
      toggleBrandModal.__createFlow = { brandId: null, applied: false, slug: '' };
    }
    return;
  }

  // ---------- choose shell: wizard (drawer) vs legacy modal ----------
  const wizard        = document.getElementById('brandWizard');
  const wizardContent = document.getElementById('wizardContent');
  const useWizard     = !!wizard && !!wizardContent;

  // mark that we're in the "Create Brand" flow (used by guarded editor opener)
  toggleBrandModal.__mode = 'create';

  // Shared: bind submit (your existing createBrandFromForm)
  function bindCreateSubmit(scope) {
    const form = scope.querySelector('#formCreateBrand');
    const btn  = scope.querySelector('#btnSubmitCreateBrand');
    if (form && btn && !btn.__pcBound) {
      btn.addEventListener('click', (e) => { e.preventDefault(); createBrandFromForm(form, btn); });
      form.addEventListener('submit', (e) => { e.preventDefault(); createBrandFromForm(form, btn); });
      btn.__pcBound = true;
    }
  }

// NEW: binds Apply (basics) + Confirm & Generate Domain + Copy button
  function bindCreateFlowControls(scope) {
    const CF = toggleBrandModal.__createFlow || { brandId: null, applied: false, slug: '' };

    // 🔁 local, surgical: migrate draft from "__new__" → real id (keeps heroBanners, colors, logo draft, etc.)
    function migrateDraft(tempId = '__new__', realId) {
      if (!realId || tempId === realId) return;
      const src = __wizard?.draftByBrand?.[tempId];
      if (!src) return;
      const dest = ensureDraft(realId);
      __wizard.draftByBrand[realId] = {
        ...dest,
        appearance:   { ...dest.appearance,   ...src.appearance },
        platforms:    { ...dest.platforms,    ...src.platforms },
        monetization: { ...dest.monetization, ...src.monetization },
        content:      { ...dest.content,      ...src.content }
      };
      try { delete __wizard.draftByBrand[tempId]; } catch {}
    }

  const nameEl   = scope.querySelector('input[name="displayName"]');
  const slugEl   = scope.querySelector('input[name="slug"]');
  const descEl   = scope.querySelector('textarea[name="description"]');
  const isPubEl  = scope.querySelector('input[name="isPublic"]');
  const visEl    = scope.querySelector('select[name="visibilityLevel"]');

  const basicsBtn    = scope.querySelector('#btnBasicsApply');
  const basicsStatus = scope.querySelector('#basicsStatus');

  const proposedEl   = scope.querySelector('#proposedDomain');
  const genBtn       = scope.querySelector('#btnConfirmGenerateDomain');
  const domainStatus = scope.querySelector('#domainStatus');

  const domainRow    = scope.querySelector('#generatedDomainRow');
  const domainValEl  = scope.querySelector('#generatedDomainValue');
  const copyBtn      = scope.querySelector('#copyGeneratedDomain');

  // keep proposed domain in sync as slug edits happen
  function updateProposed() {
    const s = slugify((slugEl?.value || '').trim());
    if (proposedEl) proposedEl.textContent = s ? `${s}.playcre8te.tv` : '';
  }
  if (slugEl && !slugEl.__pcBound) {
    slugEl.addEventListener('input', updateProposed);
    slugEl.__pcBound = true;
  }
  updateProposed();

  // enable/disable domain button depending on "applied"
  function refreshDomainButton() {
    if (!genBtn) return;
    const c = toggleBrandModal.__createFlow || {};
    genBtn.disabled = !(c.applied && c.brandId);
  }
  refreshDomainButton();

  // Helper: check slug uniqueness using local cache first; server still authoritative
  function isSlugTakenLocal(slug) {
    if (!Array.isArray(__brandsCache)) return false;
    return __brandsCache.some(b => (b.slug || '').toLowerCase() === slug.toLowerCase());
  }

  // APPLY: validate -> optional local uniqueness check -> POST create (basics only)
  if (basicsBtn && !basicsBtn.__pcBound) {
    basicsBtn.addEventListener('click', async () => {
      const displayName = (nameEl?.value || '').trim();
      let slug          = (slugEl?.value || '').trim();
      const description = (descEl?.value || '').toString();
      const isPublic    = !!(isPubEl && isPubEl.checked);
      const visibilityLevel = (visEl?.value || 'public').toString();

      if (!displayName) { alert('Brand Name is required.'); nameEl?.focus(); return; }
      slug = slugify(slug || displayName);
      if (!slug) { alert('Valid slug is required.'); slugEl?.focus(); return; }

      // Local pre-check; server will still enforce 409
      if (isSlugTakenLocal(slug)) {
        if (!confirm(`The slug "${slug}" appears to be in use.\n\nContinue anyway and let the server verify?`)) {
          return;
        }
      }

      // Confirm action
      if (!confirm(`Apply these basics?\n\nName: ${displayName}\nSlug: ${slug}\nDescription: ${description || '(none)'}`)) {
        return;
      }

      const token = getAuthToken();
      if (!token) { alert('Please sign in'); return; }

      try {
        basicsBtn.disabled = true;
        if (basicsStatus) basicsStatus.textContent = 'Applying…';

        const res = await fetch(apiJoin(BRAND_API, 'brand'), {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ displayName, slug, description, isPublic, visibilityLevel })
        });

        if (res.status === 409) {
          const t = await res.text().catch(()=> '');
          alert('❌ Slug already exists. Please choose another.\n' + (t || ''));
          basicsBtn.disabled = false;
          if (basicsStatus) basicsStatus.textContent = 'Slug already exists.';
          return;
        }
        if (!res.ok) {
          const t = await res.text().catch(()=> '');
          alert('❌ Create failed (' + res.status + ')\n' + t);
          basicsBtn.disabled = false;
          if (basicsStatus) basicsStatus.textContent = 'Failed to apply.';
          return;
        }

        // Refresh list and locate the new brand (by slug) to get its id
        try { await loadBrands(); } catch(e) { console.warn('post-apply loadBrands failed', e); }
        const created = Array.isArray(__brandsCache)
          ? __brandsCache.find(b => (b.slug || '').toLowerCase() === slug.toLowerCase())
          : null;

        // Save create-flow state for domain & full appearance step
        toggleBrandModal.__createFlow = {
          brandId: (created && (created.brandId || created.id)) || null,
          applied: true,
          slug
        };

        // 🔁 migrate draft so heroBanners (and other appearance) follow the real id
        if (toggleBrandModal.__createFlow.brandId) {
          migrateDraft('__new__', toggleBrandModal.__createFlow.brandId);
        }

        if (basicsStatus) basicsStatus.textContent = 'Applied ✓';
        refreshDomainButton();
        updateProposed();

        // 🔄 Re-render the create form so Appearance becomes FULLY enabled
        renderCreateBrandInWizard();
        // rebind handlers after re-render
        const host = document.getElementById('brandWizard') || document;
        bindCreateSubmit(host);
        bindCreateFlowControls(host);

        alert('✅ Brand basics applied. You can now upload a logo, apply/publish, and generate the domain.');

      } catch (err) {
        console.error('Apply basics error:', err);
        if (basicsStatus) basicsStatus.textContent = 'Failed to apply.';
        alert('❌ Something went wrong applying your brand basics.');
      } finally {
        basicsBtn.disabled = false;
      }
    });
    basicsBtn.__pcBound = true;
  }

  // Copy handler
  function bindCopy(btn, getText) {
    if (!btn || btn.__pcCopyBound) return;
    btn.addEventListener('click', async () => {
      const txt = typeof getText === 'function' ? getText() : '';
      if (!txt) return;
      try {
        await navigator.clipboard?.writeText(txt);
        const prev = btn.textContent; btn.textContent = 'Copied';
        setTimeout(() => btn.textContent = prev || 'Copy', 1200);
      } catch {
        prompt('Copy', txt);
      }
    });
    btn.__pcCopyBound = true;
  }

  // CONFIRM & GENERATE DOMAIN: requires applied + brandId
  // CONFIRM & GENERATE DOMAIN: requires applied + brandId
if (genBtn && !genBtn.__pcBound) {
  genBtn.addEventListener('click', async () => {
    const CF2 = toggleBrandModal.__createFlow || {};
    if (!CF2.applied || !CF2.brandId) {
      alert('Please Apply Brand Basics first.');
      return;
    }

    const s = CF2.slug || (slugEl ? slugify(slugEl.value || '') : '');
    if (!confirm(`Generate domain using slug "${s}"?\nThis will create the subdomain on playcre8te.tv.`)) {
      return;
    }

    try {
      genBtn.disabled = true;
      if (domainStatus) domainStatus.textContent = 'Generating…';

      const { domain } = await requestDomainGeneration(CF2.brandId);

// Show domain row with copy button immediately (keep your existing UI bits)
try { await loadBrands(); } catch(e) { console.warn('post-domain loadBrands failed', e); }
if (domain && domainValEl && domainRow) {
  domainValEl.textContent = domain;
  domainRow.classList.remove('hidden');
  bindCopy(copyBtn, () => domain);
}
if (domainStatus) domainStatus.textContent = domain ? `✓ ${domain}` : 'Done';
alert(domain ? `✅ Domain generated: ${domain}` : '✅ Domain generated');

// Mark domain ready so persistence and publish become available
// Mark domain ready so Apply/Publish is enabled in Create UI
    toggleBrandModal.__createFlow = {
      ...(toggleBrandModal.__createFlow || {}),
      domainOk: !!domain,
      brandId: CF2.brandId
    };

    // Rebind Appearance with persistence allowed now
    try {
      bindBrandEditorAppearance(CF2.brandId, scope, { allowPersist: true });
    } catch (e) { console.warn('rebind appearance after domain gen failed', e); }

    // 🔵 Create-only: immediately show the live domain in the preview (no params needed).
    // This guarantees the iframe is visible and working even before any brand-config is published.
    try { __pcShowCreatePreviewOnDomain(scope, CF2.brandId); } catch {}


    // Point the Live Preview iframe at the *creator domain* right away
    try {
      const d = ensureDraft(CF2.brandId);
      const { homeUrl } = buildPreviewUrlsFromDraft(d, CF2.brandId);
      const live = scope.querySelector('#wzLiveThemePreview');
      if (live && homeUrl) {
        live.src = homeUrl; // clean set (no cache-buster)
        if (!live.__pcFitBound) {
          live.addEventListener('load', () => fitThemePreviewToContainer(scope));
          live.__pcFitBound = true;
        }
      }
    } catch (e) { console.warn('live preview refresh after domain gen failed', e); }

    // In Create UI, unhide the preview now that we have a real URL
    try {
      if (typeof toggleBrandModal === 'function' && toggleBrandModal.__mode === 'create') {
        const block = scope.querySelector('#wzLivePreviewBlock');
        const hint  = scope.querySelector('#wzLivePreviewHint');
        if (block) block.classList.remove('hidden');
        if (hint)  hint.classList.add('hidden');
      }
    } catch {}

    // Refresh links + reveal + refit (single source of truth)
    try {
      if (typeof bindBrandEditorAppearance === 'function') {
        // Use the existing logic bound to this scope to recalc URLs & scale
        const draf = ensureDraft(CF2.brandId);
        // Update external preview links + iframe (with cache-bust if needed)
        const applyBtn = scope.querySelector('#wzApplyPreview');
        if (applyBtn && !applyBtn.disabled) {
          // call the same path users hit, but silently
          applyBtn.click();
        } else {
          // fall back to direct helpers
          if (typeof refreshPreviewLinks === 'function') refreshPreviewLinks();
          if (typeof fitThemePreviewToContainer === 'function') fitThemePreviewToContainer(scope);
        }
      }
      // Ensure the block is visible & hints are hidden
      const block = scope.querySelector('#wzLivePreviewBlock');
      const hint1 = scope.querySelector('#wzLivePreviewHint');
      const hint2All = scope.querySelectorAll('[data-live-preview-hint]');
      if (block) block.classList.remove('hidden');
      if (hint1) hint1.classList.add('hidden');
      hint2All.forEach(h => h.classList.add('hidden'));
    } catch {}



    } catch (err) {
      console.error(err);
      if (domainStatus) domainStatus.textContent = 'Failed.';
      alert('❌ Could not generate domain. See console for details.');
    } finally {
      genBtn.disabled = false;
      setTimeout(() => { if (domainStatus) domainStatus.textContent = ''; }, 1500);
    }
  });
  genBtn.__pcBound = true;
}


  // If a domain already exists in cache (reopen), surface it
  const CF3 = toggleBrandModal.__createFlow || {};
  if (CF3.brandId && Array.isArray(__brandsCache)) {
    const b = __brandsCache.find(x => (x.brandId || x.id) === CF3.brandId);
    const d = b?.customDomain || b?.domain || '';
    if (d && domainValEl && domainRow) {
      domainValEl.textContent = d;
      domainRow.classList.remove('hidden');
      bindCopy(copyBtn, () => d);
    }
  }
}

if (useWizard) {
  // ===== Drawer path (preferred) =====
  // fresh state for this open
  toggleBrandModal.__createFlow = { brandId: null, applied: false, slug: '' };

  openBtn.classList.add('hidden');

  if (typeof renderCreateBrandInWizard === 'function') {
    renderCreateBrandInWizard();
  } else {
    wizardContent.innerHTML = '<div class="p-5 text-sm text-gray-300">Create form unavailable.</div>';
  }

  wizard.classList.remove('hidden');
  document.documentElement.style.overflow = 'hidden'; // lock page scroll

  // Bind existing create submit + the new apply/domain controls
  bindCreateSubmit(wizard);
  bindCreateFlowControls(wizard);

  return; // (close handled by top-level early return)
}

// ===== Legacy path (standalone #modalCreateBrand) – still supported =====
const modal = document.getElementById('modalCreateBrand');
if (!modal) return;

// fallback layout fix for legacy modal (single scrollable body)
function ensureLegacyModalLayout(m) {
  const panel =
    m.querySelector('[data-modal-panel]') ||
    m.querySelector('.bg-gray-900') ||
    m.querySelector('form')?.parentElement ||
    null;
  if (!panel) return;
  panel.classList.add('flex','flex-col','w-full','max-w-3xl','h-[min(100vh,calc(100svh))]','max-h-[100svh]','relative','overflow-hidden');
  const header = panel.querySelector('[data-modal-header]') || panel.querySelector('.px-6.pt-6.pb-4') || panel.firstElementChild;
  const form   = panel.querySelector('#formCreateBrand') || panel.querySelector('form') || panel;
  const body   = panel.querySelector('[data-modal-body]') || form.querySelector('.overflow-y-auto') || form;
  const footer = panel.querySelector('[data-modal-footer]') || form.parentElement?.querySelector('.border-t') || null;
  if (header) header.classList.add('shrink-0','sticky','top-0','bg-gray-900','z-10');
  if (footer) footer.classList.add('shrink-0','sticky','bottom-0','bg-gray-900','z-10');
  if (body) { body.classList.add('flex-1','min-h-0','overflow-y-auto'); body.style.webkitOverflowScrolling = 'touch'; }
}

// open legacy modal
if (modal.parentElement !== document.body) document.body.appendChild(modal);
ensureLegacyModalLayout(modal);
document.documentElement.style.overflow = 'hidden';
openBtn.classList.add('hidden');
modal.classList.remove('hidden');

try { if (typeof enhanceCreateBrandModal === 'function') enhanceCreateBrandModal(); } catch (e) { console.warn('enhanceCreateBrandModal failed', e); }

bindCreateSubmit(document);
bindCreateFlowControls(modal);

setTimeout(() => ensureLegacyModalLayout(modal), 0);
window.addEventListener('resize', () => ensureLegacyModalLayout(modal), { passive: true });
}

async function loadBrands() {
  var token = getAuthToken();
  if (!token) return;

  var sub = (typeof getUserSub === 'function') ? getUserSub() : null;
  var url = sub ? apiJoin(BRAND_API, 'brand?owner=' + encodeURIComponent(sub))
                : apiJoin(BRAND_API, 'brand');

  try {
    var res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });

    if (!res.ok) {
      var rawErr = '';
      try { rawErr = await res.text(); } catch (_) {}
      console.error('loadBrands: non-OK', res.status, rawErr);
      renderBrandList([]);
      return;
    }

    var raw = '';
    try { raw = await res.text(); } catch (_) {}
    var items = [];
    if (raw && raw.trim().length) {
      try { items = JSON.parse(raw); }
      catch (e) {
        console.error('loadBrands: JSON parse error', e, raw);
        items = [];
      }
    }
    if (!Array.isArray(items)) items = [];
    __brandsCache = items;
    renderBrandList(items);
  } catch (e) {
    console.error('loadBrands error:', e);
    renderBrandList([]);
  }
}

// ---------- NEW: Logo upload helpers (presigned PUT) ----------
async function requestLogoUploadUrl(brandId, idToken, file) {
  const res = await fetch(apiJoin(BRAND_API, `brand/${encodeURIComponent(brandId)}/logo/upload-url`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'image/png'
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`presign failed: ${res.status} ${t}`);
  }
  return res.json(); // { method, uploadUrl, headers, key, ... }
}

async function uploadWithPresign({ uploadUrl, method, headers }, file) {
  const up = await fetch(uploadUrl, { method, headers, body: file });
  if (!up.ok) throw new Error(`upload failed: ${up.status}`);
}

  // Prefer the MediaAsset's "landscape" value wherever it lives.
  // Accept either a string or an object like { url: "..." }.



// ---------- Media Picker bridge (safe; no-ops if media.js isn't loaded) ----------
// ---------- Media Picker bridge (safe; no-ops if media.js isn't loaded) ----------
async function pcPickImageFromLibrary(opts = {}) {
  const { title = 'Select an image', accept = ['image/*'], multiple = false } = opts;

  // 1) Preferred: promise-based picker provided by media.js
  if (typeof window.openMediaPicker === 'function') {
    try {
      const res = await window.openMediaPicker({
        title, accept, multiple,
        // pass a token if your media lib supports it (harmless if ignored)
        token: (typeof getAuthToken === 'function' ? getAuthToken() : '')
      });
        const item = Array.isArray(res) ? res[0] : res;
        if (item) {
          // Prefer a proper landscape URL if present
          try {
            const url =
              (typeof resolveLandscapeUrl === 'function' && resolveLandscapeUrl(item)) ||
              item.url || item.src || item.href || item.downloadUrl || '';
            if (url) return { ...item, url };
          } catch {}
          return item;
        }
    } catch (e) {
      // This is where "Error listing media files" usually bubbles from.
      console.warn('openMediaPicker failed, falling back to URL prompt:', e);
    }
  }

  // 2) Fallback: event bridge (if your media lib fires CustomEvent('pc:media-picked'))
  try {
    const picked = await new Promise((resolve) => {
      let settled = false;
      const onPick = (ev) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('pc:media-picked', onPick);
        const d = ev?.detail || {};
        const arr = Array.isArray(d.items) ? d.items : (d.item ? [d.item] : []);
        resolve(arr[0] || d || null);
      };
      window.addEventListener('pc:media-picked', onPick, { once: true });

      // try to open media section if available
      try { if (typeof showSection === 'function') showSection('media'); } catch {}

      // safety timeout so UI never hangs forever
      setTimeout(() => { if (!settled) resolve(null); }, 60000);
    });
    if (picked) return picked;
  } catch (e) {
    console.warn('event-bridge picker failed, will fall back to URL:', e);
  }

  // 3) Final fallback: simple URL prompt (so creators aren’t blocked)
  const url = prompt(title + '\n\nPaste a direct image URL (PNG/JPG/WEBP/SVG):', '');
  if (url && typeof url === 'string' && url.trim()) {
    return { url: url.trim() };
  }
  return null;
}

// ---------- NEW: save brand config (POST-first, mirrors your existing style) ----------
// ---------- save brand config via existing POST /brand ----------
async function saveBrandConfigViaPost(brandId, configMap) {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in');
  if (!brandId) throw new Error('Missing brandId');

  const url  = apiJoin(BRAND_API, 'brand');
  const body = JSON.stringify({
    brandId,                 // ⬅️ tell backend which brand to update
    action: 'updateConfig',  // ⬅️ optional hint; backend can branch on it
    config: configMap        // ⬅️ the map you built
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body
  });

  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`saveBrandConfigViaPost failed (${res.status}): ${t}`);
  }

  try { return await res.json(); } catch { return {}; }
}

// ---------- generate domain via existing POST /brand (action switch) ----------
async function requestDomainGeneration(brandId) {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in');
  if (!brandId) throw new Error('Missing brandId');

  const url  = apiJoin(BRAND_API, 'brand');
  const body = JSON.stringify({
    brandId,
    action: 'generateDomain' // backend will: add CF alias, Route53 ALIAS, save "domain" on brand
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body
  });

  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`requestDomainGeneration failed (${res.status}): ${t}`);
  }

  const payload = await res.json().catch(()=> ({}));
  const domain = payload?.domain || '';

  // Update cache so UI reflects the new domain immediately
  if (domain) {
    const idx = __brandsCache.findIndex(b => (b.brandId || b.id) === brandId);
    if (idx >= 0) __brandsCache[idx] = { ...__brandsCache[idx], domain };
  }
  return { domain };
}

// ---------- publish brand config to CDN (POST /brand with action=publishConfig) ----------
async function publishBrandConfig(brandId) {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in');
  if (!brandId) throw new Error('Missing brandId');

  const url = apiJoin(BRAND_API, 'brand');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'publishConfig',
      brandId
    })
  });

  // Expect { ok:true, key:"brand-config/<domain>.json", invalidationId:"..." }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?.error || ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}


// ----- Tolerant brand fetch (ignores transient 5xx during processing) -----
async function getBrandOne(brandId, idToken) {
  const res = await fetch(apiJoin(BRAND_API, `brand/${encodeURIComponent(brandId)}`), {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    const err = new Error(`transient ${res.status}`);
    err.transient = true;
    throw err;
  }
  if (!res.ok) throw new Error(`get brand failed: ${res.status}`);
  return res.json();
}

// Poll until processor writes DynamoDB/logo.version; tolerate transient 5xx
async function pollBrandLogo(brandId, idToken, priorVersion = null, maxWaitMs = 60000) {
  const start = Date.now();
  let delay = 900;
  while (Date.now() - start < maxWaitMs) {
    try {
      const b = await getBrandOne(brandId, idToken);
      const v = b?.logo?.version;
      if (b?.logo && (!priorVersion || v !== priorVersion)) {
        return b.logo;
      }
    } catch (err) {
      if (!err?.transient) throw err; // only ignore transient
    }
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.6, 4000);
  }
  // timeout → let caller proceed optimistically
  return null;
}

// Pickers for card/logo usage
const _pick = (arr, includes) => (arr || []).find(u => u.includes(includes));
function selectNavbarLogo(logo, targetCssHeight = 32) {
  if (!logo) return '';
  const svg = (logo.primary || []).find(u => u.endsWith('/primary/svg/primary.svg'));
  if (svg) return svg;
  return _pick(logo.primary, `primary-h${targetCssHeight}@2x.png`)
      || _pick(logo.primary, 'primary-h32@2x.png')
      || (logo.primary || [])[0]
      || '';
}
function selectCardMark(logo, size = 64) {
  if (!logo) return '';
  return _pick(logo.mark, `mark-${size}.png`) || (logo.mark || [])[0] || '';
}
function selectStacked(logo, size = 128) {
  if (!logo) return '';
  const svg = (logo.stacked || []).find(u => u.endsWith('/stacked/svg/stacked.svg'));
  return svg || _pick(logo.stacked, `stacked-${size}.png`) || (logo.stacked || [])[0] || '';
}

// ---------- NEW: helpers for richer card UI -----
function calcProgress(brand) {
  let steps = 0;
  let done = 0;
  const checks = [
    !!(brand.displayName || brand.slug),             // Step 0: basics
    !!brand.themeKey || !!brand.themeConfigVersion,  // Step 1
    !!(brand.domain || brand.customDomain),          // Step 2
    !!brand.monetization || !!brand.tiers,           // Step 3
    !!brand.hasContent,                              // Step 4
    brand.status === 'ready' || brand.status === 'launched' // Step 5-ish
  ];
  steps = checks.length;
  done = checks.filter(Boolean).length;
  return Math.round((done / steps) * 100);
}
function statusChipClass(status) {
  switch ((status || 'draft').toLowerCase()) {
    case 'launched': return 'bg-green-700 text-green-100';
    case 'ready':    return 'bg-yellow-700 text-yellow-100';
    case 'draft':
    default:         return 'bg-gray-700 text-gray-100';
  }
}

function primaryCtaLabel(brand) {
  const st = (brand?.status || 'draft').toLowerCase();
  if (st === 'launched') return 'View Site';
  if (calcProgress(brand) >= 100 && st !== 'launched') return 'Publish';
  return 'Brand Settings'; // ← force this instead of "Continue Setup"
}
function getLogoMarkup(brand) {
  const id = brand.brandId || brand.id;
  const draftPreview = __wizard?.draftByBrand?.[id]?.appearance?.logoUrl || '';
  // Prefer processed CDN assets if present
  const cdnMark = brand.logo ? selectCardMark(brand.logo, 64) : null;
  const cdnPrimary = brand.logo ? selectNavbarLogo(brand.logo, 32) : null;
  const url = cdnMark || cdnPrimary || draftPreview;

  const name = (brand.displayName || brand.slug || '—').toString();
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'BR';

  if (url) {
    const safe = escapeHtml(url);
    return `<img src="${safe}" alt="${escapeHtml(name)} logo" class="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10">`;
  }
  return `<div class="h-10 w-10 rounded-lg bg-gray-700 flex items-center justify-center ring-1 ring-white/10">
            <span class="text-sm font-semibold text-gray-200">${escapeHtml(initials)}</span>
          </div>`;
}
function progressRingStyle(pct) {
  const p = Math.max(0, Math.min(100, pct));
  return `background: conic-gradient(#22c55e ${p * 3.6}deg, rgba(255,255,255,0.08) 0);`;
}

// ... after buildBrandCardHTML(b) { ... }

function ensureBrandGridLayout() {
  const grid = document.getElementById('brandList');
  if (!grid) return;

  if (grid.__pcLayoutApplied) return;
  grid.__pcLayoutApplied = true;

  Object.assign(grid.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingInline: '8px',
  });
}

function buildBrandCardHTML(b) {
  const id      = b.brandId || b.id || '';
  const name    = (b.displayName || b.slug || '').toString();
  const domain  = (b.customDomain || b.domain || '').toString();
  const fallbackDomain = ((b.slug || '—') + '.playcre8te.tv');

  const safeId     = escapeHtml(id);
  const safeName   = escapeHtml(name);
  const safeDomain = escapeHtml(domain || fallbackDomain);

  // Logo (keeps your existing fallbacks)
  const draftPreview = __wizard?.draftByBrand?.[id]?.appearance?.logoUrl || '';
  const cdnMark    = b.logo ? selectCardMark(b.logo, 64) : null;
  const cdnPrimary = b.logo ? selectNavbarLogo(b.logo, 32) : null;
  const logoUrl    = cdnMark || cdnPrimary || draftPreview || '';
  const initials   = safeName.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'BR';

  const logoHTML = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${safeName} logo" class="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10">`
    : `<div class="h-10 w-10 rounded-xl bg-gray-700 flex items-center justify-center ring-1 ring-white/10">
         <span class="text-sm font-semibold text-gray-200">${initials}</span>
       </div>`;

  // Button sizing: clamp to avoid wrapping on small screens, stay crisp on desktop
  // We keep buttons on ONE line via white-space:nowrap and allow the card to "hug" them.
  const btnStyle = `
    --btn-fs: clamp(11px, 2.6vw, 14px);
    font-size: var(--btn-fs);
    padding: calc(var(--btn-fs) * 0.6) calc(var(--btn-fs) * 1.0);
    line-height: 1;
  `.replace(/\s+/g,' ');

  return `
  <div
    data-brand-id="${safeId}"

    class="bg-gray-800/95 backdrop-blur rounded-2xl shadow-xl ring-1 ring-white/10
           inline-flex flex-col gap-3 select-none"

    style="
      /* Hug content but never exceed viewport width */
      width: max-content;
      max-width: 100%;
      /* Nice breathing room */
      padding: 14px 16px;
      /* Prevent weird horizontal scroll on tiny viewports */
      box-sizing: border-box;
    "
  >
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 min-w-0">
      <div class="flex items-center gap-3 min-w-0">
        ${logoHTML}
        <div class="min-w-0">
          <div class="font-semibold text-blue-300 text-[15px] leading-5 truncate" title="${safeName}">
            ${safeName}
          </div>
        </div>
      </div>

      <!-- ⋯ menu (same position as before) -->
      <div class="relative shrink-0">
        <button class="h-8 w-8 grid place-items-center rounded-md hover:bg-gray-700"
                aria-haspopup="menu" aria-expanded="false"
                data-action="overflow" data-brand="${safeId}">
          ⋯
        </button>
        <div class="hidden absolute right-0 mt-2 w-44 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-20"
             data-menu-for="${safeId}">
          <button class="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm" data-nav="basics">Brand Settings</button>
          <button class="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm" data-nav="appearance">Appearance</button>
          <button class="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm" data-nav="platforms">Platforms</button>
          <button class="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm" data-nav="monetization">Monetization</button>
          <button class="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm" data-nav="launch">Launch checklist</button>
        </div>
      </div>
    </div>

    <!-- Domain row (no wrap, ellipsis if long) -->
    <div class="text-[13px] text-gray-300 flex items-center gap-2 min-w-0">
      <span class="text-gray-400">Domain:</span>
      <span class="whitespace-nowrap overflow-hidden text-ellipsis inline-block"
            title="${safeDomain}"
            style="
              /* Leave room for the Copy button; tie to viewport so it never overflows */
              max-width: min(60ch, calc(100vw - 180px));
            ">
        ${safeDomain}
      </span>
      <button
        class="px-2 py-0.5 text-[11px] bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200 shrink-0"
        type="button"
        onclick="navigator.clipboard.writeText('${safeDomain}').then(()=>{this.textContent='Copied';setTimeout(()=>this.textContent='Copy',1100);})">
        Copy
      </button>
    </div>

    <!-- Actions: never wrap; card expands to hug them; buttons scale on small screens -->
    <div class="mt-1">
      <div
        class="flex items-center gap-2 flex-nowrap"
        style="
          white-space: nowrap;
          /* Allow the card to hug without causing page overflow on tiny screens */
          max-width: 100vw;
        "
      >
        <button
          class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          style="${btnStyle}"
          data-action="brand-settings" data-brand="${safeId}">
          Brand Settings
        </button>
        <button
          class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          style="${btnStyle}"
          data-action="manage-media" data-brand="${safeId}">
          Manage Media
        </button>
        <button
          class="shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          style="${btnStyle}"
          data-action="monetization" data-brand="${safeId}">
          Monetization
        </button>
      </div>
    </div>
  </div>`;
}


function patchCardCtas(root = document) {
  const grid = root.getElementById ? root.getElementById('brandList') : root.querySelector('#brandList');
  if (!grid) return;

  grid.querySelectorAll('[data-action="primary-cta"]').forEach((btn) => {
    // 1) Fix the label if an old card/text slipped through
    const txt = (btn.textContent || '').trim().toLowerCase();
    if (txt === 'continue setup') btn.textContent = 'Brand Settings';

    // 2) Make sure clicking this opens the Brand Editor (not the wizard)
    if (!btn.__pcBrandSettingsBound) {
      btn.addEventListener('click', (e) => {
        const label = (btn.textContent || '').trim();
        if (label === 'View Site' || label === 'Publish') return; // let those behave as-is

        const brandId =
          btn.getAttribute('data-brand') ||
          btn.closest('[data-brand-id]')?.getAttribute('data-brand-id') ||
          '';

        e.preventDefault();
        openBrandEditorGuarded(brandId);
      });
      btn.__pcBrandSettingsBound = true;
    }
  });
}

// ---------- Wizard helpers (UI only) -----------------
function getBrandById(id) {
  return __brandsCache.find(b => (b.brandId || b.id) === id);
}

// Is this a real server-side brand id (vs temp id used in create modal)?
function isRealBrandId(id) {
  if (!id) return false;
  return !!getBrandById(id);
}

function ensureDraft(id) {
  if (!__wizard.draftByBrand[id]) {
    const serverBrand = getBrandById(id) || {};
    const serverLogo  = serverBrand.logo || null;
    const seededLogo  = selectCardMark(serverLogo, 64) || selectNavbarLogo(serverLogo, 32) || '';

    __wizard.draftByBrand[id] = {
      appearance: {
        themeKey: 'streaming',
        bgPreset: 'dark',
        bgHex: '#0B0B0B',
        accentHex: '#E50000',
        useDefaultTheme: false,
        font: 'Inter',
        logoUrl: seededLogo,
        logoFile: null,
        // ⬇️ NEW: local draft storage for banner text (3 slots)
        heroBanners: [
          { h1:'', sub:'', imgUrl:'' },
          { h1:'', sub:'', imgUrl:'' },
          { h1:'', sub:'', imgUrl:'' }
        ]
      },
      platforms:  { websiteEnabled: true, pwaEnabled: true, subdomain: '', customDomain: '' },
      monetization: { model: 'free', tiers: [] },
      content: { hasFeatured: false }
    };
  }
  return __wizard.draftByBrand[id];
}

// Put this somewhere top-level in the module (once)
function migrateDraftToRealId(tempId = '__new__', realId) {
  if (!realId || tempId === realId) return;
  const src = __wizard?.draftByBrand?.[tempId];
  if (!src) return;
  const dest = ensureDraft(realId);
  __wizard.draftByBrand[realId] = {
    ...dest,
    appearance:   { ...dest.appearance,   ...src.appearance },
    platforms:    { ...dest.platforms,    ...src.platforms },
    monetization: { ...dest.monetization, ...src.monetization },
    content:      { ...dest.content,      ...src.content }
  };
  try { delete __wizard.draftByBrand[tempId]; } catch {}
}



// ---- Preview helpers (URL builders) ----
const LIGHT_SECTION_OVERRIDES = [
  '--site-bg:#ffffff',
  '--site-title:#000000',
  '--sec-trending-bg:transparent','--sec-trending-title:#000000',
  '--sec-newreleases-bg:transparent','--sec-newreleases-title:#000000',
  '--sec-mustwatch-bg:transparent','--sec-mustwatch-title:#000000',
  '--sec-free-bg:transparent','--sec-free-title:#0B0B0B',
  '--sec-trending-card-title:#ffffff',
  '--sec-newreleases-card-title:#ffffff',
  '--sec-mustwatch-card-title:#ffffff',
  '--sec-free-card-title:#ffffff',
  '--explore-live-bg:transparent','--explore-live-title:#000000',
  '--explore-purchase-bg:transparent','--explore-purchase-title:#000000',
  '--explore-collections-bg:transparent','--explore-collections-title:#000000',
  '--explore-categories-bg:transparent','--explore-categories-title:#000000',
  '--explore-personalization-bg:transparent','--explore-personalization-pad:0','--explore-personalization-title:#ffffff',
  '--explore-live-card-title:#ffffff',
  '--explore-purchase-card-title:#ffffff',
  '--explore-collections-card-title:#ffffff',
  '--explore-categories-card-title:#ffffff',
  '--plans-bg:transparent',
  '--plans-title:#0B0B0B',
  '--plans-sub:#D1D5DB',
  '--footer-bg:#0F0F0F','--footer-fg:#D1D5DB','--footer-title:#FFFFFF'
].join(';');

// Prefer the creator's live domain; fallback to themes host only if no domain yet
function buildPreviewUrlsFromDraft(draft, brandId) {
  const themeKey  = (draft?.appearance?.themeKey) || 'streaming';
  const bgPreset  = (draft?.appearance?.bgPreset) || 'dark';
  let   accentHex = (draft?.appearance?.accentHex || '#E50000');
  const useDefault = !!(draft?.appearance?.useDefaultTheme);

  const domain = (typeof getBrandDomainById === 'function')
    ? getBrandDomainById(brandId)
    : '';

  let homeBase, exploreBase;
  if (domain) {
    homeBase    = new URL(`https://${domain}/`);
    exploreBase = new URL(`https://${domain}/explore`);
  } else {
    homeBase    = new URL(`https://themes.playcre8te.com/themes/${encodeURIComponent(themeKey)}/v1/pages/home.html`);
    exploreBase = new URL(`https://themes.playcre8te.com/themes/${encodeURIComponent(themeKey)}/v1/pages/explore.html`);
  }

  // If “Use Default Theme” is on, still prefer the domain (just no params)
  if (useDefault) {
    return { homeUrl: homeBase.toString(), exploreUrl: exploreBase.toString() };
  }

  if (!/^#/.test(accentHex)) accentHex = '#' + accentHex;

  const params = new URLSearchParams();
  params.set('preview', '1');
  params.set('pc-theme', themeKey);
  params.set('pc-bg', bgPreset);
  params.set('pc-accent-overrides', accentHex);

  if (bgPreset === 'light') {
    params.set('pc-section-overrides', LIGHT_SECTION_OVERRIDES);
  }

  const banners = draft?.appearance?.heroBanners || [];
  const safe = (s) => (s || '').toString().trim();
  const b1 = banners[0] || {}, b2 = banners[1] || {}, b3 = banners[2] || {};
  if (safe(b1.h1))  params.set('pc-hero1-h1',  safe(b1.h1));
  if (safe(b1.sub)) params.set('pc-hero1-sub', safe(b1.sub));
  if (safe(b2.h1))  params.set('pc-hero2-h1',  safe(b2.h1));
  if (safe(b2.sub)) params.set('pc-hero2-sub', safe(b2.sub));
  if (safe(b3.h1))  params.set('pc-hero3-h1',  safe(b3.h1));
  if (safe(b3.sub)) params.set('pc-hero3-sub', safe(b3.sub));
    // NEW: optional banner images (themes may ignore if unsupported)
  if (safe(b1.imgUrl)) params.set('pc-hero1-img', safe(b1.imgUrl));
  if (safe(b2.imgUrl)) params.set('pc-hero2-img', safe(b2.imgUrl));
  if (safe(b3.imgUrl)) params.set('pc-hero3-img', safe(b3.imgUrl));


  const qs = params.toString();
  const homeUrl    = homeBase.toString()    + (homeBase.search ? '&' : '?') + qs;
  const exploreUrl = exploreBase.toString() + (exploreBase.search ? '&' : '?') + qs;

  return { homeUrl, exploreUrl };
}


// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL: Fit a 1024×768 "landscape tablet" preview frame to its container
// Works for both IDs used in Brand Settings and Create/Appearance.
// ─────────────────────────────────────────────────────────────────────────────
// Fit any 1024×768 device frames inside their own containers (supports multiple on the page)
function fitThemePreviewToContainer(scopeRoot) {
  const scope = scopeRoot || document;

  // We may have one or both previews in the DOM at once. Handle each pair separately.
  const PAIRS = [
    { c: '#wzThemeDeviceContainer', f: '#wzThemeDeviceFrame' }, // Appearance (editor)
    { c: '#beDeviceContainer',      f: '#beDeviceFrame' }       // Current Appearance (read-only)
  ];

  const BASE_W = 1024;
  const BASE_H = 768;

  for (const { c, f } of PAIRS) {
    const container = scope.querySelector(c);
    const frame     = scope.querySelector(f);
    if (!container || !frame) continue;

    // Compute per-container scale
    const cw   = container.clientWidth || BASE_W;
    // Prefer container's available height if it has one; otherwise fall back to viewport cap
    const chCap = Math.max(
      0,
      container.clientHeight || 0
    );
    const vhCap = Math.max(280, Math.floor(window.innerHeight * 0.7));
    const maxH  = chCap > 0 ? chCap : vhCap;

    const scaleW = cw / BASE_W;
    const scaleH = maxH / BASE_H;
    const scale  = Math.max(0.1, Math.min(scaleW, scaleH));

    frame.style.transformOrigin = 'top left';
    frame.style.transform = `scale(${scale})`;

    const scaledH = Math.round(BASE_H * scale);
    // Ensure the container is tall enough to fully show the scaled tablet (plus a little padding for the frame chrome)
    container.style.height = `${scaledH + 24}px`;

    // Bind one window-resize listener per *container* so both refit correctly
    if (!container.__pcResizeBound) {
      const onWinResize = () => fitThemePreviewToContainer(scope);
      window.addEventListener('resize', onWinResize, { passive: true });
      container.__pcResizeBound = true;
    }

    // Also refit when this specific container changes size (e.g., section expand/collapse)
    if (!container.__pcResizeObserved) {
      try {
        const ro = new ResizeObserver(() => fitThemePreviewToContainer(scope));
        ro.observe(container);
        container.__pcResizeObserved = true;
      } catch {}
    }
  }
}



function stepIndex(key) {
  return WIZARD_STEPS.findIndex(s => s.key === key);
}
function stepKeyByDelta(curKey, delta) {
  const idx = stepIndex(curKey);
  const next = Math.min(WIZARD_STEPS.length - 1, Math.max(0, idx + delta));
  return WIZARD_STEPS[next].key;
}

// Renders the Create Brand form INSIDE the Brand Settings drawer (same shell/scroll behavior)

function renderCreateBrandInWizard() {
  const shell    = document.getElementById('brandWizard');
  const steps    = document.getElementById('wizardSteps');
  const content  = document.getElementById('wizardContent');
  const prevBtn  = document.getElementById('wizardPrevBtn');
  const nextBtn  = document.getElementById('wizardNextBtn');
  const saveBtn  = document.getElementById('wizardSaveBtn');
  const nameEl   = document.getElementById('wizardBrandName');

  if (!shell || !content) return;

  // Title + hide wizard chrome (same look/behavior as Brand Settings)
  if (nameEl) nameEl.textContent = 'Create Brand';
  if (steps) steps.classList.add('hidden');
  if (prevBtn) prevBtn.classList.add('hidden');
  if (nextBtn) nextBtn.classList.add('hidden');
  if (saveBtn) saveBtn.classList.add('hidden');

  // Reuse your step HTML for Appearance so bindings match exactly
  const TEMP_ID = '__new__';
  const appearanceHTML = captureStepHTML(TEMP_ID, 'appearance');

  // Build create form (DARK theme UI, no Platforms)
  content.innerHTML = `
    <!-- Form = header/body/footer column layout -->
    <form id="formCreateBrand" class="flex-1 flex flex-col min-h-0 text-white">

      <!-- Header (dark, sticky) -->
      <div class="px-6 pt-6 pb-4 border-b border-white/10 sticky top-0 bg-gray-900 z-10">
        <h3 class="text-xl font-semibold">Create Brand</h3>
      </div>

      <!-- BODY: scrollable -->
      <div class="flex-1 overflow-y-auto min-h-0 px-6 py-6 space-y-6" style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;">

        <!-- ===================== Brand Basics ===================== -->
        <section class="rounded-xl ring-1 ring-white/10 bg-gray-900/60 overflow-hidden">
          <div class="px-4 py-3 border-b border-white/10">
            <h4 class="text-sm font-semibold text-gray-100">Brand Basics</h4>
          </div>
          <div class="p-4 space-y-4">
            <!-- Brand Name + Slug -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-300 mb-1">Brand Name *</label>
                <input name="displayName" required
                       class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
                       placeholder="e.g., My Fitness Brand" />
              </div>
              <div>
                <label class="block text-sm text-gray-300 mb-1">Slug *</label>
                <input name="slug" required
                       class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
                       placeholder="my-fitness-brand" />
                <p class="text-xs text-gray-400 mt-1">Lowercase; letters, numbers, and dashes only.</p>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm text-gray-300 mb-1">Description (optional)</label>
              <textarea name="description" rows="3"
                        class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
                        placeholder="Short brand bio..."></textarea>
            </div>

            <!-- Basics Apply row -->
            <div class="flex items-center justify-between pt-1">
              <p id="basicsStatus" class="text-sm text-gray-400"></p>
              <div class="flex items-center gap-2">
                <!-- Validates slug & creates brand without closing -->
                <button id="btnBasicsApply" type="button"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </section>
        <!-- =================== /Brand Basics =================== -->

        <!-- ===================== Domain information ===================== -->
        <section class="rounded-xl ring-1 ring-white/10 bg-gray-900/60 overflow-hidden">
          <div class="px-4 py-3 border-b border-white/10">
            <h4 class="text-sm font-semibold text-gray-100">Domain information</h4>
          </div>
          <div class="p-4 space-y-4">
            <!-- PlayCre8te Domain -->
            <div>
              <label class="block text-sm text-gray-300 mb-1">PlayCre8te Domain</label>
              <div class="text-sm text-gray-200">
                Proposed subdomain (from your slug): 
                <code id="proposedDomain" class="text-blue-300 font-medium"></code>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                After you <span class="text-blue-300">Apply</span> Brand Basics, you can generate a
                <code class="text-gray-300">*.playcre8te.tv</code> subdomain using your slug.
              </p>
            </div>

            <!-- Confirm + Generate -->
            <div class="flex items-center justify-between">
              <p id="domainStatus" class="text-sm text-gray-400"></p>
              <button id="btnConfirmGenerateDomain" type="button"
                      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50"
                      disabled>
                Confirm &amp; Generate Domain
              </button>
            </div>

            <!-- Show actual domain (once generated) -->
            <div id="domainRow" class="hidden flex items-center gap-2">
              <code id="domainValue" class="text-sm text-blue-300"></code>
              <button id="copyDomainBtn"
                      class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                      type="button">Copy</button>
            </div>
          </div>
        </section>
        <!-- =================== /Domain information =================== -->
      </div>

      <!-- FOOTER: Cancel + Confirm & Publish (global) -->
      <div class="px-6 py-4 border-t border-white/10 bg-gray-900 sticky bottom-0 z-10 flex items-center justify-between">
        <button type="button" data-close-wizard
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          Cancel
        </button>
        <button id="btnConfirmPublishGlobal" type="button"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                disabled>
          Confirm &amp; Publish
        </button>
      </div>
    </form>
  `;

  // Initial state
  const state = toggleBrandModal.__createFlow || { brandId: null, applied: false, slug: '', domainOk: false };
  const tempId = state.brandId || TEMP_ID;

// 🔁 If we've now got a real brandId, migrate draft from "__new__"
  if (state.brandId) {
    migrateDraftToRealId('__new__', state.brandId);
  }

  // Bind Appearance fragment. Persisting is allowed only AFTER domain exists.
  bindBrandEditorAppearance(tempId, content, { allowPersist: !!(state.domainOk && state.brandId) });

  // Wire the "Create" (green) button to your existing logic (kept for parity)
  const form = content.querySelector('#formCreateBrand');
  const createBtn = content.querySelector('#btnSubmitCreateBrand');
  if (form && createBtn && !createBtn.__pcBound) {
    createBtn.addEventListener('click', (e) => { e.preventDefault(); createBrandFromForm(form, createBtn); });
    form.addEventListener('submit', (e) => { e.preventDefault(); createBrandFromForm(form, createBtn); });
    createBtn.__pcBound = true;
  }

  // Bind the new Apply/Domain/Publish/Cancel controls
  bindCreateFlowControls(content);
}

// NOTE: bindCreateFlowControls is intentionally declared *inside* toggleBrandModal
// where it has access to helpers. We don't export it globally to avoid collisions.

// Cache for fetched live brand-config JSON by domain
let __brandConfigCache = {}; // { [domain]: json }

function getBrandDomainById(brandId) {
  const b = getBrandById(brandId) || {};
  return (b.customDomain || b.domain || '').toString().trim() || '';
}

async function fetchBrandConfigJSON(domain) {
  if (!domain) return null;
  const url = `https://cdn.playcre8te.com/brand-config/${encodeURIComponent(domain)}.json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    __brandConfigCache[domain] = json;
    return json;
  } catch (e) {
    console.warn('fetchBrandConfigJSON failed', domain, e);
    return null;
  }
}

function pickLogoFromConfig(cfg) {
  // config.brand.logo[5] (fallbacks if shorter/absent)
  const arr = cfg?.brand?.logo;
  if (Array.isArray(arr) && arr.length) {
    return arr[5] || arr[arr.length - 1] || null;
  }
  return null;
}


function renderStepsHeader(activeKey) {
  const host = document.getElementById('wizardSteps');
  if (!host) return;
  host.innerHTML = WIZARD_STEPS.map(s => {
    const isActive = s.key === activeKey;
    return `<button class="px-3 py-1.5 rounded-lg text-sm ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}"
                        data-wizard-step="${s.key}">${s.label}</button>`;
  }).join('');
}

function renderStepContent(brandId, key) {
  const el = document.getElementById('wizardContent');
  const nameEl = document.getElementById('wizardBrandName');

  const b = getBrandById(brandId) || { displayName: 'Brand', slug: 'brand' };
  if (nameEl) nameEl.textContent = b.displayName || b.slug || 'Brand';

// Draft + simple computed vars for clean templates
const draft = ensureDraft(brandId);

const serverLogoPreview =
  selectCardMark((getBrandById(brandId) || {}).logo, 64) ||
  selectNavbarLogo((getBrandById(brandId) || {}).logo, 32) ||
  '';

const logoUrl = draft.appearance.logoUrl || serverLogoPreview || '';
const hasFile = !!(draft.appearance && draft.appearance.logoFile);

const logoPreview = logoUrl
  ? `<img src="${escapeHtml(logoUrl)}" alt="Logo preview" class="object-cover h-full w-full">`
  : `<span class="text-xs text-gray-400">No logo</span>`;

const hasProcessedLogo = !!(
  (getBrandById(brandId) || {}).logo &&
  ((getBrandById(brandId) || {}).logo.primary ||
   (getBrandById(brandId) || {}).logo.stacked ||
   (getBrandById(brandId) || {}).logo.mark ||
   (getBrandById(brandId) || {}).logo.web)
);

// NEW: hero banner image URLs (preview support)
const hero1Img = draft.appearance?.heroBanners?.[0]?.imgUrl || '';
const hero2Img = draft.appearance?.heroBanners?.[1]?.imgUrl || '';
const hero3Img = draft.appearance?.heroBanners?.[2]?.imgUrl || '';


  const renderLogoRenditions = (logo) => {
    const groups = [
      ['primary', 'Primary (navbar)'],
      ['stacked', 'Stacked (square lockup)'],
      ['mark',    'Mark (square/avatars)'],
      ['web',     'Web / PWA'],
    ];

    const renderTile = (url) => {
      const isImage = /\.(png|webp|jpg|jpeg|svg|ico)$/i.test(url);
      const name = url.split('/').pop() || 'asset';
      return `
        <div class="flex items-center gap-3 bg-gray-800 rounded-lg p-2 ring-1 ring-white/10">
          <div class="h-10 w-10 rounded-md bg-gray-900 ring-1 ring-white/10 overflow-hidden grid place-items-center">
            ${isImage ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" class="object-contain max-h-10 max-w-10">`
                       : `<span class="text-[10px] text-gray-400">file</span>`}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs text-gray-200 truncate" title="${escapeHtml(url)}">${escapeHtml(name)}</div>
            <div class="text-[11px] text-gray-500 truncate" title="${escapeHtml(url)}">${escapeHtml(url)}</div>
          </div>
          <button class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                  data-copy-url="${escapeHtml(url)}">Copy</button>
        </div>
      `;
    };

    const sectionsHtml = groups.map(([k, label]) => {
      const arr = (logo && logo[k]) || [];
      if (!arr.length) return '';
      return `
        <div class="space-y-2">
          <div class="text-xs uppercase tracking-wide text-gray-400">${escapeHtml(label)}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${arr.map(renderTile).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (!sectionsHtml.trim()) return '';
    return `
      <div class="mt-4 rounded-xl ring-1 ring-white/10 overflow-hidden">
        <button type="button"
                class="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 text-sm"
                aria-expanded="false"
                data-wz-renditions-toggle>
          <span class="font-medium text-gray-200">View all logo renditions</span>
          <span class="text-gray-400" data-wz-renditions-caret>▸</span>
        </button>
        <div class="hidden bg-gray-900 p-3 space-y-4" data-wz-renditions-panel>
          ${sectionsHtml}
        </div>
      </div>
    `;
  };

// ===================== APPEARANCE STEP =====================
const appearance = `
  <div class="space-y-6">
    <p class="text-gray-300">Pick a theme and customize styles.</p>

    <!-- Logo upload + preview -->
    <div class="space-y-2">
      <label class="block text-sm mb-1 text-gray-300">Brand Logo</label>
      <div class="flex items-center gap-4">
        <div class="h-16 w-16 rounded-lg bg-gray-800 ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
          ${logoPreview}
        </div>
          <div class="flex items-center gap-2">
            <input id="wzLogoFile" type="file" accept="image/*,.svg" class="text-sm text-gray-300" />
            ${logoUrl ? `<button id="wzClearLogo" class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">Remove</button>` : ''}
            <button id="wzUploadLogoBtn"
                    class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
                    ${hasFile ? '' : 'disabled'}>Upload Logo</button>
          </div>
      </div>
      <p class="text-xs text-gray-400">PNG/JPG/WEBP/SVG, 512×512 recommended.</p>
      <div id="wzLogoStatus" class="text-xs text-gray-400"></div>
    </div>

    ${hasProcessedLogo ? renderLogoRenditions(b.logo) : ''}

    <!-- Theme / Primary Color / Accent -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm mb-1 text-gray-300">Theme</label>
        <select id="wzTheme" class="w-full p-2 bg-gray-800 rounded border border-white/10">
          <option value="streaming"${draft.appearance.themeKey==='streaming'?' selected':''}>Streaming</option>
        </select>
      </div>

      <div>
        <label class="block text-sm mb-1 text-gray-300">Primary Color</label>
        <select id="wzBgPreset" class="w-full p-2 bg-gray-800 rounded border border-white/10">
          <option value="dark"${draft.appearance.bgPreset==='dark'?' selected':''}>⬛ Dark / Black</option>
          <option value="light"${draft.appearance.bgPreset==='light'?' selected':''}>⬜ Light / White</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm mb-1 text-gray-300">Accent Color (Hex)</label>
        <div class="flex items-center gap-3">
          <input id="wzAccent" type="color" value="${draft.appearance.accentHex || '#E50000'}"
                 class="h-10 w-20 bg-gray-800 rounded border border-white/10">
          <code id="wzAccentHex" class="text-xs text-gray-300">${escapeHtml(draft.appearance.accentHex || '#E50000')}</code>
        </div>
      </div>
    </div>

    <!-- ===================== Streaming Theme: Hero Banners (H1/Sub) ===================== -->
    ${draft.appearance.themeKey === 'streaming' ? `
      <div class="mt-4 rounded-xl ring-1 ring-white/10 p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-gray-400 text-sm">Hero Banners (optional)</div>
          <span class="text-[11px] text-gray-500">Leave blank to keep the default text</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Banner 1 -->
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-400">Banner 1</div>
            <label class="block text-xs text-gray-300">Heading (H1)</label>
            <input id="wzBanner1H1" type="text" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                   placeholder="Note: Add Space To Remove Text" value="${escapeHtml(draft.appearance?.heroBanners?.[0]?.h1 || '')}">
            <label class="block text-xs text-gray-300 mt-2">Sub Heading</label>
            <textarea id="wzBanner1Sub" rows="2" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                      placeholder="Note: Add Space To Remove Text">${escapeHtml(draft.appearance?.heroBanners?.[0]?.sub || '')}</textarea>
            <!-- NEW: Banner 1 image picker -->
            <div class="mt-2 flex items-center gap-3">
              <div id="wzBanner1ImgPreview"
                  class="h-12 w-20 rounded bg-gray-800 ring-1 ring-white/10 overflow-hidden grid place-items-center">
                ${hero1Img ? `<img src="${escapeHtml(hero1Img)}" alt="Banner 1 image" class="object-cover max-h-12 w-full">`
                            : `<span class="text-[10px] text-gray-500">No image</span>`}
              </div>
              <button id="wzBanner1PickImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Pick from Library
              </button>
              ${hero1Img ? `<button id="wzBanner1ClearImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Clear
              </button>` : ''}
            </div>
          </div>

          <!-- Banner 2 -->
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-400">Banner 2</div>
            <label class="block text-xs text-gray-300">Heading (H1)</label>
            <input id="wzBanner2H1" type="text" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                   placeholder="Note: Add Space To Remove Text" value="${escapeHtml(draft.appearance?.heroBanners?.[1]?.h1 || '')}">
            <label class="block text-xs text-gray-300 mt-2">Sub Heading</label>
            <textarea id="wzBanner2Sub" rows="2" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                      placeholder="Note: Add Space To Remove Text">${escapeHtml(draft.appearance?.heroBanners?.[1]?.sub || '')}</textarea>
            <!-- NEW: Banner 2 image picker -->
            <div class="mt-2 flex items-center gap-3">
              <div id="wzBanner2ImgPreview"
                  class="h-12 w-20 rounded bg-gray-800 ring-1 ring-white/10 overflow-hidden grid place-items-center">
                ${hero2Img ? `<img src="${escapeHtml(hero2Img)}" alt="Banner 2 image" class="object-cover max-h-12 w-full">`
                            : `<span class="text-[10px] text-gray-500">No image</span>`}
              </div>
              <button id="wzBanner2PickImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Pick from Library
              </button>
              ${hero2Img ? `<button id="wzBanner2ClearImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Clear
              </button>` : ''}
            </div>
          </div>

          <!-- Banner 3 -->
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-400">Banner 3</div>
            <label class="block text-xs text-gray-300">Heading (H1)</label>
            <input id="wzBanner3H1" type="text" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                   placeholder="Note: Add Space To Remove Text" value="${escapeHtml(draft.appearance?.heroBanners?.[2]?.h1 || '')}">
            <label class="block text-xs text-gray-300 mt-2">Sub Heading</label>
            <textarea id="wzBanner3Sub" rows="2" class="w-full p-2 bg-gray-800 rounded border border-white/10 text-sm"
                      placeholder="Note: Add Space To Remove Text">${escapeHtml(draft.appearance?.heroBanners?.[2]?.sub || '')}</textarea>
            <!-- NEW: Banner 3 image picker -->
            <div class="mt-2 flex items-center gap-3">
              <div id="wzBanner3ImgPreview"
                  class="h-12 w-20 rounded bg-gray-800 ring-1 ring-white/10 overflow-hidden grid place-items-center">
                ${hero3Img ? `<img src="${escapeHtml(hero3Img)}" alt="Banner 3 image" class="object-cover max-h-12 w-full">`
                            : `<span class="text-[10px] text-gray-500">No image</span>`}
              </div>
              <button id="wzBanner3PickImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Pick from Library
              </button>
              ${hero3Img ? `<button id="wzBanner3ClearImage"
                      type="button"
                      class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                Clear
              </button>` : ''}
            </div>
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          These fields only influence the Streaming theme. Blank fields will fall back to the theme’s built-in defaults.
        </p>
      </div>
    ` : ''}

            <!-- LIVE preview (URL-param based) -->
            <div class="rounded-xl ring-1 ring-white/10 p-4 mt-4">
              <div class="flex items-center justify-between mb-2">
                <div class="text-gray-400 text-sm">
                  Theme Preview
                </div>
                <button id="wzPreviewRefresh"
                        type="button"
                        class="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">
                  Refresh
                </button>
              </div>

              <!-- HINT shown until a domain exists (Create UI only) -->
              <div id="wzLivePreviewHint" class="p-3 text-xs text-gray-400">
                Generate your domain first, then click <em>Apply</em> to load the live preview.
              </div>

              <!-- “Device” frame: 1024×768 scaled to fit -->
              <div id="wzLivePreviewBlock" class="hidden">
                <div id="wzThemeDeviceContainer"
                    class="relative w-full rounded-lg overflow-hidden ring-1 ring-white/10 bg-gray-900 p-3 min-h-[240px]">
                  <!-- Loading overlay (covers iframe while resolving/blank) -->
                  <div id="wzPreviewLoading"
                      class="absolute inset-3 rounded-lg bg-gray-900/85 backdrop-blur-sm ring-1 ring-white/10 grid place-items-center text-center hidden">
                    <div class="flex flex-col items-center gap-3 max-w-[22rem] px-4">
                      <!-- simple spinner -->
                      <svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
                      </svg>
                      <div class="text-sm text-gray-200" data-msg>
                        Preparing your preview… This can take a moment.
                      </div>
                      <div class="text-[11px] text-gray-400">
                        It refreshes automatically. If nothing appears, press <strong>Refresh</strong>.
                      </div>
                    </div>
                  </div>

                  <div id="wzThemeDeviceFrame"
                      class="origin-top-left"
                      style="width:1024px; height:768px;">
                    <iframe id="wzLiveThemePreview"
                            src=""
                            class="block bg-black"
                            style="width:1024px; height:768px; border:0;"
                            loading="lazy"
                            referrerpolicy="no-referrer">
                    </iframe>
                  </div>
                </div>

                <p class="mt-2 text-[11px] text-gray-500">
                  This preview uses your site and applies the appearance settings above.
                </p>
              </div>
            </div>



            <!-- Small hint shown only while hidden -->
            <p data-live-preview-hint class="mt-2 text-[11px] text-gray-400">
              Press <strong>Apply</strong> to load the live preview here.
            </p>


          <div class="md:col-span-2">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <button id="wzApplyPreview"
                      class="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                Apply
              </button>
              <!-- 🔹 Confirm & Publish (writes config to S3 and invalidates CDN) -->
              <button id="wzConfirmPublish"
                      class="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white"
                      title="Publish this brand's config to the CDN so your live site uses it">
                Confirm &amp; Publish
              </button>
              <span id="wzApplySuccess" class="text-xs text-green-400 hidden">Applied ✓</span>
            </div>

            <p class="text-xs text-gray-400 mb-2">
              Press <strong>Apply</strong> for your look &amp; feel design changes to take effect.
            </p>
          </div>

  </div>
`;


// ===================== PLATFORMS STEP =====================
const platforms = `
  <div class="space-y-6">
    <p class="text-gray-300">Enable platforms and generate a domain.</p>

    <!-- Platform toggles -->
    <div class="rounded-xl ring-1 ring-white/10 p-4 space-y-4">
      <div class="flex items-start gap-3">
        <input id="wzPlatformWebsite" type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800"
              ${draft.platforms.websiteEnabled ? 'checked' : ''}>
        <div>
          <div class="text-sm text-gray-200 font-medium">Website</div>
          <div class="text-xs text-gray-400">Desktop and Mobile</div>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <input id="wzPlatformPwa" type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800"
              ${draft.platforms.pwaEnabled ? 'checked' : ''}>
        <div>
          <div class="text-sm text-gray-200 font-medium">Progressive Web App (PWA)</div>
          <div class="text-xs text-gray-400">Desktop, Tablet, Mobile</div>
        </div>
      </div>
    </div>

    <!-- Domain generation -->
    <div class="rounded-xl ring-1 ring-white/10 p-4 space-y-3">
      <div class="text-sm text-gray-300 font-medium">Domain</div>
      <div class="text-xs text-gray-400">
        A subdomain will be created on <code>playcre8te.com</code> using your brand slug.
        Proposed: <code>${escapeHtml((b.slug || 'your-brand').toString())}.playcre8te.com</code>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button id="wzGenDomainBtn"
                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">
          Generate Domain
        </button>
        <span id="wzDomainStatus" class="text-xs text-gray-400"></span>
      </div>

      <div id="wzDomainRow" class="${b.domain ? '' : 'hidden'} flex items-center gap-2">
        <code id="wzDomainValue" class="text-sm text-blue-300">${escapeHtml(b.domain || '')}</code>
        <button id="wzCopyDomain"
                class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                data-copy-domain="${escapeHtml(b.domain || '')}">
          Copy
        </button>
      </div>
    </div>
  </div>
`;

  const monetization = `...`;
  const content = `...`;
  const launch = `...`;

  const sections = { appearance, platforms, monetization, content, launch };
  if (el) el.innerHTML = sections[key] || '<div>Unknown step.</div>';

  // NEW: After-render bindings now delegated to reusable helpers
if (key === 'appearance') {
  bindBrandEditorAppearance(brandId, el, { allowPersist: true });
}
if (key === 'platforms') {
  bindBrandEditorPlatforms(brandId, el, { allowDomainGen: true });
}
}

// === Reusable After-render bindings (extracted) =============================

// Re-render the *current* UI context without flipping from Create → Brand Settings
function rerenderAppearanceInPlace(brandId, scopeRoot) {
  const inCreate = (typeof toggleBrandModal === 'function' && toggleBrandModal.__mode === 'create');

  if (inCreate) {
    // We are inside the Create Brand drawer — rebuild the Create form and rebind
    if (typeof renderCreateBrandInWizard === 'function') {
      renderCreateBrandInWizard();
    }
    const host  = document.getElementById('brandWizard') || document;
    const state = (toggleBrandModal.__createFlow || { brandId: null, applied: false, slug: '', domainOk: false });

    // Appearance persists only AFTER domain exists and brandId is real
    const allowPersist = !!(state.domainOk && state.brandId);

    // Rebind Create Flow controls (Apply, Generate Domain, Publish)
    if (typeof bindCreateFlowControls === 'function') {
      bindCreateFlowControls(host);
    }
    // Rebind Appearance fragment in create context
    bindBrandEditorAppearance(state.brandId || brandId || '__new__', host, { allowPersist });

    return; // stay in Create UI
  }

  // Normal Brand Settings context
  renderStepContent(brandId, 'appearance');
}
// --- Create-only helper: immediately show the live preview on the newly created domain ---
// Use this ONLY in the Create Brand flow, right after domain generation succeeds.
function __pcShowCreatePreviewOnDomain(scope, brandId) {
  try {
    const domain = getBrandDomainById(brandId);
    if (!domain) return;

    // Reveal block + hide hints
    const block    = scope.querySelector('#wzLivePreviewBlock');
    const hint1    = scope.querySelector('#wzLivePreviewHint');           // inner hint (id)
    const hint2All = scope.querySelectorAll('[data-live-preview-hint]');  // small outer hint(s)
    if (block) block.classList.remove('hidden');
    if (hint1) hint1.classList.add('hidden');
    hint2All.forEach(h => h.classList.add('hidden'));

    // Point iframe at the live domain *without params* so it works before any config exists.
    const liveIframe = scope.querySelector('#wzLiveThemePreview');
    if (liveIframe) {
      const url = `https://${domain}/`;
      liveIframe.setAttribute('src', url);

      // Fit on load (and also now)
      if (!liveIframe.__pcFitBound) {
        liveIframe.addEventListener('load', () => {
          try { fitThemePreviewToContainer(scope); } catch {}
        });
        liveIframe.__pcFitBound = true;
      }
    }

    // Fit device frame right away
    try { fitThemePreviewToContainer(scope); } catch {}
  } catch (e) {
    console.warn('__pcShowCreatePreviewOnDomain failed (non-blocking)', e);
  }
}


// Appearance bindings were moved here from renderStepContent


function bindBrandEditorAppearance(brandId, scopeRoot, opts) {
  const scope       = scopeRoot || document;
  const allowPersist = !!(opts && opts.allowPersist); // In Create Brand UI this is false until domain+brandId exist

  const statusEl  = scope.querySelector('#wzLogoStatus');
  const fileInput = scope.querySelector('#wzLogoFile');
  const uploadBtn = scope.querySelector('#wzUploadLogoBtn');
  const clearBtn  = scope.querySelector('#wzClearLogo');
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

  // ─────────────────────────── Logo: pick-from-library (unchanged logic) ───────────────────────────
  const pickBtn  = scope.querySelector('#wzPickLogoFromLibrary');
  if (pickBtn && !pickBtn.__pcBound) {
    try { pickBtn.setAttribute('type', 'button'); } catch {}
    pickBtn.addEventListener('click', async (e) => {
      e?.preventDefault?.(); e?.stopPropagation?.();
      setStatus('Opening library…');

      const item = await pcPickImageFromLibrary({
        title: 'Pick a logo image',
        accept: ['image/*'],
        multiple: false
      });

      if (!item) { setStatus('No image selected.'); return; }

      // Logo can keep its flexible fallbacks (not related to hero landscape)
      const url = item.url || item.src || item.href || item.downloadUrl || '';
      if (!url) { setStatus('Selected item had no URL.'); return; }

      const d = ensureDraft(brandId);
      d.appearance.logoUrl  = url;
      d.appearance.logoFile = null;

      setLogoPreviewInline(url);

      if (allowPersist && isRealBrandId(brandId)) {
        try { await saveBrandConfigViaPost(brandId, {}); } catch {}
      }

      setStatus('Logo set from library (preview). You can Publish to go live.');
    });
    pickBtn.__pcBound = true;
  }

  // ─────────────────────────── Live preview overlay helpers ───────────────────────────
  const _loadingEl = scope.querySelector('#wzPreviewLoading');
  function showPreviewLoading(msg) {
    if (!_loadingEl) return;
    const t = _loadingEl.querySelector('[data-msg]');
    if (t && msg) t.textContent = msg;
    _loadingEl.classList.remove('hidden');
  }
  function hidePreviewLoading() {
    if (_loadingEl) _loadingEl.classList.add('hidden');
  }

  // Inline preview updater for logo
  function setLogoPreviewInline(url) {
    const fileRow = fileInput ? fileInput.closest('.flex.items-center.gap-4') : null;
    const previewBox = fileRow ? fileRow.querySelector('.h-16.w-16.rounded-lg') : null;
    if (!previewBox) return;
    if (url) {
      const safe = escapeHtml(url);
      previewBox.innerHTML = `<img src="${safe}" alt="Logo preview" class="object-cover h-full w-full">`;
    } else {
      previewBox.innerHTML = `<span class="text-xs text-gray-400">No logo</span>`;
    }
  }

  // --- mini helpers for banner image previews ---
  function setBannerImagePreview(slot, url) {
    const prev = scope.querySelector(`#wzBanner${slot}ImgPreview`);
    if (!prev) return;
    if (url) {
      const safe = escapeHtml(url);
      prev.innerHTML = `<img src="${safe}" alt="Banner ${slot} image" class="object-cover max-h-12 w-full">`;
    } else {
      prev.innerHTML = `<span class="text-[10px] text-gray-500">No image</span>`;
    }
    try { prev.dataset.url = url || ''; } catch {}
  }

  // ─────────────────────────── STRICT path helper (only DB-provided URL) ───────────────────────────
  // NEW: define resolveLandscapeUrl so the picker handler never throws.
  function resolveLandscapeUrl(item) {
    // Prefer the strict DB path we normalize in pickImageSmart:
    const fromStrict = item?.mediaUrl?.artwork?.primary?.landscape;
    // Accept a direct url fallback (we pass {assetId, url} from the picker):
    const fromDirect = item?.url;
    // Final fallback: try to sniff in case an older picker shape slips through.
    const fromLegacy =
      item?.mediaUrl?.artwork?.landscape ||
      item?.artwork?.primary?.landscape ||
      item?.artwork?.landscape ||
      item?.image?.landscape ||
      '';

    return (fromStrict || fromDirect || fromLegacy || '').toString().trim();
  }

    if (!window.resolveLandscapeUrl) window.resolveLandscapeUrl = resolveLandscapeUrl;

  // ─────────────────────────── Wire the three hero picker buttons ───────────────────────────
  function wireHeroPicker(slot1Based) {
    const idx  = slot1Based - 1;
    const pick = scope.querySelector(`#wzBanner${slot1Based}PickImage`);
    const clr  = scope.querySelector(`#wzBanner${slot1Based}ClearImage`);

    if (pick && !pick.__pcBound) {
      try { pick.setAttribute('type', 'button'); } catch {}
      pick.addEventListener('click', async (e) => {
        e?.preventDefault?.(); e?.stopPropagation?.();

        // Inline picker only — returns selected item
        const item = await pickImageSmart({ brandId, slot1Based });
        if (!item) return;

        // robust helpers
        const safeGetAssetId = (it) => {
          if (!it) return '';
          if (typeof window.getAssetId === 'function') return window.getAssetId(it) || '';
          return it.assetId || it.id || it.mediaId || it.fileId || it.key || '';
        };

        const url = (typeof resolveLandscapeUrl === 'function')
          ? resolveLandscapeUrl(item)
          : (item?.mediaUrl?.artwork?.primary?.landscape || item?.url || '');

        const assetId = safeGetAssetId(item);

        // 🔎 trace
        console.log('[hero-pick] slot', slot1Based, { assetId, url, raw: item });

        if (!url) {
          alert('Selected item has no landscape URL.'); 
          return;
        }

        const d = ensureDraft(brandId);
        if (!d.appearance.heroBanners) d.appearance.heroBanners = [{},{},{}];

        // write both canonical & legacy
        d.appearance.heroBanners[idx].url     = url;
        d.appearance.heroBanners[idx].assetId = assetId;
        d.appearance.heroBanners[idx].imgUrl  = url;

        // show small preview & refresh the preview links
        try { setBannerImagePreview(slot1Based, url); } catch {}
        try { refreshPreviewLinks(); } catch {}

        // (optional) don’t immediately re-render the whole Appearance panel here;
        // if you want to keep the current behavior, leave this line, but it’s not required:
        // try { rerenderAppearanceInPlace(brandId, document); } catch {}
      });
      pick.__pcBound = true;
    }

    if (clr && !clr.__pcBound) {
      try { clr.setAttribute('type', 'button'); } catch {}
      clr.addEventListener('click', (e) => {
        e?.preventDefault?.(); e?.stopPropagation?.();

        const d = ensureDraft(brandId);
        if (!d.appearance.heroBanners) d.appearance.heroBanners = [{},{},{}];
        d.appearance.heroBanners[idx].imgUrl  = '';
        d.appearance.heroBanners[idx].assetId = '';
        // add:
        d.appearance.heroBanners[idx].url     = '';

        try { setBannerImagePreview(slot1Based, ''); } catch {}
        try { refreshPreviewLinks(); } catch {}
      });
      clr.__pcBound = true;
    }
  }

  // ─────────────────────────── Picker helpers ───────────────────────────

  // NOTE: currently unused in this inline-only flow
  function waitForEl(selector, { timeout = 800, pollMs = 50 } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function tick() {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start >= timeout) return reject(new Error('timeout'));
        setTimeout(tick, pollMs);
      })();
    });
  }

  // Inline-only pick helper: normalize item into shape containing the STRICT path
  // Normalize selection using resolveLandscapeUrl (the same URL the thumbnail used)
  async function pickImageSmart({ brandId, slot1Based, accept = ['image/*'] } = {}) {
    // 1) load items from your Media API
    async function listAllMedia() {
      const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';

      // Preferred: if api.js exposes listMedia()
      if (window.api?.listMedia) {
        const r = await window.api.listMedia();
        return Array.isArray(r) ? r
             : Array.isArray(r?.items) ? r.items
             : Array.isArray(r?.data) ? r.data
             : Array.isArray(r?.results) ? r.results
             : [];
      }

      // Fallback: direct fetch to MEDIALIBRARY_API
      const base = (typeof MEDIALIBRARY_API === 'string' && MEDIALIBRARY_API) || '';
      if (!base) throw new Error('MEDIALIBRARY_API not set');
      const res = await fetch(`${base.replace(/\/$/, '')}/media`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json().catch(() => ([]));
      return Array.isArray(payload) ? payload
           : Array.isArray(payload?.items) ? payload.items
           : Array.isArray(payload?.data) ? payload.data
           : Array.isArray(payload?.results) ? payload.results
           : [];
    }

    let items = [];
    try { items = await listAllMedia(); } catch (e) {
      console.error('[picker] listAllMedia failed:', e);
      alert('❌ Could not list media. Check console for details.');
      return null;
    }

    // 2) open your inline picker with the list
    // inside pickImageSmart(...)
    return await new Promise((resolve) => {
      const directOnPick = ({ assetId, url }) => {
        // Normalize the shape we resolve back to the caller (wireHeroPicker)
        resolve({
          assetId: assetId || '',
          mediaUrl: { artwork: { primary: { landscape: url || '' } } },
          url: url || ''
        });
      };

      // Prefer explicit onPick over global
      if (typeof showInlineMediaPicker === 'function') {
        showInlineMediaPicker(items, { brandId, slot: slot1Based, onPick: directOnPick });
      } else {
        console.error('[pickImageSmart] showInlineMediaPicker is not defined.');
        resolve(null);
      }
    });
  }

  // ─────────────────────────── Preview URL wiring (unchanged) ───────────────────────────
  function refreshPreviewLinks() {
    const d = ensureDraft(brandId);
    let { homeUrl, exploreUrl } = buildPreviewUrlsFromDraft(d, brandId);

    const inCreate = (typeof toggleBrandModal === 'function' && toggleBrandModal.__mode === 'create');
    const deviceContainer = scope.querySelector('#wzThemeDeviceContainer');

    const curDomain = (typeof getBrandDomainById === 'function') ? getBrandDomainById(brandId) : '';
    let pinnedDomain = '';

    if (inCreate) {
      pinnedDomain = (deviceContainer && deviceContainer.getAttribute('data-pinned-domain')) || '';
      if (curDomain) {
        pinnedDomain = curDomain;
        if (deviceContainer) deviceContainer.setAttribute('data-pinned-domain', pinnedDomain);
      }
    }

    const forceDomainUrl = (url, domain, path) => {
      if (!domain || !url) return url;
      try {
        const u = new URL(url);
        if (!u.host.includes('themes.playcre8te.com')) return url; // already a brand host
      } catch {}
      const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      return `https://${domain}${path}${qs}`;
    };

    if (inCreate && pinnedDomain) {
      homeUrl    = forceDomainUrl(homeUrl,    pinnedDomain, '/');
      exploreUrl = forceDomainUrl(exploreUrl, pinnedDomain, '/explore');
    }

    const homeA    = scope.querySelector('#wzPreviewHome');
    const exploreA = scope.querySelector('#wzPreviewExplore');
    if (homeA)    homeA.href = homeUrl || '#';
    if (exploreA) exploreA.href = exploreUrl || '#';

    const liveIframe = scope.querySelector('#wzLiveThemePreview');
    if (!liveIframe || !homeUrl) {
      if (liveIframe) liveIframe.removeAttribute('src');
      hidePreviewLoading();
      fitThemePreviewToContainer(scope);
      return;
    }

    showPreviewLoading('Preparing your preview… This can take a moment.');

    const cur = liveIframe.getAttribute('src') || '';
    const baseNew   = homeUrl.split('#')[0];
    const cleanCur  = cur.split('#')[0].split('?')[0];
    const cleanNew  = baseNew.split('?')[0];

    if (cleanCur !== cleanNew) {
      liveIframe.src = homeUrl;
    } else {
      const sep = baseNew.includes('?') ? '&' : '?';
      liveIframe.src = `${baseNew}${sep}t=${Date.now()}`;
    }

    fitThemePreviewToContainer(scope);

    if (!liveIframe.__pcFitBound) {
      liveIframe.addEventListener('load', () => {
        hidePreviewLoading();
        fitThemePreviewToContainer(scope);
      });
      liveIframe.addEventListener('error', () => {
        showPreviewLoading('Still getting things ready… If nothing appears, press Refresh.');
      });
      liveIframe.__pcFitBound = true;
    }
  }

  function attachInlinePreviewHandlers() {
    const inCreate = (typeof toggleBrandModal === 'function' && toggleBrandModal.__mode === 'create');
    if (!inCreate) return;

    const homeA      = scope.querySelector('#wzPreviewHome');
    const exploreA   = scope.querySelector('#wzPreviewExplore');
    const liveIframe = scope.querySelector('#wzLiveThemePreview');

    const revealLiveBlock = () => {
      const block    = scope.querySelector('#wzLivePreviewBlock');
      const hint1    = scope.querySelector('#wzLivePreviewHint');
      const hint2All = scope.querySelectorAll('[data-live-preview-hint]');
      if (block) block.classList.remove('hidden');
      if (hint1) hint1.classList.add('hidden');
      hint2All.forEach(h => h.classList.add('hidden'));
    };

    const bind = (a) => {
      if (!a || a.__pcInlineBound) return;
      try { a.removeAttribute('target'); a.removeAttribute('rel'); } catch {}
      a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { refreshPreviewLinks(); } catch {}
        const url = a.href || '';
        if (!url || !liveIframe) return;
        const base = url.split('#')[0];
        const sep  = base.includes('?') ? '&' : '?';
        liveIframe.setAttribute('src', `${base}${sep}t=${Date.now()}`);
        revealLiveBlock();
        try { fitThemePreviewToContainer(scope); } catch {}
      }, true);
      a.__pcInlineBound = true;
    };

    bind(homeA);
    bind(exploreA);
  }

  function revealLivePreviewIfReady() {
    try {
      const dom = getBrandDomainById(brandId);
      const block = scope.querySelector('#wzLivePreviewBlock');
      const hint1 = scope.querySelector('#wzLivePreviewHint');
      const hint2All = scope.querySelectorAll('[data-live-preview-hint]');
      const hasDom = !!dom;
      if (block) block.classList.toggle('hidden', !hasDom);
      if (hint1) hint1.classList.toggle('hidden', !!hasDom);
      hint2All.forEach(h => h.classList.toggle('hidden', !!hasDom));
    } catch {}
  }

  // ─────────────────────────── Logo file upload glue (unchanged) ───────────────────────────
  if (clearBtn && !clearBtn.__pcBound) {
    clearBtn.addEventListener('click', () => {
      const d = ensureDraft(brandId);
      d.appearance.logoUrl  = '';
      d.appearance.logoFile = null;
      setLogoPreviewInline('');
      setStatus('');
      if (uploadBtn) uploadBtn.disabled = true;
    });
    clearBtn.__pcBound = true;
  }

  const canUploadLogo = allowPersist && isRealBrandId(brandId);

  if (fileInput && !fileInput.__pcBound) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      const d = ensureDraft(brandId);
      if (f) {
        d.appearance.logoFile = f;
        d.appearance.logoUrl  = URL.createObjectURL(f);
        setLogoPreviewInline(d.appearance.logoUrl);
        setStatus(canUploadLogo ? 'Ready to upload…' : 'Will upload after brand is created');
        if (uploadBtn) uploadBtn.disabled = !canUploadLogo;
      }
    });
    fileInput.__pcBound = true;
  }

  if (uploadBtn && !uploadBtn.__pcBound) {
    if (!canUploadLogo) {
      uploadBtn.disabled = true;
      uploadBtn.title = 'Create the brand first, then upload the logo here.';
    } else {
      uploadBtn.addEventListener('click', async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const d = ensureDraft(brandId);
        const file = d.appearance.logoFile;
        if (!file) { setStatus('Please choose a file first.'); return; }

        const idToken = getAuthToken();
        const priorVersion = (getBrandById(brandId) || {}).logo?.version || null;

        try {
          uploadBtn.disabled = true;
          setStatus('Requesting upload URL…');
          const presign = await requestLogoUploadUrl(brandId, idToken, file);

          setStatus('Uploading to storage…');
          await uploadWithPresign(presign, file);

          setStatus('Processing logo (generating renditions)…');
          const logo = await pollBrandLogo(brandId, idToken, priorVersion, 60000);

          const idx = __brandsCache.findIndex(bx => (bx.brandId || bx.id) === brandId);
          if (idx >= 0 && logo) __brandsCache[idx] = { ...__brandsCache[idx], logo };

          const processedPreview =
            (logo && (selectCardMark(logo, 64) || selectNavbarLogo(logo, 32) || (logo.primary||[])[0])) ||
            d.appearance.logoUrl;

          d.appearance.logoFile = null;
          d.appearance.logoUrl  = processedPreview;

          setLogoPreviewInline(processedPreview);

          try { await saveBrandConfigViaPost(brandId, {}); } catch (e2) { console.warn('config rebuild after logo update failed (non-blocking)', e2); }

          setStatus(logo ? 'Logo uploaded & processed ✓' : 'Logo uploaded ✓ (processing shortly)');
          refreshPreviewLinks();
          try { if (window.pcBrand?.refresh) window.pcBrand.refresh().catch(()=>{}); } catch(_) {}

        } catch (err) {
          console.error(err);
          setStatus('Upload failed.');
          alert('❌ Logo upload failed: ' + (err && err.message ? err.message : err));
        } finally {
          uploadBtn.disabled = false;
        }
      });
    }
    uploadBtn.__pcBound = true;
  }

  // ===== Logo renditions panel + copy buttons (from Block 2) =====
  const toggleBtn = scope.querySelector('[data-wz-renditions-toggle]');
  const panel     = scope.querySelector('[data-wz-renditions-panel]');
  const caret     = scope.querySelector('[data-wz-renditions-caret]');
  if (toggleBtn && panel && !toggleBtn.__pcBound) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !isHidden);
      if (caret) caret.textContent = isHidden ? '▾' : '▸';
      toggleBtn.setAttribute('aria-expanded', String(isHidden));
    });
    toggleBtn.__pcBound = true;
  }
  scope.querySelectorAll('[data-copy-url]').forEach((btn) => {
    if (btn.__pcBound) return;
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-copy-url') || '';
      try {
        await navigator.clipboard?.writeText(url);
        const prev = btn.textContent; btn.textContent = 'Copied';
        setTimeout(() => btn.textContent = prev || 'Copy', 1200);
      } catch { prompt('Copy URL', url); }
    });
    btn.__pcBound = true;
  });

  // ─────────────────────────── Theme controls + hero text (unchanged) ───────────────────────────
  const themeEl      = scope.querySelector('#wzTheme');
  const bgPresetEl   = scope.querySelector('#wzBgPreset');
  const bgHexEl      = scope.querySelector('#wzBgHex');
  const accentEl     = scope.querySelector('#wzAccent');
  const accentHexEl  = scope.querySelector('#wzAccentHex');
  const useDefaultEl = scope.querySelector('#wzUseDefaultTheme');

  const b1h = scope.querySelector('#wzBanner1H1');
  const b1s = scope.querySelector('#wzBanner1Sub');
  const b2h = scope.querySelector('#wzBanner2H1');
  const b2s = scope.querySelector('#wzBanner2Sub');
  const b3h = scope.querySelector('#wzBanner3H1');
  const b3s = scope.querySelector('#wzBanner3Sub');

  function syncHeroDraft() {
    const d = ensureDraft(brandId);
    if (!d.appearance.heroBanners) d.appearance.heroBanners = [{},{},{}];
    if (b1h) d.appearance.heroBanners[0].h1  = b1h.value || '';
    if (b1s) d.appearance.heroBanners[0].sub = b1s.value || '';
    if (b2h) d.appearance.heroBanners[1].h1  = b2h.value || '';
    if (b2s) d.appearance.heroBanners[1].sub = b2s.value || '';
    if (b3h) d.appearance.heroBanners[2].h1  = b3h.value || '';
    if (b3s) d.appearance.heroBanners[2].sub = b3s.value || '';
  }

  if (themeEl && !themeEl.__pcBound) {
    themeEl.addEventListener('change', () => {
      const d = ensureDraft(brandId);
      d.appearance.themeKey = themeEl.value || 'streaming';
      refreshPreviewLinks();
      renderStepContent(brandId, 'appearance');
    });
    themeEl.__pcBound = true;
  }
  if (bgPresetEl && !bgPresetEl.__pcBound) {
    bgPresetEl.addEventListener('change', () => {
      const d = ensureDraft(brandId);
      d.appearance.bgPreset = bgPresetEl.value;
      d.appearance.bgHex = d.appearance.bgPreset === 'light' ? '#FFFFFF' : '#0B0B0B';
      if (bgHexEl) bgHexEl.textContent = d.appearance.bgHex;
      refreshPreviewLinks();
    });
    bgPresetEl.__pcBound = true;
  }
  if (accentEl && !accentEl.__pcBound) {
    accentEl.addEventListener('input', () => {
      const d = ensureDraft(brandId);
      d.appearance.accentHex = accentEl.value;
      if (accentHexEl) accentHexEl.textContent = d.appearance.accentHex;
      refreshPreviewLinks();
    });
    accentEl.__pcBound = true;
  }
  if (useDefaultEl && !useDefaultEl.__pcBound) {
    useDefaultEl.addEventListener('change', () => {
      const d = ensureDraft(brandId);
      d.appearance.useDefaultTheme = !!useDefaultEl.checked;
      refreshPreviewLinks();
      renderStepContent(brandId, 'appearance');
    });
    useDefaultEl.__pcBound = true;
  }

  [b1h, b1s, b2h, b2s, b3h, b3s].forEach(inp => {
    if (!inp || inp.__pcBound) return;
    const onChange = () => { syncHeroDraft(); refreshPreviewLinks(); };
    inp.addEventListener('input', onChange);
    inp.addEventListener('blur',  onChange);
    inp.__pcBound = true;
  });

  // ===== Theme token builders (from Block 2) =====
  const buildDefaultStreamingThemeConfig = () => ({
    updatedAt: Date.now(),
    ttlSeconds: 3600,
    tokens: {
      accent: "#E50000",
      siteBg: "#0B0B0B", siteTitle: "#000000",
      trendingBg: "transparent", trendingTitle: "#ffffff", trendingCardTitle: "#ffffff",
      newreleasesBg: "transparent", newreleasesTitle: "#ffffff", newreleasesCardTitle: "#ffffff",
      mustwatchBg: "transparent", mustwatchTitle: "#ffffff", mustwatchCardTitle: "#ffffff",
      freeBg: "transparent", freeTitle: "#ffffff", freeCardTitle: "#ffffff",
      exploreLiveBg: "transparent", exploreLiveTitle: "#ffffff", exploreLiveCardTitle: "#ffffff",
      explorePurchaseBg: "transparent", explorePurchaseTitle: "#ffffff", explorePurchaseCardTitle: "#ffffff",
      exploreCollectionsBg: "transparent", exploreCollectionsTitle: "#ffffff", exploreCollectionsCardTitle: "#ffffff",
      exploreCategoriesBg: "transparent", exploreCategoriesTitle: "#ffffff", exploreCategoriesCardTitle: "#ffffff",
      explorePersonalizationBg: "transparent", explorePersonalizationPad: "0", explorePersonalizationTitle: "#ffffff",
      plansBg: "transparent", plansTitle: "#ffffff", plansSub: "#D1D5DB",
      footerBg: "#0F0F0F", footerFg: "#D1D5DB", footerTitle: "#FFFFFF"
    }
  });
  const buildDarkPresetConfig = (accentHex) => ({
    updatedAt: Date.now(),
    ttlSeconds: 3600,
    tokens: {
      accent: accentHex,
      siteBg: "#0B0B0B", siteTitle: "#000000",
      trendingBg: "transparent", trendingTitle: "#ffffff", trendingCardTitle: "#ffffff",
      newreleasesBg: "transparent", newreleasesTitle: "#ffffff", newreleasesCardTitle: "#ffffff",
      mustwatchBg: "transparent", mustwatchTitle: "#ffffff", mustwatchCardTitle: "#ffffff",
      freeBg: "transparent", freeTitle: "#ffffff", freeCardTitle: "#ffffff",
      exploreLiveBg: "transparent", exploreLiveTitle: "#ffffff", exploreLiveCardTitle: "#ffffff",
      explorePurchaseBg: "transparent", explorePurchaseTitle: "#ffffff", explorePurchaseCardTitle: "#ffffff",
      exploreCollectionsBg: "transparent", exploreCollectionsTitle: "#ffffff", exploreCollectionsCardTitle: "#ffffff",
      exploreCategoriesBg: "transparent", exploreCategoriesTitle: "#ffffff", exploreCategoriesCardTitle: "#ffffff",
      explorePersonalizationBg: "transparent", explorePersonalizationPad: "0", explorePersonalizationTitle: "#ffffff",
      plansBg: "transparent", plansTitle: "#ffffff", plansSub: "#D1D5DB",
      footerBg: "#0F0F0F", footerFg: "#D1D5DB", footerTitle: "#FFFFFF"
    }
  });
  const buildLightPresetConfig = (accentHex) => ({
    updatedAt: Date.now(),
    ttlSeconds: 3600,
    tokens: {
      accent: accentHex,
      siteBg: "#ffffff", siteTitle: "#000000",
      trendingBg: "transparent", trendingTitle: "#0B0B0B", trendingCardTitle: "#ffffff",
      newreleasesBg: "transparent", newreleasesTitle: "#0B0B0B", newreleasesCardTitle: "#ffffff",
      mustwatchBg: "transparent", mustwatchTitle: "#0B0B0B", mustwatchCardTitle: "#ffffff",
      freeBg: "transparent", freeTitle: "#0B0B0B", freeCardTitle: "#ffffff",
      exploreLiveBg: "transparent", exploreLiveTitle: "#0B0B0B", exploreLiveCardTitle: "#ffffff",
      explorePurchaseBg: "transparent", explorePurchaseTitle: "#0B0B0B", explorePurchaseCardTitle: "#ffffff",
      exploreCollectionsBg: "transparent", exploreCollectionsTitle: "#0B0B0B", exploreCollectionsCardTitle: "#ffffff",
      exploreCategoriesBg: "transparent", exploreCategoriesTitle: "#0B0B0B", exploreCategoriesCardTitle: "#ffffff",
      explorePersonalizationBg: "transparent", explorePersonalizationPad: "0", explorePersonalizationTitle: "#ffffff",
      plansBg: "transparent", plansTitle: "#0B0B0B", plansSub: "#D1D5DB",
      footerBg: "#0F0F0F", footerFg: "#D1D5DB", footerTitle: "#FFFFFF"
    }
  });
  const normHex = (h) => {
    const v = (h || '').trim();
    if (!v) return "#E50000";
    return v.startsWith('#') ? v : ('#' + v);
  };




  // Read hero text from inputs; fall back to draft for images
  // REPLACED: now returns {h1, sub, url, assetId} for persistence
  function collectHeroBannersForPersist() {
    const val = (el) => (el && typeof el.value === 'string' ? el.value.trim() : '');
    const d = ensureDraft(brandId);
    const at = (i, key) => (d?.appearance?.heroBanners?.[i]?.[key] || '').toString().trim();

    const rows = [
      { h1: val(scope.querySelector('#wzBanner1H1')), sub: val(scope.querySelector('#wzBanner1Sub')), url: at(0,'url'),     assetId: at(0,'assetId') },
      { h1: val(scope.querySelector('#wzBanner2H1')), sub: val(scope.querySelector('#wzBanner2Sub')), url: at(1,'url'),     assetId: at(1,'assetId') },
      { h1: val(scope.querySelector('#wzBanner3H1')), sub: val(scope.querySelector('#wzBanner3Sub')), url: at(2,'url'),     assetId: at(2,'assetId') },
    ];

    // If text empty but we have a legacy imgUrl in draft, map it to url
    rows.forEach((r, i) => {
      if (!r.url) {
        const legacy = at(i, 'imgUrl');
        if (legacy) r.url = legacy;
      }
    });

    // keep if any content (text or image url)
    return rows.filter(r => r.h1 || r.sub || r.url);
  }

  // Bind all three hero pickers
  [1, 2, 3].forEach(wireHeroPicker);

  // ─────────────────────────── Apply/Publish buttons (unchanged) ───────────────────────────
  const previewRefreshBtn = scope.querySelector('#wzPreviewRefresh');
  if (previewRefreshBtn && !previewRefreshBtn.__pcBound) {
    try { previewRefreshBtn.setAttribute('type', 'button'); } catch {}
    const parentForm = previewRefreshBtn.closest('form');
    if (parentForm && !parentForm.__pcNoSubmitGuard) {
      parentForm.addEventListener('submit', (e) => {
        if (e.submitter && e.submitter.matches && e.submitter.matches('#wzPreviewRefresh')) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
        }
      }, true);
      parentForm.__pcNoSubmitGuard = true;
    }
    const cancel = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); e?.stopImmediatePropagation?.(); };
    previewRefreshBtn.addEventListener('pointerdown', cancel, true);
    previewRefreshBtn.addEventListener('click', (e) => {
      cancel(e);
      const liveIframe = scope.querySelector('#wzLiveThemePreview');
      if (!liveIframe) return;
      const current = liveIframe.getAttribute('src') || '';
      if (!current) { try { scope.querySelector('#wzApplyPreview')?.click(); } catch {} return; }
      const clean = current.split('#')[0].split('?')[0];
      liveIframe.setAttribute('src', `${clean}?t=${Date.now()}`);
      try { fitThemePreviewToContainer(scope); } catch {}
    }, true);
    previewRefreshBtn.__pcBound = true;
  }

  const applyPreviewBtn = scope.querySelector('#wzApplyPreview');
  const applySuccessEl  = scope.querySelector('#wzApplySuccess');
  if (applyPreviewBtn && !applyPreviewBtn.__pcPreviewBound) {
    try { applyPreviewBtn.setAttribute('type', 'button'); } catch(_){}
    applyPreviewBtn.addEventListener('click', (e) => {
      e?.preventDefault?.(); e?.stopPropagation?.();
      refreshPreviewLinks();
      if (applySuccessEl) {
        applySuccessEl.classList.remove('hidden');
        setTimeout(() => applySuccessEl.classList.add('hidden'), 2000);
      }
    });
    applyPreviewBtn.__pcPreviewBound = true;
  }

  const confirmPublishBtn = scope.querySelector('#wzConfirmPublish');
  if (confirmPublishBtn) {
    if (!allowPersist || !isRealBrandId(brandId)) {
      confirmPublishBtn.disabled = true;
      confirmPublishBtn.title = 'Create the brand first, then publish.';
    } else if (!confirmPublishBtn.__pcPublishBound) {
      confirmPublishBtn.addEventListener('click', async () => {
        refreshPreviewLinks();
        const original = confirmPublishBtn.textContent;
        confirmPublishBtn.disabled = true;
        confirmPublishBtn.textContent = 'Publishing…';
        try {
          await publishBrandConfig(brandId);
          if (applySuccessEl) {
            const prev = applySuccessEl.textContent;
            const wasHidden = applySuccessEl.classList.contains('hidden');
            applySuccessEl.textContent = 'Published ✓';
            applySuccessEl.classList.remove('hidden');
            setTimeout(() => {
              applySuccessEl.textContent = prev || 'Applied ✓';
              if (wasHidden) applySuccessEl.classList.add('hidden');
            }, 2200);
          }
          if (window.pcBrand?.refresh) window.pcBrand.refresh().catch(()=>{});
        } catch (e) {
          const msg = (e && (e.message || e.toString())) || 'Unknown error';
          alert('❌ Publish failed: ' + msg + '\nMake sure your brand has a domain and config.tokens set.');
          console.error('publishBrandConfig error:', e);
        } finally {
          confirmPublishBtn.disabled = false;
          confirmPublishBtn.textContent = original;
        }
      });
      confirmPublishBtn.__pcPublishBound = true;
    }
  }

  // ===== Optional persistence on Apply (from Block 2; keeps your existing Apply intact) =====
  if (allowPersist && isRealBrandId(brandId)) {
    const applyPreviewBtn = scope.querySelector('#wzApplyPreview');
    const applySuccessEl  = scope.querySelector('#wzApplySuccess');

    if (applyPreviewBtn && !applyPreviewBtn.__pcPersistBound) {
      applyPreviewBtn.addEventListener('click', async () => {
        try {
          const usingDefault = !!scope.querySelector('#wzUseDefaultTheme')?.checked;
          const preset = (scope.querySelector('#wzBgPreset')?.value || 'dark').toLowerCase();
          const accent = normHex(scope.querySelector('#wzAccent')?.value || '#E50000');

          let payload, label;
          if (usingDefault) { payload = buildDefaultStreamingThemeConfig(); label = 'Default Theme'; }
          else if (preset === 'light') { payload = buildLightPresetConfig(accent); label = 'Light'; }
          else { payload = buildDarkPresetConfig(accent); label = 'Dark'; }

          // Theme key + HERO handling
          const themeEl = scope.querySelector('#wzTheme');
          const d = ensureDraft(brandId);
          const themeKey = (themeEl && themeEl.value) || d.appearance.themeKey || 'streaming';

          if (themeKey === 'streaming') {
            const banners = (d.appearance.heroBanners || [])
              .slice(0, 3)
              .map(b => ({
                h1: (b?.h1 || '').trim(),
                sub: (b?.sub || '').trim(),
                assetId: (b?.assetId || '').trim(),
                url: ((b?.url || b?.imgUrl) || '').trim()
              }))
              .filter(b => b.h1 || b.sub || b.assetId || b.url);

            if (banners.length) {
              payload.brand = payload.brand || {};
              payload.brand.heroBanners = banners; // [{h1,sub,url,assetId}]
            }
          }
          await saveBrandConfigViaPost(brandId, payload);

          // Enhance the success toast, but keep your existing non-persisting toast too
          if (applySuccessEl) {
            const prev = applySuccessEl.textContent;
            applySuccessEl.textContent = `Applied & Saved (${label}) ✓`;
            applySuccessEl.classList.remove('hidden');
            setTimeout(() => {
              applySuccessEl.textContent = prev || 'Applied ✓';
              applySuccessEl.classList.add('hidden');
            }, 2000);
          }
        } catch (err) {
          console.error(err);
          const el = applySuccessEl;
          if (el) {
            el.textContent = 'Save failed — check console';
            el.classList.remove('hidden');
            el.classList.add('bg-red-600');
            setTimeout(() => {
              el.classList.remove('bg-red-600');
              el.classList.add('hidden');
              el.textContent = 'Applied ✓';
            }, 4000);
          } else {
            alert('Could not save brand config. See console for details.');
          }
        }
      }, { capture: false }); // allow your original Apply handler to run too

      applyPreviewBtn.__pcPersistBound = true;
    }
  }

  // ===== Initial preview setup =====
  try { revealLivePreviewIfReady(); } catch {}
  refreshPreviewLinks();
  const live = scope.querySelector('#wzLiveThemePreview');
  if (live && !live.__pcFitBound) {
    live.addEventListener('load', () => fitThemePreviewToContainer(scope));
    live.__pcFitBound = true;
  }
  fitThemePreviewToContainer(scope);

  try { attachInlinePreviewHandlers(); } catch {}

  // ─────────────────────────── Inline Media Picker (STRICT landscape only) ───────────────────────────

  // === public thumbnail helper (same logic as media.js) ===
  window.getPublicThumbUrl = function getPublicThumbUrl(item) {
    const type = (item.fileType || item.mediaType || '').toLowerCase();
    if (type.startsWith('image')) {
      const art = item.mediaUrl?.artwork?.primary || {};
      return (
        art.landscape ||
        ''
      );
    }
    if (type.startsWith('video')) {
      const t = item.mediaUrl?.video?.primary?.thumbnails || {};
      return t.rendition3 || t.rendition2 || t.rendition1 || '';
    }
    return '';
  };

  // ===== INLINE MEDIA PICKER (brand.js) — fixed thumbnail loading =====
  // ---- DROP-IN: inline media picker that mirrors media.js thumbnail logic ----
  function showInlineMediaPicker(fullList, { brandId = null, slot = null, onPick = null } = {}) {
    // Close any previous picker
    try { if (typeof window.closeInlineMediaPicker === 'function') window.closeInlineMediaPicker(); } catch {}

    // Basic guard
    if (!Array.isArray(fullList)) fullList = [];

    // Build modal shell
    const overlay = document.createElement('div');
    overlay.id = 'pcInlineMediaPicker';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-gray-900 rounded-xl ring-1 ring-white/10 w-[min(1100px,92vw)] h-[min(80vh,800px)] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div class="text-sm text-gray-200 font-medium">Choose an image</div>
          <button id="pcPickerClose" class="px-2 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600">Close</button>
        </div>
        <div class="p-3 flex items-center gap-2 border-b border-white/10">
          <input id="pcPickerSearch" placeholder="Search…" class="w-full px-2 py-1 text-sm bg-gray-800 rounded border border-white/10" />
          <div id="pcPickerMeta" class="text-xs text-gray-400 whitespace-nowrap"></div>
        </div>
        <div class="flex-1 overflow-auto">
          <div id="pcPickerGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-3"></div>
          <div id="pcPickerEmpty" class="hidden p-8 text-center text-gray-400 text-sm">No matching images.</div>
        </div>
        <div id="pcPickerErr" class="hidden p-3 text-xs text-red-400 border-t border-white/10"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // One global closer (idempotent)
    if (!window.closeInlineMediaPicker) {
      window.closeInlineMediaPicker = function closeInlineMediaPicker() {
        const el = document.getElementById('pcInlineMediaPicker');
        if (el && el.parentNode) el.parentNode.removeChild(el);
        try {
          if (window.MediaPicker) {
            window.MediaPicker.active = false;
            window.MediaPicker.onPick  = null;
            window.MediaPicker.slot    = null;
            window.MediaPicker.brandId = null;
          }
        } catch {}
      };
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) window.closeInlineMediaPicker();
    }, true);
    overlay.querySelector('#pcPickerClose')?.addEventListener('click', () => window.closeInlineMediaPicker());

    const grid   = overlay.querySelector('#pcPickerGrid');
    const empty  = overlay.querySelector('#pcPickerEmpty');
    const errBox = overlay.querySelector('#pcPickerErr');
    const meta   = overlay.querySelector('#pcPickerMeta');
    const search = overlay.querySelector('#pcPickerSearch');

    // Optional lazy observer (same pattern you already use)
    const pickerObserver = ('IntersectionObserver' in window)
      ? new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const src = img.getAttribute('data-src');
              if (src) { img.src = src; img.removeAttribute('data-src'); }
              obs.unobserve(img);
            }
          });
        }, { root: grid, rootMargin: '200px', threshold: 0.01 })
      : null;

    function getTitle(it) {
      return (it.title || it.fileName || '').toLowerCase();
    }

    function sortList(list) {
      list.sort((a, b) => {
        const ma = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const mb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return mb - ma;
      });
    }

    function renderNow() {
      const q = (search.value || '').toLowerCase();

      // Filter to **images with a PUBLIC thumbnail** (exactly like media.js)
      let viewList = fullList.filter(it => {
        if ((it.status || '').toLowerCase() === 'deleted') return false;
        const t = (it.fileType || it.mediaType || '').toLowerCase();
        if (t && !t.startsWith('image')) return false;

        const hasPublicThumb = !!(window.getPublicThumbUrl ? window.getPublicThumbUrl(it) : '');
        if (!hasPublicThumb) return false;

        if (q && !getTitle(it).includes(q)) return false;
        return true;
      });

      sortList(viewList);
      window.__pickerViewList = viewList; // <-- for console inspection

      grid.innerHTML = '';
      if (!viewList.length) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        errBox.classList.add('hidden');
        meta.textContent = '0 items';
        return;
      } else {
        grid.classList.remove('hidden');
        empty.classList.add('hidden');
        errBox.classList.add('hidden');
        meta.textContent = `${viewList.length} items`;
      }

      viewList.forEach(item => {
        const title     = item.title || item.fileName || 'Untitled';

        // STRICT landscape for saving the selection (DB path)
        const selectUrl =
        (window.resolveLandscapeUrl && window.resolveLandscapeUrl(item)) ||
        (window.getPublicThumbUrl && window.getPublicThumbUrl(item)) ||
        item?.mediaUrl?.artwork?.primary?.landscape ||
        item?.url ||
        '';
        const canSelect = !!selectUrl;

        // PUBLIC thumbnail for the <img> (same logic as media.js)
        const thumbUrl  = (window.getPublicThumbUrl ? window.getPublicThumbUrl(item) : '') || selectUrl;

        const card = document.createElement('div');
        card.className = 'bg-gray-800 rounded-xl ring-1 ring-white/10 overflow-hidden flex flex-col';

        // --- thumbnail ---
        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'relative';

        const FALLBACK_TILE_HTML = `
          <div style="width:100%;height:180px;background:#111;"
              class="flex items-center justify-center ring-1 ring-white/10">
            <span class="text-[11px] text-gray-400">Preview unavailable</span>
          </div>`;

        if (thumbUrl) {
          const spinner = document.createElement('div');
          spinner.className = 'absolute inset-0 flex items-center justify-center z-10 bg-gray-700 bg-opacity-60';
          spinner.innerHTML = `<div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

          const img = document.createElement('img');
          img.className = 'pc-thumb';                 // CSS forces 180px height
          img.alt = title;
          img.loading = 'lazy';

          // IMPORTANT: do NOT set crossOrigin/referrerPolicy
          img.setAttribute('style', 'width:100%; height:180px; object-fit:cover; display:block; background:#111;');

          img.src = thumbUrl; // show the public thumbnail (like media.js)
          if (pickerObserver) {
            img.setAttribute('data-src', thumbUrl);
            pickerObserver.observe(img);
          }

          img.addEventListener('load',  () => { try { spinner.remove(); } catch {} });
          img.addEventListener('error', () => {
            try { spinner.remove(); } catch {}
            thumbWrap.innerHTML = FALLBACK_TILE_HTML;
          });

          // Safety timeout
          setTimeout(() => {
            if (thumbWrap.contains(spinner)) {
              try { spinner.remove(); } catch {}
            }
          }, 1500);

          thumbWrap.appendChild(spinner);
          thumbWrap.appendChild(img);
        } else {
          thumbWrap.innerHTML = FALLBACK_TILE_HTML;
        }

        card.appendChild(thumbWrap);

        // ----- BODY (title + open + Select) -----
        const body = document.createElement('div');
        body.className = 'p-3 flex items-center justify-between gap-2';
        body.innerHTML = `
          <div class="text-xs text-blue-300 font-medium truncate" title="${title}">
            ${title}
          </div>
          <div class="flex items-center gap-2">
            ${thumbUrl ? `<a href="${thumbUrl}" target="_blank" rel="noopener" class="text-[11px] text-gray-400 underline">open</a>` : ''}
            <button class="px-2 py-1 text-xs rounded ${canSelect ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-700 opacity-60 cursor-not-allowed'}">
              Select
            </button>
          </div>
        `;
        card.appendChild(body);

        // Wire Select (only if we have a strict landscape URL to save)
        const btn = body.querySelector('button');
        if (btn && canSelect) {
          try { btn.type = 'button'; } catch {}
          btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();

            const getAssetId = (typeof window.getAssetId === 'function')
              ? window.getAssetId
              : (it) => it.assetId || it.id || it.mediaId || it.fileId || it.key || '';

            const assetId = getAssetId(item);
            if (!assetId || !selectUrl) {
              alert('⚠️ This image is missing the required primary.landscape URL.');
              return;
            }

            console.log('[picker:select]', {
              assetId,
              selectUrl,
              slot,
              brandId
            });

            if (typeof onPick === 'function') {
              onPick({ assetId, url: selectUrl, slot, brandId });
            } else if (window.MediaPicker && typeof window.MediaPicker.onPick === 'function') {
              window.MediaPicker.onPick({ assetId, url: selectUrl, slot: window.MediaPicker.slot, brandId: window.MediaPicker.brandId });
            }

            window.closeInlineMediaPicker();
          });
        } else if (btn) {
          btn.title = 'This item lacks primary.landscape; cannot select.';
        }

        grid.appendChild(card);
      });
    }

    // Search handler
    let t;
    const re = () => { clearTimeout(t); t = setTimeout(renderNow, 150); };
    search.addEventListener('input', re);

    // Initial render
    renderNow();

    // ESC closes
    document.addEventListener('keydown', function escClose(ev) {
      if (ev.key === 'Escape') {
        document.removeEventListener('keydown', escClose);
        window.closeInlineMediaPicker();
      }
    });
  }

  // Expose once so any legacy checks for window.openInlineMediaPicker work
  if (!globalThis.showInlineMediaPicker) {
    globalThis.showInlineMediaPicker = showInlineMediaPicker;
  }
}


  // Platforms bindings were moved here from renderStepContent
  // Platforms bindings were moved here from renderStepContent
  function bindBrandEditorPlatforms(brandId, scopeRoot, opts) {
    const scope = scopeRoot || document;
    const allowDomainGen = !!(opts && opts.allowDomainGen); // ⬅️ NEW for Create modal
    const d = ensureDraft(brandId);

  

  // Manual refresh button (cache-bust)
  // Manual refresh button (cache-bust) — bulletproof "do NOT submit"
  // Manual refresh button (cache-bust) — bulletproof "do NOT submit"
  const previewRefreshBtn = scope.querySelector('#wzPreviewRefresh');
  if (previewRefreshBtn && !previewRefreshBtn.__pcBound) {
    // 1) force non-submit
    try { previewRefreshBtn.setAttribute('type', 'button'); } catch {}

    // 2) guard against accidental form submit in all browsers
    const parentForm = previewRefreshBtn.closest('form');
    if (parentForm && !parentForm.__pcNoSubmitGuard) {
      parentForm.addEventListener('submit', (e) => {
        if (e.submitter && e.submitter.matches && e.submitter.matches('#wzPreviewRefresh')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
        }
      }, true); // capture
      parentForm.__pcNoSubmitGuard = true;
    }

  // 3) also cancel early events
  const cancel = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    e?.stopImmediatePropagation?.();
  };
  previewRefreshBtn.addEventListener('pointerdown', cancel, true);

  previewRefreshBtn.addEventListener('click', (e) => {
    cancel(e);

    const liveIframe = scope.querySelector('#wzLiveThemePreview');
    if (!liveIframe) return;

    const current = liveIframe.getAttribute('src') || '';
    if (!current) {
      // No src yet → rebuild preview URLs via Apply
      try { scope.querySelector('#wzApplyPreview')?.click(); } catch {}
      return;
    }

    const clean = current.split('#')[0].split('?')[0];
    liveIframe.setAttribute('src', `${clean}?t=${Date.now()}`);

    try { fitThemePreviewToContainer(scope); } catch {}
  }, true);

  previewRefreshBtn.__pcBound = true;
  }

  // Ensure the device preview is scaled initially
  requestAnimationFrame(() => fitThemePreviewToContainer(scope));


  if (typeof d.platforms.websiteEnabled === 'undefined') d.platforms.websiteEnabled = true;
  if (typeof d.platforms.pwaEnabled === 'undefined') d.platforms.pwaEnabled = true;

  const websiteEl = scope.querySelector('#wzPlatformWebsite');
  const pwaEl     = scope.querySelector('#wzPlatformPwa');
  const genBtn    = scope.querySelector('#wzGenDomainBtn');
  const statusEl  = scope.querySelector('#wzDomainStatus');
  const rowEl     = scope.querySelector('#wzDomainRow');
  const valEl     = scope.querySelector('#wzDomainValue');
  const copyEl    = scope.querySelector('#wzCopyDomain');

  if (websiteEl) websiteEl.addEventListener('change', () => {
    d.platforms.websiteEnabled = !!websiteEl.checked;
  });
  if (pwaEl) {
    pwaEl.addEventListener('change', () => {
      d.platforms.pwaEnabled = !!pwaEl.checked;
    });
  }

  if (genBtn) {
    if (!allowDomainGen || !isRealBrandId(brandId)) {
      genBtn.disabled = true;
      genBtn.title = 'Create the brand first, then generate the domain.';
    } else {
      genBtn.addEventListener('click', async () => {
        try {
          genBtn.disabled = true;
          if (statusEl) statusEl.textContent = 'Generating…';
          const { domain } = await requestDomainGeneration(brandId);

          if (valEl) valEl.textContent = domain || '';
          if (copyEl && domain) copyEl.setAttribute('data-copy-domain', domain);
          if (rowEl && domain) rowEl.classList.remove('hidden');

          if (statusEl) statusEl.textContent = domain ? '✓ Domain created' : 'Done';
          alert(domain ? `✅ Domain generated: ${domain}` : '✅ Domain generated');
        } catch (err) {
          console.error(err);
          if (statusEl) statusEl.textContent = 'Failed';
          alert('❌ Could not generate domain. See console for details.');
        } finally {
          genBtn.disabled = false;
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 1500);
        }
      }, { once: true });
    }
  }

  if (copyEl) {
    copyEl.addEventListener('click', async () => {
      const domain = copyEl.getAttribute('data-copy-domain') || valEl?.textContent || '';
      if (!domain) return;
      try {
        await navigator.clipboard?.writeText(domain);
        const prev = copyEl.textContent;
        copyEl.textContent = 'Copied';
        setTimeout(() => copyEl.textContent = prev || 'Copy', 1200);
      } catch {
        prompt('Copy domain', domain);
      }
    });
  }
  }

  // Safely render a wizard step into a detached container and return its HTML
  function captureStepHTML(brandId, stepKey) {
    // Build an isolated sandbox that mimics the expected DOM ids
    const sandbox = document.createElement('div');
    sandbox.innerHTML = `
      <div id="wizardBrandName"></div>
      <div id="wizardContent"></div>
    `;
    const sbBrandName = sandbox.querySelector('#wizardBrandName');
    const sbContent   = sandbox.querySelector('#wizardContent');

    // Temporarily hijack getElementById so renderStepContent writes into the sandbox
    const realGetById = document.getElementById.bind(document);
    document.getElementById = function(id) {
      if (id === 'wizardContent')   return sbContent;
      if (id === 'wizardBrandName') return sbBrandName;
      return realGetById(id);
    };

    try {
      renderStepContent(brandId, stepKey);
      return sbContent.innerHTML || '';
    } finally {
      // Restore the real getElementById no matter what
      document.getElementById = realGetById;
      }
  }

  // Inject Appearance & Platforms into the Create Brand modal safely (no persistence yet)
  function enhanceCreateBrandModal() {
    const form = document.getElementById('formCreateBrand');
    if (!form) return;

    // Avoid double-injecting
    if (form.__pcEnhanced) return;
    form.__pcEnhanced = true;

    // Temporary id for draft while creating
    const TEMP_ID = '__new__';

    // Capture step HTML from our existing templates
    const appearanceHTML = captureStepHTML(TEMP_ID, 'appearance');
    const platformsHTML  = captureStepHTML(TEMP_ID, 'platforms');

    // Insert sections right before the Actions row
    const actions = form.querySelector('.flex.items-center.justify-end');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <!-- Create: Appearance & Platforms -->
      <section class="rounded-xl ring-1 ring-white/10 p-4">
        <div class="text-sm text-gray-300 font-medium mb-2">Appearance (optional)</div>
        <p class="text-xs text-gray-400 mb-3">These settings preview your theme while creating. We’ll save them after the brand is created.</p>
        ${appearanceHTML}
      </section>
      <section class="rounded-xl ring-1 ring-white/10 p-4">
        <div class="text-sm text-gray-300 font-medium mb-2">Platforms (optional)</div>
        <p class="text-xs text-gray-400 mb-3">Domain generation is available once the brand exists.</p>
        ${platformsHTML}
      </section>
    `;
    form.insertBefore(wrapper, actions || null);

    // Bind with "no persistence" so Apply just updates preview links
    bindBrandEditorAppearance(TEMP_ID, form, { allowPersist: false });
    bindBrandEditorPlatforms(TEMP_ID, form, { allowDomainGen: false });

    // Keep the proposed domain preview in sync with slug input (if present)
    const slugInput = form.querySelector('input[name="slug"]');
    if (slugInput) {
      const proposed = form.querySelector('#wzDomainRow code, .wzProposedDomain, code'); // best effort
      slugInput.addEventListener('input', () => {
        const slug = (slugInput.value || '').trim() || 'your-brand';
        // try to update any code element that shows the proposed domain
        form.querySelectorAll('code').forEach((c) => {
          const t = (c.textContent || '').toLowerCase();
          if (t.includes('playcre8te.com') || t.includes('playcre8te.tv')) {
            c.textContent = `${slug}.playcre8te.com`;
          }
        });
      });
    }

    // Disable Publish UI in the create modal explicitly (just in case)
    const publishBtn = form.querySelector('#wzConfirmPublish');
    if (publishBtn) {
      publishBtn.disabled = true;
      publishBtn.title = 'Publish is available after the brand is created.';
    }
  }


  // ===================== BRAND EDITOR (Single Page) ===========================
  function renderBrandEditor(brandId) {
    // Reuse wizard shell for layout
    const shell   = document.getElementById('brandWizard');
    const header  = document.getElementById('wizardSteps');
    const content = document.getElementById('wizardContent');
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const saveBtn = document.getElementById('wizardSaveBtn');
    const nameEl  = document.getElementById('wizardBrandName');

    if (!content || !shell) return;

    const b = getBrandById(brandId) || { displayName: 'Brand', slug: 'brand' };
    if (nameEl) nameEl.textContent = b.displayName || b.slug || 'Brand';

    // ✅ Safely capture the step fragments without touching live DOM
    const appearanceHTML = captureStepHTML(brandId, 'appearance');
    const platformsHTML  = captureStepHTML(brandId, 'platforms');
    // NEW: Current Appearance (read-only) pane
    const currentAppearanceHTML = buildCurrentAppearancePaneHTML(brandId);


    // Compose the one-page editor UI
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold text-gray-100">Brand Settings</div>
          <div class="flex items-center gap-2">
            <button id="beClose" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">Close</button>
            <button id="bePublish" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white">Confirm & Publish</button>
          </div>
        </div>


        <!-- Current Appearance (read-only) -->
        <section class="rounded-xl ring-1 ring-white/10 p-4">
          <div class="text-sm text-gray-300 font-medium mb-2">Current Appearance</div>
          ${currentAppearanceHTML}
        </section>

          <section class="rounded-xl ring-1 ring-white/10">
            <button id="beAppearanceToggle"
                    class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/60">
              <span class="text-sm text-gray-300 font-medium">Update Appearance / Look &amp; Feel</span>
              <span id="beAppearanceCaret" class="text-gray-400">▸</span>
            </button>
            <div id="beAppearancePanel" class="hidden p-4 border-t border-white/10">
              ${appearanceHTML}
            </div>
          </section>


        <section class="rounded-xl ring-1 ring-white/10 p-4">
          <div class="text-sm text-gray-300 font-medium mb-2">Platforms</div>
          ${platformsHTML}
          ${buildVisibilityControlsHTML(brandId)}
        </section>

      </div>
    `;

    // Hide stepper chrome while in Brand Settings
    if (header && header.classList) header.classList.add('hidden');
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    if (saveBtn) saveBtn.classList.add('hidden');

    // Re-bind the exact same behaviors those fragments expect, but scoped to this content
  bindBrandEditorAppearance(brandId, content, { allowPersist: true });
  bindBrandEditorPlatforms(brandId, content, { allowDomainGen: true });

  bindCurrentAppearancePane(brandId, content);      // NEW
  bindBrandVisibilityControls(brandId, content);    // NEW

  /// Collapse/expand for Appearance section
  const apToggle = content.querySelector('#beAppearanceToggle');
  const apPanel  = content.querySelector('#beAppearancePanel');
  const apCaret  = content.querySelector('#beAppearanceCaret');

  if (apToggle && apPanel && !apToggle.__pcBound) {
    // Ensure it won't submit any surrounding form
    try { apToggle.setAttribute('type', 'button'); } catch {}

    // Accessibility wiring
    apToggle.setAttribute('aria-controls', 'beAppearancePanel');
    apToggle.setAttribute('aria-expanded', String(!apPanel.classList.contains('hidden')));

    apToggle.addEventListener('click', () => {
      const willShow = apPanel.classList.contains('hidden'); // currently hidden -> will show

      apPanel.classList.toggle('hidden', !willShow);
      if (apCaret) apCaret.textContent = willShow ? '▾' : '▸';
      apToggle.setAttribute('aria-expanded', String(willShow));

      // If the panel contains the live theme preview, refit after opening
      if (willShow) {
        // scope to the current content so we don’t touch other views
        if (typeof fitThemePreviewToContainer === 'function') {
          fitThemePreviewToContainer(content);
        }
      }
    });

    apToggle.__pcBound = true;
  }

  // Editor shell controls
  const closeBtn   = content.querySelector('#beClose');
  const publishBtn = content.querySelector('#bePublish');
  if (closeBtn) closeBtn.addEventListener('click', () => toggleBrandEditor(false));
  if (publishBtn) publishBtn.addEventListener('click', async () => {
    try {
      publishBtn.disabled = true;
      publishBtn.textContent = 'Publishing…';
      await publishBrandConfig(brandId);

      // ⬇️ NEW: refresh cached config so the summary panel can show latest data
      const domain = getBrandDomainById(brandId);
      if (domain) { fetchBrandConfigJSON(domain).catch(()=>{}); }

      alert('✅ Published');
    } catch (e) {
      console.error(e);
      alert('❌ Publish failed — see console for details.');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Confirm & Publish';
    }
  });

  // Show the shell
  shell.classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Current Appearance (read-only) pane (iframe + summary + refresh/json)
// ────────────────────────────────────────────────────────────────────────────
function buildCurrentAppearancePaneHTML(brandId) {
  const b = getBrandById(brandId) || {};
  const domain = (b.customDomain || b.domain || '').toString().trim();
  const hasDomain = !!domain;
  const liveUrl = hasDomain ? `https://${escapeHtml(domain)}/` : '';

  // We’re intentionally removing the old “Config summary” to avoid stale/missing data.
  // This pane now focuses purely on a clean, landscape tablet live preview.

  return `
    <div class="space-y-3">
      <div class="text-xs text-gray-400">Live Home preview (Landscape tablet)</div>

      <div id="beDeviceContainer"
           class="relative w-full rounded-lg overflow-hidden ring-1 ring-white/10 bg-gray-900 p-3 min-h-[240px]">
        ${
          hasDomain
            ? `
              <div id="beDeviceFrame"
                   class="origin-top-left"
                   style="width:1024px; height:768px;">
                <iframe id="beLivePreview"
                        src="${liveUrl}"
                        class="block bg-black"
                        style="width:1024px; height:768px; border:0;"
                        loading="lazy"
                        referrerpolicy="no-referrer"></iframe>
              </div>`
            : `<div class="p-4 text-sm text-gray-400">
                 No domain yet. Generate a domain in Platforms to preview the live site.
               </div>`
        }
      </div>

      <div class="flex items-center gap-2">
        <button id="beRefreshCurrent"
                class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">
          Refresh Preview
        </button>
      </div>
    </div>
  `;
}


function bindCurrentAppearancePane(brandId, scopeRoot) {
  const scope = scopeRoot || document;
  const refreshBtn = scope.querySelector('#beRefreshCurrent');
  const iframe     = scope.querySelector('#beLivePreview');

  // Refresh button must not submit any wrapping form
  if (refreshBtn && !refreshBtn.__pcTypeSet) {
    try { refreshBtn.setAttribute('type', 'button'); } catch {}
    refreshBtn.__pcTypeSet = true;
  }

  // Refresh button: hard reload the iframe (cache-bust)
  if (refreshBtn && iframe && !refreshBtn.__pcBound) {
    refreshBtn.addEventListener('click', () => {
      try {
        const src = iframe.getAttribute('src') || '';
        if (!src) return;
        const clean = src.split('#')[0].split('?')[0];
        iframe.setAttribute('src', `${clean}?t=${Date.now()}`);
        // Refit on next paint
        if (typeof fitThemePreviewToContainer === 'function') {
          requestAnimationFrame(() => fitThemePreviewToContainer(scope));
        }
      } catch {}
    });
    refreshBtn.__pcBound = true;
  }

  // Initial fit after layout paints
  if (typeof fitThemePreviewToContainer === 'function') {
    requestAnimationFrame(() => fitThemePreviewToContainer(scope));
  }

  // Refit after the live site finishes loading (images/fonts)
  if (iframe && !iframe.__pcFitBound) {
    iframe.addEventListener('load', () => {
      if (typeof fitThemePreviewToContainer === 'function') {
        fitThemePreviewToContainer(scope);
      }
    });
    iframe.__pcFitBound = true;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
 // NEW: Visibility controls inside Platforms (UI only by default)
// ─────────────────────────────────────────────────────────────────────────────
function buildVisibilityControlsHTML(brandId) {
  const b = getBrandById(brandId) || {};
  const vis = (b.visibilityLevel || 'public');
  return `
    <div class="mt-4 rounded-xl ring-1 ring-white/10 p-4 space-y-2">
      <div class="text-sm text-gray-300 font-medium">Visibility</div>
      <div class="text-xs text-gray-400">Controls who can access your site. <em>Unlisted</em> hides it from listings but anyone with the link can view.</div>
      <div class="mt-2">
        <select id="beVisibilityLevel" class="w-full max-w-xs p-2 bg-gray-800 rounded border border-white/10">
          <option value="public"${vis==='public'?' selected':''}>public</option>
          <option value="unlisted"${vis==='unlisted'?' selected':''}>unlisted</option>
          <option value="private"${vis==='private'?' selected':''}>private</option>
        </select>
      </div>
    </div>
  `;
}

function bindBrandVisibilityControls(brandId, scopeRoot) {
  const scope = scopeRoot || document;
  const sel = scope.querySelector('#beVisibilityLevel');
  if (!sel || sel.__pcBound) return;
  sel.addEventListener('change', () => {
    // Draft-only for now; to persist later, call saveBrandConfigViaPost with brand.visibilityLevel
    const d = ensureDraft(brandId);
    d.platforms = d.platforms || {};
    d.platforms.visibilityLevel = sel.value;
  });
  sel.__pcBound = true;
}


function toggleBrandEditor(open, brandId = null, mode = 'edit') {
  const shell = document.getElementById('brandWizard'); // reuse wizard shell
  const header = document.getElementById('wizardSteps');
  const content = document.getElementById('wizardContent');
  const prevBtn = document.getElementById('wizardPrevBtn');
  const nextBtn = document.getElementById('wizardNextBtn');
  const saveBtn = document.getElementById('wizardSaveBtn');

  __brandEditor.open = !!open;
  __brandEditor.mode = mode;
  __brandEditor.brandId = brandId;

  if (!shell) return;

  if (open && brandId) {
    renderBrandEditor(brandId);
  } else {
    // hide and restore wizard chrome for safety
    shell.classList.add('hidden');
    if (header && header.classList) header.classList.remove('hidden');
    if (prevBtn) prevBtn.classList.remove('hidden');
    if (nextBtn) nextBtn.classList.remove('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');
    if (content) content.innerHTML = '';
  }
}


// ===================== (Wizard open/close kept for rollback) =================
function openWizard(brandId, stepKey = 'appearance') {
  // Route all wizard openings into the single-page Brand Editor.
  // We keep the old code path for rollback, but default to the editor.
  try {
    openBrandEditorGuarded(brandId);
  } catch (e) {
    console.warn('toggleBrandEditor failed, falling back to legacy wizard', e);
    // Legacy fallback (kept for safety)
    __wizard.open = true;
    __wizard.brandId = brandId;
    __wizard.step = stepKey;
    ensureDraft(brandId);
    const shell = document.getElementById('brandWizard');
    if (shell) shell.classList.remove('hidden');
    renderStepsHeader(stepKey);
    renderStepContent(brandId, stepKey);
    updateWizardButtons();
  }
}
function closeWizard() {
  __wizard.open = false;
  __wizard.brandId = null;
  const shell = document.getElementById('brandWizard');
  if (shell) shell.classList.add('hidden');
}
function updateWizardButtons() {
  const prev = document.getElementById('wizardPrevBtn');
  const next = document.getElementById('wizardNextBtn');
  const const_save = document.getElementById('wizardSaveBtn'); // keep name distinct locally
  const idx = stepIndex(__wizard.step);
  if (prev) prev.disabled = idx === 0;
  if (next) next.textContent = idx === WIZARD_STEPS.length - 1 ? 'Finish' : 'Next';
  if (const_save) const_save.disabled = false;
}
// simplistic next-incomplete: always appearance first for now
function nextIncompleteStepKey(/*brand*/) {
  return 'appearance'; // refine later using /checklist when API is ready
}

// ---------- /helpers ----------------------------------------------------------
function renderBrandList(items) {
  var grid = document.getElementById('brandList');
  var empty = document.getElementById('brandEmptyState');
  if (!grid || !empty) return;

  if (!Array.isArray(items) || items.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = items.map(buildBrandCardHTML).join('');

  // ✅ make the grid responsive & centered
  ensureBrandGridLayout();

  // ✅ Force CTA text/behavior every render (your existing helper)
  patchCardCtas(document);
}


// Wire UI events after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  // Open button
  var btnOpen = document.getElementById('btnCreateBrand');
  if (btnOpen) {
    btnOpen.addEventListener('click', function () { toggleBrandModal(true); });
  }

  // Close actions (X / backdrop / any [data-close-brand-modal])
var closeEls = document.querySelectorAll('[data-close-brand-modal]');
if (closeEls && typeof closeEls.forEach === 'function') {
  closeEls.forEach(function (el) {
    el.addEventListener('click', function () { restoreCreateBrandUI(); });
  });
}

// Wizard close (Cancel buttons etc.)
const wzClose = document.querySelectorAll('[data-close-wizard]');
wzClose.forEach(el => el.addEventListener('click', () => {
  restoreCreateBrandUI();
}));

// ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    restoreCreateBrandUI();
  }
});


  // Wizard step tab clicks (still functional for rollback)
  const wizardStepsHost = document.getElementById('wizardSteps');
  if (wizardStepsHost) {
    wizardStepsHost.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wizard-step]');
      if (!btn) return;
      __wizard.step = btn.getAttribute('data-wizard-step');
      renderStepsHeader(__wizard.step);
      renderStepContent(__wizard.brandId, __wizard.step);
      updateWizardButtons();
    });
  }

  // Wizard footer controls
  const btnPrev = document.getElementById('wizardPrevBtn');
  const btnNext = document.getElementById('wizardNextBtn');
  const btnSave = document.getElementById('wizardSaveBtn');
  if (btnPrev) btnPrev.addEventListener('click', () => {
    __wizard.step = stepKeyByDelta(__wizard.step, -1);
    renderStepsHeader(__wizard.step);
    renderStepContent(__wizard.brandId, __wizard.step);
    updateWizardButtons();
  });
  if (btnNext) btnNext.addEventListener('click', () => {
    __wizard.step = stepKeyByDelta(__wizard.step, +1);
    renderStepsHeader(__wizard.step);
    renderStepContent(__wizard.brandId, __wizard.step);
    updateWizardButtons();
  });
  if (btnSave) btnSave.addEventListener('click', () => {
    const id = __wizard.brandId;
    const d = ensureDraft(id);

    if (__wizard.step === 'appearance') {
      d.appearance.themeKey = document.getElementById('wzTheme')?.value || d.appearance.themeKey;
      d.appearance.bgPreset = document.getElementById('wzBgPreset')?.value || d.appearance.bgPreset;
      d.appearance.bgHex    = (d.appearance.bgPreset === 'light') ? '#FFFFFF' : '#0B0B0B';
      d.appearance.accentHex = document.getElementById('wzAccent')?.value || d.appearance.accentHex;
      d.appearance.useDefaultTheme = !!document.getElementById('wzUseDefaultTheme')?.checked;

      const file = d.appearance.logoFile;
      const idToken = getAuthToken();
      const priorVersion = (getBrandById(id) || {}).logo?.version || null;

      const saveBtn = document.getElementById('wizardSaveBtn');
      const prevTxt = saveBtn ? saveBtn.textContent : '';
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

      (async () => {
        try {
          if (file) {
            const presign = await requestLogoUploadUrl(id, idToken, file);
            await uploadWithPresign(presign, file);
            const logo = await pollBrandLogo(id, idToken, priorVersion, 60000);

            const idx = __brandsCache.findIndex(b => (b.brandId || b.id) === id);
            if (idx >= 0 && logo) {
              __brandsCache[idx] = { ...__brandsCache[idx], logo };
            }

            const processedPreview =
              (logo && (selectCardMark(logo, 64) || selectNavbarLogo(logo, 32) || (logo.primary||[])[0])) ||
              d.appearance.logoUrl;

            d.appearance.logoFile = null;
            d.appearance.logoUrl  = processedPreview;

            try { await saveBrandConfigViaPost(id, {}); } catch (e) { console.warn('config rebuild after logo update failed (non-blocking)', e); }

            renderBrandList(__brandsCache);
            renderStepContent(id, 'appearance');
            setTimeout(() => { try { loadBrands(); } catch {} }, 1200);

            alert(logo ? '✅ Appearance saved & logo processed!' : '✅ Appearance saved!');

          } else {
            alert('🎨 Appearance saved.');
            renderStepContent(id, 'appearance');
          }
        } catch (err) {
          console.error(err);
          alert('❌ Logo upload failed: ' + (err && err.message ? err.message : err));
        } finally {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = prevTxt || 'Save'; }
        }
      })();

    } else if (__wizard.step === 'platforms') {
      d.platforms.subdomain    = document.getElementById('wzSubdomain')?.value || '';
      d.platforms.customDomain = document.getElementById('wzCustomDomain')?.value || '';
      alert('🌐 Platforms saved (UI only).');

    } else if (__wizard.step === 'monetization') {
      d.monetization.model = document.getElementById('wzModel')?.value || d.monetization.model;
      const tierList = document.getElementById('wzTierList');
      tierList?.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-tier-index]');
        if (!rm) return;
        const idx = parseInt(rm.getAttribute('data-tier-index'), 10);
        d.monetization.tiers.splice(idx, 1);
        renderStepContent(id, 'monetization');
      }, { once: true });
      document.getElementById('wzAddTier')?.addEventListener('click', () => {
        d.monetization.tiers.push({ name: 'Premium', price: '9.99' });
        renderStepContent(id, 'monetization');
      }, { once: true });
      alert('💰 Monetization saved (UI only).');

    } else if (__wizard.step === 'content') {
      document.getElementById('wzPickMedia')?.addEventListener('click', () => {
        d.content.hasFeatured = true;
        renderStepContent(id, 'content');
      }, { once: true });
      alert('📚 Content selections saved (UI only).');

    } else if (__wizard.step === 'launch') {
      document.getElementById('wzPublishBtn')?.addEventListener('click', () => {
        alert('🚀 Publish (UI only). When backend is wired, this will call POST /publish.');
      }, { once: true });
    }
  });

  // Form submit + button click (prevents native submit/full reload)
  const form = document.getElementById('formCreateBrand');
  const submitBtn = document.getElementById('btnSubmitCreateBrand');

  if (form && submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      createBrandFromForm(form, submitBtn);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      createBrandFromForm(form, submitBtn);
    });
  } else {
    console.warn('Brand form (#formCreateBrand) not found at DOMContentLoaded.');
  }
}); // ← closes DOMContentLoaded

// --- CTA compatibility shim: turn any "Continue Setup" into "Brand Settings" and open the editor ---
(function patchLegacyContinueSetupButtons(){
  const grid = document.getElementById('brandList');
  if (!grid) return;

  // 1) Update visible labels defensively
  grid.querySelectorAll('[data-action="primary-cta"]').forEach(btn => {
    const txt = (btn.textContent || '').trim().toLowerCase();
    if (txt === 'continue setup') btn.textContent = 'Brand Settings';
  });

  // 2) Intercept clicks that would have opened the wizard earlier
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="primary-cta"]');
    if (!btn || !grid.contains(btn)) return;

    const brandId = btn.getAttribute('data-brand')
                 || btn.closest('[data-brand-id]')?.getAttribute('data-brand-id')
                 || '';

    const label = (btn.textContent || '').trim();
    if (label === 'View Site') return; // let your existing handler deal with this
    if (label === 'Publish')   return; // same

    e.preventDefault();
    openBrandEditorGuarded(brandId); // ← open editor instead of wizard (guarded during Create)
  }, true);
})();

/* Global delegation for brand-card actions & overflow menu */
document.addEventListener('click', (e) => {
  const grid = document.getElementById('brandList');
  if (!grid) return;

  const target = e.target.closest('[data-action],[data-nav],[data-menu-for]');
  if (!target || !grid.contains(target)) return;

  // Close menus when clicking off
  if (!target.closest('[data-menu-for]') && !target.matches('[data-action="overflow"]')) {
    grid.querySelectorAll('[data-menu-for]').forEach(m => m.classList.add('hidden'));
  }

  // Overflow menu open/close
  if (target.matches('[data-action="overflow"]')) {
    const brandId = target.getAttribute('data-brand') || target.closest('[data-brand-id]')?.getAttribute('data-brand-id') || '';
    const menu = grid.querySelector(`[data-menu-for="${brandId}"]`);
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    grid.querySelectorAll('[data-menu-for]').forEach(m => m.classList.add('hidden'));
    if (isHidden) menu.classList.remove('hidden'); else menu.classList.add('hidden');
    return;
  }

  // Menu items → open the Editor (soft-deprecate wizard)
  if (target.matches('[data-nav]')) {
    const nav = target.getAttribute('data-nav');
    const menu = target.closest('[data-menu-for]');
    const brandId = menu?.getAttribute('data-menu-for') || '';
    if (menu) menu.classList.add('hidden');

    // Regardless of which submenu was clicked, we open the single-page editor
    openBrandEditorGuarded(brandId);
    // If you need the old behavior: openWizard(brandId, map[nav] || 'appearance');
    return;
  }

  // Primary CTA / Manage Media / Brand Settings
  if (target.matches('[data-action]')) {
    const brandId = target.getAttribute('data-brand') || target.closest('[data-brand-id]')?.getAttribute('data-brand-id') || '';
    const action = target.getAttribute('data-action');
    if (action === 'primary-cta') {
      const label = target.textContent.trim();
      if (label === 'View Site') alert('🌐 Opening site for brand ' + brandId);
      else if (label === 'Publish') alert('🚀 Publish (UI only) for brand ' + brandId);
      else openBrandEditorGuarded(brandId); // Continue Setup → Brand Editor (guarded)
    } else if (action === 'manage-media') {
      openTitleManagerOverlay(brandId); // NEW: full overlay that lists titles + create flow
    } else if (action === 'brand-settings') {
      openBrandEditorGuarded(brandId);
      } else if (action === 'monetization') {
    // TODO: replace with your monetization editor when ready
    alert('💰 Monetization (UI hook) — brand=' + brandId);
    }
  }
});

// ✅ Capture-phase failsafe for the green Create button
document.addEventListener('click', (e) => {
  const createBtn = e.target.closest('#btnSubmitCreateBrand');
  if (!createBtn) return;
  const form = document.getElementById('formCreateBrand');
  if (!form) return;

  e.preventDefault();
  createBrandFromForm(form, createBtn);
}, true); // ← capture = true

// ✅ Capture-phase failsafe for the wizard Next button
document.addEventListener('click', (e) => {
  const nextBtn = e.target.closest('#wizardNextBtn');
  if (!nextBtn) return;
  e.preventDefault();
  __wizard.step = stepKeyByDelta(__wizard.step, +1);
  renderStepsHeader(__wizard.step);
  renderStepContent(__wizard.brandId, __wizard.step);
  updateWizardButtons();
}, true);

// Hook into your existing showSection flow (like you did for Media Library)
var __originalShowSectionBrands = showSection;
showSection = function (sectionId) {
  __originalShowSectionBrands(sectionId);
  if (sectionId === 'brands') {
    loadBrands();
  }
};
// ───────────── Brands: helpers & UI  End────────────



//-----Picker Loading Start------

// inline-media-picker.js
// Provides window.showInlineMediaPicker(items, { title, allow|filter, onPick })
// Renders a thumbnail grid overlay with "Select" buttons.

(function (global) {
  if (global.showInlineMediaPicker) return; // once

  function typeOf(it) { return (it.fileType || it.mediaType || '').toLowerCase(); }

  function getThumb(it) {
    const mu   = it?.mediaUrl || it?.media_url || {};
    const type = (it?.mediaType || it?.fileType || '').toLowerCase();
    const isVideo = type.startsWith('video');

    // ── STRICT for videos (Primary / Trailer): ONLY use rendition1; no fallback
    if (isVideo) {
      return mu?.video?.primary?.thumbnails?.rendition1 || '';
    }

    // ── Images (Thumbnail picker) and anything non-video:
    // 1) Keep your old "exact" path first (this is what your image thumbs relied on)
    const exact = mu?.artwork?.primary?.landscape;
    if (exact) return exact;

    // 2) Then your existing artwork fallbacks
    const ipr = mu?.image?.primary || mu?.primary || {};
    const aw  = ipr?.artwork || mu?.artwork || {};

    // 3) Plus a couple safe thumbnail fallbacks for images only (does NOT affect videos)
    const ith = ipr?.thumbnails || mu?.thumbnails || it?.thumbnails || {};

    return (
      aw?.landscape ||
      aw?.['16x9'] ||
      aw?.standard ||
      aw?.portrait ||
      aw?.default ||
      ith?.rendition1 ||
      ith?.landscape ||
      ith?.standard ||
      ith?.portrait ||
      it?.thumb ||
      it?.url ||
      ''
    );
  }



  // Tiny escape utility (kept local to avoid collisions)
  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  global.showInlineMediaPicker = function showInlineMediaPicker(items, opts = {}) {
    const onPick = typeof opts.onPick === 'function' ? opts.onPick : function(){};
    const allow  = (opts.allow || opts.filter || '').toLowerCase(); // 'image'|'video'|'audio'|''

    const source = Array.isArray(items) ? items : [];
    const view = source.filter(it => {
      if (!allow || allow === 'any') return true;
      const t = typeOf(it);
      return t ? t.startsWith(allow) : false;
    });

    // Build overlay shell
    const id = 'pcInlineMediaPicker';
    const old = document.getElementById(id);
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = id;
    el.className = 'fixed inset-0 z-[9999] bg-black/70';
    el.innerHTML = [
      '<div class="absolute inset-0 grid place-items-center p-4" role="dialog" aria-modal="true">',
      '  <div class="w-[min(1200px,95vw)] h-[min(90vh,880px)] bg-gray-900 rounded-2xl ring-1 ring-white/10 overflow-hidden flex flex-col">',
      '    <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">',
      `      <div class="text-gray-100 font-semibold">${esc(opts.title || 'Select Media')}</div>`,
      '      <div class="flex items-center gap-2">',
      '        <input id="ipSearch" placeholder="Search…" class="bg-gray-800 border border-white/10 text-sm rounded px-2 py-1 text-gray-100 w-56" />',
      '        <button id="ipClose" class="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Close</button>',
      '      </div>',
      '    </div>',
      '    <div class="flex-1 overflow-auto p-4">',
      '      <div id="ipGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"></div>',
      '      <div id="ipEmpty" class="hidden text-sm text-gray-400 p-10 text-center">No media found.</div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(el);

    // Render a card (16:9 thumbs, proper scaling, tighter caption spacing)
    function cardHTML(it, idx) {
      const t = String(it.title || it.fileName || it.assetId || it.id || 'Untitled');
      const thumb = getThumb(it);

      const media = thumb
        ? `<img src="${esc(thumb)}"
                alt="${esc(t)}"
                class="absolute inset-0 w-full h-full object-cover"
                loading="lazy" decoding="async">`
        : `<div class="absolute inset-0 grid place-items-center text-[11px] text-gray-400 bg-gray-800">
            no preview
          </div>`;

      return [
        '<div class="bg-gray-800/80 rounded-xl ring-1 ring-white/10 overflow-hidden flex flex-col">',
        // 16:9 box that controls the media’s size
        '  <div class="relative aspect-[16/9]">',
        `    ${media}`,
        '  </div>',
        // slightly tighter body spacing
        '  <div class="p-3 flex-1 flex flex-col">',
        `    <div class="text-sm text-gray-200 truncate" title="${esc(t)}">${esc(t)}</div>`,
        '    <div class="mt-1.5 flex items-center justify-between">',
        `      <div class="text-[11px] text-gray-400 truncate">${esc(typeOf(it) || '—')}</div>`,
        `      <button data-pick="${idx}" class="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white">Select</button>`,
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');
    }


    const grid  = el.querySelector('#ipGrid');
    const empty = el.querySelector('#ipEmpty');
    const search = el.querySelector('#ipSearch');

    let all = view.slice();
    let current = all.slice();

    function render(list) {
      if (!list.length) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        grid.innerHTML = list.map(cardHTML).join('');
      }
    }
    render(current);

    // Live search
    let t = null;
    search?.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = (search.value || '').toLowerCase();
        current = q
          ? all.filter(i => String(i.title || i.fileName || i.assetId || i.id || '')
                .toLowerCase().includes(q))
          : all.slice();
        render(current);
      }, 120);
    });

    // Select handler (PATCHED to normalize like the old picker)
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-pick'), 10);
      const item = current[idx];
      if (!item) return;

      // Try to use the shared normalizer from your Title Manager code
      const normalizer =
        (typeof globalThis !== 'undefined' && typeof globalThis.normalizeFromItem === 'function')
          ? globalThis.normalizeFromItem
          : (typeof window !== 'undefined' && typeof window.normalizeFromItem === 'function'
              ? window.normalizeFromItem
              : null);

      let payload = null;

      // 1) Best path: normalize raw library item
      if (normalizer) {
        try { payload = normalizer(item); } catch (_) { payload = null; }
      }

      // 2) Fallback: construct minimal payload
      if (!payload || !payload.assetId || (!opts.idOnly && !payload.url)) {
        const id = item.assetId || item.assetID || item.id || item._id || item.mediaId || item.fileId || item.key || null;

        if (opts.idOnly && id) {
          // ✅ Thumbnails/images: ID only is enough
          payload = { assetId: String(id) };
        } else if (id) {
          // Try to produce a URL for non-idOnly flows (videos, etc.)
          const mu = item.mediaUrl || item.media_url || {};
          const v  = mu.video || {};
          const vp = v.primary || {};
          const vh = vp.hls;
          const url =
            (typeof vh === 'string' ? vh : vh?.url) ||
            (typeof (mu?.primary?.hls) === 'string' ? mu.primary.hls : mu?.primary?.hls?.url) ||
            mu?.primary?.master || mu?.primary?.url || item.hls || item.url || null;

          if (url) payload = { assetId: String(id), url };
        }
      }

      // 3) Validate — DO NOT require url for idOnly/image picks
      const allowType = (opts.allow || opts.filter || '').toLowerCase();
      const needUrl = !(opts.idOnly || allowType === 'image');
      if (!payload || !payload.assetId || (needUrl && !payload.url)) {
        alert('Selected media did not resolve to a known asset (need assetId). Please pick again.');
        return;
      }

      try {
        // If idOnly, still pass preview fields for UI cards,
        // but your save only reads assetId from the element attributes.
        const result = opts.idOnly
          ? {
              assetId: String(payload.assetId),
              // UI-only helpers so the card can render nicely:
              url: payload.url,                // safe for preview
              thumb: payload.thumb,
              videoThumb: payload.videoThumb,  // typically empty for images
              title: payload.title,
              fileName: payload.fileName,
              shapes: payload.shapes
            }
          : payload;

        onPick(result);
      } finally {
        el.remove();
      }
    });

    function close(){ el.remove(); }
    el.querySelector('#ipClose')?.addEventListener('click', close);
    el.addEventListener('click', (e) => { if (e.target.id === id) close(); }, true);
  };
})(typeof window !== 'undefined' ? window : globalThis);


//---- Picker Loading End---
/* ────────────────────────────────────────────────────────────────────────────
   TITLE MANAGER OVERLAY (non-breaking, additive)
   - Lists Titles by brandId
   - Create New Title with required fields
   - Uses existing auth/token + BRAND_API base
   - Media pickers reuse your inline picker, but with type filters
──────────────────────────────────────────────────────────────────────────── */

(function initTitleManagerNamespace(){
  // Use existing BRAND_API host
  const TITLE_API_BASE = (typeof BRAND_API === 'string' && BRAND_API) ? BRAND_API : '';
  if (!TITLE_API_BASE) console.warn('[TitleManager] BRAND_API not set — requests will fail.');

  // Small state bag (per session)
  const __titles = {
    cacheByBrand: {}, // { [brandId]: [titleSummary,...] }
    openForBrand: null,
    creating: false
  };

  // Utilities
  function authedHeaders() {
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
    return {
      'Authorization': token ? ('Bearer ' + token) : '',
      'Content-Type': 'application/json'
    };
  }
  function joinUrl(base, path) {
    if (!base) return path;
    return (base.replace(/\/+$/,'') + '/' + String(path||'').replace(/^\/+/, ''));
  }

  // ─────────────── API: LIST & CREATE (catalog) ───────────────
  async function listTitlesByBrand(brandId) {
    const url = joinUrl(TITLE_API_BASE, `catalog?brandId=${encodeURIComponent(brandId)}`);
    const res = await fetch(url, { method: 'GET', headers: authedHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(`listTitles failed: ${res.status}`);
    const json = await res.json().catch(()=>[]);
    // Expect array of summaries: { titleId, title, mediaType, status, releaseDate, updatedAt }
    return Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
  }

  async function createTitle(brandId, payload) {
    // payload is the normalized Title object (see formSave handler below)
    const url = joinUrl(TITLE_API_BASE, 'catalog');
    const body = JSON.stringify({ brandId, entityType: 'Title', ...payload });
    const res = await fetch(url, { method: 'POST', headers: authedHeaders(), body });
    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(`createTitle failed (${res.status}): ${t}`);
    }
    return res.json().catch(()=> ({}));
  }

  // READ one Title (non-breaking). Prefer /catalog/{id}?brandId=... with minimal headers.
  // Falls back to /catalog?brandId=...&id=... . Never sets Content-Type on GET.
  async function readTitleById(brandId, titleId) {
    const base = joinUrl(TITLE_API_BASE, 'catalog');
    const idStr = encodeURIComponent(String(titleId));
    const bStr  = encodeURIComponent(String(brandId));

    // Build GET headers WITHOUT Content-Type (important for CORS)
    function getHeaders() {
      const h = (typeof authedHeaders === 'function') ? authedHeaders() : {};
      try { delete h['Content-Type']; delete h['content-type']; } catch (_) {}
      // Accept is a simple header and safe to send
      h['Accept'] = 'application/json';
      // If authedHeaders() returned Authorization: '' (empty), remove it to keep request simple
      if (!h['Authorization']) { try { delete h['Authorization']; } catch (_) {} }
      return h;
    }

    // Helper to normalize result to a single object
    function pickOne(json) {
      if (!json) return null;
      if (Array.isArray(json)) return json[0] || null;
      if (json.item) return json.item;
      if (Array.isArray(json.items)) return json.items[0] || null;
      if (Array.isArray(json.data))  return json.data[0]  || null;
      return json;
    }

    // 1) Try path form: /catalog/{id}?brandId=...
    try {
      const url1 = `${joinUrl(base, idStr)}?brandId=${bStr}`;
      const r1 = await fetch(url1, { method: 'GET', headers: getHeaders(), cache: 'no-store' });
      if (r1.ok) {
        const j1 = await r1.json().catch(() => null);
        const obj1 = pickOne(j1);
        if (obj1 && (obj1.media || obj1.identity || obj1.pricing || obj1.gating || obj1.availability)) {
          return obj1; // looks like a full record
        }
        if (obj1) var best = obj1; // remember summary in case
      }
    } catch (_) {}

    // 2) Fallback to query-string detail: /catalog?brandId=...&id=...
    try {
      const url2 = `${base}?brandId=${bStr}&id=${idStr}`;
      const r2 = await fetch(url2, { method: 'GET', headers: getHeaders(), cache: 'no-store' });
      if (r2.ok) {
        const j2 = await r2.json().catch(() => null);
        // If the API returns a collection, try to find the matching id
        let obj2 = null;
        if (Array.isArray(j2)) {
          obj2 = j2.find(x => String(x?.titleId) === String(titleId)) || j2[0];
        } else if (j2 && typeof j2 === 'object') {
          const pool = Array.isArray(j2.items) ? j2.items : Array.isArray(j2.data) ? j2.data : null;
          obj2 = pool ? (pool.find(x => String(x?.titleId) === String(titleId)) || pool[0]) : pickOne(j2);
        }
        if (obj2 && (obj2.media || obj2.identity || obj2.pricing || obj2.gating || obj2.availability)) {
          return obj2; // full record
        }
        if (obj2 && !best) best = obj2;
      }
    } catch (_) {}

    // 3) If both attempts yielded only a summary, merge with cached list item so UI has fields.
    try {
      const list = await listTitlesByBrand(brandId).catch(() => []);
      const summary = (list || []).find(x => String(x?.titleId) === String(titleId)) || null;
      if (summary || best) return { ...(summary || {}), ...(best || {}) };
    } catch (_) {}

    return null;
  }

  // UPDATE one Title (PATCH /catalog/{titleId}?brandId=...)
  async function updateTitle(brandId, titleId, payload) {
    const base = joinUrl(TITLE_API_BASE, 'catalog');
    const url  = `${base}/${encodeURIComponent(String(titleId))}?brandId=${encodeURIComponent(String(brandId))}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: (typeof authedHeaders === 'function') ? authedHeaders('PATCH') : { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`updateTitle failed (${res.status}): ${t}`);
    }
    // backend returns { ok: true, updatedAt } – but handle empty just in case
    return res.json().catch(() => ({}));
  }



    // ─────────────── MediaAsset lookup for thumbnails (Block 1) ───────────────
    async function __tm_listMediaAll() {
      // Reuse your media API; identical pattern as your pickers
      if (window.api?.listMedia) {
        const r = await window.api.listMedia();
        return Array.isArray(r) ? r
            : Array.isArray(r?.items) ? r.items
            : Array.isArray(r?.data) ? r.data
            : Array.isArray(r?.results) ? r.results
            : [];
      }
      const base = (typeof MEDIALIBRARY_API === 'string' && MEDIALIBRARY_API) || '';
      if (!base) return [];
      const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
      const res = await fetch(`${base.replace(/\/$/,'')}/media`, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        cache: 'no-store'
      });
      if (!res.ok) return [];
      const payload = await res.json().catch(()=>[]);
      return Array.isArray(payload) ? payload
          : Array.isArray(payload?.items) ? payload.items
          : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.results) ? payload.results
          : [];
    }

      function __tm_mediaAssetId(it) {
        const mt = (it.mediaType || it.type || '').toLowerCase();
        if (mt !== 'video') return null;
        return it.thumbnailAssetId || null;
      }

    function __tm_landscapeFromMediaAsset(asset) {
      const mu = asset?.mediaUrl || asset?.media_url || {};
      // Exact path requested: mediaUrl > artwork > primary > landscape
      const exact = mu?.artwork?.primary?.landscape;
      if (exact) return exact;

      // Fallbacks (keeps this robust if upstream shape varies slightly)
      const ipr = mu?.image?.primary || mu?.primary || {};
      const aw  = ipr?.artwork || mu?.artwork || {};
      return aw?.landscape || aw?.['16x9'] || aw?.default || '';
    }

    async function __tm_enrichThumbnailsFromMedia(items) {
      if (!Array.isArray(items) || !items.length) return items;

      // Collect needed assetIds (only for video titles)
      const wanted = new Set();
      items.forEach(it => {
        const mt = (it.mediaType || it.type || '').toLowerCase();
        if (mt === 'video') {
          const aid = __tm_mediaAssetId(it);
          if (aid) wanted.add(String(aid));
        }
      });
      if (!wanted.size) return items;

      // Load media library once and map by assetId
      const all = await __tm_listMediaAll().catch(() => []);
      const byId = new Map();
      all.forEach(m => {
        const id = m.assetId || m.id || m.mediaId || m.fileId || m.key;
        if (id) byId.set(String(id), m);
      });

      // Enrich items: if thumbnailUrl is missing or wrong, set from MediaAsset
      items.forEach(it => {
        const mt = (it.mediaType || it.type || '').toLowerCase();
        if (mt !== 'video') return;
        const aid = __tm_mediaAssetId(it);
        if (!aid) return;
        const asset = byId.get(String(aid));
        if (!asset) return;
        const url = __tm_landscapeFromMediaAsset(asset);
        if (url) it.thumbnailUrl = url;
      });

      return items;
    }

    // ---------- Detail cache + hydrator (for filters) ----------
    const __tmDetailCache = new Map(); // key: `${brandId}:${titleId}` -> full title

    // Step 1: tiny invalidation helpers (non-breaking additions)
    function __tm_invalidateDetail(brandId, titleId){
      __tmDetailCache.delete(`${brandId}:${titleId}`);
    }
    function __tm_invalidateManyForBrand(brandId, ids){
      ids?.forEach(id => __tmDetailCache.delete(`${brandId}:${id}`));
    }

    function __tm_hasDetailFields(t){
      // We consider "detail" available if either tags/pricing/feeds present
      if (!t || typeof t !== 'object') return false;
      const hasTags = Array.isArray(t?.tags) || typeof t?.tags === 'string' ||
                      Array.isArray(t?.identity?.tags) || typeof t?.identity?.tags === 'string';
      const hasPricing = t?.pricing && (t.pricing.type || t.pricing.purchase || t.pricing.rental);
      const hasAvail   = t?.availability && (t.availability.status || t.availability.releaseDate);
      return !!(hasTags || hasPricing || hasAvail);
    }

    // Step 2: backward-compatible fetch with optional force/minUpdatedAt
    // Supports BOTH call shapes:
    //   __tm_fetchDetailOnce(brandId, titleId, 6000)           // old (timeout)
    //   __tm_fetchDetailOnce(brandId, titleId, { force:true }) // new (opts)
    async function __tm_fetchDetailOnce(brandId, titleId, arg3){
      // Parse args without breaking old callers
      const isObj = arg3 && typeof arg3 === 'object';
      const force       = isObj ? !!arg3.force : false;
      const minUpdatedAt= isObj ? (arg3.minUpdatedAt ?? null) : null;
      const timeoutMs   = isObj ? (arg3.timeoutMs ?? 6000)
                                : (typeof arg3 === 'number' ? arg3 : 6000);

      const key = `${brandId}:${titleId}`;

      if (!force && __tmDetailCache.has(key)) {
        const cached = __tmDetailCache.get(key);
        if (!minUpdatedAt) return cached;

        // Only refetch if caller knows there's a newer record
        const toEpoch = (s) => { const t = Date.parse(s || ''); return Number.isNaN(t) ? 0 : t; };
        if (toEpoch(cached?.updatedAt) >= toEpoch(minUpdatedAt)) return cached;
      }

      // Timeout wrapper (unchanged behavior)
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        // reuse your readTitleById (already defined in your code)
        const full = await readTitleById(brandId, titleId);
        __tmDetailCache.set(key, full || null);
        return full || null;
      } catch(e){
        console.warn('[TitleManager] detail fetch failed', titleId, e);
        __tmDetailCache.set(key, null);
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    // ---------- Re-apply filters/render after a title detail update ----------
    function __tm_getRootForFilters() {
      // Use whatever your app already uses as the "root" for the title manager.
      // We try a few safe selectors without breaking anything.
      return (
        window.__tmRoot ||                            // if your app set a global
        document.querySelector('#tmRoot') ||          // common id
        document.querySelector('[data-tm-root]') ||   // common data-attr
        document.getElementById('tm') ||              // fallback
        document                                       // last resort; tmApplyFiltersAndSort will no-op if it can't find elements
      );
    }

    function __tm_reapplyFiltersUI(){
      try {
        if (typeof tmApplyFiltersAndSort === 'function') {
          const root = __tm_getRootForFilters();
          tmApplyFiltersAndSort(root);
        } else {
          // If your app prefers events, emit a reapply signal too
          window.dispatchEvent(new CustomEvent('tm:filters:reapply'));
        }
      } catch (e) {
        console.warn('[TitleManager] reapply filters failed', e);
      }
    }

    // Listen once: whenever an editor reports a saved title, bust cache and refresh UI
    window.addEventListener('tm:title:saved', async (e) => {
      const { brandId, titleId, updatedAt } = e.detail || {};
      if (!brandId || !titleId) return;

      // 1) Drop stale cache (from Step 1)
      __tm_invalidateDetail(brandId, titleId);

      // 2) (optional) Warm the cache so the next read is fresh immediately
      try { await __tm_fetchDetailOnce(brandId, titleId, { force: true }); } catch(_) {}

      // 3) Re-apply filters / rerender using your existing function
      __tm_reapplyFiltersUI();
    });



    /**
     * Hydrate list summaries with full detail (throttled) so filters have feeds.tags/pricing.
     * - Non-blocking: returns after all done.
     * - Updates __titles.cacheByBrand in-place (merging per item).
     * - Calls a provided onProgress callback each time it merges a detail (to re-apply filters live).
     */
    async function __tm_hydrateSummariesWithDetails(brandId, onProgress){
      const list = __titles.cacheByBrand[brandId] || [];
      if (!list.length) return;

      // Build work queue for items that *lack* detail
      const queue = list
        .filter(t => t && t.titleId && !__tm_hasDetailFields(t))
        .map(t => ({ titleId: String(t.titleId) }));

      if (!queue.length) return; // all good

      const CONCURRENCY = 4;
      let idx = 0;

      async function worker(){
        while (idx < queue.length){
          const my = queue[idx++]; // take next
          const full = await __tm_fetchDetailOnce(brandId, my.titleId);
          if (full) {
            // Merge into the cached list item
            const arr = __titles.cacheByBrand[brandId];
            const i = arr.findIndex(x => String(x.titleId) === my.titleId);
            if (i >= 0) {
              arr[i] = { ...arr[i], ...full };
              if (typeof onProgress === 'function') {
                try { onProgress(); } catch(_) {}
              }
            }
          }
        }
      }

      // Kick N workers
      await Promise.all(new Array(Math.min(CONCURRENCY, queue.length)).fill(0).map(worker));
    }




  // ─────────────── Overlay Shell (single instance) ───────────────
  function ensureOverlayShell() {
    let el = document.getElementById('pcTitleOverlay');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'pcTitleOverlay';
    el.className = 'fixed inset-0 z-[9998] bg-black/70 hidden';
    el.innerHTML = `
      <div class="absolute inset-0 grid place-items-center">
        <div class="w-[min(1200px,96vw)] h-[min(90vh,860px)] bg-gray-900 rounded-2xl ring-1 ring-white/10 overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div class="flex items-center gap-3">
              <div id="tmBrandChip" class="text-sm text-gray-300"></div>
            </div>
            <div class="flex items-center gap-2">
              <button id="tmCreateBtn" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm text-white">Create New Title</button>
              <button id="tmCloseBtn" class="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-100">Close</button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 grid grid-cols-12 min-h-0">
            <!-- Left: List -->
            <div class="col-span-6 border-r border-white/10 min-h-0 flex flex-col">
              <div class="p-3 flex items-center justify-between">
                <div class="text-sm text-gray-300 font-medium">Titles</div>
                <input id="tmSearch" placeholder="Search titles…" class="bg-gray-800 border border-white/10 text-sm rounded px-2 py-1 w-48 text-gray-100" />
              </div>
              <div id="tmList" class="flex-1 overflow-auto p-3 space-y-2"></div>
              <div id="tmListEmpty" class="hidden p-6 text-center text-gray-400 text-sm">No titles yet.</div>
            </div>

            <!-- Right: Details / Create Form -->
            <div class="col-span-6 min-h-0">
              <div id="tmDetail" class="h-full overflow-auto">
                <div class="p-6 text-gray-300">
                  <div class="text-sm">Select a title on the left, or click <em>Create New Title</em>.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);

    // Close handlers
    el.querySelector('#tmCloseBtn')?.addEventListener('click', closeTitleManagerOverlay);
    el.addEventListener('click', (e) => {
      if (e.target === el) closeTitleManagerOverlay();
    });

    return el;
  }

  // Public open/close
  window.openTitleManagerOverlay = async function openTitleManagerOverlay(brandId, opts = {}) {
    // brandId fallback (non-breaking)
    if (!brandId) {
      brandId =
        (typeof getActiveBrandId === 'function' && getActiveBrandId()) ||
        (typeof getBrandContext === 'function' && getBrandContext()?.id) ||
        brandId;
    }
    if (!brandId) return;
    __titles.openForBrand = String(brandId);

    const el = ensureOverlayShell();
    el.classList.remove('hidden');

    // Brand label in header
    const b = (typeof getBrandById === 'function') ? getBrandById(brandId) : null;
    const name = b?.displayName || b?.slug || brandId;
    el.querySelector('#tmBrandChip').textContent = `Brand: ${name}`;

    // List + bind
    await refreshTitleList(brandId);
    bindOverlayEvents(brandId);

    // Optional: start directly in Create mode (used by Media Manager handoff)
    if (opts.startInCreate === true) {
      __titles.creating = true;
      renderCreateForm(brandId);
    }
  };

  function closeTitleManagerOverlay() {
    const el = document.getElementById('pcTitleOverlay');
    if (el) el.classList.add('hidden');
    __titles.openForBrand = null;
    __titles.creating = false;
  }

// ─────────────── List Rendering ───────────────
async function refreshTitleList(brandId) {
  const el = ensureOverlayShell();
  const listEl = el.querySelector('#tmList');
  const emptyEl = el.querySelector('#tmListEmpty');

  listEl.innerHTML = `<div class="text-sm text-gray-400 px-1">Loading…</div>`;

  try {
    let items = await listTitlesByBrand(brandId);

    // Enrich thumbnails for video items from MediaAsset table
    items = await __tm_enrichThumbnailsFromMedia(items);

    __titles.cacheByBrand[brandId] = items;

    if (!items.length) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');

      // Ensure toolbar exists, then render via the pipeline
      tmEnsureFilterBar(el);
      try {
        tmApplyFiltersAndSort(el);
      } catch (err) {
        console.warn('[TitleManager] sorter failed; rendering raw list:', err);
        renderList(listEl, items);
        annotateListWithIds(listEl, items);
      }

       let items = await listTitlesByBrand(brandId);

      // Enrich thumbnails for video items from MediaAsset table
      items = await __tm_enrichThumbnailsFromMedia(items);

      // NEW: drop any that are already marked deleted (some backends include availability in the list payload)
      items = items.filter(t => !__tm_isDeleted(t));  // NEW

      __titles.cacheByBrand[brandId] = items;

      // ——— Hydration hint (optional, small text under header) ———
      const hintId = 'tmHydrateHint';
      if (!document.getElementById(hintId)) {
        const n = document.createElement('div');
        n.id = hintId;
        n.className = 'px-3 pb-2 text-[11px] text-gray-400';
        n.textContent = 'Loading title details for filters…';
        const header = el.querySelector('.p-3.flex.items-center.justify-between');
        if (header && header.parentNode) header.parentNode.insertBefore(n, header.nextSibling);
      }

      // ——— Background detail hydration (feeds.tags / pricing / availability, etc.) ———
      // Re-apply filters after each merged detail so categories/monetization start working immediately.
      __tm_hydrateSummariesWithDetails(brandId, () => {
        try { tmApplyFiltersAndSort(el); } catch (_) {}
      }).finally(() => {
        const h = document.getElementById(hintId);
        if (h) h.remove();
      });
    }
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<div class="text-sm text-red-400 px-1">Failed to load titles.</div>`;
  }
}

function renderList(host, items) {
  const row = (t) => {
    const title     = (t.title || t.identity?.title || 'Untitled');
    const mediaType = (t.mediaType || t.type || '—');
    const status    = (t.status || 'draft');
    const rd        = t.releaseDate ? new Date(t.releaseDate).toLocaleDateString() : '—';
    const up        = t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—';
    const thumb     = t.thumbnailUrl || '';

    // 16:9 wrapper (no dependency on Tailwind aspect-ratio plugin)
    const thumbBlock = `
      <div class="relative w-full bg-gray-700 rounded-md overflow-hidden">
        <div class="pt-[56.25%]"></div>
        ${
          thumb
            ? `<img src="${escapeHtml(thumb)}" alt="" class="absolute inset-0 w-full h-full object-cover">`
            : `<div class="absolute inset-0 grid place-items-center text-[11px] text-gray-300">no image</div>`
        }
      </div>
    `;

    return `
      <div class="rounded-md ring-1 ring-white/10 bg-gray-850 p-2">
        <button type="button"
          class="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-750 ring-1 ring-white/10"
          data-card data-title-id="${escapeHtml(String(t.titleId || ''))}">
          ${thumbBlock}

          <div class="mt-3">
            <div class="flex items-center justify-between">
              <div class="text-sm text-blue-300 font-medium truncate">${escapeHtml(title)}</div>
              <span class="text-[11px] px-2 py-0.5 rounded bg-gray-700 text-gray-200">${escapeHtml(mediaType)}</span>
            </div>

            <div class="text-[11px] text-gray-400 mt-1">
              <span class="mr-3">status: ${escapeHtml(status)}</span>
              <span class="mr-3">release: ${escapeHtml(rd)}</span>
              <span>updated: ${escapeHtml(up)}</span>
            </div>

            <!-- Actions row at the bottom -->
            <div class="mt-3 flex items-center justify-end gap-2">
              <button type="button"
                      class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 rounded"
                      data-edit="${escapeHtml(String(t.titleId || ''))}">
                Edit
              </button>
              <button type="button"
                      class="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded"
                      data-delete="${escapeHtml(String(t.titleId || ''))}">
                Delete
              </button>
            </div>
          </div>
        </button>
        </div>
    `;
  };

  host.innerHTML = items.map(row).join('');
}

/* ======================= TITLE MANAGER: Sort / Filter ======================= */

function tmEnsureFilterBar(root){
  if (!root) return;
  if (root.querySelector('#tmFilters')) return; // once

  const listHost = root.querySelector('#tmList');
  if (!listHost || !listHost.parentNode) return;

  const bar = document.createElement('div');
  bar.id = 'tmFilters';
  bar.className = 'px-3 mb-3 grid grid-cols-1 md:grid-cols-5 gap-2';

  bar.innerHTML = `
    <div>
      <label class="block text-xs text-gray-400 mb-1">Sort</label>
      <select id="tmSort" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
        <option value="latest">Latest → Oldest</option>
        <option value="oldest">Oldest → Latest</option>
        <option value="az">Title A → Z</option>
        <option value="za">Title Z → A</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-400 mb-1">Media Type</label>
      <select id="tmType" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
        <option value="">Any</option>
        <option value="video">Video</option>
        <option value="image">Image</option>
        <option value="audio">Audio</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-400 mb-1">Status</label>
      <select id="tmStatus" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
        <option value="">Any</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archive">Archive</option>
        <option value="deleted">Deleted</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-400 mb-1">Media Categories</label>
      <select id="tmTags" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
        <option value="">Any</option>
        <option value="spotlight">Spotlight</option>
        <option value="featured">Featured</option>
        <option value="trending">Trending</option>
        <option value="newrelease">New Release</option>
        <option value="mustsee">Must See</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-400 mb-1">Monetization</label>
      <select id="tmMon" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
        <option value="">Any</option>
        <option value="free">Free</option>
        <option value="subscription">Subscription</option>
        <option value="purchase">Purchase</option>
        <option value="rental">Rental</option>
      </select>
    </div>
  `;

  listHost.parentNode.insertBefore(bar, listHost);
  bar.addEventListener('change', () => tmApplyFiltersAndSort(root));
}

// ───────────────────────── Readers ─────────────────────────
function tmReadSelect(id){
  const el = document.getElementById(id);
  return el ? (el.value || '').toLowerCase() : '';
}
function tmReadSortValue(){
  const el = document.getElementById('tmSort');
  return el ? el.value : 'latest';
}

// NEW: canonical “is deleted” check (prefers availability.status)
function __tm_isDeleted(t) {
  const a = String(t?.availability?.status || '').toLowerCase();
  const s = String(t?.status || '').toLowerCase();
  return a === 'deleted' || s === 'deleted';
}


// ───────────────────────── Apply filters + sort (single-select + OR for tags/mon) ─────────────────────────
function tmApplyFiltersAndSort(root){
  if (!root) return;
  const listEl = root.querySelector('#tmList');
  if (!listEl) return;

  const brandId = (typeof __titles !== 'undefined') ? __titles.openForBrand : null;
  const all = (brandId && __titles.cacheByBrand[brandId]) ? __titles.cacheByBrand[brandId].slice() : [];
  if (!all.length) {
    renderList(listEl, []);
    annotateListWithIds(listEl, []);
    return;
  }

  // search box text
  const searchEl = root.querySelector('#tmSearch');
  const q = (searchEl ? (searchEl.value || '') : '').toLowerCase();

  // single-select values ('' means Any)
  const typeSel  = tmReadSelect('tmType');
  const statSel  = tmReadSelect('tmStatus');
  const tagSel   = tmReadSelect('tmTags');
  const monSel   = tmReadSelect('tmMon');
  const sort     = tmReadSortValue();

  // helpers
  const titleOf   = (t) => (t.title || t.identity?.title || '').toLowerCase();
  const mtOf      = (t) => String(t.mediaType || t.type || '').toLowerCase();
  const statusOf  = (t) => (String(t?.availability?.status || '').toLowerCase() || String(t.status || '').toLowerCase());
  const tagsOf = (t) => {
    const out = new Set();
    const add = (v) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach(add);
      else if (typeof v === 'string') {
        v.split(/[,\s]+/).forEach(s => { if (s) out.add(s.toLowerCase()); });
      }
    };

    // Title record tags only (no feed tags)
    add(t?.tags);
    // Optional: if some titles carry tags in identity, include them
    add(t?.identity?.tags);

    return Array.from(out);
  };
  const monOf     = (t) => {
    const out = new Set();
    const add = (v)=>{
      if (!v) return;
      if (Array.isArray(v)) v.forEach(add);
      else if (typeof v === 'string') v.split(/[,\s]+/).forEach(s=> s && out.add(s.toLowerCase()));
      else if (typeof v === 'object') add(v.type);
    };
    add(t?.pricing); add(t?.pricing?.type);
    return Array.from(out);
  };
  const dateOf    = (t) => t.updatedAt || t.createdAt || t?.availability?.releaseDate || t.releaseDate || '';

  // filter (search AND single-selects; tags/mon are inclusion tests)
  const filtered = all.filter(t=>{

    // NEW: never show deleted, even if "Status: Deleted" is chosen
    if (__tm_isDeleted(t)) return false;  // NEW

    if (q && !titleOf(t).includes(q)) return false;
    if (typeSel && mtOf(t) !== typeSel) return false;
    if (statSel && statusOf(t) !== statSel) return false;
    if (tagSel){
      const its = tagsOf(t);
      if (!its.includes(tagSel)) return false;
    }
    if (monSel){
      const toks = monOf(t);
      if (!toks.includes(monSel)) return false;
    }
    return true;
  });

  // sort
  switch (sort){
    case 'latest':
      filtered.sort((a,b)=> (dateOf(b)>dateOf(a)?1: dateOf(b)<dateOf(a)?-1:0));
      break;
    case 'oldest':
      filtered.sort((a,b)=> (dateOf(a)>dateOf(b)?1: dateOf(a)<dateOf(b)?-1:0));
      break;
    case 'az':
      filtered.sort((a,b)=> (titleOf(a).localeCompare(titleOf(b))));
      break;
    case 'za':
      filtered.sort((a,b)=> (titleOf(b).localeCompare(titleOf(a))));
      break;
  }

  renderList(listEl, filtered);
  annotateListWithIds(listEl, filtered);
}


  function bindOverlayEvents(brandId) {
    const el = ensureOverlayShell();

    // Create button
    const createBtn = el.querySelector('#tmCreateBtn');
    if (createBtn && !createBtn.__tmBound) {
      createBtn.addEventListener('click', () => {
        __titles.creating = true;
        renderCreateForm(brandId);
      });
      createBtn.__tmBound = true;
    }

    // Search filter — reuse the same pipeline so it stacks with the dropdowns
    const search = el.querySelector('#tmSearch');
    if (search && !search.__tmBound) {
      let t;
      const rerender = () => tmApplyFiltersAndSort(el);
      search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(rerender, 120); });
      search.__tmBound = true;
    }
  }
  /* ======================= EDIT FEATURE (Add-Only) ======================= */

  /** Internal: keep a quick lookup of current list that was rendered into #tmList. */
  const __tm_currentRender = {
    items: [],
    byId: new Map(), // titleId -> item
  };

  /** Attach data needed for clicks + bind handlers (no DOM re-stamping). */
  function annotateListWithIds(listEl, items) {
    if (!listEl) return;

    // 1) Cache for lookups
    __tm_currentRender.items = items || [];
    __tm_currentRender.byId.clear();
    (items || []).forEach(it => {
      if (it && it.titleId) __tm_currentRender.byId.set(String(it.titleId), it);
    });

    // 2) IMPORTANT: scrub any accidental data-title-id on inner buttons
    //    (protects us if a previous version stamped them)
    listEl.querySelectorAll('button[data-edit],button[data-delete]')
          .forEach(b => b.removeAttribute('data-title-id'));

    // 3) Handlers (bind once per listEl)

    // Inline Edit button -> open Edit (and stop bubbling so the card handler doesn’t re-fire)
    if (!listEl.__tmInlineEditBound) {
      listEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-edit]');
        if (!btn) return;
        ev.stopPropagation(); // prevent the card click handler

        const titleId =
          btn.getAttribute('data-edit') ||
          btn.closest('[data-card][data-title-id]')?.getAttribute('data-title-id');

        const brandId = __titles.openForBrand;
        if (!brandId || !titleId) return;

        openEditFor(brandId, titleId);
      });
      listEl.__tmInlineEditBound = true;
    }

    // Card click -> open Edit (but ignore clicks on inline Edit/Delete buttons)
    if (!listEl.__tmCardClickBound) {
      listEl.addEventListener('click', (ev) => {
        // If user clicked inline action buttons, do nothing here
        if (ev.target.closest('[data-edit],[data-delete]')) return;

        const card = ev.target.closest('[data-card][data-title-id]');
        if (!card) return;

        const titleId = card.getAttribute('data-title-id');
        const brandId = __titles.openForBrand;
        if (!brandId || !titleId) return;

        openEditFor(brandId, titleId);
      });
      listEl.__tmCardClickBound = true;
    }

    // Inline Delete button -> soft delete
    if (!listEl.__tmDeleteBound) {
      listEl.addEventListener('click', async (ev) => {
        const b = ev.target.closest('button[data-delete]');
        if (!b) return;
        ev.stopPropagation(); // prevent the card click handler

        const titleId =
          b.getAttribute('data-delete') ||
          b.closest('[data-card][data-title-id]')?.getAttribute('data-title-id');

        const brandId = __titles.openForBrand;
        if (!brandId || !titleId) return;

        const ok = confirm('Are you sure you want to mark this title as deleted?');
        if (!ok) return;

        try {
          b.disabled = true;
          b.textContent = 'Deleting…';

          await updateTitle(brandId, titleId, {
            status: 'deleted',
            availability: { status: 'deleted' }
          });

          // Remove from cache & re-render list
          const list = __titles.cacheByBrand[brandId] || [];
          __titles.cacheByBrand[brandId] = list.filter(x => String(x.titleId) !== String(titleId));
          renderList(listEl, __titles.cacheByBrand[brandId]);
          annotateListWithIds(listEl, __titles.cacheByBrand[brandId]);
        } catch (err) {
          console.error('Delete failed:', err);
          alert('Failed to delete title.');
        } finally {
          b.disabled = false;
          b.textContent = 'Delete';
        }
      });
      listEl.__tmDeleteBound = true;
    }
  }

  /** Open Edit form for a given titleId (uses cache already in memory). */
  async function openEditFor(brandId, titleId) {
    try {
      const el = ensureOverlayShell();
      const all = __titles.cacheByBrand[brandId] || [];

      // existing summary (from the list)
      const summary =
        __tm_currentRender.byId.get(String(titleId)) ||
        all.find(x => String(x.titleId) === String(titleId));

      if (!summary) {
        alert('Could not locate the selected title.');
        return;
      }

        // NEW: fetch full record
      let full = await readTitleById(brandId, summary.titleId);

      // NEW: if deleted, remove from cache/UI and bail out
      if (full && __tm_isDeleted(full)) {                 // NEW
        // prune from cache                                                     // NEW
        __titles.cacheByBrand[brandId] = (__titles.cacheByBrand[brandId]||[])
          .filter(x => String(x.titleId) !== String(summary.titleId));         // NEW
        try { await refreshTitleList(brandId); } catch(_) {}                   // NEW
        alert('This title was deleted and is no longer available.');           // NEW
        return;                                                                // NEW
      }                                                                         // NEW

      // Merge: prefer full fields, but keep summary fallbacks (e.g., thumbnailUrl you enriched)
      const t = full ? { ...summary, ...full } : summary;

      renderEditForm(brandId, t);
    } catch (e) {
      console.error(e);
      alert('Failed to open title for editing.');
    }
  }

  /** Render the EDIT version of the form (same layout, different header/buttons). */
  function renderEditForm(brandId, titleObj) {
    const el = ensureOverlayShell();
    const host = el.querySelector('#tmDetail');

    host.innerHTML = `
      <form id="tmFormEdit" class="p-5 space-y-5 text-gray-100" data-title-id="${escapeHtml(
        titleObj.titleId || ''
      )}">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-300 font-medium">Edit Title</div>
          <div class="flex items-center gap-2">
            <button id="tmSaveEditBtn" class="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-sm text-white">Save Changes</button>
            <button id="tmCancelEditBtn" type="button" class="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
          </div>
        </div>

        <!-- Media Type / Status / Release -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Primary Media Type *</label>
            <select id="fMediaType" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
              <option value="video">Video</option>
              <option value="image">Image/Art</option>
              <option value="audio">Audio/Music/Podcast</option>
            </select>
            <p class="text-[8px] text-gray-500 mt-1">Select the media type for the primary content of this title.</p>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Status *</label>
            <select id="fStatus" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archive">Archive</option>
              <option value="delete">Delete</option>
            </select>
            <p class="text-[8px] text-gray-500 mt-1">Status controls visibility. Only Active titles will be shown.</p>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Release Date (EDT)</label>
            <input id="fRelease" type="datetime-local" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" />
            <label class="mt-2 flex items-center gap-2 text-xs text-gray-300">
              <input id="fReleaseNow" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
              Release now
            </label>
            <p class="text-[11px] text-gray-500 mt-1">Stored as UTC. “Release now” uses current time.</p>
          </div>
        </div>

        <!-- Title -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Title *</label>
            <input id="fTitle" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" />
          </div>
        </div>

        <!-- Identity -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Description</label>
            <textarea id="fDesc" rows="3" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Contributors</label>
            <input id="fContrib" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" placeholder="comma separated" />
          </div>
        </div>

        <!-- Tags + Monetization -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Media Categories</label>
            <div id="fTagsWrap" class="flex flex-wrap gap-2">
              <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                      data-tag="spotlight" aria-pressed="false">Spotlight</button>
              <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                      data-tag="featured"  aria-pressed="false">Featured</button>
              <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                      data-tag="trending"  aria-pressed="false">Trending</button>
              <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                      data-tag="newrelease" aria-pressed="false">New Release</button>
              <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                      data-tag="mustsee"    aria-pressed="false">Must See</button>
            </div>
            <input id="fTags" type="hidden" value="" />
            <p class="text-[8px] text-gray-500 mt-1">Select one or more. These categories populate the carousels/sections.</p>
          </div>

          <div class="space-y-2">
            <div class="text-xs text-gray-400">Monetization</div>
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input id="mFree" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
              Free (exclusive)
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-300">
              <input id="mSub" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" checked />
              Subscription
            </label>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-300">
                <input id="mPurchase" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                Purchase
              </label>
              <input id="mPurchasePrice" type="number" min="4.99" step="0.01"
                    placeholder="Price (≥ 4.99)"
                    class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40" disabled />
            </div>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2 text-sm text-gray-300">
                      <input id="mRental" type="checkbox"
                            class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                      Rental
                    </label>
                    <input id="mRentalPrice" type="number" min="4.99" step="0.01"
                          placeholder="Price (≥ 4.99)"
                          class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40"
                          disabled />
                  </div>
                  <div class="pl-7"> <!-- indent aligns visually under label -->
                    <select id="mRentalWindow"
                            class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40"
                            disabled>
                      <option value="">Select window</option>
                      <option value="24">24 hrs</option>
                      <option value="48">48 hrs</option>
                      <option value="72">72 hrs</option>
                    </select>
                  </div>
                </div>
            <p class="text-[11px] text-gray-500">Defaults: subscription=on; purchase/rental optional. Free disables others.</p>
          </div>
        </div>

        <!-- (Hidden mirrors remain) -->
        <div class="hidden">
          <input id="fVirtualCatalogue" type="checkbox" checked />
          <input id="fVirtualFree" type="checkbox" />
          <input id="fVirtualPurchaseRental" type="checkbox" />
        </div>

        <!-- Media Attachments -->
        <div id="mediaBlocks" class="space-y-3"></div>
      </form>
    `;

    // Same media blocks as Create
    renderMediaBlocks();

    // Initialize monetization controls (scoped for Edit)
    const form = el.querySelector('#tmFormEdit');
    if (form && !form.__monetBound) {
      tmInitMonetizationControls(el);  // <-- call our local initializer
      form.__monetBound = true;
    }

    // NEW: populate all fields from the existing title data
    populateEditFormFields(el, titleObj);

    // Hydrate values from titleObj (sets #fTags and chip visuals)
    hydrateEditFormFromTitle(titleObj);

    // Bind chip clicks for EDIT (keeps #fTags CSV updated)
    tmInitEditTagChips(el);

    // Bind edit-specific save/cancel
    bindEditForm(brandId, titleObj);
  }

  /** Push values from a Title object into the edit form. */
  function hydrateEditFormFromTitle(t) {
    const el = ensureOverlayShell();
    // Basic fields
    setVal('#fMediaType', t.mediaType || 'video');
    setVal('#fStatus', t.status || 'draft');
    setVal('#fTitle', t.title || t.identity?.title || '');
    setVal('#fDesc', t.identity?.description || '');
    setVal('#fContrib', t.identity?.contributors || '');

    // Release date (if present) to datetime-local value
    if (t.releaseDate) {
      const dt = new Date(t.releaseDate);
      // datetime-local wants local time format "YYYY-MM-DDTHH:MM"
      const pad = (n) => String(n).padStart(2,'0');
      const v = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      setVal('#fRelease', v);
      setChecked('#fReleaseNow', false);
    } else {
      setVal('#fRelease', '');
      setChecked('#fReleaseNow', false);
    }

    // Tags → #fTags hidden + chip visuals
    const tags = Array.isArray(t.tags) ? t.tags.map(s => String(s).toLowerCase()) : [];
    const hidden = el.querySelector('#fTags');
    if (hidden) hidden.value = tags.join(',');
    const wrap = el.querySelector('#fTagsWrap');
    if (wrap) {
      wrap.querySelectorAll('[data-tag]').forEach(btn => {
        const tag = btn.getAttribute('data-tag');
        const on = tags.includes(tag);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('bg-indigo-600', on);
        btn.classList.toggle('text-white', on);
        btn.classList.toggle('border-indigo-500/60', on);
        btn.classList.toggle('bg-gray-800', !on);
        btn.classList.toggle('text-gray-200', !on);
        btn.classList.toggle('border-white/10', !on);
      });
      // keep the chip click handler already wired by renderMediaBlocks()/bindCreateForm-equivalent
    }

    // Monetization / Gating (accept CSV string or array)
    const types = __tm_pricingTypes(t);
    const has = (k) => types.includes(k);

    const isFree = (!!t.gating?.free) || has('free');

    setChecked('#mFree', isFree);
    setChecked('#mSub', (!!t.gating?.subscription) || has('subscription'));
    setChecked('#mPurchase', (!!t.gating?.purchase) || has('purchase'));
    setChecked('#mRental', (!!t.gating?.rental) || has('rental'));

    // Prices/windows if present
    if (t.pricing?.purchase?.price) setVal('#mPurchasePrice', String(t.pricing.purchase.price));
    if (t.pricing?.rental?.price)   setVal('#mRentalPrice', String(t.pricing.rental.price));
    if (t.pricing?.rental?.windowHours) setVal('#mRentalWindow', String(t.pricing.rental.windowHours));

    // Re-apply monetization disabling/locking logic
    const evt = new Event('change');
    (el.querySelector('#mFree')||{}).dispatchEvent(evt);
    (el.querySelector('#mPurchase')||{}).dispatchEvent(evt);
    (el.querySelector('#mRental')||{}).dispatchEvent(evt);

    // Media type: ensure correct block set is shown, then hydrate assets
    const mtSel = el.querySelector('#fMediaType');
    if (mtSel) {
      const mt = t.mediaType || 'video';
      if (mtSel.value !== mt) {
        mtSel.value = mt;
        renderMediaBlocks(); // re-render block set
      }
    }
    // Fill slots from t.media
    hydrateMediaSlotsFromTitle(t);
  }

  /** Take title.media and push into the slot cards (data-asset-id + preview). */
  async function hydrateMediaSlotsFromTitle(t) {
    const el = ensureOverlayShell();
    const mt = t.mediaType || 'video';

    const setSlot = async (slotId, assetId, { isVideoSlot = false, isThumbSlot = false } = {}) => {
      if (!assetId) return;
      const card = el.querySelector(`[data-slot-card="${slotId}"]`);
      if (!card) return;
      card.setAttribute('data-asset-id', String(assetId));

      // try to get a preview (use your existing cache helper if available)
      let previewUrl = '';
      let title = '';
      try {
        const pv = await __tm_getPreviewFor(assetId, { isVideoSlot, isThumbSlot });
        previewUrl = pv?.thumb || '';
        title = pv?.title || '';
      } catch {}

      const host = card.querySelector('[data-preview]');
      host.innerHTML = previewUrl
        ? `<img src="${escapeHtml(previewUrl)}" alt="" class="w-full h-24 object-cover rounded-md">`
        : `<div class="h-24 grid place-items-center text-[11px] text-gray-500">No preview</div>`;

      const meta = card.querySelector('[data-meta]');
      if (meta) meta.textContent = title || String(assetId);
    };

    if (mt === 'video') {
      await setSlot('vidPrimary', t.media?.video?.primary?.assetId, { isVideoSlot: true });
      await setSlot('vidTrailer', t.media?.video?.trailer?.assetId, { isVideoSlot: true });
      await setSlot('vidThumb',   t.media?.video?.thumbnail?.assetId, { isThumbSlot: true });
    } else if (mt === 'image') {
      await setSlot('imgPrimary',  t.media?.image?.primary?.assetId);
      await setSlot('imgAlternate',t.media?.image?.alternate?.assetId);
      await setSlot('imgThumb',    t.media?.image?.thumbnail?.assetId, { isThumbSlot: true });
    } else if (mt === 'audio') {
      await setSlot('audPrimary',  t.media?.audio?.primary?.assetId);
      await setSlot('audThumb',    t.media?.audio?.thumbnail?.assetId, { isThumbSlot: true });
    }
  }

  /** Edit form bindings (save -> updateTitle, cancel -> back). */
  function bindEditForm(brandId, titleObj) {
    const el = ensureOverlayShell();
    const form = el.querySelector('#tmFormEdit');
    const btnSave = el.querySelector('#tmSaveEditBtn');
    const btnCancel = el.querySelector('#tmCancelEditBtn');
    const mediaTypeSel = el.querySelector('#fMediaType');

    if (btnCancel && !btnCancel.__tmBound) {
      btnCancel.addEventListener('click', () => {
        // restore neutral “select a title” panel
        el.querySelector('#tmDetail').innerHTML =
          `<div class="p-6 text-gray-300"><div class="text-sm">Select a title on the left, or click <em>Create New Title</em>.</div></div>`;
      });
      btnCancel.__tmBound = true;
    }

    if (btnSave && !btnSave.__tmBound) {
      btnSave.addEventListener('click', async (e) => {
        e.preventDefault();
        const titleId = String(titleObj.titleId || '');
        if (!titleId) return alert('Missing titleId.');

        try {
          btnSave.disabled = true;
          btnSave.textContent = 'Saving…';

          // Build the base payload (your existing function)
          const payload = buildPayloadFromOverlayForm();

          // Read tags from the hidden #fTags (CSV to array), ALWAYS include (even if [])
          const tags = (ensureOverlayShell().querySelector('#fTags')?.value || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);
          payload.tags = tags;

          // ── NEW: force the dropdown value into availability.status (and top-level) ──
          const sel = (ensureOverlayShell().querySelector('#fStatus')?.value || '').trim();
          const normalizedStatus = sel ? sel.toLowerCase() : (payload.status || 'draft');

          // keep top-level in sync (your server already accepts this)
          payload.status = normalizedStatus;

          // ensure availability exists and mirrors the status
          payload.availability = {
            ...(payload.availability || {}),
            status: normalizedStatus,
          };
          // ── end new ──

          // ⬇️ capture the response (so we can get updatedAt if your client returns it)
          const resp = await updateTitle(brandId, titleId, payload);

          // ✅ NEW: Step 4 — tell the Title Manager a title was saved
          window.dispatchEvent(new CustomEvent('tm:title:saved', {
            detail: { brandId, titleId, updatedAt: Date.now() }
          }));


          alert('✅ Title updated');

          // refresh list to reflect changes (keep your current flow)
          await refreshTitleList(brandId);

          // return to neutral panel
          el.querySelector('#tmDetail').innerHTML =
            `<div class="p-6 text-gray-300"><div class="text-sm">Select a title on the left, or click <em>Create New Title</em>.</div></div>`;
        } catch (err) {
          console.error(err);
          alert('❌ Update failed: ' + (err?.message || err));
        } finally {
          btnSave.disabled = false;
          btnSave.textContent = 'Save Changes';
        }
      });
      btnSave.__tmBound = true;
    }


    // media type switch should re-render blocks (then we’ll lose hydrated previews—that’s expected if user changes type)
    if (mediaTypeSel && !mediaTypeSel.__tmBound) {
      mediaTypeSel.addEventListener('change', renderMediaBlocks);
      mediaTypeSel.__tmBound = true;
    }
  }

    /** Monetization initializer for the Edit form (scoped to overlay `el`). */
  function tmInitMonetizationControls(el) {
    const freeEl = el.querySelector('#mFree');
    const subEl  = el.querySelector('#mSub');
    const purEl  = el.querySelector('#mPurchase');
    const renEl  = el.querySelector('#mRental');

    if (!freeEl || !subEl || !purEl || !renEl) return;

    // local helpers that operate within the same overlay `el`
    function mirrorGating({ free, subscription, purchase, rental }) {
      const set = (sel, on) => {
        const n = el.querySelector(sel);
        if (n) n.checked = !!on;
      };
      set('#fGateFree', free);
      set('#fGateSub', subscription);
      set('#fGatePurchase', purchase);
      set('#fGateRental', rental);
    }
    function setDisabled(sel, on) {
      const node = el.querySelector(sel);
      if (!node) return;
      node.disabled = !!on;
      const label = node.closest('label');
      if (label) {
        label.classList.toggle('opacity-50', !!on);
        label.classList.toggle('pointer-events-none', !!on);
      }
    }
    function clearValue(sel) {
      const node = el.querySelector(sel);
      if (node) node.value = '';
    }

    function mirrorCurrentGating() {
      mirrorGating({
        free: freeEl.checked,
        subscription: subEl.checked && !freeEl.checked,
        purchase: purEl.checked && !freeEl.checked,
        rental: renEl.checked && !freeEl.checked
      });
    }

    function hardLockOthers(lock) {
      setDisabled('#mSub', lock);
      setDisabled('#mPurchase', lock);
      setDisabled('#mRental', lock);

      const purOn = purEl.checked && !lock;
      const renOn = renEl.checked && !lock;

      setDisabled('#mPurchasePrice', lock || !purOn);
      setDisabled('#mRentalPrice',  lock || !renOn);
      setDisabled('#mRentalWindow', lock || !renOn);

      if (lock) {
        subEl.checked = false;
        purEl.checked = false; clearValue('#mPurchasePrice');
        renEl.checked = false; clearValue('#mRentalPrice'); clearValue('#mRentalWindow');
      }
    }

    function applyFreeGate() {
      const isFree = !!freeEl.checked;
      hardLockOthers(isFree);
      mirrorCurrentGating();
    }

    function togglePurchaseInputs() {
      const on = purEl.checked && !freeEl.checked;
      setDisabled('#mPurchasePrice', !on);
      if (!on) clearValue('#mPurchasePrice');
      mirrorCurrentGating();
    }

    function toggleRentalInputs() {
      const on = renEl.checked && !freeEl.checked;
      setDisabled('#mRentalPrice', !on);
      setDisabled('#mRentalWindow', !on);
      if (!on) { clearValue('#mRentalPrice'); clearValue('#mRentalWindow'); }
      mirrorCurrentGating();
    }

    function preventWhenFree(e) {
      if (freeEl.checked) { e.preventDefault(); e.stopPropagation(); }
    }

    subEl.addEventListener('mousedown', preventWhenFree);
    purEl.addEventListener('mousedown', preventWhenFree);
    renEl.addEventListener('mousedown', preventWhenFree);

    freeEl.addEventListener('change', applyFreeGate);
    subEl.addEventListener('change', mirrorCurrentGating);
    purEl.addEventListener('change', togglePurchaseInputs);
    renEl.addEventListener('change', toggleRentalInputs);

    // Initial pass
    applyFreeGate();
    togglePurchaseInputs();
    toggleRentalInputs();
  }

  // Edit form: bind tag chips to toggle + keep #fTags (CSV) in sync
  function tmInitEditTagChips(el) {
    const wrap   = el.querySelector('#fTagsWrap');
    const hidden = el.querySelector('#fTags');
    if (!wrap || !hidden) return;
    if (wrap.__tmBound) return;            // prevent double-binding on re-render
    wrap.__tmBound = true;

    // Visual toggle helper (matches your create-form styles)
    function selectBtn(btn, on) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('bg-indigo-600', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('border-indigo-500/60', on);
      btn.classList.toggle('bg-gray-800', !on);
      btn.classList.toggle('text-gray-200', !on);
      btn.classList.toggle('border-white/10', !on);
    }

    // Seed from hidden CSV (hydrateEditFormFromTitle sets this)
    const selected = new Set(
      (hidden.value || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
    );

    // Apply initial visuals
    wrap.querySelectorAll('[data-tag]').forEach(btn => {
      const tag = String(btn.getAttribute('data-tag') || '').toLowerCase();
      selectBtn(btn, selected.has(tag));
    });

    // Toggle on click + update hidden CSV
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tag]');
      if (!btn) return;
      const tag = String(btn.getAttribute('data-tag') || '').toLowerCase();
      if (!tag) return;

      if (selected.has(tag)) selected.delete(tag);
      else selected.add(tag);

      selectBtn(btn, selected.has(tag));

      // ⬇️ keep CSV in sync; IMPORTANT: allow empty (means "clear all")
      hidden.value = Array.from(selected).join(',');
    });
  }


    /**
   * Populate the Edit form with all fields from the title object.
   * Non-destructive: only sets values in the edit overlay.
   */
  async function populateEditFormFields(el, t) {
    if (!el || !t) return;

    // ========= Basics =========
    const q = (s) => el.querySelector(s);

    // Title
    if (q('#fTitle')) q('#fTitle').value = String(
      t.title || t.identity?.title || ''
    );

    // Description / Contributors
    if (q('#fDesc'))     q('#fDesc').value     = String(t.identity?.description || '');
    if (q('#fContrib'))  q('#fContrib').value  = String(t.identity?.contributors || '');

    // Status
    if (q('#fStatus')) {
      const status = (t.status || t.availability?.status || 'draft').toLowerCase();
      q('#fStatus').value = status;
    }

    // Media Type
    if (q('#fMediaType')) {
      const mt = (t.mediaType || 'video');
      q('#fMediaType').value = mt;
      // Re-render blocks for the detected media type
      renderMediaBlocks();
    }

    // Release date (ISO -> datetime-local). Do NOT auto-check "Release now"
    if (q('#fRelease')) {
      const iso = t.releaseDate || t.availability?.releaseDate || '';
      q('#fRelease').value = iso ? iso.slice(0, 16) : '';
    }
    if (q('#fReleaseNow')) q('#fReleaseNow').checked = false;

    // ========= Tags (chips + hidden) =========
    (function applyTags(){
      const current = Array.isArray(t.tags) ? t.tags.map(s => String(s).toLowerCase()) : [];
      const hidden = q('#fTags');
      const wrap   = el.querySelector('#fTagsWrap'); // the chip container with [data-tag] buttons
      if (!hidden || !wrap) return;

      // set hidden CSV
      hidden.value = current.join(',');

      // toggle chip visuals to match
      const selectBtn = (btn, on) => {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('bg-indigo-600', on);
        btn.classList.toggle('text-white', on);
        btn.classList.toggle('border-indigo-500/60', on);
        btn.classList.toggle('bg-gray-800', !on);
        btn.classList.toggle('text-gray-200', !on);
        btn.classList.toggle('border-white/10', !on);
      };
      wrap.querySelectorAll('[data-tag]').forEach(btn => {
        const tag = String(btn.getAttribute('data-tag') || '').toLowerCase();
        selectBtn(btn, current.includes(tag));
      });
    })();

    // ========= Monetization / Pricing / Gating =========
    (function applyMonetization(){
      const types = __tm_pricingTypes(t);

      const freeOn = !!t.gating?.free || types.includes('free');
      const subOn  = !!t.gating?.subscription || types.includes('subscription');
      const purOn  = !!t.gating?.purchase     || types.includes('purchase');
      const renOn  = !!t.gating?.rental       || types.includes('rental');

      if (q('#mFree'))      q('#mFree').checked      = freeOn;
      if (q('#mSub'))       q('#mSub').checked       = subOn && !freeOn;
      if (q('#mPurchase'))  q('#mPurchase').checked  = purOn && !freeOn;
      if (q('#mRental'))    q('#mRental').checked    = renOn && !freeOn;

      // Prices / Window (if present)
      const purchasePrice = t.pricing?.purchase?.price;
      const rentalPrice   = t.pricing?.rental?.price;
      const rentalWindow  = t.pricing?.rental?.windowHours;

      if (q('#mPurchasePrice')) q('#mPurchasePrice').value = (purOn && purchasePrice != null) ? String(purchasePrice) : '';
      if (q('#mRentalPrice'))   q('#mRentalPrice').value   = (renOn && rentalPrice   != null) ? String(rentalPrice)   : '';
      if (q('#mRentalWindow'))  q('#mRentalWindow').value  = (renOn && rentalWindow  != null) ? String(rentalWindow)  : '';

      // Fire change events so the monetization initializer updates disabled states + gating mirror
      ['#mFree','#mSub','#mPurchase','#mRental'].forEach(sel=>{
        const n = q(sel); if (!n) return;
        n.dispatchEvent(new Event('change', { bubbles:true }));
      });
    })();

    // ========= Media selections (cards + previews) =========
    // We set data-asset-id and try to paint a preview using your cache helper if available
    async function setPreview(slotSel, assetId, fallbackTitle){
      const card = q(slotSel);
      if (!card || !assetId) return;

      card.setAttribute('data-asset-id', assetId);
      // ensure preview host exists
      let ph = card.querySelector('[data-preview]');
      if (!ph) return;

      // Try your cache helper for a thumbnail/title
      let thumb = ''; let title = fallbackTitle || assetId;
      try {
        if (typeof __tm_getPreviewFor === 'function') {
          const isVideoSlot = /^(#vidPrimary|#vidTrailer)$/.test(slotSel);
          const isThumbSlot = /Thumb$/.test(slotSel);
          const pv = await __tm_getPreviewFor(assetId, { isVideoSlot, isThumbSlot });
          thumb = pv?.thumb || '';
          title = pv?.title || title;
        }
      } catch {}

      if (thumb) {
        ph.innerHTML = `<img src="${escapeHtml(thumb)}" alt="" class="w-full h-24 object-cover rounded-md">`;
      } else {
        ph.innerHTML = `<div class="h-24 grid place-items-center text-[11px] text-gray-500">asset: ${escapeHtml(assetId)}</div>`;
      }
      const meta = card.querySelector('[data-meta]');
      if (meta) meta.textContent = title;
    }

    // Choose the correct media branch
    const mt = (t.mediaType || 'video').toLowerCase();
    if (mt === 'video' && t.media?.video) {
      await setPreview('#vidPrimary', t.media.video.primary?.assetId, 'video.primary');
      await setPreview('#vidTrailer', t.media.video.trailer?.assetId, 'video.trailer');
      await setPreview('#vidThumb',   t.media.video.thumbnail?.assetId, 'video.thumbnail');
    } else if (mt === 'image' && t.media?.image) {
      await setPreview('#imgPrimary',   t.media.image.primary?.assetId, 'image.primary');
      await setPreview('#imgAlternate', t.media.image.alternate?.assetId || '', 'image.preview');
      await setPreview('#imgThumb',     t.media.image.thumbnail?.assetId, 'image.thumbnail');
    } else if (mt === 'audio' && t.media?.audio) {
      await setPreview('#audPrimary', t.media.audio.primary?.assetId, 'audio.primary');
      await setPreview('#audThumb',   t.media.audio.thumbnail?.assetId, 'audio.thumbnail');
    }

    // Final nudge: if any size-dependent code runs, tell it we changed content
    try { window.dispatchEvent(new Event('resize')); } catch(_) {}
  }


  /* ---- small helpers reused above (safe if already present) ---- */
  function setVal(sel, v) {
    const el = document.querySelector(sel);
    if (el) el.value = (v == null ? '' : String(v));
  }
  function setChecked(sel, on) {
    const el = document.querySelector(sel);
    if (el) el.checked = !!on;
  }
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Normalize pricing.type into an array of lowercased strings.
  // Accepts: ["free","subscription"], "free,subscription", "free", undefined
  function __tm_pricingTypes(obj) {
    const t = obj?.pricing?.type;
    if (Array.isArray(t)) return t.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    if (typeof t === 'string') {
      return t.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    return [];
  }

  // ───────────────── Shared builder for Create + Edit forms ─────────────────
  function buildPayloadFromOverlayForm() {
    const overlay = ensureOverlayShell();
    // Prefer Edit form if present, else Create form
    const form = overlay.querySelector('#tmFormEdit') || overlay.querySelector('#tmForm');
    if (!form) throw new Error('Form not found');

    const q = (sel) => form.querySelector(sel);
    const value = (sel) => (q(sel)?.value || '').trim();
    const bool  = (sel) => !!q(sel)?.checked;
    const valNum = (sel) => {
      const v = value(sel); if (!v) return undefined;
      const n = Number(v); return Number.isFinite(n) ? n : undefined;
    };

    // ----- Required basics -----
    const title = value('#fTitle');
    if (!title) throw new Error('Title is required');

    const mediaType = (value('#fMediaType') || 'video').toLowerCase();
    const status = value('#fStatus') || 'draft';

    // Release date: “Release now” overrides picker
    const releaseNow = bool('#fReleaseNow');
    const releaseDate = releaseNow
      ? new Date().toISOString()
      : (value('#fRelease') ? new Date(value('#fRelease')).toISOString() : undefined);

    // Identity
    const identityTitle = value('#fIdTitle') || title;
    const description   = value('#fDesc');
    const contributors  = value('#fContrib');

    // Tags (top-level list) — kept as CSV in #fTags
    const tags = (value('#fTags') || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    // Monetization → pricing.type (+ prices/windows)
    const mFree = bool('#mFree');
    const mSub  = bool('#mSub');
    const mPur  = bool('#mPurchase');
    const mRen  = bool('#mRental');

    const purPrice = valNum('#mPurchasePrice');
    const renPrice = valNum('#mRentalPrice');
    const renWin   = value('#mRentalWindow');

    if (mFree) {
      // exclusive; UI already disables others
    } else {
      const picked = [mSub, mPur, mRen].some(Boolean);
      if (!picked) throw new Error('Select at least one monetization option or choose Free.');
      if (mPur && !(purPrice >= 4.99)) throw new Error('Purchase price must be at least $4.99.');
      if (mRen) {
        if (!(renPrice >= 4.99)) throw new Error('Rental price must be at least $4.99.');
        if (!['24','48','72'].includes(renWin)) throw new Error('Select a valid rental window (24/48/72 hours).');
      }
    }

    // Build pricing.type
    let pricingType = [];
    if (mFree) pricingType = ['free'];
    else {
      if (mSub) pricingType.push('subscription');
      if (mPur) pricingType.push('purchase');
      if (mRen) pricingType.push('rental');
    }

    const pricing = { type: pricingType };
    if (pricingType.includes('purchase')) pricing.purchase = { price: Number(purPrice.toFixed(2)) };
    if (pricingType.includes('rental'))   pricing.rental   = { price: Number(renPrice.toFixed(2)), windowHours: Number(renWin) };

    // Gating mirrors monetization
    const gating = {
      free:        pricingType.includes('free'),
      subscription:pricingType.includes('subscription'),
      purchase:    pricingType.includes('purchase'),
      rental:      pricingType.includes('rental'),
    };

    // Media from the preview cards inside the **current** form
    function assembleMediaSection(mt) {
      const read = (sel) => {
        const n = q(sel); if (!n) return null;
        const assetId = n.getAttribute('data-asset-id') || '';
        return assetId ? { assetId } : null;
      };
      const toThumb = (sel) => ({ assetId: sel.assetId });

      if (mt === 'video') {
        const primary   = read('#vidPrimary');
        const trailer   = read('#vidTrailer');
        const thumbnail = read('#vidThumb');
        if (!primary)   throw new Error('Video Primary is required');
        if (!thumbnail) throw new Error('Video Thumbnail is required');
        const out = { video: { primary: { assetId: primary.assetId }, thumbnail: toThumb(thumbnail) } };
        if (trailer) out.video.trailer = { assetId: trailer.assetId };
        return out;
      }
      if (mt === 'image') {
        const primary   = read('#imgPrimary');
        const thumbnail = read('#imgThumb');
        if (!primary)   throw new Error('Image Primary is required');
        if (!thumbnail) throw new Error('Image Thumbnail is required');
        return { image: { primary: { assetId: primary.assetId }, thumbnail: toThumb(thumbnail) } };
      }
      if (mt === 'audio') {
        const primary   = read('#audPrimary');
        const thumbnail = read('#audThumb');
        if (!primary)   throw new Error('Audio Primary is required');
        if (!thumbnail) throw new Error('Audio Thumbnail is required');
        return { audio: { primary: { assetId: primary.assetId }, thumbnail: toThumb(thumbnail) } };
      }
      return {};
    }

    const media = assembleMediaSection(mediaType);

    // Availability mirrors status + releaseDate
    const availability = { status, ...(releaseDate ? { releaseDate } : {}) };

    // Final payload (shape matches what your Lambda expects)
    return {
      entityType: 'Title',
      mediaType,
      status,
      title,
      ...(releaseDate ? { releaseDate } : {}),
      identity: { title: identityTitle, description, contributors },
      ...(tags.length ? { tags } : {}),
      pricing,
      availability,
      gating,
      media,
    };
  }


  // ─────────────── Create Form ───────────────
  function renderCreateForm(brandId) {
    const el = ensureOverlayShell();
    const host = el.querySelector('#tmDetail');

    host.innerHTML = `
      <form id="tmForm" class="p-5 space-y-5 text-gray-100">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-300 font-medium">Create New Title</div>
          <div class="flex items-center gap-2">
            <button id="tmSaveBtn" class="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-sm text-white">Save</button>
            <button id="tmCancelBtn" type="button" class="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm">Cancel</button>
          </div>
        </div>

        <!-- Media Type -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Primary Media Type *</label>
            <select id="fMediaType" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
              <option value="video">Video</option>
              <option value="image">Image/Art</option>
              <option value="audio">Audio/Music/Podcast</option>
            </select>
            <p class="text-[8px] text-gray-500 mt-1">Select the media type for the primary content of this title.</p>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Status *</label>
            <select id="fStatus" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archive">Archived</option>
            </select>
            <p class="text-[8px] text-gray-500 mt-1">Status controls visibility. Only Active titles will be shown.</p>
          </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Release Date (EDT)</label>
              <input id="fRelease" type="datetime-local" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" />
              <label class="mt-2 flex items-center gap-2 text-xs text-gray-300">
                <input id="fReleaseNow" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                Release now
              </label>
              <p class="text-[11px] text-gray-500 mt-1">Stored as UTC. “Release now” uses current time.</p>
            </div>
        </div>

        <!-- Title -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Title *</label>
            <input id="fTitle" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" placeholder="e.g., Championship 43" />
          </div>
        </div>

        <!-- Identity -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Description</label>
            <textarea id="fDesc" rows="3" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs text-gray-400 mb-1">Contributors</label>
            <input id="fContrib" class="w-full bg-gray-800 border border-white/10 rounded px-2 py-1.5" placeholder="comma separated" />
          </div>
        </div>

        <!-- Tags + Pricing -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Tags row -->
          <!-- Tags (multi-select chips) -->
            <div>
              <label class="block text-xs text-gray-400 mb-1">Media Categories</label>

                <!-- Buttons -->
                <div id="fTagsWrap" class="flex flex-wrap gap-2">
                  <!-- Keep these exact data-tag values; they are what get written -->
                  <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          data-tag="spotlight" aria-pressed="false">Spotlight</button>
                  <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          data-tag="featured"  aria-pressed="false">Featured</button>
                  <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          data-tag="trending"  aria-pressed="false">Trending</button>
                  <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          data-tag="newrelease" aria-pressed="false">New Release</button>
                  <button type="button" class="px-2 py-1 rounded border border-white/10 bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
                          data-tag="mustsee"    aria-pressed="false">Must See</button>
                </div>

                <!-- Hidden input preserved so existing csv('#fTags') continues to work -->
                <input id="fTags" type="hidden" value="" />

                <p class="text-[8px] text-gray-500 mt-1">
                  Select one or more. These categories pobluate the various carousels and section on the site.
                </p>
              </div>
       
              <!-- Monetization (new) -->
                <div class="space-y-2">
                  <div class="text-xs text-gray-400">Monetization</div>

                  <!-- Free (exclusive gate) -->
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="mFree" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                    Free (exclusive)
                  </label>

                  <!-- Subscription (default checked) -->
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="mSub" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" checked />
                    Subscription
                  </label>

                  <!-- Purchase -->
                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2 text-sm text-gray-300">
                      <input id="mPurchase" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                      Purchase
                    </label>
                    <input id="mPurchasePrice" type="number" min="4.99" step="0.01"
                          placeholder="Price (≥ 4.99)"
                          class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40" disabled />
                  </div>

                  <!-- Rental -->
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 text-sm text-gray-300">
                          <input id="mRental" type="checkbox"
                                class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                          Rental
                        </label>
                        <input id="mRentalPrice" type="number" min="4.99" step="0.01"
                              placeholder="Price (≥ 4.99)"
                              class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40"
                              disabled />
                      </div>
                      <div class="pl-7"> <!-- indent aligns visually under label -->
                        <select id="mRentalWindow"
                                class="w-40 bg-gray-800 border border-white/10 rounded px-2 py-1.5 disabled:opacity-40"
                                disabled>
                          <option value="">Select window</option>
                          <option value="24">24 hrs</option>
                          <option value="48">48 hrs</option>
                          <option value="72">72 hrs</option>
                        </select>
                      </div>
                    </div>

                  <p class="text-[11px] text-gray-500">
                    Defaults: subscription=on; purchase/rental optional. Selecting <strong>Free</strong> disables others.
                  </p>
                </div>

                <!-- Gating (read-only mirror of Monetization) -->
                <div class="hidden space-y-2">
                  <div class="text-xs text-gray-400">Gating (mirrors Monetization)</div>
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="fGateFree" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" disabled />
                    Free
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="fGateSub" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" disabled checked />
                    Subscription
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="fGatePurchase" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" disabled />
                    Purchase
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input id="fGateRental" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" disabled />
                    Rental
                  </label>
                </div>


        </div>

        <!-- Availability & Gating (hidden, defaults still applied) -->
        <div >   
          <!-- Feeds (Virtual flags) -->
            <div class="hidden space-y-2">
              <div class="text-xs text-gray-400">Feeds (Virtual)</div>
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input id="fVirtualCatalogue" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" checked />
                  Include in Catalogue
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input id="fVirtualFree" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                  Mark as Free in Feeds
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input id="fVirtualPurchaseRental" type="checkbox" class="h-4 w-4 bg-gray-800 border-gray-600 rounded" />
                  Enable Purchase/Rental in Feeds
                </label>
                <p class="text-[11px] text-gray-500">Defaults: catalogue=true, free=false, purchaserental=false.</p>
              </div>
            </div>
          

          <!-- Offers (minimal add/remove) -->
          <div class="hidden">
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-400">Offers (optional)</div>
              <button id="fAddOffer" type="button" class="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600">Add offer</button>
            </div>
            <div id="fOfferList" class="mt-2 space-y-2"></div>
          </div>
        </div>

        <!-- Media Attachments -->
        <div id="mediaBlocks" class="space-y-3">
          <!-- dynamically renders based on Media Type -->
        </div>
      </form>
    `;

    bindCreateForm(brandId);
    renderMediaBlocks(); // initial
  }

  function bindCreateForm(brandId) {
    const el = ensureOverlayShell();
    const form = el.querySelector('#tmForm');
    const btnSave = el.querySelector('#tmSaveBtn');
    const btnCancel = el.querySelector('#tmCancelBtn');
    const mediaTypeSel = el.querySelector('#fMediaType');

    // add temporarily inside bindCreateForm
    document.getElementById('tmForm').addEventListener('submit', () => console.log('SUBMIT fired'));
    document.getElementById('tmSaveBtn').addEventListener('click', () => console.log('CLICK fired'));

    if (btnCancel && !btnCancel.__tmBound) {
      btnCancel.addEventListener('click', () => {
        __titles.creating = false;
        // Back to empty detail
        el.querySelector('#tmDetail').innerHTML =
          `<div class="p-6 text-gray-300"><div class="text-sm">Select a title on the left, or click <em>Create New Title</em>.</div></div>`;
      });
      btnCancel.__tmBound = true;
    }

    // Save handler
    if (btnSave && !btnSave.__tmBound) {
      btnSave.addEventListener('click', async (e) => {
        e.preventDefault();

        // Validate required
        const title = value('#fTitle');
        if (!title) { return alert('Title is required'); }
        const mediaType = value('#fMediaType');

        // Build payload
        const payload = buildPayloadFromOverlayForm();
        try {
          btnSave.disabled = true;
          btnSave.textContent = 'Saving…';


          // ✅ NEW: notify Title Manager that a title was created
          const resp = await createTitle(brandId, payload);
          window.dispatchEvent(new CustomEvent('tm:title:saved', {
            detail: { brandId, titleId: resp?.titleId, updatedAt: Date.now() }
          }));


          alert('✅ Title created');

          // Refresh list & reset form view (unchanged)
          await refreshTitleList(brandId);
          __titles.creating = false;
          el.querySelector('#tmDetail').innerHTML =
            `<div class="p-6 text-gray-300"><div class="text-sm">Select a title on the left, or click <em>Create New Title</em>.</div></div>`;
        } catch (err) {
          console.error(err);
          alert('❌ Save failed: ' + (err?.message || err));
        } finally {
          btnSave.disabled = false;
          btnSave.textContent = 'Save';
        }
      });
      btnSave.__tmBound = true;
    }

    // Rerender media blocks when media type changes
    if (mediaTypeSel && !mediaTypeSel.__tmBound) {
      mediaTypeSel.addEventListener('change', renderMediaBlocks);
      mediaTypeSel.__tmBound = true;
    }

    // ---- Tags (chips) wiring: writes a comma-separated list into #fTags so csv('#fTags') keeps working
    (function initTagChips(){
      const wrap = el.querySelector('#fTagsWrap');
      const hidden = el.querySelector('#fTags'); // hidden input we keep in sync
      if (!wrap || !hidden) return;
      if (wrap.__tmBound) return; // avoid double-binding if form re-renders
      wrap.__tmBound = true;

      // Visual toggle helpers
      function selectBtn(btn, on) {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('bg-indigo-600', on);
        btn.classList.toggle('text-white', on);
        btn.classList.toggle('border-indigo-500/60', on);
        btn.classList.toggle('bg-gray-800', !on);
        btn.classList.toggle('text-gray-200', !on);
        btn.classList.toggle('border-white/10', !on);
      }

      // Keep a Set of selected tags; initialize from any existing hidden value (if present)
      const selected = new Set(
        (hidden.value || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      );

      // Apply initial visual state
      wrap.querySelectorAll('[data-tag]').forEach(btn => {
        const tag = btn.getAttribute('data-tag');
        selectBtn(btn, selected.has(tag));
      });

      // Click to toggle
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tag]');
        if (!btn) return;
        const tag = btn.getAttribute('data-tag');
        if (!tag) return;

        if (selected.has(tag)) selected.delete(tag);
        else selected.add(tag);

        // Update visuals
        selectBtn(btn, selected.has(tag));

        // Sync hidden input as comma-separated list (so your csv('#fTags') keeps working)
        hidden.value = Array.from(selected).join(',');
      });
    })();

    // Tag chips toggle
    const chipHost = el.querySelector('#fTagChips');
      if (chipHost && !chipHost.__tmBound) {
        chipHost.addEventListener('click', (ev) => {
          const b = ev.target.closest('button[data-tag]');
          if (!b) return;
          const on = b.getAttribute('data-on') === 'true';
          b.setAttribute('data-on', on ? 'false' : 'true');
        });
        chipHost.__tmBound = true;
      }

      const releaseInput = el.querySelector('#fRelease');
      const releaseNow = el.querySelector('#fReleaseNow');
      if (releaseInput && releaseNow && !releaseNow.__tmBound) {
        const syncDisabled = () => {
          releaseInput.disabled = !!releaseNow.checked;
          releaseInput.classList.toggle('opacity-60', !!releaseNow.checked);
        };
        releaseNow.addEventListener('change', syncDisabled);
        syncDisabled();
        releaseNow.__tmBound = true;
      }


    // Offers add/remove
    const addOfferBtn = el.querySelector('#fAddOffer');
    if (addOfferBtn && !addOfferBtn.__tmBound) {
      addOfferBtn.addEventListener('click', () => {
        const list = el.querySelector('#fOfferList');
        const idx = list.children.length;
        const node = document.createElement('div');
        node.className = 'p-3 rounded bg-gray-800 ring-1 ring-white/10';
        node.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input placeholder="offerId" class="bg-gray-850 border border-white/10 rounded px-2 py-1.5" data-offer="id">
            <input placeholder="label"   class="bg-gray-850 border border-white/10 rounded px-2 py-1.5" data-offer="label">
            <input placeholder="price"   class="bg-gray-850 border border-white/10 rounded px-2 py-1.5" data-offer="price">
            <input placeholder="regions" class="bg-gray-850 border border-white/10 rounded px-2 py-1.5" data-offer="regions">
            <input placeholder="rentalHours (optional)" class="bg-gray-850 border border-white/10 rounded px-2 py-1.5" data-offer="hours">
          </div>
          <div class="mt-2">
            <button type="button" class="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600" data-offer="remove">Remove</button>
          </div>
        `;
        list.appendChild(node);
        node.querySelector('[data-offer="remove"]').addEventListener('click', () => node.remove());
      });
      addOfferBtn.__tmBound = true;
    }

    // Helpers
    function value(sel) { return (el.querySelector(sel)?.value || '').trim(); }
    function bool(sel)  { return !!el.querySelector(sel)?.checked; }

    function csv(sel) {
      const v = value(sel);
      if (!v) return [];
      return v.split(',').map(s => s.trim()).filter(Boolean);
    }

    // ── Monetization helpers (scoped to the active overlay form)
      // ── Monetization helpers (SCOPED to this overlay/form)
      const q = (sel) => el.querySelector(sel) || document.querySelector(sel);

      function valNum(id) {
        const v = (value(id) || '').trim();
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      function setChecked(sel, on) {
        const node = q(sel);
        if (node) node.checked = !!on;
      }
      function setDisabled(sel, on) {
        const node = q(sel);
        if (!node) return;
        node.disabled = !!on;
        // Optional UX: visually gray out the label when disabled
        const label = node.closest('label');
        if (label) {
          label.classList.toggle('opacity-50', !!on);
          label.classList.toggle('pointer-events-none', !!on);
        }
      }
      function clearValue(sel) {
        const node = q(sel);
        if (node) node.value = '';
      }
      function mirrorGating({ free, subscription, purchase, rental }) {
        setChecked('#fGateFree', free);
        setChecked('#fGateSub', subscription);
        setChecked('#fGatePurchase', purchase);
        setChecked('#fGateRental', rental);
      }

      function initMonetizationControls() {
        const freeEl = el.querySelector('#mFree');
        const subEl  = el.querySelector('#mSub');
        const purEl  = el.querySelector('#mPurchase');
        const renEl  = el.querySelector('#mRental');

        if (!freeEl || !subEl || !purEl || !renEl) return;

        function mirrorCurrentGating() {
          mirrorGating({
            free: freeEl.checked,
            subscription: subEl.checked && !freeEl.checked,
            purchase: purEl.checked && !freeEl.checked,
            rental: renEl.checked && !freeEl.checked
          });
        }

        function hardLockOthers(lock) {
          // Disable toggles & inputs when Free is on; clear when locking
          setDisabled('#mSub', lock);
          setDisabled('#mPurchase', lock);
          setDisabled('#mRental', lock);

          const purOn = purEl.checked && !lock;
          const renOn = renEl.checked && !lock;

          setDisabled('#mPurchasePrice', lock || !purOn);
          setDisabled('#mRentalPrice',  lock || !renOn);
          setDisabled('#mRentalWindow', lock || !renOn);

          if (lock) {
            subEl.checked = false;
            purEl.checked = false; clearValue('#mPurchasePrice');
            renEl.checked = false; clearValue('#mRentalPrice'); clearValue('#mRentalWindow');
          }
        }

        function applyFreeGate() {
          const isFree = !!freeEl.checked;
          hardLockOthers(isFree);
          mirrorCurrentGating();
        }

        function togglePurchaseInputs() {
          const on = purEl.checked && !freeEl.checked;
          setDisabled('#mPurchasePrice', !on);
          if (!on) clearValue('#mPurchasePrice');
          mirrorCurrentGating();
        }

        function toggleRentalInputs() {
          const on = renEl.checked && !freeEl.checked;
          setDisabled('#mRentalPrice', !on);
          setDisabled('#mRentalWindow', !on);
          if (!on) { clearValue('#mRentalPrice'); clearValue('#mRentalWindow'); }
          mirrorCurrentGating();
        }

        // Guards: block toggling others while Free is on (prevents label click toggles)
        function preventWhenFree(e) {
          if (freeEl.checked) { e.preventDefault(); e.stopPropagation(); }
        }
        subEl.addEventListener('mousedown', preventWhenFree);
        purEl.addEventListener('mousedown', preventWhenFree);
        renEl.addEventListener('mousedown', preventWhenFree);

        // Wire up
        freeEl.addEventListener('change', applyFreeGate);
        subEl.addEventListener('change', mirrorCurrentGating);
        purEl.addEventListener('change', togglePurchaseInputs);
        renEl.addEventListener('change', toggleRentalInputs);

        // Initial pass — keeps Subscription default when Free is off
        applyFreeGate();
        togglePurchaseInputs();
        toggleRentalInputs();
      }




    // --- Timezone helpers: interpret NY (America/New_York) wall time, output UTC ISO ---
    function getOffsetMinutesForNY(atUtcMs) {
      // Return the NY offset in minutes (e.g., -240 for EDT, -300 for EST)
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'shortOffset',
        hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      const parts = fmt.formatToParts(new Date(atUtcMs));
      const tz = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-05:00';
      // tz like "GMT-04:00" -> sign is NY offset from UTC (i.e., UTC-4)
      const m = tz.match(/GMT([+\-])(\d{2}):(\d{2})/);
      if (!m) return -300; // fallback -5h
      const sign = m[1] === '-' ? -1 : 1;
      const hh = parseInt(m[2], 10);
      const mm = parseInt(m[3], 10);
      // Example GMT-04:00 => offsetMinutes = -240
      return sign * (hh * 60 + mm);
    }

    function nyLocalToUtcIso(y, M, d, h, m) {
      // 1) initial guess: assume UTC == NY wall (wrong, we fix with offset)
      let guessUtc = Date.UTC(y, M - 1, d, h, m);
      // 2) compute NY offset at that UTC, adjust
      for (let i = 0; i < 2; i++) {
        const nyOffset = getOffsetMinutesForNY(guessUtc); // e.g., -240 for EDT
        // UTC = NY wall time - (NY offset from UTC)
        guessUtc = Date.UTC(y, M - 1, d, h, m) - (nyOffset * 60 * 1000);
      }
      return new Date(guessUtc).toISOString();
    }

    function parseDatetimeLocalToNYIsoUtc(v) {
      // v comes as "YYYY-MM-DDTHH:mm"
      if (!v) return undefined;
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (!m) return undefined;
      const [_, ys, Ms, ds, hs, mins] = m;
      return nyLocalToUtcIso(parseInt(ys,10), parseInt(Ms,10), parseInt(ds,10), parseInt(hs,10), parseInt(mins,10));
    }

    function nyNowIsoUtc() {
      // Get current time in NY, then convert to UTC ISO
      const now = Date.now();
      const nyOffset = getOffsetMinutesForNY(now);
      // If local UTC is 'now', NY wall = UTC + (NY offset)
      const nyWall = new Date(now + nyOffset * 60 * 1000);
      return nyLocalToUtcIso(
        nyWall.getUTCFullYear(),
        nyWall.getUTCMonth() + 1,
        nyWall.getUTCDate(),
        nyWall.getUTCHours(),
        nyWall.getUTCMinutes()
      );
    }


    function buildPayloadFromForm() {
      // Required basics
      const title = value('#fTitle');
      const mediaType = value('#fMediaType'); // 'video' | 'image' | 'audio'
      const status = value('#fStatus') || 'draft';

      // Release date (ISO). If "Release now" checked, use now; else use picker if present.
      const releaseNow = bool('#fReleaseNow');
      const releaseDate = releaseNow
        ? new Date().toISOString()
        : (value('#fRelease') ? new Date(value('#fRelease')).toISOString() : undefined);

      // Identity
      const identityTitle = value('#fIdTitle') || title;
      const description = value('#fDesc');
      const contributors = value('#fContrib');

      // Tags (top-level!) — lambda reads ONLY top-level `tags`
      const tags = (value('#fTags') || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

        // ⬇️ keep this line unguarded
      payload.tags = tags;

      // ===== NEW: Monetization → pricing.type (list) + mirrored gating
      const mFree = bool('#mFree');
      const mSub  = bool('#mSub');
      const mPur  = bool('#mPurchase');
      const mRen  = bool('#mRental');

      const purPrice = valNum('#mPurchasePrice');
      const renPrice = valNum('#mRentalPrice');
      const renWin   = (value('#mRentalWindow') || '').trim(); // '24' | '48' | '72'

      // Validation
      if (mFree) {
        // exclusive; other inputs/UI are disabled already
      } else {
        const picked = [mSub, mPur, mRen].some(Boolean);
        if (!picked) throw new Error('Select at least one monetization option or choose Free.');
        if (mPur && !(purPrice >= 4.99)) {
          throw new Error('Purchase price must be at least $4.99.');
        }
        if (mRen) {
          if (!(renPrice >= 4.99)) throw new Error('Rental price must be at least $4.99.');
          if (!['24','48','72'].includes(renWin)) {
            throw new Error('Select a valid rental window (24/48/72 hours).');
          }
        }
      }

      // Build pricing.type list
      let pricingType = [];
      if (mFree) {
        pricingType = ['free'];
      } else {
        if (mSub) pricingType.push('subscription');
        if (mPur) pricingType.push('purchase');
        if (mRen) pricingType.push('rental');
      }

      const pricing = { type: pricingType };
      if (pricingType.includes('purchase')) {
        pricing.purchase = { price: Number(purPrice.toFixed(2)) };
      }
      if (pricingType.includes('rental')) {
        pricing.rental = {
          price: Number(renPrice.toFixed(2)),
          windowHours: Number(renWin)
        };
      }

      // Gating map mirrors monetization
      const gating = {
        free: pricingType.includes('free'),
        subscription: pricingType.includes('subscription'),
        purchase: pricingType.includes('purchase'),
        rental: pricingType.includes('rental')
      };


      // Media selections (assetIds captured in data-* attrs):
      const media = assembleMediaSection(mediaType);

      // Availability mirrors (lambda ignores status, but we mirror per your spec)
      const availability = {
        status,
        ...(releaseDate ? { releaseDate } : {})
      };

      // Construct final payload EXACTLY as the lambda expects to see fields
      const payload = {
        entityType: 'Title',
        mediaType,
        status,
        title,
        ...(releaseDate ? { releaseDate } : {}),
        identity: {
          title: identityTitle,
          description,
          contributors
        },
        ...(tags.length ? { tags } : {}),
        pricing,          // canonical (list)
        availability,
        gating,           // 4-key map
        media
      };

      // No visibilityLevel, no taxonomy, and we don't need feeds.virtual in v1 for lambda.
      return payload;
    }

      function assembleMediaSection(mt) {
        // Reads data-asset-id + data-url (+ data-shapes) from the picker preview cards
        const read = (sel) => {
          const n = el.querySelector(sel);
          if (!n) return null;
          const assetId = n.getAttribute('data-asset-id') || '';
          return assetId ? { assetId } : null;
        };

        const toVideoPlayback = (sel) => ({
          assetId: sel.assetId
        });

        const toThumbnail = (sel) => {
          // Only persist the assetId now; feeds builder will resolve URLs/shapes later
          return { assetId: sel.assetId };
        };

        if (mt === 'video') {
          const primary   = read('#vidPrimary');
          const trailer   = read('#vidTrailer');
          const thumbnail = read('#vidThumb');
          if (!primary)   { alert('Video Primary is required'); throw new Error('missing video.primary'); }
          if (!thumbnail) { alert('Video Thumbnail is required'); throw new Error('missing video.thumbnail'); }

          const out = {
            video: {
              primary:   toVideoPlayback(primary),
              thumbnail: toThumbnail(thumbnail)
            }
          };
          if (trailer) out.video.trailer = toVideoPlayback(trailer);
          return out;
        }

        if (mt === 'image') {
          const primary   = read('#imgPrimary');
          const thumbnail = read('#imgThumb');
          if (!primary)   { alert('Image Primary is required'); throw new Error('missing image.primary'); }
          if (!thumbnail) { alert('Image Thumbnail is required'); throw new Error('missing image.thumbnail'); }

          return {
            image: {
              primary:   { assetId: primary.assetId },
              thumbnail: toThumbnail(thumbnail)
              // NOTE: 'Alternate' is not persisted in v1
            }
          };
        }


        if (mt === 'audio') {
          const primary   = read('#audPrimary');
          const thumbnail = read('#audThumb');
          if (!primary)   { alert('Audio Primary is required'); throw new Error('missing audio.primary'); }
          if (!thumbnail) { alert('Audio Thumbnail is required'); throw new Error('missing audio.thumbnail'); }

          return {
            audio: {
              primary:   { assetId: primary.assetId },
              thumbnail: toThumbnail(thumbnail)
            }
          };
        }

        return {};
      }
      // Initialize Monetization controls exactly once per form render
      if (form && !form.__monetBound) {
        initMonetizationControls();
        form.__monetBound = true;
      }
    }

    // --- Media preview cache used by the Create form (pickers untouched) ---
    const __tmMediaPreviewCache = {
      loaded: false,
      byId: new Map()
    };

    function __tm_thumbFrom(mu) {
      // Thumbnail picker path (your “image thumbnail” source of truth)
      const exact = mu?.artwork?.primary?.landscape;
      if (exact) return exact;

      // Safe fallbacks (don’t affect video)
      const ipr = mu?.image?.primary || mu?.primary || {};
      const aw  = ipr?.artwork || mu?.artwork || {};
      return aw?.landscape || aw?.['16x9'] || aw?.standard || aw?.portrait || aw?.default || '';
    }


async function __tm_loadMediaPreviewCacheOnce() {
  if (__tmMediaPreviewCache.loaded) return __tmMediaPreviewCache;
  // Try list via your existing APIs (same shape you already use elsewhere)
  let all = [];
  try {
    if (window.api?.listMedia) {
      const r = await window.api.listMedia();
      all = Array.isArray(r) ? r
         : Array.isArray(r?.items) ? r.items
         : Array.isArray(r?.data) ? r.data
         : Array.isArray(r?.results) ? r.results
         : [];
    } else {
      const base = (typeof MEDIALIBRARY_API === 'string' && MEDIALIBRARY_API) || '';
      if (base) {
        const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
        const res = await fetch(`${base.replace(/\/$/,'')}/media`, {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const payload = await res.json().catch(()=>[]);
          all = Array.isArray(payload) ? payload
              : Array.isArray(payload?.items) ? payload.items
              : Array.isArray(payload?.data) ? payload.data
              : Array.isArray(payload?.results) ? payload.results
              : [];
        }
      }
    }
  } catch {}

  const map = new Map();
  all.forEach(m => {
    const id = m.assetId || m.id || m.mediaId || m.fileId || m.key;
    if (!id) return;
    map.set(String(id), m);
  });
  __tmMediaPreviewCache.byId = map;
  __tmMediaPreviewCache.loaded = true;
  return __tmMediaPreviewCache;
}

// Extract best preview + title for a given assetId
function __tm_pickTitle(it) {
  return it?.title || it?.fileName || it?.name || it?.displayName || it?.originalFileName || it?.filename || it?.label || '';
}

function __tm_videoThumbFrom(mu) {
  const vthumbs = mu?.video?.primary?.thumbnails || {};
  return (
    vthumbs.rendition1 ||
    vthumbs.landscape ||
    vthumbs.rendition2 ||
    vthumbs.rendition3 ||
    vthumbs.default ||
    ''
  );
}

function __tm_imageLandscapeFrom(mu) {
  const ipr = mu?.image?.primary || mu?.primary || {};
  const aw  = ipr?.artwork || mu?.artwork || {};
  return aw?.landscape || aw?.['16x9'] || aw?.standard || aw?.portrait || aw?.default || '';
}

// Build a preview object for the UI card using the cache (does NOT alter saving)
async function __tm_getPreviewFor(assetId, { isVideoSlot, isThumbSlot } = {}) {
  await __tm_loadMediaPreviewCacheOnce();
  const raw = __tmMediaPreviewCache.byId.get(String(assetId));
  if (!raw) return { title: String(assetId), thumb: '' };

  const mu = raw.mediaUrl || raw.media_url || raw.mediaURL || {};
  const title = __tm_pickTitle(raw);

  let thumb = '';
  if (isVideoSlot) {
    thumb = __tm_videoThumbFrom(mu);         // video: rendition1
  } else if (isThumbSlot) {
    thumb = __tm_thumbFrom(mu);              // thumbnail picker: artwork.primary.landscape
  } else {
    thumb = __tm_imageLandscapeFrom(mu);     // generic image fallback
  }

  return { title, thumb };
}



  // ─────────────── Media blocks + pickers ───────────────
  function renderMediaBlocks() {
    const el = ensureOverlayShell();
    const type = (el.querySelector('#fMediaType')?.value || 'video');

    const blocks = {
      video: `
        <div class="rounded-xl ring-1 ring-white/10 p-3">
          <div class="text-xs text-gray-400 mb-2">Media Attachments</div>
          ${pickerRow('Primary Media *', 'vidPrimary', 'video')}
          ${pickerRow('Trailer', 'vidTrailer', 'video')}
          ${pickerRow('Thumbnail *', 'vidThumb','image')}
        </div>`,
      image: `
        <div class="rounded-xl ring-1 ring-white/10 p-3">
          <div class="text-xs text-gray-400 mb-2">Image Attachments</div>
          ${pickerRow('Image Primary *',      'imgPrimary',  'image')}
          ${pickerRow('Preview',      'imgAlternate','image')}
          ${pickerRow('Thumbnail *',          'imgThumb',    'image')}
        </div>`,
      audio: `
        <div class="rounded-xl ring-1 ring-white/10 p-3">
          <div class="text-xs text-gray-400 mb-2">Audio Attachments</div>
          ${pickerRow('Audio Primary *', 'audPrimary', 'audio')}
          ${pickerRow('Thumbnail *',     'audThumb',   'image')}
        </div>`
    };

    const host = el.querySelector('#mediaBlocks');
    host.innerHTML = blocks[type] || blocks.video;

    // bind each picker button that was just rendered
    host.querySelectorAll('[data-pick]').forEach(btn => {
      if (btn.__tmBound) return;
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const slot   = btn.getAttribute('data-slot') || '';
        const filter = btn.getAttribute('data-type') || 'image';
        const idOnly = (slot === 'vidThumb' || slot === 'imgThumb' || slot === 'audThumb'); // any “thumbnail” slot
        const picked = await pickAssetFromLibrary({ filter, brandId: __titles.openForBrand, idOnly });
        if (!picked) return;

        // normalize + attach to card
        const card = host.querySelector(`[data-slot-card="${slot}"]`);
        if (card) {
          card.setAttribute('data-asset-id', picked.assetId || '');
          card.setAttribute('data-url', picked.url || '');

          if (picked.shapes) {
            try { card.setAttribute('data-shapes', JSON.stringify(picked.shapes)); }
            catch { /* noop */ }
          } else {
            card.removeAttribute('data-shapes');
          }
        }

        // Decide which slot type this is
        const isVideoSlot = /^(vidPrimary|vidTrailer)$/.test(slot);
        const isThumbSlot = /Thumb$/.test(slot);

        // 1) Prefer whatever the picker already gave us
        let previewUrl =
          (isVideoSlot ? (picked.videoThumb || picked.thumb) : picked.thumb) ||
          '';

        let displayTitle = picked.title || picked.fileName || '';

        // 2) If missing (e.g., idOnly flow), enrich from the media cache WITHOUT touching pickers
        if (!previewUrl || !displayTitle) {
          try {
            const pv = await __tm_getPreviewFor(picked.assetId, { isVideoSlot, isThumbSlot });
            displayTitle = displayTitle || pv.title || String(picked.assetId);

            // For Thumbnail slot, ALWAYS prefer the exact thumbnail path from cache
            if (isThumbSlot) {
              previewUrl = pv.thumb || previewUrl || '';
            } else if (!previewUrl) {
              previewUrl = pv.thumb || '';
            }
          } catch {}
        }

        // 3) Absolute last-resort image fallback for images (keeps your old behavior)
        if (!previewUrl && !isVideoSlot) {
          try {
            const shapes = picked.shapes || {};
            previewUrl = shapes.landscape || shapes.standard || shapes.portrait || picked.url || '';
          } catch {}
        }

        // Render into the card (thumbnail + title)
        if (card) {
          const prevHost = card.querySelector('[data-preview]');
          prevHost.innerHTML = previewUrl
            ? `<img src="${escapeHtml(previewUrl)}" alt="" class="w-full h-24 object-cover rounded-md">`
            : `<div class="h-24 grid place-items-center text-[11px] text-gray-500">No preview</div>`;

          const meta = card.querySelector('[data-meta]');
          if (meta) meta.textContent = displayTitle || String(picked.assetId || '');
        }
      });
      btn.__tmBound = true;
    });
  }

  function pickerRow(label, slotId, type) {
    return `
      <div class="grid grid-cols-3 gap-3 items-start mb-2" data-slot-card="${slotId}" id="${slotId}">
        <div>
          <div class="text-sm text-gray-200">${escapeHtml(label)}</div>
          <div class="text-[11px] text-gray-500">(${escapeHtml(type)})</div>
        </div>
        <div class="col-span-2">
          <div class="rounded-md ring-1 ring-white/10 bg-gray-850 p-2">
            <div data-preview class="h-24 grid place-items-center text-[11px] text-gray-500">No selection</div>
            <div class="flex items-center justify-between mt-2">
              <div class="text-xs text-gray-300 truncate" data-meta></div>
              <button type="button" class="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600" data-pick data-slot="${slotId}" data-type="${type}">Pick</button>
            </div>
          </div>
        </div>
      </div>`;
  }

// Generic asset picker that ensures BOTH { assetId, url } from MediaAsset table.
async function pickAssetFromLibrary({ filter = 'image', brandId = null, idOnly = false } = {}) {
  const wanted = String(filter || 'image').toLowerCase();

  async function listAll() {
    if (window.api?.listMedia) {
      const r = await window.api.listMedia();
      return Array.isArray(r) ? r
           : Array.isArray(r?.items) ? r.items
           : Array.isArray(r?.data) ? r.data
           : Array.isArray(r?.results) ? r.results
           : [];
    }
    const base = (typeof MEDIALIBRARY_API === 'string' && MEDIALIBRARY_API) || '';
    if (!base) throw new Error('MEDIALIBRARY_API not set');
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
    const res = await fetch(`${base.replace(/\/$/,'')}/media`, {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json().catch(()=>[]);
    return Array.isArray(payload) ? payload
         : Array.isArray(payload?.items) ? payload.items
         : Array.isArray(payload?.data) ? payload.data
         : Array.isArray(payload?.results) ? payload.results
         : [];
  }

  function typeOf(it){ return (it.fileType || it.mediaType || '').toLowerCase(); }
  function filterItems(items){
    return items.filter(it => {
      const t = typeOf(it);
      if (!t) return false;
      if (wanted === 'image') return t.startsWith('image');
      if (wanted === 'video') return t.startsWith('video');
      if (wanted === 'audio') return t.startsWith('audio');
      return true;
    });
  }

  function safeKey(u){
    const s = String(u || '');
    if (!s) return '';
    try { const x = new URL(s); x.hash=''; x.search=''; return x.toString().replace(/\/+$/,''); }
    catch { return s.split('#')[0].split('?')[0].replace(/\/+$/,''); }
  }

  function buildUrlIndex(items){
    const map = new Map();
    items.forEach(it => {
      const mu   = it.mediaUrl || it.media_url || {};
      const prim = mu.primary || mu.main || mu.default || {};
      const vid  = mu.video?.primary || {};
      const img  = mu.image?.primary || mu.primary || {};
      const art  = img.artwork || mu.artwork || {};
      const th   = img.thumbnails || mu.thumbnails || it.thumbnails || {};
      const candidates = [
        it.url,
        (typeof vid.hls === 'string' ? vid.hls : vid.hls?.url), vid.master, vid.url,
        (typeof prim.hls === 'string' ? prim.hls : prim.hls?.url), prim.master, prim.url,
        art.landscape, art['16x9'], art.standard, art['1x1'], art.portrait, art['2x3'], art.default,
        img.url, img.src, img.href,
        th.landscape, th.standard, th.portrait, th.rendition3, th.rendition2, th.rendition1
      ];
      candidates.forEach(u => { if (u) map.set(safeKey(u), it); });
    });
    return map;
  }

  function buildIdIndex(items){
    const m = new Map();
    items.forEach(it => {
      const id = it.assetId || it.assetID || it.id || it._id || it.mediaId || it.fileId || it.key;
      if (id) m.set(String(id), it);
    });
    return m;
  }

  function normalizeFromItem(it){
    const assetId = it.assetId || it.id || it.mediaId || it.fileId || it.key || '';
    const mu = it.mediaUrl || it.media_url || {};

    // Detect type so we only change preview behavior for videos
    const mt = (it.mediaType || it.fileType || '').toLowerCase();
    const isVideo = mt.startsWith('video');

    // VIDEO playback URL (prefer HLS)
    const vpr = mu.video?.primary || {};
    const vh  = vpr.hls;
    const urlVideo =
      (typeof vh === 'string' ? vh : vh?.url) ||
      (typeof (mu?.primary?.hls) === 'string' ? mu.primary.hls : mu?.primary?.hls?.url) ||
      mu?.primary?.master || mu?.primary?.url || it.hls || it.url || '';

    // VIDEO THUMB (landscape still) — prefer rendition1; videos have NO artwork fallback here
    const vthumbs = vpr.thumbnails || {};
    const videoThumb =
      vthumbs.rendition1 ||
      vthumbs.landscape ||
      vthumbs.rendition2 ||
      vthumbs.rendition3 ||
      vthumbs.default ||
      '';

    // IMAGE shapes/preview (unchanged for images)
    const ipr = mu.image?.primary || mu.primary || {};
    const aw  = ipr.artwork || ipr.images || mu.artwork || {};
    const shapes = {
      landscape:     aw.landscape     || aw['16x9']     || aw.default || '',
      landscape_art: aw.landscape_art || aw['16x9_art'] || '',
      portrait:      aw.portrait      || aw['2x3']      || '',
      portrait_art:  aw.portrait_art  || aw['2x3_art']  || '',
      standard:      aw.standard      || aw['1x1']      || '',
      standard_art:  aw.standard_art  || aw['1x1_art']  || ''
    };
    Object.keys(shapes).forEach(k => { if (!shapes[k]) delete shapes[k]; });

    // Keep your existing image preview fallback
    const imagePreview = shapes.landscape || shapes.standard || shapes.portrait || it.url || '';

    // Build base (URL behavior unchanged)
    const out = {
      assetId: String(assetId || ''),
      url: urlVideo || imagePreview,
      // preview image:
      thumb: isVideo ? (videoThumb || '') : imagePreview,
      // include both labels so UI can choose best
      title: (it.title || it.fileName || ''),
      fileName: (it.fileName || it.title || '')
    };

    if (videoThumb) out.videoThumb = videoThumb;
    if (Object.keys(shapes).length) out.shapes = shapes;

    return out;
  }
  (globalThis || window).normalizeFromItem = normalizeFromItem;

  const all   = await listAll().catch(e => { console.warn('[TitleManager] list media failed', e); return []; });
  const items = filterItems(all);
  const byUrl = buildUrlIndex(items);
  const byId  = buildIdIndex(items);

  function resolveSelection(sel){
    if (Array.isArray(sel)) sel = sel[0];

    if (typeof sel === 'number' || (typeof sel === 'string' && /^\d+$/.test(sel.trim()))) {
      const idx = typeof sel === 'number' ? sel : (parseInt(sel,10) - 1);
      const it = items[idx];
      return it ? normalizeFromItem(it) : null;
    }
    if (typeof sel === 'string') {
      const found = byUrl.get(safeKey(sel));
      return found ? normalizeFromItem(found) : null;
    }

    const cand = (sel && typeof sel === 'object') ? (sel.item || sel) : null;
    if (!cand) return null;

    if (cand.assetId && (cand.url || idOnly)) {
      return { assetId: String(cand.assetId), ...(cand.url ? { url: String(cand.url) } : {}) };
    }

    const idOnlyValue = cand.assetId || cand.assetID || cand.id || cand._id || cand.mediaId || cand.fileId || cand.key;
    if (idOnlyValue) {
      const it = byId.get(String(idOnlyValue));
      return it ? normalizeFromItem(it) : { assetId: String(idOnlyValue) };
    }

    const looksLikeItem =
      cand.mediaUrl || cand.media_url || cand.hls || cand.thumbnails || cand.artwork || cand.fileType || cand.mediaType;
    if (looksLikeItem) {
      const n = normalizeFromItem(cand);
      if (n && n.assetId) return n;
    }

    const u = cand.url || cand.hls || cand.mediaUrl?.primary?.hls || cand.media_url?.primary?.hls ||
              cand.mediaUrl?.image?.primary?.url || cand.media_url?.image?.primary?.url;
    if (u) {
      const found = byUrl.get(safeKey(u));
      if (found) return normalizeFromItem(found);
    }

    return null;
  }

  if (window.MediaPicker && typeof window.MediaPicker.open === 'function') {
    return await new Promise((resolve) => {
      try {
        window.MediaPicker.open({
          title: wanted === 'video' ? 'Select Video' : wanted === 'audio' ? 'Select Audio' : 'Select Image',
          multi: false,
          allow: wanted,
          items,
          brandId,
          onSelect: (sel) => resolve(resolveSelection(sel))
        });
      } catch (e) {
        console.warn('[TitleManager] MediaPicker.open error; falling back to inline picker', e);
        fallbackInline(resolve);
      }
    });
  }

  return await new Promise((resolve) => fallbackInline(resolve));

  function fallbackInline(done){
    if (typeof window.showInlineMediaPicker === 'function') {
      try {
        window.showInlineMediaPicker(items, {
          title: wanted === 'video' ? 'Select Video' : wanted === 'audio' ? 'Select Audio' : 'Select Image',
          allow: wanted,
          idOnly,                                  // you already pass idOnly=true for thumb slots
          onPick: (sel) => done(resolveSelection(sel))
        });
        return;
      } catch (e2) { console.warn('[TitleManager] inline picker failed', e2); }
    }
    const names = items.map((i, idx) => `${idx+1}. ${(i.title || i.fileName || i.assetId || 'item')}`).join('\n');
    const pickIdx = prompt(`Pick a ${wanted} by number:\n\n${names}\n\nEnter #:`,'');
    const idx = Math.max(0, (parseInt(pickIdx,10)||0)-1);
    const chosen = items[idx];
    done(chosen ? normalizeFromItem(chosen) : null);
  }
}
})();


// =================== SAFE FOOTER (glue for the router) ======================
// Restore real getElementById once import finishes
document.getElementById = __brand_getById_orig;

let __brand_unbinders = [];

export async function init({ app }) {
  __brandApp = app;

  // Scope future getElementById to the section first
  const realGetById = document.getElementById.bind(document);
  document.getElementById = (id) =>
    (__brandApp && __brandApp.querySelector('#' + id)) || realGetById(id);

  // --- Rebind minimal essentials (form + modal close) ---
  const rebind = (el, type, handler) => {
    if (!el || !handler) return;
    el.addEventListener(type, handler);
    __brand_unbinders.push(() => el.removeEventListener(type, handler));
  };

  // Open "Create Brand"
  rebind(document.getElementById('btnCreateBrand'), 'click', () => toggleBrandModal(true));

  // Close actions (X / backdrop / any [data-close-brand-modal]) → central closer
  __brandApp.querySelectorAll('[data-close-brand-modal]').forEach((el) =>
    rebind(el, 'click', () => {
      if (typeof restoreCreateBrandUI === 'function') {
        restoreCreateBrandUI();
      } else {
        // fallback to prior behavior
        toggleBrandModal(false);
      }
    })
  );

  // Wizard close (Cancel buttons etc.) → central closer
  __brandApp.querySelectorAll('[data-close-wizard]').forEach((el) =>
    rebind(el, 'click', () => {
      if (typeof restoreCreateBrandUI === 'function') {
        restoreCreateBrandUI();
      } else {
        // fallback to prior behavior
        if (__brandEditor.open) toggleBrandEditor(false);
        else closeWizard();
      }
    })
  );

  // First load of list
  try { if (typeof loadBrands === 'function') loadBrands(); } catch {}

  // Delegate clicks within the section (menus/buttons already handled globally)
}

//This is Wherer teh old Media Management Overly code was//////////////


export function destroy() {
  __brand_unbinders.forEach((fn) => { try { fn(); } catch {} });
  __brand_unbinders = [];

  if (__brandApp) {
    document.getElementById = __brand_getById_orig;
  }
  __brandApp = null;
}
// ========================== END SAFE FOOTER =================================
