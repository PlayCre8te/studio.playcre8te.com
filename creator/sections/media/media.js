// ==== SAFE HEADER (do not edit your working block below) =====================
let __app = null;
let __origGetById_forImport = document.getElementById.bind(document);
let __origAddEvent_forImport = null;

// Prevent immediate crashes during module import if elements aren’t in DOM yet.
// For the few top-level lines in your block that do:
// document.getElementById('...').addEventListener(...)
// we temporarily return a no-op stub so imports never throw.
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
    return __origGetById_forImport(id) || NOOP_EL;
  };
})();

// Provide globals your block expects if not already present
if (!globalThis.getAuthToken) {
  globalThis.getAuthToken = () =>
    localStorage.getItem('access_token') || localStorage.getItem('id_token') || '';
}
if (!globalThis.lazyObserver) {
  globalThis.lazyObserver = ('IntersectionObserver' in globalThis)
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset?.src;
            if (src) { img.src = src; img.removeAttribute('data-src'); }
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px', threshold: 0.01 })
    : { observe: el => { if (el?.dataset?.src) el.src = el.dataset.src; } };
}
if (typeof globalThis.MEDIALIBRARY_API === 'undefined') {
  globalThis.MEDIALIBRARY_API = 'https://rs30cqq30m.execute-api.us-east-2.amazonaws.com/prod';
}

if (typeof globalThis.BRAND_API === 'undefined') {
  globalThis.BRAND_API = 'https://bf8fc5jjb2.execute-api.us-east-2.amazonaws.com/prod';
}

// ---- Media Picker (passive shim; off by default) -------------------------
if (!globalThis.MediaPicker) {
  globalThis.MediaPicker = {
    active: false,              // set true by brand.js when user clicks "Choose Image"
    onPick: null,               // callback(payload) provided by brand.js
    brandId: null,              // who is picking
    slot: null,                 // 0,1,2 (hero index)
  };
}

// ---- small DOM helper (wait for #mediaGrid to exist) -----------------------
async function waitForEl(selector, { root = document, timeout = 3000 } = {}) {
  const start = Date.now();
  let el = root.querySelector(selector);
  if (el) return el;

  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      el = root.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
      else if (Date.now() - start > timeout) { obs.disconnect(); resolve(null); }
    });
    obs.observe(root.body || root, { childList: true, subtree: true });

    requestAnimationFrame(() => {
      el = root.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });

    setTimeout(() => { obs.disconnect(); resolve(root.querySelector(selector)); }, timeout);
  });
}


// Hide everything on entry; we will keep using your own show* functions for opening.
function forceHideAllMediaModals() {
  const hide = (el) => el && el.classList.add('hidden');
  hide(__origGetById_forImport('mediaInfoModal'));
  hide(__origGetById_forImport('mediaPlayerModal'));
  hide(__origGetById_forImport('imagePreviewModal'));
  __origGetById_forImport('videoContainer')?.classList.add('hidden');
  __origGetById_forImport('audioContainer')?.classList.add('hidden');
  __origGetById_forImport('videoThumbnailsContainer')?.classList.add('hidden');
}
// ============================================================================
// ==== YOUR WORKING BLOCK STARTS BELOW — DO NOT EDIT IT =======================

// --- SHIM: ensure a global showSection exists so your block can extend it ---
if (typeof globalThis.showSection !== 'function') {
  globalThis.showSection = function noopShowSection() {};
}

// Media Library Section JS Code (Beginging)
// Replace ONLY the function signature & the first "fetch items" block down to the point
// where you start filtering/sorting. Your rendering code below can stay the same.

async function listUploadedMedia(sortOrder = 'modified-desc', filterType = 'all', searchTerm = '') {
  const token = getAuthToken();
  if (!token) return;

  // --- helpers (local to this function) ---
  const normalizeType = (raw) => {
    const t = (raw || '').toLowerCase();
    if (!t) return '';
    // handle MIME-like types and synonyms
    if (t.startsWith('image')) return 'image';
    if (t.startsWith('video')) return 'video';
    if (t.startsWith('audio')) return 'audio';
    if (t.includes('pdf'))     return 'pdf';
    if (t.includes('zip'))     return 'zip';
    return t; // 'other' or backend-specific values
  };

  const unwrapItems = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  };

  // Optional pagination support for future (kept inert if API is non-paginated)
  async function fetchAllPages() {
    // Prefer api.js if present (it may already handle pagination)
    if (window.api?.listMedia) {
      const r = await window.api.listMedia();
      return unwrapItems(r);
    }

    // Minimal non-paginated fallback
    const res = await fetch(`${MEDIALIBRARY_API}/media`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("API response error:", await res.text());
      return [];
    }
    try {
      const json = await res.json();
      return unwrapItems(json);
    } catch {
      const txt = await res.text();
      try { return unwrapItems(JSON.parse(txt)); } catch { return []; }
    }
  }

  try {
    // ---- Fetch items (with graceful unwrapping) ----
    let items = await fetchAllPages();

    // ✅ Combined filter + search logic (and hide deleted)
    const search = (searchTerm || '').toLowerCase();
    const filteredItems = items.filter(item => {
      const typeRaw = item.fileType ?? item.mediaType ?? item.type ?? '';
      const type    = normalizeType(typeRaw);
      const title   = (item.title || item.fileName || '').toLowerCase();
      const status  = (item.status || '').toLowerCase();

      if (status === 'deleted') return false;

      const typeMatches =
        filterType === 'all' ||
        normalizeType(filterType) === type;

      const searchMatches = !search || title.includes(search);
      return typeMatches && searchMatches;
    });

    // (the rest of your existing sorting + render logic stays exactly the same)
    // ...


    // ✅ Sorting logic
    filteredItems.sort((a, b) => {
      const getTitle = (item) => (item.title || item.fileName || '').toLowerCase();
      const getCreated = (item) => new Date(item.createdAt || 0).getTime();
      const getModified = (item) => new Date(item.updatedAt || 0).getTime();
      const getSize = (item) => {
        const s = item.size ?? item.fileSize ?? item.bytes ?? 0;
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
      };

      switch (sortOrder) {
        case 'modified-asc': return getModified(a) - getModified(b);
        case 'modified-desc': return getModified(b) - getModified(a);
        case 'created-asc': return getCreated(a) - getCreated(b);
        case 'created-desc': return getCreated(b) - getCreated(a);
        case 'title-asc': return getTitle(a).localeCompare(getTitle(b));
        case 'title-desc': return getTitle(b).localeCompare(getTitle(a));
        case 'size-desc': return getSize(b) - getSize(a);
        case 'size-asc': return getSize(a) - getSize(b);
        default: return getModified(b) - getModified(a); // fallback
      }
    });

    // ✅ Ensure #mediaGrid exists before we touch it (prevents early null crash)
    const grid = await waitForEl('#mediaGrid', { timeout: 3000 });
    if (!grid) {
      console.warn('media.js: #mediaGrid not available yet; skipping render.');
      return;
    }

    grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4'; // ✅ Responsive columns
    grid.innerHTML = '';

    filteredItems.forEach(item => {
      const title = item.title || item.fileName || 'Untitled';
      const type = item.fileType || item.mediaType || 'unknown';
      const status = item.status || 'unknown';

      let thumbnailUrl = '';
      if (type === 'video') {
        const thumbs = item.mediaUrl?.video?.primary?.thumbnails;
        thumbnailUrl = thumbs?.rendition3 || thumbs?.rendition2 || thumbs?.rendition1 || '';
      } else if (type === 'image') {
        const artwork = item.mediaUrl?.artwork?.primary;
        thumbnailUrl = artwork?.standard || artwork?.landscape || artwork?.portrait || artwork?.standard_art || artwork?.landscape_art || artwork?.portrait_art || '';
      } else if (type === 'audio') {
        thumbnailUrl = '/icons/audio.PNG';
      }

      const card = document.createElement('div');
      card.className = 'flex flex-col bg-gray-800 p-3 rounded-xl shadow text-white overflow-hidden relative min-w-0'; // ✅ Flex + min-w-0

      const thumbnailContainer = document.createElement('div');
      thumbnailContainer.className = 'relative thumbnail-container';

      if (thumbnailUrl) {
        const spinner = document.createElement('div');
        spinner.className = 'absolute inset-0 flex items-center justify-center z-10 bg-gray-700 bg-opacity-60';
        spinner.innerHTML = `<div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

        const img = document.createElement('img');
        img.alt = title;
        img.className = 'rounded w-full h-40 object-cover mb-2 cursor-pointer relative z-0';
        img.setAttribute('data-src', thumbnailUrl);
        img.loading = 'lazy';
        lazyObserver.observe(img);

        img.addEventListener('load', () => {
          spinner.remove();
        });

        img.addEventListener('error', () => {
          spinner.innerHTML = `<span class="text-xs text-red-500">❌ Failed to load</span>`;
        });

        img.addEventListener('click', () => {
          if (type === 'image') showImagePreviewModal(item);
          else if (type === 'video' || type === 'audio') showMediaPlayer(item);
        });

        thumbnailContainer.appendChild(spinner);
        thumbnailContainer.appendChild(img);
        img.src = thumbnailUrl;
      } else {
        thumbnailContainer.innerHTML = `<div class="h-40 mb-2 flex items-center justify-center text-gray-500 italic bg-gray-700 rounded">Processing Content...</div>`;
      }

      card.innerHTML = `
        <div class="mb-2 text-blue-300 font-semibold text-center text-sm truncate">${title}</div> <!-- ✅ text-sm for no wrap -->
      `;
      card.appendChild(thumbnailContainer);

      const metaRow = document.createElement('div');
      metaRow.className = 'flex flex-wrap justify-between items-center gap-2 mt-2'; // ✅ flex-wrap + gap
      metaRow.innerHTML = `
        <div class="text-xs text-gray-400 whitespace-nowrap">Type: ${type}</div> <!-- ✅ no wrapping -->
        <div class="flex flex-row-reverse items-center gap-2 action-icons"></div>
      `;
      card.appendChild(metaRow);

      const statusRow = document.createElement('div');
      statusRow.className = `text-xs ${status === 'processed' ? 'text-green-400' : 'text-yellow-400'} whitespace-nowrap`; // ✅ no wrap
      statusRow.innerText = `Status: ${status}`;
      card.appendChild(statusRow);

      const actions = metaRow.querySelector('.action-icons');
      const iconData = [
        { src: "/icons/info.png", alt: "Info", click: () => showMediaInfo(item) },
        { src: "/icons/edit.png", alt: "Edit", click: () => openEditAssetModal(item) }, // ← wire it
        // { src: "/icons/folder.png", alt: "Folder" },
        { src: "/icons/brand.png", alt: "Brand" }
      ];

      if (type === 'image') {
        iconData.push({ src: "/icons/image.PNG", alt: "Preview", click: () => showImagePreviewModal(item) });
      }
      if (type === 'video' || type === 'audio') {
        iconData.push({ src: "/icons/play.PNG", alt: "Play", click: () => showMediaPlayer(item) });
      }

      iconData.forEach(({ src, alt, click }) => {
        const icon = document.createElement('img');
        icon.src = src;
        icon.alt = alt;
        icon.className = "w-5 h-5 sm:w-4 sm:h-4 cursor-pointer opacity-80 hover:opacity-100"; // ✅ responsive icon size
        if (typeof click === 'function') {
          icon.addEventListener('click', (e) => {
            e.stopPropagation();
            click();
          });
        }
        actions.appendChild(icon);
      });

      // If Brand Settings opened us in "picker" mode, show a big Select button for images
      const isPicker = !!(globalThis.MediaPicker && globalThis.MediaPicker.active);
      if (isPicker && type === 'image') {
        const selectBtn = document.createElement('button');
        selectBtn.className = 'px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500';
        selectBtn.textContent = 'Select';

        selectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            // Requirement: use ONLY the landscape variant from *primary* artwork
            const assetId = getAssetId(item);
            const url = item?.mediaUrl?.artwork?.primary?.landscape || '';

            if (!assetId || !url) {
              alert('⚠️ This image is missing the required primary.landscape URL.');
              return;
            }

            // Return selection to brand.js
            if (typeof globalThis.MediaPicker.onPick === 'function') {
              globalThis.MediaPicker.onPick({ assetId, url, slot: globalThis.MediaPicker.slot, brandId: globalThis.MediaPicker.brandId });
            }

            // Exit picker mode
            globalThis.MediaPicker.active = false;
            globalThis.MediaPicker.onPick  = null;

            // Jump back to the Brand Editor so the user sees their choice
            if (typeof openBrandEditorGuarded === 'function' && globalThis.MediaPicker.brandId) {
              openBrandEditorGuarded(globalThis.MediaPicker.brandId);
            } else if (typeof showSection === 'function') {
              showSection('brands');
            }
          } catch (err) {
            console.error('Picker select failed:', err);
            alert('❌ Could not select this image.');
          }
        });

        actions.appendChild(selectBtn);
      }

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Failed to list media:", err);
    alert("❌ Error listing media files.");
  }
}


// ✅ Preserve original showSection behavior
const originalShowSection = showSection;

// ✅ Extend to support sorting + filtering for Media Library
// ✅ Extend to support sorting + filtering for Media Library (with a tiny delay)
showSection = function (sectionId) {
  originalShowSection(sectionId);

  if (sectionId === 'media') {
    setTimeout(() => {
      const sortValue   = document.getElementById('mediaSort')?.value   || 'modified-desc';
      const filterValue = document.getElementById('mediaType')?.value   || 'all';
      const searchTerm  = document.getElementById('mediaSearch')?.value || '';
      listUploadedMedia(sortValue, filterValue, searchTerm);
    }, 0);
  }
};

// ✅ Modal display logic
function showMediaInfo(item) {
  const modal = document.getElementById('mediaInfoModal');
  const modalContent = document.getElementById('modalContent');

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const fields = [
    { label: 'File Name', value: item.fileName },
    { label: 'Created', value: formatDateTime(item.createdAt) },
    { label: 'Modified', value: formatDateTime(item.updatedAt) },
    { label: 'Size', value: formatBytes(item.size) },
    {
      label: 'Duration',
      value:
        item.fileType === 'video' || item.fileType === 'audio'
          ? formatDuration(item.duration)
          : null,
    },
  ];

  modalContent.innerHTML = fields
    .filter(f => f.value)
    .map(f => `<div><strong>${f.label}:</strong> ${f.value}</div>`)
    .join('');

  modal.classList.remove('hidden');
}

function showMediaPlayer(item) {
  const modal = document.getElementById('mediaPlayerModal');
  const videoContainer = document.getElementById('videoContainer');
  const audioContainer = document.getElementById('audioContainer');
  const video = document.getElementById('modalVideoPlayer');
  const audio = document.getElementById('modalAudioPlayer');
  const thumbnailsContainer = document.getElementById('videoThumbnailsContainer');
  const thumbnailsGrid = document.getElementById('videoThumbnailsGrid');

  // Reset all containers
  videoContainer.classList.add('hidden');
  audioContainer.classList.add('hidden');
  thumbnailsContainer.classList.add('hidden');
  thumbnailsGrid.innerHTML = '';

  // Pause & reset both players
  if (video.player) {
    video.player.pause();
    video.player.currentTime(0);
  }
  audio.pause();
  audio.currentTime = 0;

  const type = item.fileType || item.mediaType;
  let url = '';

  if (type === 'video') {
    url = item.mediaUrl?.video?.primary?.hls || item.mediaUrl?.video?.primary?.mp4;
  } else if (type === 'audio') {
    url = item.mediaUrl?.audio?.primary?.mp3 || item.mediaUrl?.audio?.primary?.hls;
  }

  if (!url) {
    alert('⚠️ No playable media found.');
    return;
  }

 
  if (type === 'video') {
  // Initially hide the container
  videoContainer.classList.add('invisible');

  // ✅ Always get an existing player (no re-init)
  video.player = videojs.getPlayer('modalVideoPlayer');

  if (!video.player) {
    console.error('❌ Video.js player not initialized yet!');
    alert('Video player is not ready.');
    return;
  }

  // ✅ Force dimensions early (for layout)
  video.player.dimensions(640, 360);

  // ✅ Set HLS or MP4 source
  video.player.src({
    src: url,
    type: url.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
  });

  // ✅ Suppress visual error flash
  video.player.on('error', function () {
    const err = video.player.error();
    if (err?.code === 4) {
      console.warn('⚠️ Ignoring transient MEDIA_ERR_SRC_NOT_SUPPORTED');
    }
  });

  // ✅ Show player only when ready
  video.player.ready(() => {
    video.player.play().catch(err => {
      console.warn('Video.js play error:', err);
    });

    // Show video player cleanly after small delay
    setTimeout(() => {
      videoContainer.classList.remove('invisible');
      videoContainer.classList.remove('hidden'); // Just in case
    }, 200); // Adjust if needed
  });

    // ✅ Populate and show only valid thumbnails
    const thumbs = item.mediaUrl?.video?.primary?.thumbnails || {};
    const thumbUrls = Object.values(thumbs);

    if (thumbUrls.length > 0) {
      let validFound = false;

      thumbUrls.forEach((thumbUrl) => {
        const img = new Image();
        img.src = thumbUrl;
        img.alt = 'Video Thumbnail';
        img.className = 'w-full rounded shadow';

        img.onload = () => {
          thumbnailsGrid.appendChild(img);
          if (!validFound) {
            thumbnailsContainer.classList.remove('hidden');
            validFound = true;
          }
        };

        img.onerror = () => {
          console.warn('❌ Skipping invalid thumbnail:', thumbUrl);
        };
      });
    }
  } else if (type === 'audio') {
    audioContainer.classList.remove('hidden');
    audio.setAttribute('type', url.endsWith('.m3u8') ? 'application/x-mpegURL' : 'audio/mpeg');
    audio.src = url;
    audio.play();
  }

  modal.classList.remove('hidden');
}


// ✅ Close buttons
document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('mediaInfoModal').classList.add('hidden');
});

document.getElementById('closePlayerBtn').addEventListener('click', () => {
  const modal = document.getElementById('mediaPlayerModal');
  const videoContainer = document.getElementById('videoContainer');
  const audioContainer = document.getElementById('audioContainer');
  const video = document.getElementById('modalVideoPlayer');
  const audio = document.getElementById('modalAudioPlayer');

  // Stop playback
  if (video.player) {
    video.player.pause();
    video.player.currentTime(0);
    video.player.src({ src: '', type: '' }); // clear source
  }

  audio.pause();
  audio.currentTime = 0;
  audio.src = '';

  // Hide containers
  videoContainer.classList.add('hidden');
  audioContainer.classList.add('hidden');

  // Hide modal
  modal.classList.add('hidden');
});


function showImagePreviewModal(item) {
  const modal = document.getElementById('imagePreviewModal');
  const grid = document.getElementById('imagePreviewGrid');
  grid.innerHTML = '';

  const artwork = item.mediaUrl?.artwork?.primary || {};
  const keys = ['landscape', 'portrait', 'standard', 'landscape_art', 'portrait_art', 'standard_art'];
  const urls = keys.map(k => artwork[k]).filter(url => url && url.startsWith('http'));

  if (urls.length === 0) {
    grid.innerHTML = `<div class="text-white text-center w-full">No images available.</div>`;
  } else {
    urls.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Artwork Preview';
      img.className = 'max-h-[70vh] max-w-full object-contain border rounded shadow';
      grid.appendChild(img);
    });
  }

  modal.classList.remove('hidden');
}

// ✅ Close image modal
document.getElementById('closeImageModalBtn').addEventListener('click', () => {
  document.getElementById('imagePreviewModal').classList.add('hidden');
});


// ✅ Edit Asset Modal Logic
/***** Edit Asset Modal: Rename + Tags + Delete *****/
let _editAsset = { assetId: null, originalItem: null, tags: [] };

function getAssetId(item) {
  // Prefer the field your API uses as the path param
  return item.assetId || item.id || item._id || item.key || item.s3Key;
}

// Accepts array or map -> returns array of strings
function parseTagsToArray(tagsField) {
  if (!tagsField) return [];
  if (Array.isArray(tagsField)) return tagsField.filter(Boolean).map(String);
  if (typeof tagsField === 'object') return Object.keys(tagsField);
  return [];
}

// Convert array -> DynamoDB Map format { tag: true }
function arrayToTagMap(arr) {
  const out = {};
  arr.forEach(t => { out[t] = true; });
  return out;
}

// Normalize + dedupe; keep simple, readable tokens
function sanitizeTag(tag) {
  return tag.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
}

function renderTagChips() {
  const wrap = document.getElementById('tagChips');
  const count = document.getElementById('tagCount');
  wrap.innerHTML = '';

  _editAsset.tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded';
    chip.innerHTML = `
      <span>#${tag}</span>
      <button class="text-gray-400 hover:text-white" aria-label="Remove tag">&times;</button>
    `;
    chip.querySelector('button').onclick = () => {
      _editAsset.tags = _editAsset.tags.filter(t => t !== tag);
      renderTagChips();
    };
    wrap.appendChild(chip);
  });

  count.textContent = `${_editAsset.tags.length} / 25`;
}

function addTagFromInput() {
  const input = document.getElementById('tagInput');
  const raw = input.value || '';
  let tag = sanitizeTag(raw);
  if (!tag) return;
  if (_editAsset.tags.length >= 25) {
    alert('You may add up to 25 tags.');
    return;
  }
  // prevent duplicates (case-insensitive handled by sanitizeTag)
  if (!_editAsset.tags.includes(tag)) {
    _editAsset.tags.push(tag);
    renderTagChips();
  }
  input.value = '';
}

function refreshMediaGrid() {
  const sortValue   = document.getElementById('mediaSort')?.value || 'modified-desc';
  const filterValue = document.getElementById('mediaType')?.value || 'all';
  const searchTerm  = document.getElementById('mediaSearch')?.value || '';
  listUploadedMedia(sortValue, filterValue, searchTerm);
}

async function patchAsset(assetId, body) {
  const idToken = localStorage.getItem('id_token');
  if (!idToken) throw new Error('No auth token');

  const res = await fetch(`${MEDIALIBRARY_API}/media/${encodeURIComponent(assetId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('PATCH failed:', res.status, text);
    throw new Error(`PATCH ${res.status}`);
  }
  try { return await res.json(); } catch { return {}; }
}

function openEditAssetModal(item) {
  const assetId = getAssetId(item);
  if (!assetId) {
    alert('⚠️ Could not identify assetId for this item.');
    return;
  }

  _editAsset.assetId = assetId;
  _editAsset.originalItem = item;
  _editAsset.tags = parseTagsToArray(item.tags);

  // Prefill file name
  const input = document.getElementById('editFileName');
  input.value = item.fileName || item.title || '';

  // Setup tags UI
  renderTagChips();
  const addBtn = document.getElementById('addTagBtn');
  const tagInput = document.getElementById('tagInput');
  addBtn.onclick = addTagFromInput;
  tagInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagFromInput();
    }
  };

  // Buttons
  document.getElementById('closeEditModalBtn').onclick = closeEditAssetModal;
  document.getElementById('cancelEditBtn').onclick = closeEditAssetModal;
  document.getElementById('saveEditBtn').onclick = handleSaveEdits;
  document.getElementById('deleteAssetBtn').onclick = handleDeleteAsset;

  // Show
  document.getElementById('editAssetModal').classList.remove('hidden');
}

function closeEditAssetModal() {
  document.getElementById('editAssetModal').classList.add('hidden');
  _editAsset = { assetId: null, originalItem: null, tags: [] };
}

async function handleSaveEdits() {
  const newName = (document.getElementById('editFileName').value || '').trim();
  const originalName = _editAsset.originalItem?.fileName || '';
  const origTags = parseTagsToArray(_editAsset.originalItem?.tags || []);
  const newTags = _editAsset.tags;

  // Figure out what changed
  const nameChanged = newName && newName !== originalName;
  const tagsChanged = JSON.stringify([...origTags].sort()) !== JSON.stringify([...newTags].sort());

  if (!nameChanged && !tagsChanged) {
    closeEditAssetModal();
    return;
  }

  const payload = { updatedAt: new Date().toISOString() };
  if (nameChanged) payload.fileName = newName;
  if (tagsChanged) payload.tags = newTags; // Array of strings ✅


  try {
    await patchAsset(_editAsset.assetId, payload);
    closeEditAssetModal();
    refreshMediaGrid();
    alert('✅ Asset updated.');
  } catch (err) {
    console.error('Save edits failed:', err);
    alert('❌ Failed to update asset.');
  }
}

/* ───────────────────────────────
 * STRICT asset usage verification (Option A) — UPDATED
 * Uses your existing client + endpoints:
 *  - Brands:   window.api.listBrandsByOwner(sub)  → GET {BRAND_API}/brand?owner=...
 *  - Catalog:  {BRAND_API}/catalog?brandId=...    (summary list of titles)
 *  - Catalog:  {BRAND_API}/catalog/{titleId}?brandId=... (detail per title)
 * Rules:
 *  - If ANY step cannot be verified, ABORT deletion (fail-safe).
 *  - Only availability.status === "deleted" permits asset deletion.
 *  - Asset checks are done ONLY on the DETAILED record.
 * ─────────────────────────────── */

(function attachStrictUsageGuard() {
  // ---------- helpers ----------
  function unwrapList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }
  function norm(x) { return String(x ?? '').trim(); }
  function titleIdOf(t) { return t?.titleId || t?.id || t?.key || t?.TitleId || t?.ID || null; }

  function bearerHeader() {
    try {
      const tok = (typeof getAuthToken === 'function') ? getAuthToken() : '';
      return tok ? { 'Authorization': 'Bearer ' + tok } : {};
    } catch { return {}; }
  }
  function brandBase() {
    const base = (window.BRAND_API || (typeof BRAND_API === 'string' && BRAND_API) || '').replace(/\/+$/, '');
    if (!base) throw new Error('BRAND_API base not available');
    return base;
  }
  function getSubFromIdToken() {
    try {
      const id = localStorage.getItem('id_token') || '';
      if (!id.includes('.')) return null;
      return JSON.parse(atob(id.split('.')[1] || ''))?.sub || null;
    } catch { return null; }
  }

  // ---------- A) list brands (uses your existing api.js client) ----------
  async function listAllBrandsStrict() {
    if (window.api && typeof window.api.listBrandsByOwner === 'function') {
      const sub = getSubFromIdToken();
      const res = await window.api.listBrandsByOwner(sub);
      const arr = unwrapList(res).map(b => ({
        brandId: norm(b.id || b.brandId || b.key || b._id),
        name:    norm(b.displayName || b.name || b.slug || b.title || 'Brand')
      })).filter(b => !!b.brandId);
      if (arr.length) return arr;
    }

    // last-chance: if Title Manager is open to a brand, at least check that one
    if (globalThis.__titles?.openForBrand) {
      return [{ brandId: norm(globalThis.__titles.openForBrand), name: 'Current Brand' }];
    }

    // in doubt → throw; caller will block deletion
    throw new Error('No brands discovered; cannot verify usage');
  }

  // ---------- B) brand’s title summaries ----------
  async function fetchTitleSummariesForBrand(brandId) {
    const url = `${brandBase()}/catalog?brandId=${encodeURIComponent(brandId)}`;
    const r = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { ...bearerHeader(), 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!r.ok) throw new Error(`catalog list ${r.status}`);
    return unwrapList(await r.json().catch(() => []));
  }

  // ---------- C) read title detail (strict) ----------
  async function fetchTitleDetail(brandId, titleId) {
    const url = `${brandBase()}/catalog/${encodeURIComponent(String(titleId))}?brandId=${encodeURIComponent(String(brandId))}`;
    const r = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { ...bearerHeader(), 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!r.ok) throw new Error(`catalog detail ${r.status}`);
    const doc = await r.json().catch(() => null);
    if (!doc || typeof doc !== 'object') throw new Error('catalog detail malformed');
    return doc;
  }

  // ---------- D) status & slot checks on DETAIL ----------
  function isDeleted(detail) {
    const s = String(detail?.availability?.status || detail?.status || '').toLowerCase();
    return s === 'deleted';
  }
  function detailHasStatus(detail) {
    return typeof detail?.availability?.status === 'string';
  }
  function detailUsesAsset(detail, assetId) {
    const A = norm(assetId);
    if (!A) return false;
    const m = detail?.media || {};

    // video
    const v = m.video;
    if (v) {
      if (norm(v?.primary?.assetId)   === A) return true;
      if (norm(v?.thumbnail?.assetId) === A) return true;
      if (norm(v?.trailer?.assetId)   === A) return true;
    }
    // image
    const i = m.image;
    if (i) {
      if (norm(i?.primary?.assetId)   === A) return true;
      if (norm(i?.thumbnail?.assetId) === A) return true;
    }
    // audio
    const a = m.audio;
    if (a) {
      if (norm(a?.primary?.assetId)   === A) return true;
      if (norm(a?.thumbnail?.assetId) === A) return true;
    }
    return false;
  }

  // ---------- E) scan all brands + all titles (strict; fail-safe) ----------
  async function findBlockingTitlesForAsset(assetId) {
    const blockers = [];
    const brands = await listAllBrandsStrict(); // throws → caller blocks delete

    for (const b of brands) {
      let summaries;
      try {
        summaries = await fetchTitleSummariesForBrand(b.brandId);
      } catch (_) {
        // fail-safe on list failure
        blockers.push({ brandId: b.brandId, brandName: b.name, reason: 'list-unavailable' });
        continue;
      }

      const ids = summaries.map(s => titleIdOf(s)).filter(Boolean);
      for (const tid of ids) {
        let detail;
        try {
          detail = await fetchTitleDetail(b.brandId, tid);
        } catch (_) {
          // fail-safe on detail failure
          blockers.push({ brandId: b.brandId, brandName: b.name, titleId: tid, reason: 'detail-unavailable' });
          continue;
        }

        // No status → fail-safe
        if (!detailHasStatus(detail)) {
          blockers.push({ brandId: b.brandId, brandName: b.name, titleId: tid, reason: 'no-status' });
          continue;
        }

        // In use & not deleted → blocker
        if (detailUsesAsset(detail, assetId) && !isDeleted(detail)) {
          blockers.push({
            brandId:  b.brandId,
            brandName:b.name,
            titleId:  String(tid),
            title:    norm(detail.title || detail.identity?.title || 'Untitled'),
            slot:     '(see media slots in detail)',
            reason:   'in-use'
          });
        }
      }
    }

    return blockers;
  }

  // ---------- F) public guard used by handleDeleteAsset ----------
  async function __ml_strictGuardBeforeDelete(assetId) {
    const blockers = await findBlockingTitlesForAsset(assetId);

    if (blockers.length) {
      const lines = blockers.map(b => {
        if (b.reason === 'in-use') {
          return `• ${b.brandName || b.brandId} — "${b.title || b.titleId}"`;
        }
        if (b.reason === 'no-status') {
          return `• ${b.brandName || b.brandId} — ${b.titleId || '(unknown)'} (missing availability.status)`;
        }
        if (b.reason === 'detail-unavailable') {
          return `• ${b.brandName || b.brandId} — ${b.titleId || '(unknown)'} (detail unavailable)`;
        }
        if (b.reason === 'list-unavailable') {
          return `• ${b.brandName || b.brandId} — (catalog list unavailable)`;
        }
        return `• ${b.brandName || b.brandId} — ${b.title || b.titleId || '(unknown)'}`;
      }).join('\n');

      const msg = [
        '🚫 This asset cannot be deleted because it’s referenced by one or more Titles (or could not be safely verified):',
        '',
        lines,
        '',
        //'Only Titles with availability.status="deleted" permit asset deletion.',
        'Please remove the asset from those Titles (or delete those Titles) and try again.'
      ].join('\n');

      const err = new Error(msg);
      err._blockers = blockers;
      throw err;
    }
    // otherwise OK
  }

  // expose
  globalThis.__ml_strictGuardBeforeDelete = __ml_strictGuardBeforeDelete;
})();

/* ===== Busy UI for strict delete checks (non-breaking, idempotent) ===== */
(function () {
  if (window.__mlBusyUIInstalled) return;
  window.__mlBusyUIInstalled = true;

  const OVERLAY_ID = 'mlStrictDeleteOverlay';
  const BTN_ID = 'deleteAssetBtn';

  function createOverlay(message) {
    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-live', 'polite');
    el.className = [
      'fixed inset-0 z-[99999]',
      'bg-black/55',
      'backdrop-blur-[1px]',
      'flex items-center justify-center',
      'pointer-events-auto'
    ].join(' ');

    el.innerHTML = `
      <div class="min-w-[280px] max-w-[90vw] rounded-xl bg-gray-900 text-gray-100 ring-1 ring-white/10 p-4 shadow-xl">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <div class="text-sm" id="mlStrictDeleteMsg">${message || 'Checking usage & permissions…'}</div>
        </div>
        <div class="mt-2 text-[11px] text-gray-400">
          This may take a moment while we verify titles across your brands.
        </div>
      </div>
    `;
    return el;
  }

  function setPageBusy(on) {
    try { document.body.setAttribute('aria-busy', on ? 'true' : 'false'); } catch {}
  }

  function freezePage(on) {
    // An overlay is enough for click-blocking; we also toggle body scrolling for nicer UX.
    try {
      if (on) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = '';
    } catch {}
  }

  function tweakDeleteBtn(starting) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    if (starting) {
      if (!btn.dataset.prevText) btn.dataset.prevText = btn.textContent || 'Delete';
      btn.textContent = 'Checking if asset can be deleted…';
      btn.disabled = true;
      btn.classList.add('opacity-60', 'cursor-not-allowed');
    } else {
      const prev = btn.dataset.prevText || 'Delete';
      btn.textContent = prev;
      btn.disabled = false;
      btn.classList.remove('opacity-60', 'cursor-not-allowed');
      delete btn.dataset.prevText;
    }
  }

  // Public API
  window.__ml_startStrictDeleteBusyUI = function (msg) {
    // button UX
    tweakDeleteBtn(true);

    // overlay
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = createOverlay(msg);
      document.body.appendChild(overlay);
    } else {
      const m = overlay.querySelector('#mlStrictDeleteMsg');
      if (m) m.textContent = msg || 'Checking usage & permissions…';
      overlay.classList.remove('hidden');
    }

    setPageBusy(true);
    freezePage(true);
  };

  window.__ml_endStrictDeleteBusyUI = function () {
    tweakDeleteBtn(false);
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    setPageBusy(false);
    freezePage(false);
  };
})();


async function handleDeleteAsset() {
  if (!confirm('Are you sure you want to delete this asset? This asset will be permanently deleted!')) return;

  const assetId = _editAsset?.assetId;
  if (!assetId) {
    alert('⚠️ Missing assetId.');
    return;
  }

  // Start busy UI with a clear message
  try { __ml_startStrictDeleteBusyUI?.('Checking if asset can be deleted…'); } catch {}

  try {
    // Strict usage guard (fail-safe)
    if (typeof __ml_strictGuardBeforeDelete !== 'function') {
      throw new Error('Usage guard is unavailable; aborting delete.');
    }
    await __ml_strictGuardBeforeDelete(assetId);

    // If guard passed → delete
    await patchAsset(assetId, {
      status: 'deleted',
      updatedAt: new Date().toISOString()
    });

    closeEditAssetModal();
    refreshMediaGrid();
    alert('🗑️ Asset Permanently Deleted.');
  } catch (err) {
    console.error('Strict asset usage verification failed; aborting delete:', err);
    const msg = (err && err.message)
      ? err.message
      : '🚫 This asset cannot be deleted (it’s in use or verification failed).';
    alert(msg);
  } finally {
    // Always end busy UI
    try { __ml_endStrictDeleteBusyUI?.(); } catch {}
  }
}



// ✅ Uppy Setup (fresh every time, performance tuned)
const uppy = new Uppy.Uppy({
  autoProceed: false,
  debug: true,
  restrictions: {
    allowedFileTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/zip']
  }
});

// Restriction alert (keeps your behavior)
uppy.on('restriction-failed', (file, error) => {
  alert(`❌ File not allowed: ${file?.name}\nReason: ${error?.message}`);
});

// 🧩 Upload sources
uppy.use(Uppy.Url, {
  companionUrl: 'https://companion.uppy.io', // replace with your Companion in prod
  // allowedHosts: ['*'],
});

uppy.use(Uppy.GoogleDrive, {
  companionUrl: 'https://companion.uppy.io', // replace with your Companion in prod
  // allowedHosts: ['*'],
});

uppy.use(Uppy.Dropbox, {
  companionUrl: 'https://companion.uppy.io', // replace with your Companion in prod
  // allowedHosts: ['*'],
});

uppy.use(Uppy.Webcam, {
  modes: ['picture', 'video-audio'],
  mirror: true,
  preferredFacingMode: 'environment',
  showVideoSourceDropdown: true
});

// 🖥️ Dashboard (modal)
uppy.use(Uppy.Dashboard, {
  inline: false,
  trigger: '#openUploader',
  closeAfterFinish: true, // we also programmatically close on complete
  showProgressDetails: true,
  proudlyDisplayPoweredByUppy: false,
  plugins: ['Url', 'Webcam']
});


// 🔄 Start clean on OPEN and CLOSE
const hardClear = () => {
  try {
    uppy.cancelAll(); // stop any inflight
    uppy.reset();     // reset state
    uppy.clear();     // clear file list
  } catch (_) {}
};
uppy.on('dashboard:modal-open', hardClear);
uppy.on('dashboard:modal-closed', hardClear);

// 🔎 Connection-aware base tuning
function pickTuning(size) {
  const conn = (navigator.connection && navigator.connection.effectiveType) || 'unknown';

  // Fast defaults
  let partSize = 32 * 1024 * 1024; // 32 MB
  let limit    = 12;               // 12 parallel parts

  // Slow networks → smaller parts & fewer in-flight requests
  if (conn === '3g' || conn === '2g' || conn === 'slow-2g') {
    partSize = 8 * 1024 * 1024;
    limit    = 3;
  } else if (conn === '4g') {
    // keep fast defaults
  }

  // Also adapt by file size
  if (size >= 2 * 1024 * 1024 * 1024) {       // ≥ 2 GB
    partSize = Math.max(partSize, 64 * 1024 * 1024); // 64 MB
    limit    = Math.min(limit, 12);
  } else if (size < 100 * 1024 * 1024) {      // < 100 MB
    partSize = Math.min(partSize, 8 * 1024 * 1024);  // 8 MB
    limit    = Math.min(limit, 6);
  }

  return { partSize, limit };
}

// ✅ Multipart for ALL files — fast defaults (will be overridden per-file)
uppy.use(Uppy.AwsS3Multipart, {
  partSize: 32 * 1024 * 1024,                  // default 32MB chunks
  limit: 12,                                   // default 12 parallel parts
  retryDelays: [0, 2000, 5000, 15000, 30000],  // resilient retries

  // 1) Start
  createMultipartUpload: async (file) => {
    console.time(`[${file.name}] total`);
    const idToken = localStorage.getItem('id_token');
    if (!idToken) throw new Error('Not authenticated');
    const creatorSub = JSON.parse(atob(idToken.split('.')[1]))?.sub;
    const fileType = file.meta?.fileType || detectFileType(file.name);

    const res = await fetch(`${MEDIALIBRARY_API}/media/multipart/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ filename: file.name, fileType, mimeType: file.type, creatorSub })
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('start failed:', res.status, t);
      throw new Error(`Start failed: ${res.status}`);
    }
    const json = await res.json();

    // Save assetId so we can PATCH after success
    if (json.assetId) {
      uppy.setFileMeta(file.id, { ...file.meta, assetId: json.assetId });
    }

    // Uppy expects these keys
    return { uploadId: json.uploadId || json.UploadId, key: json.s3Key || json.key };
  },

  // 2) Sign each part (ideally an s3-accelerate URL)
signPart: async (file, { uploadId, partNumber, key }) => {
  const idToken = localStorage.getItem('id_token');

  // ✅ Client-side guard: never send bad inputs
  const pn = Number(partNumber);
  if (!uploadId || !key || !Number.isFinite(pn) || pn < 1) {
    console.error('signPart invalid args:', { uploadId, partNumber, key });
    throw new Error('signPart: invalid uploadId/partNumber/key');
  }

  const payload = { uploadId, partNumber: pn, s3Key: key };
  let res;
  try {
    res = await fetch(`${MEDIALIBRARY_API}/media/multipart/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(payload)
    });
  } catch (netErr) {
    console.error('sign fetch failed (network):', netErr);
    throw new Error('Sign failed: network error');
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.error('sign failed:', res.status, t);
    // Surface server hint if present
    throw new Error(`Sign failed: ${res.status}${t ? ` ${t}` : ''}`);
  }

  let json;
  try {
    json = await res.json();
  } catch (parseErr) {
    console.error('sign: bad JSON', parseErr);
    throw new Error('Sign failed: invalid JSON');
  }

  const { signedUrl } = json || {};
  if (!signedUrl) {
    console.error('sign: response missing signedUrl', json);
    throw new Error('Sign failed: missing signedUrl');
  }

  // ⚠️ Diagnostic: verify acceleration host
  try {
    const host = new URL(signedUrl).host;
    if (!/s3-accelerate\.amazonaws\.com$/i.test(host)) {
      console.warn('Signed URL is NOT using S3 Transfer Acceleration:', host);
    }
  } catch {}

  return { url: signedUrl };
},

  // 3) Complete
  completeMultipartUpload: async (file, { uploadId, key, parts }) => {
    const idToken = localStorage.getItem('id_token');
    const assetId = file.meta?.assetId;
    const res = await fetch(`${MEDIALIBRARY_API}/media/multipart/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({
        uploadId,
        s3Key: key,
        parts: parts.map(p => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
        assetId
      })
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('complete failed:', res.status, t);
      throw new Error(`Complete failed: ${res.status}`);
    }
    return res.json().catch(() => ({}));
  },

  // (Optional) Abort
  abortMultipartUpload: async (file, { uploadId, key }) => {
    const idToken = localStorage.getItem('id_token');
    await fetch(`${MEDIALIBRARY_API}/media/multipart/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ uploadId, s3Key: key })
    });
  }
});

// ⚡ Per-file tuning + adaptive throughput control
uppy.on('file-added', (file) => {
  const { partSize, limit } = pickTuning(file.size || 0);
  const s3mp = uppy.getPlugin('AwsS3Multipart');
  if (s3mp) s3mp.setOptions({ partSize, limit });

  // Speedometer
  file.__t0 = Date.now();
  file.__lastTs = file.__t0;
  file.__loadedPrev = 0;
  file.__emaMbps = 0;      // exponential moving average Mbps
  file.__adapted = false;  // mark if we already adapted up/down
});

uppy.on('upload-progress', (file, progress) => {
  if (!progress || !progress.bytesUploaded) return;
  const now = Date.now();
  const dt  = (now - (file.__lastTs || file.__t0)) / 1000;
  const dB  = progress.bytesUploaded - (file.__loadedPrev || 0);

  if (dt > 0 && dB >= 0) {
    const instMbps = (dB * 8) / (dt * 1024 * 1024);
    file.__emaMbps = file.__emaMbps ? (0.7 * file.__emaMbps + 0.3 * instMbps) : instMbps;

    // Log current estimates
    const s3mp = uppy.getPlugin('AwsS3Multipart');
    if (s3mp) {
      const ps = (s3mp.opts.partSize / 1024 / 1024) | 0;
      const lm = s3mp.opts.limit;
      console.debug(`[${file.name}] ~${file.__emaMbps.toFixed(2)} Mbps (partSize=${ps}MB limit=${lm})`);
    }

    // After ~10s, adapt settings for remaining parts (one-time)
    const elapsed = (now - file.__t0) / 1000;
    if (!file.__adapted && elapsed > 10) {
      const s3mp = uppy.getPlugin('AwsS3Multipart');
      if (s3mp) {
        if (file.__emaMbps < 2) {
          // Slow link → smaller parts, fewer parallel requests
          s3mp.setOptions({ partSize: 8 * 1024 * 1024, limit: 3 });
          console.warn(`[${file.name}] Adapting DOWN: 8MB parts, limit=3 (EMA ~${file.__emaMbps.toFixed(2)} Mbps)`);
          file.__adapted = true;
        } else if (file.__emaMbps > 40) {
          // Fast link → push harder (cap at safe values)
          s3mp.setOptions({ partSize: Math.max(s3mp.opts.partSize, 64 * 1024 * 1024), limit: Math.min(12, s3mp.opts.limit) });
          console.warn(`[${file.name}] Adapting UP: 64MB parts, limit=12 (EMA ~${file.__emaMbps.toFixed(2)} Mbps)`);
          file.__adapted = true;
        }
      }
    }
  }

  file.__lastTs = now;
  file.__loadedPrev = progress.bytesUploaded;
});

// 🟢 After each file finishes: finalize (your logic)
uppy.on('upload-success', async (file) => {
  try {
    const idToken = localStorage.getItem('id_token');
    const assetId = file.meta?.assetId;
    if (idToken && assetId) {
      await markAsUploaded(assetId, idToken);
    } else {
      console.warn('Missing idToken or assetId; skipping finalize');
    }
  } catch (e) {
    console.error('markAsUploaded failed:', e);
    uppy.info('Uploaded, but finalize failed—please retry finalize.', 'error', 8000);
  } finally {
    console.timeEnd(`[${file.name}] total`);
  }
});

// ✅ When ALL files complete: notify, refresh, auto-close, hard reset (your UX)
uppy.on('complete', () => {
  alert('✅ All uploads complete. Processing has begun.');
  if (typeof listUploadedMedia === 'function') listUploadedMedia();

  const dashboard = uppy.getPlugin('Dashboard');
  setTimeout(() => {
    try {
      if (dashboard && typeof dashboard.closeModal === 'function') dashboard.closeModal();
    } finally {
      hardClear();
    }
  }, 0);
});

// ─────────────────────────────────────────────────────────────
// Helpers (unchanged)
// ─────────────────────────────────────────────────────────────
function detectFileType(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (["mp4", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "zip") return "zip";
  return "other";
}

async function markAsUploaded(assetId, idToken) {
  const body = JSON.stringify({ assetId, uploaded: true });
  try {
    const res = await fetch(`${MEDIALIBRARY_API}/media/upload/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Failed to mark as uploaded: ${res.status}`);
    return text;
  } catch (err) {
    console.error("❌ [markAsUploaded] Upload failed:", err);
    throw err;
  }
}

    document.addEventListener('DOMContentLoaded', () => {
      videojs('modalVideoPlayer');

      const sortDropdown = document.getElementById('mediaSort');
      const filterDropdown = document.getElementById('mediaType');
      const searchInput = document.getElementById('mediaSearch');

      function debounce(func, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
        };
      }

      const refreshMediaGrid = () => {
        const sortValue = sortDropdown?.value || 'modified-desc';
        const filterValue = filterDropdown?.value || 'all';
        const searchTerm = searchInput?.value || '';
        listUploadedMedia(sortValue, filterValue, searchTerm);
      };

      if (sortDropdown) sortDropdown.addEventListener('change', refreshMediaGrid);
      if (filterDropdown) filterDropdown.addEventListener('change', refreshMediaGrid);
      if (searchInput) searchInput.addEventListener('input', debounce(refreshMediaGrid, 250));
    });

// Media Library Code Ending

// ==== SAFE FOOTER (glue for the new router) =================================
// Restore the real getElementById now that the file has finished importing.
document.getElementById = __origGetById_forImport;

// We’ll attach section-scoped wiring in init(), without touching your block.
let __unbinders = [];
let __videoPlayer = null;

export async function init({ app }) {
  __app = app;

  // Prefer section-local elements for subsequent calls coming from your block
  const realGetById = document.getElementById.bind(document);
  document.getElementById = (id) => (__app && __app.querySelector('#' + id)) || realGetById(id);

  // Keep modals closed on entry
  forceHideAllMediaModals();

  // Make sure video.js has a player for the modal (does NOT open the modal)
  try {
    if (globalThis.videojs && __app?.querySelector('#modalVideoPlayer')) {
      __videoPlayer = videojs.getPlayer?.('modalVideoPlayer') || videojs('modalVideoPlayer');
    }
  } catch {}

  // Wire sort/filter/search (mirrors your DOMContentLoaded block)
  const sortDropdown   = document.getElementById('mediaSort');
  const filterDropdown = document.getElementById('mediaType');
  const searchInput    = document.getElementById('mediaSearch');

  const debounce = (fn, delay=250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),delay);} };
  const refresh = () => {
    const sortValue = sortDropdown?.value || 'modified-desc';
    const filterValue = filterDropdown?.value || 'all';
    const searchTerm = searchInput?.value || '';
    // Call your original function unchanged
    try { listUploadedMedia(sortValue, filterValue, searchTerm); } catch(e){ console.error(e); }
  };

  if (sortDropdown) {
    sortDropdown.addEventListener('change', refresh);
    __unbinders.push(() => sortDropdown.removeEventListener('change', refresh));
  }
  if (filterDropdown) {
    filterDropdown.addEventListener('change', refresh);
    __unbinders.push(() => filterDropdown.removeEventListener('change', refresh));
  }
  if (searchInput) {
    const h = debounce(refresh, 250);
    searchInput.addEventListener('input', h);
    __unbinders.push(() => searchInput.removeEventListener('input', h));
  }

  // Rebind the close buttons (your block added them at import time; if elements
  // didn’t exist then, those were no-ops — so bind them for real now)
  {
    const btn = document.getElementById('closeModalBtn');
    if (btn) {
      const onClick = () => document.getElementById('mediaInfoModal')?.classList.add('hidden');
      btn.addEventListener('click', onClick);
      __unbinders.push(() => btn.removeEventListener('click', onClick));
    }
  }
  {
    const btn = document.getElementById('closePlayerBtn');
    if (btn) {
      const onClick = () => {
        const modal = document.getElementById('mediaPlayerModal');
        const videoContainer = document.getElementById('videoContainer');
        const audioContainer = document.getElementById('audioContainer');
        const audio = document.getElementById('modalAudioPlayer');
        try { __videoPlayer?.pause?.(); __videoPlayer?.currentTime?.(0); __videoPlayer?.src?.({ src: '', type: '' }); } catch {}
        if (audio) { audio.pause(); audio.currentTime = 0; audio.src = ''; }
        videoContainer?.classList.add('hidden');
        audioContainer?.classList.add('hidden');
        modal?.classList.add('hidden');
      };
      btn.addEventListener('click', onClick);
      __unbinders.push(() => btn.removeEventListener('click', onClick));
    }
  }
  {
    const btn = document.getElementById('closeImageModalBtn');
    if (btn) {
      const onClick = () => document.getElementById('imagePreviewModal')?.classList.add('hidden');
      btn.addEventListener('click', onClick);
      __unbinders.push(() => btn.removeEventListener('click', onClick));
    }
  }

  // First load
  refresh();
}

export function destroy() {
  // Unbind everything we attached in init()
  __unbinders.forEach(fn => { try { fn(); } catch {} });
  __unbinders = [];

  // Dispose video.js player for this section
  try { __videoPlayer?.dispose?.(); } catch {}
  __videoPlayer = null;

  // Restore the global getElementById
  if (__app) {
    document.getElementById = __origGetById_forImport;
  }
  __app = null;
}
// ==== END SAFE FOOTER ========================================================
