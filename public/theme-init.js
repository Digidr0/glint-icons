// Resolve before the application/styles load to avoid a light flash on reload.
(() => {
  let theme;
  try { theme = localStorage.getItem('icon-studio.theme'); } catch { /* Private/blocked storage. */ }
  if (theme !== 'light' && theme !== 'dark') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17181b' : '#f7f7f8');
})();
