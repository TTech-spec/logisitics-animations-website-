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
    .from('.hero__globe', { scale: .8, opacity: 0, duration: 1.8, ease: 'power3.out' }, 0);
  gsap.to('.hero__globe', { rotate: 50, yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '70% top', scrub: true } });

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
  const stacker = el('stacker'), stack = el('stack'), truck = el('truck'), cont = el('cont');
  const boom = el('boom'), boom2 = el('boom2'), spreader = el('spreader');
  const world = el('world'), roadPath = el('roadPath'), truckTop = el('truckTop');
  const tWheels = $$('.tw'), sWheels = $$('.sw');
  const PIVOT = { x: 540, y: 500 }, T_RELEASE = 4.4;

  // ship deck: rows of coloured boxes (seeded so it is stable between loads)
  (() => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = ['#d83a3a', '#2f6fe0', '#f0a03a', '#3aa56b', '#e9ecf2', '#c2389a', '#16337a', '#e2622a'];
    let html = '';
    for (let y = 2604; y < 4230; y += 90) {
      if (y > 2800 && y < 3000) continue;
      const taper = y > 4050 ? Math.ceil((y - 4050) / 90) : 0;
      for (let c = taper; c < 8 - taper; c++) html += `<rect x="${-140 + c * 35}" y="${y}" width="31" height="84" fill="${cols[Math.floor(rnd() * cols.length)]}"/>`;
    }
    el('deck').innerHTML = html;
  })();

  const st = {
    sx: 0, tx: 1265, ty: 500, stackX: 0, truckX: 1500, travel: 0,   // scene A
    gt: 78, gb: 0,                                                  // ground band (vh)
    d: 1100, cy: 0, z: 1                                            // scenes B + C camera
  };
  let vw = innerWidth, vh = innerHeight;
  const cam = { x: 0, y: 0, s: 1, on: false };

  function render() {
    const held = tl.time() < T_RELEASE;
    stage.style.setProperty('--gt', st.gt + 'vh');
    stage.style.setProperty('--gb', st.gb + 'vh');

    // A — yard
    stacker.setAttribute('transform', `translate(${st.sx} 0)`);
    stack.setAttribute('transform', `translate(${st.stackX} 0)`);
    truck.setAttribute('transform', `translate(${st.truckX} 0)`);
    const bx = st.tx, by = st.ty - 34;
    boom.setAttribute('x2', bx); boom.setAttribute('y2', by);
    boom2.setAttribute('x1', PIVOT.x + (bx - PIVOT.x) * .58); boom2.setAttribute('y1', PIVOT.y + (by - PIVOT.y) * .58);
    boom2.setAttribute('x2', bx); boom2.setAttribute('y2', by);
    spreader.setAttribute('transform', `translate(${st.tx} ${st.ty})`);
    const cx = held ? st.sx + st.tx : 760 + st.truckX, cyy = held ? st.ty : 520;
    cont.setAttribute('transform', `translate(${cx - 215} ${cyy})`);
    const ta = (st.truckX + st.travel) / 28 * 57.3, sa = st.sx / 48 * 57.3;
    tWheels.forEach(w => w.setAttribute('transform', `translate(${w.dataset.cx} ${w.dataset.cy}) rotate(${ta})`));
    sWheels.forEach(w => w.setAttribute('transform', `translate(${w.dataset.cx} ${w.dataset.cy}) rotate(${sa})`));
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
    .to(st, { ty: 330, duration: 1, ease: io }, 0)
    .to(st, { stackX: 900, duration: 1.3, ease: 'power2.in' }, 1)
    .to(st, { sx: -320, tx: 1080, ty: 300, duration: 1.3, ease: io }, 1)
    .to(st, { truckX: 0, duration: 1.3, ease: 'power2.out' }, 2.3)
    .to(st, { ty: 520, duration: .8, ease: io }, 3.6)
    .to(st, { ty: 300, duration: .5, ease: 'power2.in' }, T_RELEASE)
    .to(st, { sx: -1700, duration: 1, ease: 'power2.in' }, 4.6)
    .to(st, { gt: 52, duration: 1.2, ease: io }, 5.4)
    .to(st, { travel: 9000, duration: 5.2, ease: 'power1.in' }, 5.2)
    .to(bigtext, { opacity: 1, duration: .5 }, 5.6)
    .fromTo(bigtext, { x: () => innerWidth * .7 }, { x: () => -(bigtext.scrollWidth - innerWidth * .4), duration: 5 }, 5.6)
    .to([track, lane], { opacity: 1, duration: .6 }, 5.9)
    .to(track, { x: () => -(track.scrollWidth - innerWidth), duration: 3.1 }, 6.8)
    // A → B: the ground folds into a road and the camera flips overhead
    .to([track, lane, bigtext, '#hud'], { opacity: 0, duration: .4 }, 10)
    .fromTo('#worldSvg', { autoAlpha: 0 }, { autoAlpha: 1, duration: .05 }, 10.15)
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
    .to('#wake', { opacity: 1, duration: .8 }, 19)
    .to('#land', { opacity: 0, duration: .8 }, 19)
    .to(st, { z: .27, cy: 860, duration: 2, ease: io }, 19)
    .fromTo('#why', { autoAlpha: 0 }, { autoAlpha: 1, duration: .1 }, 20.3)
    .from(['#why .eyebrow', '#why .h2'], { opacity: 0, y: 40, stagger: .15, duration: .6 }, 20.3)
    .from('.why__pt', { opacity: 0, y: 24, stagger: .3, duration: .5 }, 20.9)
    .to(st, { z: .2, duration: 1.6, ease: 'power1.in' }, 22.6)
    .fromTo('.clouds i', { opacity: 0, scale: .45 }, { opacity: 1, scale: 1.5, stagger: .1, duration: 1, ease: 'power1.in' }, 22.5)
    .to('#why', { autoAlpha: 0, duration: .4 }, 23.2)
    .to('#whiteout', { opacity: 1, duration: .6 }, 23.6);
  render();

  /* ---------- real-time water (WebGL) ---------- */
  (() => {
    const cv = el('seaGL'), gl = cv.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision highp float;
      uniform vec2 uRes,uCam;uniform float uScale,uTime;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+7.;a*=.5;}return v;}
      void main(){
        vec2 px=gl_FragCoord.xy-.5*uRes;px.y=-px.y;
        vec2 q=(uCam+px/uScale)*.0034;float t=uTime*.22;
        float swell=fbm(q*vec2(1.,1.7)+vec2(t,t*.6));
        float chop=fbm(q*3.3-vec2(t*1.4,-t)+swell*1.6);
        float crest=pow(1.-abs(2.*chop-1.),3.);
        float glint=pow(1.-abs(2.*fbm(q*9.+vec2(-t*2.,t*1.7)+chop)-1.),14.);
        vec3 c=mix(vec3(.015,.07,.30),vec3(.04,.20,.66),smoothstep(.2,.8,swell));
        c+=vec3(.25,.42,.95)*crest*.13*smoothstep(.25,.8,swell);
        c+=vec3(.8,.9,1.)*glint*.16*smoothstep(.45,.8,swell);
        float v=length(px/uRes);c*=1.-.35*v*v;
        gl_FragColor=vec4(c,1.);}`));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = k => gl.getUniformLocation(prog, k), uRes = U('uRes'), uCam = U('uCam'), uScale = U('uScale'), uTime = U('uTime');
    $$('.sea-fill').forEach(r => r.style.display = 'none');   // GL replaces the flat fill
    cv.classList.add('is-live');
    const size = () => { const d = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * d; cv.height = innerHeight * d; gl.viewport(0, 0, cv.width, cv.height); };
    size(); addEventListener('resize', size);
    let t0 = performance.now(), shown = null;
    gsap.ticker.add(() => {
      const show = cam.on && cam.y > 800;                       // only paint while the sea can be seen
      if (show !== shown) { shown = show; cv.style.visibility = show ? 'visible' : 'hidden'; }
      if (!show) return;
      const d = cv.width / innerWidth;
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform2f(uCam, cam.x, cam.y);
      gl.uniform1f(uScale, cam.s * d); gl.uniform1f(uTime, reduced ? 0 : (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  })();

  /* ---------- generated cloud sprites ---------- */
  (() => {
    const N = 256, perm = new Uint8Array(512); let sd = 11;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const v = (x, y) => perm[(perm[x & 255] + y) & 255] / 255;
    const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      return (v(xi, yi) * (1 - fx) + v(xi + 1, yi) * fx) * (1 - fy) + (v(xi, yi + 1) * (1 - fx) + v(xi + 1, yi + 1) * fx) * fy; };
    const fbm = (x, y) => { let a = .5, s = 0; for (let i = 0; i < 5; i++) { s += a * noise(x, y); x = x * 2 + 13; y = y * 2 + 5; a *= .5; } return s; };
    const urls = [0, 1, 2].map(k => {
      const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const u = i / N - .5, w = j / N - .5, fall = Math.max(0, 1 - Math.hypot(u * 1.9, w * 2.5) * 1.05);
        const d = Math.max(0, Math.min(1, (fbm(i / 46 + k * 31, j / 46 + k * 17) * 1.5 - .55 + fall * .9) * fall * 2.6));
        const o = (j * N + i) * 4, lit = .78 + .22 * Math.min(1, d * 1.3 + (.5 - w) * .5);
        im.data[o] = 236 * lit + 19; im.data[o + 1] = 240 * lit + 15; im.data[o + 2] = 255; im.data[o + 3] = 255 * Math.pow(d, .8);
      }
      x.putImageData(im, 0, 0); return c.toDataURL();
    });
    $$('.clouds i').forEach((c, i) => { c.style.backgroundImage = `url(${urls[i % 3]})`; });
  })();

  // speedometer driven by real scroll velocity
  const hudNum = $('#hudNum'); let speed = 0, lastY = scrollY;
  gsap.ticker.add(() => {
    const v = Math.abs(scrollY - lastY); lastY = scrollY;
    speed += (Math.min(v * 2.4, 140) - speed) * .08;
    hudNum.textContent = String(Math.round(speed)).padStart(2, '0');
  });

  /* ---------- testimonials: plane fly-over ---------- */
  gsap.fromTo('#plane', { x: () => -innerWidth * .35, y: () => innerHeight * 1.1, rotate: 52 }, {
    x: () => innerWidth * 1.05, y: () => -innerHeight * .5, rotate: 52, ease: 'none',
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
