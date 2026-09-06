/* ==========================================================================
   Nexova Store — Admin session guard (client-side demo auth only)
   NOTE: This is a client-side check for demo/UX purposes only. It does NOT
   provide real security since anyone can read the page source. Do not use
   this pattern to protect sensitive data in a production application.
   ========================================================================== */

const ADMIN_SESSION_KEY = 'nexova_admin_session';

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

function requireAdminAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'login.html';
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.href = 'login.html';
}
