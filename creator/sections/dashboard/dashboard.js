// /creator/sections/dashboard/dashboard.js
let cleanup = [];

export async function init({ app }) {
  // rotating notification bar preserved from your code
  const notifications = [
    "🚀 Welcome to your Creator Dashboard!",
    "📈 You gained 12 new fans this week.",
    "💰 Your revenue is up 18% this month.",
    "🎨 Customize your brand theme for a fresh look!",
    "📤 Don’t forget to upload your latest content."
  ];

  const bar = app.querySelector('#notificationBar');
  if (!bar) return;

  let index = 0;
  function rotateNotification() {
    bar.style.opacity = 0;
    setTimeout(() => {
      bar.textContent = notifications[index];
      bar.style.opacity = 1;
      index = (index + 1) % notifications.length;
    }, 400);
  }

  rotateNotification();
  const interval = setInterval(rotateNotification, 7000);
  cleanup.push(() => clearInterval(interval));
}

export function destroy() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}
