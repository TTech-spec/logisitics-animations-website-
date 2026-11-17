/* Shared by every page: smooth scroll, menu, cursor, page-to-page wipe. */
window.NL = (() => {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* smooth scroll */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = target => lenis ? lenis.scrollTo(target, { duration: 1.6 }) : $(target).scrollIntoView();

  /* menu */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  const menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: .8, ease: 'expo.inOut' })
    .from('.menu a span', { yPercent: 110, duration: .7, ease: 'expo.out', stagger: .05 }, .35);
  const setMenu = open => {
    menuBtn.setAttribute('aria-expanded', open); menu.setAttribute('aria-hidden', !open);
    $('span', menuBtn).textContent = open ? 'Close' : 'Menu';
    open ? menuTl.play() : menuTl.reverse();
    lenis && (open ? lenis.stop() : lenis.start());
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* page-to-page wipe */
  const wipe = $('#wipe'), root = document.documentElement;
  const reveal = () => {
    sessionStorage.removeItem('nlWipe');
    gsap.fromTo(wipe, { yPercent: 0 }, { yPercent: -100, duration: reduced ? 0 : .9, ease: 'expo.inOut', delay: .15, onComplete: () => root.classList.remove('arriving') });
  };
  if (root.classList.contains('arriving')) reveal();
  addEventListener('pageshow', e => { if (e.persisted) { gsap.set(wipe, { yPercent: 100 }); root.classList.remove('arriving'); lenis && lenis.start(); } });
  const leave = href => {
    sessionStorage.setItem('nlWipe', '1');
    lenis && lenis.stop();
    gsap.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, duration: reduced ? 0 : .8, ease: 'expo.inOut', onComplete: () => { location.href = href; } });
  };

  /* links: in-page anchors scroll smoothly, other pages get the wipe */
  $$('a[href]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    if (href.startsWith('#')) {
      if (href.length < 2 || !$(href)) return;
      e.preventDefault(); if (menu.contains(a)) setMenu(false); scrollTo(href);
    } else if (/^[\w./-]+\.html(#.*)?$/.test(href)) {
      e.preventDefault(); leave(href);
    }
  }));

  /* custom cursor (mouse only) */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    root.classList.add('has-cursor');
    const x = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), y = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    addEventListener('mousemove', e => { x(e.clientX); y(e.clientY); cur.classList.add('is-on'); });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    const hot = 'a,button,summary,.card,.grid div';
    document.addEventListener('mouseover', e => cur.classList.toggle('is-hot', !!e.target.closest(hot)));
    addEventListener('mousedown', () => cur.classList.add('is-down'));
    addEventListener('mouseup', () => cur.classList.remove('is-down'));
  }

  /* simple reveals for inner pages */
  $$('[data-rise]').forEach(el => gsap.from(el, { opacity: 0, y: 50, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));

  return { lenis, reduced, scrollTo };
})();
