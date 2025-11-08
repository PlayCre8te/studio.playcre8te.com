// /js/auth-check.js
(function () {
  const token = localStorage.getItem('id_token');

  if (!token) {
    // 🔁 Redirect to home page if no token
    window.location.href = '/index.html';
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      console.warn("⏰ Token expired, clearing and redirecting");
      localStorage.removeItem('id_token');
      window.location.href = '/index.html';
    }
  } catch (err) {
    console.error("⚠️ Invalid token, clearing and redirecting");
    localStorage.removeItem('id_token');
    window.location.href = '/index.html';
  }
})();
