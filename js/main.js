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
  const scene = el('scene'), stack = el('stack'), craneW = el('craneW'), craneSq = el('craneSq'), craneTop = el('craneTop'), craneBot = el('craneBot');
  const truckW = el('truckW'), truckInner = el('truckInner'), truckParts = el('truckParts'), truckCont = el('truckCont'), truckSq = el('truckSq'), wheels = $$('.wheel');
  const world = el('world'), roadPath = el('roadPath'), truckTop = el('truckTop'), contTop = el('contTop'), cabTop = el('cabTop');

  /* Scroll-scrubbed image sequence drawn to a canvas (nearest loaded frame wins). */
  class Seq {
    constructor(cv, dir, n, clear) {
      this.cv = cv; this.ctx = cv.getContext('2d'); this.n = n; this.clear = clear; this.im = new Array(n); this.cur = -1; this.want = 0;
      let next = 0; const load = () => { if (next >= n) return; const i = next++, im = new Image();
        im.onload = () => { this.im[i] = im; if (this.cur < 0 || Math.abs(i - this.want) <= Math.abs(this.cur - this.want)) this.draw(this.want); load(); };
        im.onerror = load; im.src = `assets/uc/seq/${dir}/${String(i).padStart(3, '0')}.avif`; };
      for (let k = 0; k < 6; k++) load();
    }
    draw(f) {
      this.want = f = Math.max(0, Math.min(this.n - 1, Math.round(f)));
      let i = f; for (let k = 0; k < this.n && !this.im[i]; k++) { const a = f - k, b = f + k; i = this.im[a] ? a : this.im[b] ? b : i; }
      if (!this.im[i] || i === this.cur) return;
      this.cur = i; if (this.clear) this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      this.ctx.drawImage(this.im[i], 0, 0, this.cv.width, this.cv.height);
    }
  }
  const craneSeq = new Seq(craneSq, 'crane', 226, false), truckSeq = new Seq(truckSq, 'tsq', 45, true);

  const st = {
    // scene A (measured from the reference: lengths in vw, see timeline)
    frame: 0, craneX: -19.3, sqY: 0, sqR: 0, sqS: 1, stackX: 0, stackS: 1, stackY: 0, stackB: 0, craneWX: 0,
    truckX: 100, wheel: 0, sceneS: 1, sceneX: 0, sceneY: 0, sceneB: 0, topY: 0, innerS: 1, innerX: 0, tk: 0, tframe: 0,
    gt: 90.74, gb: 0,                 // ground band (vh)
    d: 1100, zr: 0, oy: 0,            // road: distance along it, zoom-out progress, truck offset (vh)
    seaY: 100, ship: 1, relY: 109.75, relL: 0, whyY: 109.75   // sea / lists, in vh
  };
  const T_SWAP = 450, T_TSQ = 925, T_WORLD = 990;
  const yz = () => (innerWidth < 820 ? 1.9 : 1);                   // phones get a zoomed-in yard
  const sea = el('sea'), seaBg = el('seaBg'), shipW = el('shipW'), relRight = el('relRight'), relLeft = el('relLeft'), whyFlow = el('whyFlow'), side = el('side'), wakeW = el('wakeW');
  let vw = innerWidth, vh = innerHeight;
  const cam = { x: 0, y: 0, s: 1, on: false };

  function render() {
    stage.style.setProperty('--gt', st.gt + 'vh');
    stage.style.setProperty('--gb', st.gb + 'vh');

    // A — yard
    const Z = yz();
    const t = tl.time(), put = t >= T_SWAP, top = t >= T_TSQ;
    craneSeq.draw(st.frame); truckSeq.draw(st.tframe);
    scene.style.transform = `translate(${st.sceneX}%, ${st.sceneY}vw) scale(${st.sceneS})`;
    scene.style.filter = st.sceneB ? `blur(${st.sceneB}px)` : '';
    stack.style.transform = `translate(${st.stackX}%, ${st.stackY}%) scale(${st.stackS})`;
    stack.style.filter = st.stackB ? `blur(${st.stackB}px)` : '';
    craneW.style.transform = `translateX(${st.craneWX}%)`;
    craneSq.style.transform = `translate(${st.craneX}vw, ${st.sqY}vw) rotate(${st.sqR}deg) scale(${st.sqS})`;
    craneSq.style.visibility = put ? 'hidden' : 'visible';
    craneBot.style.visibility = craneTop.style.visibility = put ? 'visible' : 'hidden';
    craneTop.style.transform = `translateY(${st.topY}%)`;
    truckW.style.transform = `scale(${Z}) translateX(${st.truckX}vw)`; side.style.transform = `scale(${Z})`;
    truckCont.style.visibility = put ? 'visible' : 'hidden';
    truckParts.style.visibility = top ? 'hidden' : 'visible';
    truckSq.style.visibility = top ? 'visible' : 'hidden';
    truckSq.style.transform = `scale(${1 + .086 * st.tk})`;
    const ty = st.tk * ((50 - st.gt) / 100 * vh / Z + .0499 * vw);
    truckInner.style.transform = `translate(${st.innerX * (1 - st.tk) + st.tk * (8 / Z + 7.97)}vw, ${ty}px) scale(${st.innerS})`;
    wheels.forEach(w => { w.style.transform = `rotate(${st.wheel}deg)`; });
    lane.style.backgroundPositionX = st.wheel * .5 + 'px';

    // B — top-down road. Road is 395 units wide: 60vh at the handover, 29.9vh once zoomed out.
    const sA = .6 * vh / 395, sR = .299 * vh / 395, s = sA + (sR - sA) * st.zr;
    const k0 = .448 * vw * Z / (400 * sA), k1 = .3025 * vh / (400 * sR), k = k0 + (k1 - k0) * st.zr;
    const p = roadPath.getPointAtLength(st.d);
    const tan = dd => { const a = roadPath.getPointAtLength(dd), b = roadPath.getPointAtLength(dd + 2); return Math.atan2(b.y - a.y, b.x - a.x) * 57.2958; };
    const ang = tan(st.d);
    truckTop.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang}) scale(${k})`);
    cabTop.setAttribute('transform', `rotate(${(tan(st.d + 160) - ang) * .5} 110 0)`);    // cab leads into the bend,
    contTop.setAttribute('transform', `rotate(${(tan(st.d - 170) - ang) * .5} 110 0)`);   // trailer swings out behind it
    world.setAttribute('transform', `translate(${vw / 2} ${vh / 2 + st.oy * vh / 100}) scale(${s}) translate(${-p.x} ${-p.y})`);
    relRight.style.transform = `translateY(${st.relY}vh)`; relLeft.style.transform = `translateY(${st.relL}vh)`;

    // C — sea
    sea.style.transform = `translateY(${st.seaY}vh)`;
    shipW.style.transform = wakeW.style.transform = `scale(${st.ship})`;
    const fog = st.seaY > 0 ? `linear-gradient(transparent ${15.6 * st.seaY / 100}%, #000 ${15.6 * st.seaY / 100 + 14}%)` : 'none';   // ship fades in above the waterline
    shipW.style.webkitMaskImage = shipW.style.maskImage = fog;
    seaBg.style.transform = `scale(${1 + (st.ship - .082) * .9})`;
    whyFlow.style.transform = `translateY(${st.whyY}vh)`;
  }

  const io = 'power2.inOut';
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#journey', start: 'top top', end: () => '+=' + innerHeight * 20.36,
      pin: stage, scrub: .7, invalidateOnRefresh: true, anticipatePin: 1,
      onRefresh: () => { vw = innerWidth; vh = innerHeight; render(); }
    },
    onUpdate: render
  });

  /* One timeline unit = 1vh of scroll. Scene A positions and lengths are the reference site's own. */
  const sine = 'sine.inOut';
  // A — yard
  tl.to('#hud', { opacity: 1, duration: 20 }, 10)
    .to(st, { craneX: 0, duration: 100 }, 0)                                  // stacker rolls in from the left
    .to(st, { frame: 225, duration: 350 }, 100)                               // lift → turn to face us → lower
    .to(st, { stackX: 80, stackS: .85, stackY: 8, stackB: 3, duration: 83 }, 250)
    .to(st, { sqY: .58, sqR: .5, duration: 25 }, 250)
    .to(st, { sqY: .69, sqR: -3, duration: 33 }, 275)
    .to(st, { sqR: 0, duration: 25 }, 308)
    .to(st, { craneWX: 20.9, duration: 83 }, 333)
    .to(st, { sqS: .9, sqY: -.556, duration: 83 }, 345)
    .to(st, { truckX: 0, duration: 95 }, 345)                                 // empty trailer drives in underneath
    .fromTo(st, { wheel: 1440 }, { wheel: 0, duration: 95 }, 345)
    // container is now on the trailer: ground rises, stacker lets go and leaves
    .to(st, { gt: 40, innerS: .6, sceneS: .55, topY: -18, duration: 142, ease: sine }, T_SWAP)
    .to(st, { sceneX: -80, sceneY: .29, sceneB: 5, duration: 141 }, 507)
    .to(st, { wheel: -2880, duration: 141 }, 507)
    .to(st, { wheel: -7200, duration: 284 }, 648)
    .to(st, { innerX: -7.99, duration: 81 }, 575)
    .to(st, { innerX: 5.49, duration: 276 }, 656)
    .to(bigtext, { opacity: 1, duration: 1 }, 575)
    .fromTo(bigtext, { x: () => innerWidth }, { x: () => -bigtext.scrollWidth, duration: 425 }, 575)
    .to([track, lane], { opacity: 1, duration: 40 }, 545)
    .to(track, { x: () => -(track.scrollWidth - innerWidth), duration: 320 }, 600)
    // A → B: truck turns to the overhead view while the ground folds into a road
    .to([track, lane, '#hud'], { opacity: 0, duration: 25 }, 915)
    .to(bigtext, { opacity: 0, duration: 30 }, 925)
    .to(st, { tframe: 44, duration: 80 }, 920)
    .to(st, { tk: 1, duration: 75, ease: sine }, T_TSQ)
    .to(st, { gt: 20, gb: 20, duration: 70, ease: sine }, T_TSQ)
    .fromTo('#worldSvg', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, T_WORLD)
    .to(['#side', '#ground', '#truckW'], { opacity: 0, duration: 8 }, T_WORLD + 2);

  /* B + C: offsets are vh of scroll after the truck reaches the road (t = 1000), measured on the reference.
     Anything that "scrolls normally" there is moved 1vh per unit here, so it reads the same while pinned. */
  const B = 1000, out = 'power2.out';
  tl
  // road: round the bend, zoom out, then the road scrolls under a truck that holds its place
    .to(st, { d: 3400, duration: 100, ease: 'power1.inOut' }, B)
    .to(st, { zr: 1, oy: 13, duration: 50, ease: sine }, B + 50)
    .to(st, { d: 3400 + 13.21 * 180, duration: 180 }, B + 100)
    .to(st, { oy: 0, duration: 70 }, B + 140)
    .fromTo('#rel', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, B + 88)
    .from('#relLeft > *', { opacity: 0, y: 40, stagger: 10, duration: 30, ease: out }, B + 90)
    .to(st, { relY: -90.25, duration: 200 }, B + 100)                         // list scrolls 1:1
    .from('.rel__item', { opacity: 0, y: 40, stagger: 58.3, duration: 22, ease: out }, B + 122)
    .to(st, { relL: -70, duration: 70 }, B + 262)
    .to('#rel', { autoAlpha: 0, duration: 1 }, B + 335)
  // sea: slides up 1:1 over the road with the ship already in place, then the ship zooms out
    .fromTo('#sea', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, B + 159)
    .to(st, { seaY: 0, duration: 100 }, B + 160)
    .to('#worldSvg', { autoAlpha: 0, duration: 1 }, B + 262)
    .to(st, { ship: .082, duration: 556, ease: sine }, B + 360)
    .fromTo('.decor--1', { xPercent: -60, opacity: .3 }, { xPercent: 30, opacity: 0, duration: 190, ease: sine }, B + 560)
    .fromTo('.decor--2', { xPercent: 60, opacity: .8 }, { xPercent: 0, opacity: 0, duration: 190, ease: sine }, B + 560)
  // why us: heading and points scroll up through the frame
    .fromTo('#why', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, B + 648)
    .to(st, { whyY: -156.25, duration: 266 }, B + 650)
    .fromTo('#whyHead', { scale: .9, opacity: .7, filter: 'blur(2px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 50 }, B + 660)
    .from('.why__pt--l', { x: () => -innerWidth * .11, y: () => innerHeight * .16, stagger: 34.4, duration: 70, ease: out }, B + 723)
    .from('.why__pt--r', { x: () => innerWidth * .11, y: () => innerHeight * .16, stagger: 34.4, duration: 70, ease: out }, B + 723)
    .from('.why__pt--c', { y: () => innerHeight * .2, duration: 70, ease: out }, B + 792)
  // clouds close over the sea, then lift away as the plane page arrives
    .fromTo('#clouds', { opacity: 0 }, { opacity: 1, duration: 123, ease: out }, B + 785)
    .fromTo('.clouds i', { scale: i => [5, 8, 5, 2, 5, 4, 5][i], opacity: 0 }, { scale: 1, opacity: 1, duration: 140, stagger: 16, ease: out }, B + 785)
    .to('#why', { opacity: .9, duration: 100 }, B + 785)
    .to('#clouds', { scale: .8, yPercent: -55, duration: 100, ease: out }, B + 936);

  // plane + page wipe run past the end of the pin (they finish while the page scrolls away)
  const pinST = tl.scrollTrigger, tpage = el('tpage');
  const wipe = { c: -60 }, planeImg = $('#tplane img');
  const planeTravel = () => innerWidth / 2 + Math.max(planeImg.offsetWidth, innerHeight) * .5 + innerWidth * .1;   // fully off-screen either side
  gsap.set('#tplane', { x: -planeTravel() });
  gsap.timeline({
    defaults: { ease: out, duration: 1 },
    scrollTrigger: { trigger: '#journey', start: () => pinST.start + innerHeight * 19.36, end: () => pinST.start + innerHeight * 21.36, scrub: true, invalidateOnRefresh: true }
  })
    .to(wipe, { c: 180, onUpdate: () => { tpage.style.clipPath = `polygon(0 0, ${wipe.c}% 0, ${wipe.c - 40}% 100%, 0 100%)`; } }, 0)
    .fromTo('#tplane', { x: () => -planeTravel(), scale: 1 }, { x: () => planeTravel() * 1.05, scale: 1.3 }, 0);
  tpage.style.clipPath = 'polygon(0 0, -60% 0, -100% 100%, 0 100%)';
  render();

  // speedometer driven by real scroll velocity
  const hudNum = $('#hudNum'); let speed = 0, lastY = scrollY;
  gsap.ticker.add(() => {
    const v = Math.abs(scrollY - lastY); lastY = scrollY;
    speed += (Math.min(v * 2.4, 140) - speed) * .08;
    hudNum.textContent = String(Math.round(speed)).padStart(2, '0');
  });

  /* ---------- testimonials: plane fly-over ---------- */
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
