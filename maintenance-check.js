// maintenance-check.js — à inclure en <head> sur toutes les pages (sauf maintenance, maintenance-login, admin)
(async function () {
  const EXEMPT = ['/maintenance', '/maintenance-login', '/admin'];
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (EXEMPT.some(p => path === p || path.startsWith(p + '.'))) return;

  try {
    const r = await fetch('/api/admin/maintenance');
    if (!r.ok) return;
    const { maintenance } = await r.json();
    if (!maintenance) return;

    // Maintenance activée — vérifier si admin connecté
    const token = localStorage.getItem('token');
    if (token) {
      const check = await fetch('/api/admin/stats', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (check.ok) return; // admin → laisser passer
    }

    window.location.replace('/maintenance');
  } catch { /* erreur réseau → on laisse passer */ }
})();
