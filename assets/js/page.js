/* Inner pages (legal, 404, card): nav state, mobile menu, footer year */
(() => {
  const $ = (s, el = document) => el.querySelector(s);

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  if (!nav || !toggle || !menu) return;

  const setMenu = open => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
