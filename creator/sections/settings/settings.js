// /creator/sections/settings/settings.js
import { api } from '../../lib/api.js';
import { logout } from '../../lib/auth.js';

let cleanup = [];

export async function init({ app }) {
  const saveBtn = app.querySelector('#saveBioBtn');
  const uploadBtn = app.querySelector('#uploadAvatarBtn');
  const logoutBtn = app.querySelector('#settingsLogoutBtn');

  saveBtn?.addEventListener('click', () => saveCreatorBio(app));
  uploadBtn?.addEventListener('click', () => uploadAvatar(app));
  logoutBtn?.addEventListener('click', logout);
  cleanup.push(() => {
    saveBtn?.removeEventListener('click', () => {});
    uploadBtn?.removeEventListener('click', () => {});
    logoutBtn?.removeEventListener('click', logout);
  });

  await fetchUserInfo(app);
}

export function destroy() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}

async function fetchUserInfo(app) {
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return;
  try {
    const data = await api.userInfo(idToken);
    app.querySelector('#displayName').textContent = data.displayName || 'N/A';
    app.querySelector('#email').textContent = data.email || 'N/A';
    app.querySelector('#mode').textContent = data.mode || 'N/A';

    if (data.creatorAvatar?.hd) {
      const avatarHD = app.querySelector('#avatarHD');
      avatarHD.src = data.creatorAvatar.hd;
      avatarHD.classList.remove('hidden');
    }
    if (data.creatorbio) {
      const bioInput = app.querySelector('#creatorBioInput');
      bioInput.value = data.creatorbio;
    }
  } catch (e) { console.error('UserInfo error:', e); }
}

async function saveCreatorBio(app) {
  const bio = app.querySelector('#creatorBioInput').value;
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return alert("Not authenticated");
  try {
    await api.updateBio(idToken, bio);
    const msg = app.querySelector('#bioSavedMessage');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  } catch (e) { console.error('Bio save failed', e); alert('❌ Failed to save bio.'); }
}

async function uploadAvatar(app) {
  const file = app.querySelector('#avatarInput').files[0];
  const idToken = localStorage.getItem('id_token');
  if (!file || !idToken) return alert("Please select an image and be authenticated.");
  try {
    const { uploadUrl, key } = await api.getAvatarUploadUrl(idToken);
    await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    await api.processAvatar(idToken, key);
    alert("✅ Upload successful! Your avatar will refresh shortly.");
    location.reload();
  } catch (e) { console.error('Avatar upload failed', e); alert("❌ Something went wrong during upload."); }
}
