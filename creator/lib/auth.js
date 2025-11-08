// /creator/lib/auth.js

// --- Capture tokens from URL (search OR hash), persist, then clean URL ---
export function captureTokensFromUrl() {
  const url = new URL(window.location.href);

  // Read param from ?search or #hash (some IdPs use hash)
  const readParam = (name) => {
    const fromSearch = url.searchParams.get(name);
    if (fromSearch) return fromSearch;
    if (url.hash && url.hash.startsWith('#')) {
      const hp = new URLSearchParams(url.hash.slice(1));
      return hp.get(name);
    }
    return null;
  };

  const idToken = readParam("id_token");
  const accessToken = readParam("access_token");
  const tokenType = readParam("token_type") || "Bearer";

  // Persist if present
  try {
    if (idToken) localStorage.setItem("id_token", idToken);
    if (accessToken) localStorage.setItem("access_token", accessToken);
    if (idToken || accessToken) localStorage.setItem("token_type", tokenType);
  } catch (e) {
    console.warn("Token storage failed:", e);
  }

  // Clean token params from both search and hash
  if (idToken || accessToken) {
    try {
      ["id_token", "access_token", "token_type", "expires_in", "state"].forEach((k) => {
        url.searchParams.delete(k);
      });

      if (url.hash) {
        const hp = new URLSearchParams(url.hash.slice(1));
        ["id_token", "access_token", "token_type", "expires_in", "state"].forEach((k) => hp.delete(k));
        url.hash = hp.toString() ? "#" + hp.toString() : "";
      }

      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      console.warn("Failed to clean URL params:", e);
    }
  }
}

export function getAuthToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("id_token") || "";
}

export function getUserSub() {
  const idToken = localStorage.getItem("id_token");
  if (!idToken) return null;
  try {
    return JSON.parse(atob(idToken.split(".")[1]))?.sub || null;
  } catch {
    return null;
  }
}

// Optional helper if you need raw id_token specifically
export function getIdToken() {
  return localStorage.getItem("id_token") || "";
}

// Call this at top of protected pages (or just import and rely on it)
export async function ensureAuth() {
  // Auto-capture tokens from the URL before checking
  captureTokensFromUrl();

  const token = getAuthToken();
  if (!token) {
    // Keep your current behavior: send to /index.html
    window.location.href = "/index.html";
    throw new Error("Not signed in");
  }
  return token;
}

export function logout() {
  try {
    localStorage.removeItem("id_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
  } catch {}
  // Clear cookie variant if you set it elsewhere
  document.cookie = "id_token=; Max-Age=0; path=/; domain=.playcre8te.com";
  window.location.href = "/index.html";
}

export function authHeader() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
