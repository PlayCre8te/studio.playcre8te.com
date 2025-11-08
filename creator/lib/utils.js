// /creator/lib/utils.js
export function slugify(s='') {
  return String(s).trim().toLowerCase()
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'-')
    .replace(/-+/g,'-').replace(/^-|-$/g,'');
}

export function detectFileType(fileName='') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (["mp4","mov"].includes(ext)) return "video";
  if (["mp3","wav","m4a"].includes(ext)) return "audio";
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "zip") return "zip";
  return "other";
}
