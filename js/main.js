/* Northlane Freight — scroll film. GSAP + ScrollTrigger + Lenis, no build step. */
(() => {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { lenis, reduced } = window.NL;
  const skipLoader = reduced || /noloader/.test(location.search) || document.documentElement.classList.contains('arriving');

  /* ---------- dotted world map ---------- */
  const MAP = [
    '                                                                ',
    '        ####  ######          ##     ########################## ',
    '   ############ ####        ####  ############################# ',
    '   ###########   ##        ###### ###########################   ',
    '    ##########             ##### ##########################     ',
    '     ########              #### ##########################      ',
    '      ######               ###############  ##########  #       ',
    '       ####                 ############     #######            ',
    '        ###                 ###########       ####  #           ',
    '         ####               ##########         ##   ##          ',
    '          #####              ########           #    ###        ',
    '          #######             ######                  ## #      ',
    '          #######             #####                  ########   ',
    '           ######             ####                  ##########  ',
    '           #####              ###                   ##########  ',
    '           ####               ##                     ###  ###   ',
    '           ###                                             ##   ',
    '           ##                                                   ',
    '                                                                ',
    '                                                                '
  ];
  const HUBS = [[57, 14], [61, 16], [51, 9], [50, 8], [49, 10], [7, 6], [48, 10], [31, 3], [29, 3]];
  function drawMap(cv) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = w * 20 / 64;
    if (!w) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d'), step = cv.width / 64, r = step * 0.27;
    MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '#') return;
      const hub = HUBS.some(([hx, hy]) => hx === x && hy === y);
      ctx.fillStyle = hub ? cv.dataset.accent : cv.dataset.color;
      ctx.beginPath(); ctx.arc((x + .5) * step, (y + .5) * step, hub ? r * 1.5 : r, 0, 7); ctx.fill();
    }));
  }
  const maps = $$('[data-dotmap]');
  const drawMaps = () => maps.forEach(drawMap);
  drawMaps();

  /* ---------- text helpers ---------- */
  $$('[data-fill]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    gsap.fromTo($$('.w', el), { opacity: .16 }, {
      opacity: 1, stagger: .12, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 38%', scrub: .4 }
    });
  });
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), sep = 'sep' in el.dataset, o = { v: end * .55 };
    const put = () => { el.textContent = sep ? Math.round(o.v).toLocaleString('en-US') : o.v.toFixed(dec); };
    put();
    gsap.to(o, { v: end, ease: 'none', onUpdate: put, scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: .5 } });
  });

  /* ---------- hero ---------- */
  const heroLines = $$('.hero [data-lines] .line > span');
  gsap.set(heroLines, { yPercent: 110 });
  gsap.set(['.hero .eyebrow', '.hero__lede', '.hero__cta'], { opacity: 0, y: 24 });
  const heroIn = () => gsap.timeline()
    .to(heroLines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .12 })
    .to(['.hero .eyebrow', '.hero__lede', '.hero__cta'], { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .1 }, .35)
    .from('#globe', { opacity: 0, duration: 2, ease: 'power2.out' }, 0);
  gsap.to('.hero__inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '70% top', scrub: true } });

  /* ---------- hero: rotating dotted 3D globe ---------- */
  (() => {
    const cv = $('#globe'), ctx = cv.getContext('2d'), RAD = Math.PI / 180;
    const ember = '#ff7a1a', brand = '#2a45ff', glow = '#7f93ff', paper = '#fff', ink = '#0b0c10';
    const MARKERS = [['UK', 54, -2], ['Germany', 51, 10], ['Spain', 40, -4], ['Italy', 42, 12.5], ['Turkey', 39, 35], ['Egypt', 26, 30], ['Qatar', 25.3, 51.2],
      ['Kenya', 0, 38], ['South Africa', -30, 25], ['USA', 39, -98], ['Canada', 56, -106], ['Mexico', 23, -102], ['Brazil', -10, -52], ['Chile', -33, -71],
      ['Japan', 36, 138], ['Hong Kong', 22.3, 114], ['Thailand', 15, 101], ['Singapore', 1.3, 103.8], ['Australia', -25, 134], ['New Zealand', -41, 174], ['China', 35, 104]];
    const hub = MARKERS.find(k => k[0] === 'Hong Kong'), routes = MARKERS.filter(k => ['UK', 'Germany', 'Spain', 'Italy', 'Turkey', 'Egypt'].includes(k[0]));
    let land = [], rot = 22, drag = null, w = 0, h = 0, dpr = 1, live = true;
    const tilt = 18 * RAD;

    const img = new Image(); img.src = 'assets/uc/map.png';
    img.onload = () => {
      const off = document.createElement('canvas'); off.width = img.width; off.height = img.height;
      const o = off.getContext('2d'); o.drawImage(img, 0, 0);
      const data = o.getImageData(0, 0, img.width, img.height).data;
      const hit = (x, y) => { for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        const px = Math.min(img.width - 1, Math.max(0, x + dx)), py = Math.min(img.height - 1, Math.max(0, y + dy));
        if (data[(py * img.width + px) * 4 + 3] > 40) return true; } return false; };
      for (let lat = -56; lat <= 82; lat += 1.15) { const step = 1.15 / Math.max(.25, Math.cos(lat * RAD));
        for (let lon = -180; lon < 180; lon += step) if (hit(Math.round((lon + 180) / 360 * img.width), Math.round((83 - lat) / 140 * img.height))) land.push([lat, lon]); }
    };
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; };
    resize(); addEventListener('resize', resize);
    const project = (lat, lon, R, cx, cy, alt = 1) => {
      const la = lat * RAD, lo = (lon - rot) * RAD, x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
      return { x: cx + R * x * alt, y: cy - R * (y * Math.cos(tilt) - z * Math.sin(tilt)) * alt, z: y * Math.sin(tilt) + z * Math.cos(tilt) };
    };
    const circle = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); };
    const draw = () => {
      if (!live) return;
      if (!drag && !reduced) rot += .025;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const mob = w < 768, R = mob ? w * .62 : Math.min(h * .52, w * .36), cx = mob ? w * .72 : w * .86, cy = mob ? h * .32 : h * .52;
      const halo = ctx.createRadialGradient(cx, cy, R * .92, cx, cy, R * 1.25); halo.addColorStop(0, brand); halo.addColorStop(1, 'transparent');
      ctx.save(); ctx.globalAlpha = .55; ctx.fillStyle = halo; circle(cx, cy, R * 1.25); ctx.fill(); ctx.restore();
      const rim = ctx.createLinearGradient(cx - R * .6, cy - R, cx + R * .3, cy + R);
      rim.addColorStop(0, ember); rim.addColorStop(.35, ember); rim.addColorStop(.55, glow); rim.addColorStop(1, brand);
      ctx.save(); ctx.filter = 'blur(18px)'; ctx.strokeStyle = rim; ctx.lineWidth = 26; circle(cx, cy, R); ctx.stroke(); ctx.restore();
      ctx.fillStyle = ink; circle(cx, cy, R); ctx.fill();
      const inner = ctx.createRadialGradient(cx - R * .2, cy + R * .3, R * .6, cx, cy, R); inner.addColorStop(0, 'transparent'); inner.addColorStop(1, brand);
      ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = inner; circle(cx, cy, R); ctx.fill(); ctx.restore();
      ctx.save(); ctx.strokeStyle = rim; ctx.lineWidth = 2.5; ctx.filter = 'blur(1.5px)'; circle(cx, cy, R); ctx.stroke(); ctx.restore();
      ctx.fillStyle = paper;
      for (const [lat, lon] of land) { const s = project(lat, lon, R, cx, cy); if (s.z <= 0) continue;
        ctx.globalAlpha = .25 + .75 * s.z; const z = 1.1 + .6 * s.z; ctx.fillRect(s.x, s.y, z, z); }
      ctx.globalAlpha = .7; ctx.strokeStyle = ember; ctx.lineWidth = 1.2;
      for (const r of routes) { ctx.beginPath(); let on = false;
        for (let i = 0; i <= 40; i++) { const t = i / 40, s = project(hub[1] + (r[1] - hub[1]) * t, hub[2] + (r[2] - hub[2]) * t, R, cx, cy, 1 + .12 * Math.sin(Math.PI * t));
          if (s.z < -.05) { on = false; continue; } on ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); on = true; }
        ctx.stroke(); }
      ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle';
      for (const [label, lat, lon] of MARKERS) { const s = project(lat, lon, R, cx, cy);
        if (s.z <= .08 || s.x < (mob ? 0 : w * .6) || s.x > w - 40 || s.y < 60 || s.y > h) continue;
        ctx.globalAlpha = Math.min(1, s.z * 2);
        ctx.save(); ctx.shadowColor = ember; ctx.shadowBlur = 10; ctx.fillStyle = ember; circle(s.x, s.y, 3.2); ctx.fill(); ctx.restore();
        const text = label.toUpperCase(), tw = ctx.measureText(text).width + 12;
        ctx.fillStyle = ink; ctx.fillRect(s.x - tw / 2, s.y - 28, tw, 18); ctx.fillStyle = paper; ctx.fillText(text, s.x - tw / 2 + 6, s.y - 18.5); }
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(draw);
    new IntersectionObserver(e => { live = e[0].isIntersecting; }).observe(cv);
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, rot }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (drag) rot = drag.rot - (e.clientX - drag.x) * .25; });
    ['pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, () => { drag = null; }));
  })();

  /* ---------- loader ---------- */
  if (skipLoader) {
    document.body.classList.add('no-loader'); document.body.classList.remove('is-loading'); heroIn();
  } else {
    lenis && lenis.stop();
    const n = { v: 0 }, num = $('#loaderNum');
    gsap.timeline()
      .from('.loader .dotmap', { opacity: 0, scale: .96, duration: 1 })
      .from('.loader__list li', { opacity: 0, x: -10, stagger: .06, duration: .4 }, .2)
      .to(n, { v: 100, duration: 2.4, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(n.v)).padStart(2, '0'); } }, 0)
      .to('.loader > *', { opacity: 0, duration: .4 }, '+=.15')
      .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
      .add(() => { document.body.classList.remove('is-loading'); lenis && lenis.start(); heroIn(); }, '-=.45')
      .set('.loader', { display: 'none' });
  }

  /* =====================================================================
     JOURNEY — one pinned, scrubbed timeline
     A  yard (side view): stacker lifts a container onto a truck
     B  road (top view):  truck follows the road round the bend to the pier
     C  sea  (top view):  camera runs down the ship, pulls out, clouds close
     ===================================================================== */
  const stage = $('#stage'), track = $('#track'), bigtext = $('#bigtext'), lane = $('#lane');
  const el = id => document.getElementById(id);
  const yard = el('yard'), yardSet = el('yardSet'), lift = el('lift'), truckSide = el('truckSide');
  const world = el('world'), roadPath = el('roadPath'), truckTop = el('truckTop');
  const CH = 10.2 * (428 / 369) * (16 / 9);   // container height as % of the yard stage

  const st = {
    liftL: 69, liftB: CH, yardX: 0, yardO: 1, truckL: 105, yardS: 1, travel: 0,   // scene A
    gt: 86, gb: 0,                                                                 // ground band (vh)
    d: 1100, cy: 0, z: 1                                                           // scenes B + C camera
  };
  let vw = innerWidth, vh = innerHeight;
  const cam = { x: 0, y: 0, s: 1, on: false };

  function render() {
    stage.style.setProperty('--gt', st.gt + 'vh');
    stage.style.setProperty('--gb', st.gb + 'vh');

    // A — yard
    lift.style.left = st.liftL + '%'; lift.style.bottom = st.liftB + '%';
    yardSet.style.transform = `translateX(${st.yardX}%)`; yardSet.style.opacity = st.yardO;
    truckSide.style.left = st.truckL + '%';
    yard.style.transform = `translateX(-50%) scale(${st.yardS})`;
    lane.style.backgroundPositionX = -st.travel * .5 + 'px';

    // B + C — top-down world
    const s = .36 * vh / 220 * st.z;
    const p = roadPath.getPointAtLength(st.d), q = roadPath.getPointAtLength(st.d + 2);
    const ang = Math.atan2(q.y - p.y, q.x - p.x) * 57.2958;
    truckTop.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang})`);
    world.setAttribute('transform', `translate(${vw / 2} ${vh / 2}) scale(${s}) translate(${-p.x} ${-(p.y + st.cy)})`);
    cam.x = p.x; cam.y = p.y + st.cy; cam.s = s; cam.on = tl.time() > 10.1;
  }

  const io = 'power2.inOut';
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#journey', start: 'top top', end: () => '+=' + innerHeight * 11,
      pin: stage, scrub: .7, invalidateOnRefresh: true, anticipatePin: 1,
      onRefresh: () => { vw = innerWidth; vh = innerHeight; render(); }
    },
    onUpdate: render
  });

  // A — yard
  tl.to('#hud', { opacity: 1, duration: .3 }, .1)
    .to(st, { liftL: 56.8, duration: 1.8 }, 0)
    .to(st, { liftB: CH + 14, duration: .9, ease: 'power1.out' }, 0)
    .to(st, { liftB: 31.1, duration: .9, ease: 'power1.inOut' }, .9)
    .to(st, { yardX: -75, duration: 2.2, ease: 'power1.in' }, 2)
    .to(st, { yardO: 0, duration: 1.2 }, 3)
    .to(st, { truckL: 22, duration: 2.6, ease: 'power2.out' }, 2.2)
    .to(st, { gt: 52, yardS: .62, duration: 1.2, ease: io }, 5.4)
    .to(st, { travel: 9000, duration: 5.2, ease: 'power1.in' }, 5.2)
    .to(bigtext, { opacity: 1, duration: .5 }, 5.6)
    .fromTo(bigtext, { x: () => innerWidth * .7 }, { x: () => -(bigtext.scrollWidth - innerWidth * .4), duration: 5 }, 5.6)
    .to([track, lane], { opacity: 1, duration: .6 }, 5.9)
    .to(track, { x: () => -(track.scrollWidth - innerWidth), duration: 3.1 }, 6.8)
    // A → B: the ground folds into a road and the camera flips overhead
    .to([track, lane, bigtext, '#hud'], { opacity: 0, duration: .4 }, 10)
    .fromTo(['#worldSvg', '#seabg'], { autoAlpha: 0 }, { autoAlpha: 1, duration: .05 }, 10.15)
    .to('#side', { opacity: 0, duration: .35 }, 10)
    .to(st, { gt: 32, gb: 32, duration: .7, ease: io }, 10.2)
    .to('#ground', { opacity: 0, duration: .35 }, 10.6)
  // B — road
    .to(st, { d: 5485, duration: 6 }, 11.2)
    .fromTo('#rel', { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, 14.0)
    .from('.rel__left > *', { opacity: 0, y: 30, stagger: .12, duration: .4 }, 14.0)
    .from('.rel__item', { opacity: 0, y: 30, stagger: .25, duration: .4 }, 14.2)
    .to('#rel', { autoAlpha: 0, duration: .35 }, 15.75)
  // C — sea
    .to(truckTop, { opacity: 0, duration: .3 }, 17.0)
    .to(st, { cy: 520, duration: 1.8, ease: 'power1.inOut' }, 17.2)
    .to('#road', { opacity: 0, duration: .5 }, 19)
    .to('#land', { opacity: 0, duration: .8 }, 19)
    .to(st, { z: .27, cy: 717, duration: 2, ease: io }, 19)
    .fromTo('#why', { autoAlpha: 0 }, { autoAlpha: 1, duration: .1 }, 20.3)
    .from(['#why .eyebrow', '#why .h2'], { opacity: 0, y: 40, stagger: .15, duration: .6 }, 20.3)
    .from('.why__pt', { opacity: 0, y: 24, stagger: .3, duration: .5 }, 20.9)
    .to(st, { z: .2, duration: 1.6, ease: 'power1.in' }, 22.6)
    .fromTo('.clouds i', { opacity: 0, scale: .45 }, { opacity: 1, scale: 1.5, stagger: .1, duration: 1, ease: 'power1.in' }, 22.5)
    .to('#why', { autoAlpha: 0, duration: .4 }, 23.2)
    .to('#whiteout', { opacity: 1, duration: .6 }, 23.6);
  render();

  // speedometer driven by real scroll velocity
  const hudNum = $('#hudNum'); let speed = 0, lastY = scrollY;
  gsap.ticker.add(() => {
    const v = Math.abs(scrollY - lastY); lastY = scrollY;
    speed += (Math.min(v * 2.4, 140) - speed) * .08;
    hudNum.textContent = String(Math.round(speed)).padStart(2, '0');
  });

  /* ---------- testimonials: plane fly-over ---------- */
  gsap.fromTo('#plane', { x: () => -innerWidth * .75, y: () => innerHeight * .1 }, {
    x: () => innerWidth * .95, y: () => -innerHeight * .08, ease: 'none',
    scrollTrigger: { trigger: '.testi', start: 'top bottom', end: 'bottom top', scrub: .8, invalidateOnRefresh: true }
  });
  $$('.quote').forEach(q => gsap.from(q, { opacity: 0, y: 60, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: q, start: 'top 85%' } }));

  /* ---------- partners ---------- */
  const names = ['AERO NORTH', 'Skyline Cargo', 'P A C I F I C', 'Blue Meridian', 'KESTREL AIR', 'Orient Wing', 'A T L A S', 'Harbour Jet', 'TRANSPOLAR', 'Southern Cross Air',
    'OCEANLINK', 'Maritime One', 'T I D E W A Y', 'Coral Lines', 'NORDHAVN', 'Eastwind', 'A N C H O R', 'Delta Marine', 'SEABRIDGE', 'Longitude Lines'];
  el('partnerGrid').innerHTML = names.map(n => `<div>${n}</div>`).join('');
  gsap.from('#partnerGrid div', { opacity: 0, y: 20, duration: .6, stagger: { each: .04, from: 'random' }, scrollTrigger: { trigger: '#partnerGrid', start: 'top 80%' } });

  /* ---------- insights: cursor preview ---------- */
  const preview = el('preview'), rows = el('rows');
  const px = gsap.quickTo(preview, 'x', { duration: .5, ease: 'power3' }), py = gsap.quickTo(preview, 'y', { duration: .5, ease: 'power3' });
  if (matchMedia('(hover: hover)').matches) {
    rows.addEventListener('mousemove', e => { px(e.clientX + 170); py(e.clientY); });
    $$('li', rows).forEach(li => li.addEventListener('mouseenter', () => { preview.style.setProperty('--h', li.dataset.h); preview.style.opacity = 1; preview.style.scale = 1; }));
    rows.addEventListener('mouseleave', () => { preview.style.opacity = 0; preview.style.scale = .6; });
  }
  gsap.from('.rows li', { opacity: 0, y: 30, duration: .7, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: rows, start: 'top 80%' } });

  /* ---------- faq ---------- */
  $$('#faqList details').forEach(d => {
    const body = $('div', d);
    $('summary', d).addEventListener('click', e => {
      e.preventDefault();
      const done = () => ScrollTrigger.refresh();
      if (d.open) gsap.to(body, { height: 0, duration: .4, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'height' }); done(); } });
      else { d.open = true; gsap.from(body, { height: 0, duration: .5, ease: 'power2.out', onComplete: done }); }
    });
  });

  /* ---------- footer wordmark ---------- */
  const wm = el('wordmark');
  wm.innerHTML = [...wm.textContent].map(c => `<span>${c}</span>`).join('');
  gsap.from('#wordmark span', { yPercent: 100, opacity: 0, duration: 1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: wm, start: 'top 95%' } });

  /* ---------- housekeeping ---------- */
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { drawMaps(); ScrollTrigger.refresh(); }, 200); });
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
