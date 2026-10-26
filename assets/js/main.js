(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* Nav: glass when scrolled, mobile menu, active section */
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const dock = $('.dock');
  const hero = $('.hero');

  const setMenu = open => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    if (open) nav.classList.add('is-stuck');
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  const stepList = $('.steps');
  const stepItems = stepList ? $$('.step', stepList) : [];

  /* One scroll timeline: nav state, hero photo drift, step progress, dock */
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('is-stuck', y > 24 || !menu.hidden);
    const h = hero.offsetHeight;
    const p = Math.min(Math.max(y / h, 0), 1);
    if (!reduce) {
      hero.style.setProperty('--p', p.toFixed(3));
    }
    if (stepList) {
      const r = stepList.getBoundingClientRect();
      const prog = reduce ? 1 : Math.min(Math.max((innerHeight * .78 - r.top) / (r.height + innerHeight * .25), 0), 1);
      stepList.style.setProperty('--prog', prog.toFixed(3));
      stepItems.forEach((li, i) => li.classList.toggle('is-on', prog >= i / (stepItems.length - 1) - .001));
    }
    const quote = $('#quote').getBoundingClientRect();
    dock.classList.toggle('is-on', y > h * .6 && quote.top > innerHeight * .6);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'services', 'work', 'reviews', 'how', 'faq'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* Reveals: headings and key blocks only */
  const rise = $$('.section .h2, .lead, .owner, .pillars, .faq__list, .map, .form-card');
  rise.forEach(el => el.classList.add('rise'));
  $$('.pillar').forEach((el, i) => el.style.setProperty('--d', i * 0.08 + 's'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  rise.forEach(el => io.observe(el));
  const steps = $('.steps');
  if (steps) io.observe(steps);

  // Show curated service photos sharply from the first frame.

  /* Quote form wiring */
  const form = $('#quote-form');
  const quoteSec = $('#quote');
  const pick = (name, value) => {
    const input = $$(`input[name="${name}"]`, form).find(i => i.value === value);
    if (input) input.checked = true;
  };
  /* Step-by-step quote form */
  const qsteps = $$('.qstep', form);
  const qdots = $$('.qprog__list li', form);
  const qcount = $('.qprog__count', form);
  const qback = $('[data-prev]', form);
  const qnext = $('[data-next]', form);
  const qsend = $('.qnav__send', form);
  let qcur = 1;
  const firstField = n => $('input:not([type="hidden"]), select, textarea', qsteps[n - 1]);
  const showStep = (n, focus = true) => {
    qcur = n;
    form.dataset.step = n;
    qsteps.forEach((s, i) => { s.hidden = i !== n - 1; });
    qdots.forEach((li, i) => {
      li.classList.toggle('is-done', i < n - 1);
      li.classList.toggle('is-current', i === n - 1);
      if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    qcount.textContent = 'Step ' + n + ' of ' + qsteps.length;
    qback.hidden = n === 1;
    qnext.hidden = n === qsteps.length;
    qsend.hidden = n !== qsteps.length;
    if (focus) {
      const f = n === 1 ? ($('input[name="service"]:checked', form) || firstField(1)) : firstField(n);
      if (f) f.focus({ preventScroll: true });
    }
  };
  const goToForm = (step = 2) => {
    showStep(step, false);
    quoteSec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => { const f = firstField(step); if (f) f.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  };

  $('#quick').addEventListener('submit', e => {
    e.preventDefault();
    const q = e.currentTarget;
    const svc = $('input[name="q-service"]:checked', q);
    if (svc) pick('service', svc.value);
    const zip = $('input[name="q-zip"]', q).value.replace(/\D/g, '').slice(0, 5);
    if (zip) form.zip.value = zip;
    goToForm();
  });

  $$('[data-pick]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    pick('service', a.dataset.pick);
    goToForm();
  }));

  $$('.freq button').forEach(b => b.addEventListener('click', () => {
    $$('.freq button').forEach(x => x.setAttribute('aria-pressed', x === b));
    pick('service', 'Regular Cleaning');
    pick('frequency', b.dataset.freq);
    goToForm();
  }));

  /* Real service-area map (Leaflet + OpenStreetMap/CARTO tiles); pins fill the community field */
  const map = $('.map');
  const mapEl = $('#service-map');
  const community = $('#community');
  const towns = [
    ['Summerville', 33.018, -80.176, 'home'], ['Nexton', 33.058, -80.105], ['Cane Bay', 33.105, -80.135],
    ['Moncks Corner', 33.196, -80.013], ['Goose Creek', 32.981, -80.033], ['Hanahan', 32.918, -80.022, 'left'],
    ['Daniel Island', 32.862, -79.909, 'left'], ['Carolina Park', 32.888, -79.803], ['Mount Pleasant', 32.814, -79.862],
    ['Huger', 33.098, -79.806]
  ];
  const pins = {};
  const selectTown = name => {
    Object.entries(pins).forEach(([n, m]) => { const el = m.getElement(); if (el) el.classList.toggle('is-on', n === name); });
    map.classList.toggle('is-picking', !!pins[name]);
    if (pins[name]) community.value = name;
  };
  if (window.L && mapEl) {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
    }
    const home = [33.018, -80.176];
    const lmap = L.map(mapEl, { scrollWheelZoom: false, dragging: !touch, tap: false, zoomSnap: .25, attributionControl: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
    }).addTo(lmap);
    [10, 20, 30].forEach((mi, i) => L.circle(home, {
      radius: mi * 1609.34, interactive: false, color: '#14509E', weight: 1.5, opacity: i ? .35 : .55,
      dashArray: i ? '4 8' : null, fill: i === 0, fillColor: '#21ACE2', fillOpacity: .1
    }).addTo(lmap));
    towns.forEach(([name, lat, lng, kind]) => {
      const icon = L.divIcon({
        className: 'pin' + (kind === 'home' ? ' pin--home' : '') + (kind === 'left' ? ' pin--left' : ''),
        html: '<span class="pin__dot"></span><span class="pin__label">' + name + '</span>',
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      pins[name] = L.marker([lat, lng], { icon, title: name, alt: name, keyboard: true, riseOnHover: true })
        .on('click', () => selectTown(name)).addTo(lmap);
    });
    lmap.fitBounds(L.latLngBounds(towns.map(t => [t[1], t[2]])), { padding: [36, 36] });
    new ResizeObserver(() => lmap.invalidateSize()).observe(mapEl);
  } else if (mapEl) {
    mapEl.innerHTML = '<p class="map__fallback">We serve Summerville and nearby Lowcountry communities.</p>';
  }
  community.addEventListener('change', () => selectTown(community.value));

  /* Input masks: US phone (843) 555-0123 and 5-digit ZIP */
  const formatPhone = v => {
    let d = v.replace(/\D/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1); // drop US country code from autofill
    d = d.slice(0, 10);
    if (d.length < 4) return d.length ? '(' + d : '';
    if (d.length < 7) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  };
  // keep the caret after the same number of digits once the mask reflows the text
  const applyMask = (input, format) => {
    const digitsBefore = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
    const next = format(input.value);
    if (next === input.value) return;
    input.value = next;
    if (document.activeElement !== input) return;
    let pos = 0, seen = 0;
    while (pos < next.length && seen < digitsBefore) { if (/\d/.test(next[pos])) seen++; pos++; }
    input.setSelectionRange(pos, pos);
  };
  $$('input[name="phone"]').forEach(input => {
    input.maxLength = 14;
    input.addEventListener('input', () => applyMask(input, formatPhone));
    input.addEventListener('keydown', e => {
      // backspace right after a mask character removes the digit before it
      if (e.key !== 'Backspace' || input.selectionStart !== input.selectionEnd) return;
      const i = input.selectionStart;
      if (i > 0 && /[\s()-]/.test(input.value[i - 1])) {
        e.preventDefault();
        const before = input.value.slice(0, i).replace(/\D/g, '').slice(0, -1);
        input.value = formatPhone(before + input.value.slice(i).replace(/\D/g, ''));
        const p = formatPhone(before).length;
        input.setSelectionRange(p, p);
      }
    });
  });
  $$('input[name="zip"], input[name="q-zip"]').forEach(input => {
    input.addEventListener('input', () => applyMask(input, v => v.replace(/\D/g, '').slice(0, 5)));
  });

  /* Steppers */
  $$('.stepper').forEach(s => {
    const input = $('input', s);
    $$('button', s).forEach(b => b.addEventListener('click', () => {
      const step = parseFloat(b.dataset.step);
      const v = Math.min(Math.max((parseFloat(input.value) || 0) + step, +input.min), +input.max);
      input.value = v;
    }));
  });

  /* Validation + Web3Forms submit */
  const rules = {
    name: v => v.trim().length > 1,
    phone: v => v.replace(/\D/g, '').length >= 10,
    zip: v => /^\d{5}$/.test(v.trim()),
    email: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  };
  const showErr = (field, ok) => {
    const el = form.elements[field];
    const msg = document.getElementById('err-' + field);
    el.setAttribute('aria-invalid', String(!ok));
    if (msg) msg.hidden = ok;
    return ok;
  };
  Object.keys(rules).forEach(f => {
    form.elements[f].addEventListener('blur', e => { if (e.target.value || f !== 'email') if (e.target.getAttribute('aria-invalid')) showErr(f, rules[f](e.target.value)); });
    form.elements[f].addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') showErr(f, rules[f](e.target.value)); });
  });
  $$('input[name="service"]', form).forEach(r => r.addEventListener('change', () => { $('#err-service').hidden = true; }));

  // which fields each step checks before moving on
  const stepRules = { 1: ['service'], 2: ['zip'], 3: ['name', 'phone', 'email'] };
  const checkStep = n => {
    let first = null;
    stepRules[n].forEach(f => {
      if (f === 'service') {
        const ok = !!$('input[name="service"]:checked', form);
        $('#err-service').hidden = ok;
        if (!ok && !first) first = $('input[name="service"]', form);
      } else if (!showErr(f, rules[f](form.elements[f].value)) && !first) first = form.elements[f];
    });
    return first;
  };
  qnext.addEventListener('click', () => {
    const bad = checkStep(qcur);
    if (bad) { bad.focus(); return; }
    showStep(qcur + 1);
  });
  qback.addEventListener('click', () => showStep(qcur - 1));
  form.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || qcur === qsteps.length) return;
    e.preventDefault();
    qnext.click();
  });

  const status = $('.qform__status', form);
  const submit = qsend;
  const done = $('.done');

  form.elements.page_url.value = location.href.split('#')[0];

  /* Antispam: honeypot, minimum fill time, one send per 60s */
  const formOpened = Date.now();
  const looksLikeBot = () => {
    if (form.elements.botcheck.checked) return true;
    if (Date.now() - formOpened < 4000) return true;
    const msg = form.elements.message.value;
    return (msg.match(/https?:\/\//g) || []).length > 1;
  };
  const showDone = name => {
    $('.done__name').textContent = name ? ', ' + name : '';
    form.hidden = true;
    done.hidden = false;
    done.focus();
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.textContent = '';
    if (looksLikeBot()) { showDone(''); return; }
    let lastSent = 0;
    try { lastSent = +sessionStorage.getItem('rc-sent') || 0; } catch (err) {}
    if (Date.now() - lastSent < 60000) { status.textContent = 'We already have your request. Give us a moment, or text us at (854) 999-8569.'; return; }
    for (const n of [1, 2, 3]) {
      const bad = checkStep(n);
      if (bad) { showStep(n, false); bad.focus(); return; }
    }

    submit.disabled = true;
    submit.classList.add('is-loading');
    $('.btn__label', submit).textContent = 'Sending';
    try {
      const data = Object.fromEntries(new FormData(form));
      // Web3Forms emails the lead; the webhook feeds the lead system. Either one landing is enough.
      const toEmail = fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Web3Forms failed');
      });
      const { access_key, botcheck, subject, from_name, ...lead } = data;
      const toWebhook = form.dataset.webhook ? fetch(form.dataset.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lead, source: 'rochascleaningservice.com', submitted_at: new Date().toISOString() })
      }).then(res => { if (!res.ok) throw new Error('Webhook ' + res.status); }) : Promise.reject(new Error('No webhook'));
      const results = await Promise.allSettled([toEmail, toWebhook]);
      if (!results.some(r => r.status === 'fulfilled')) throw new Error('Request failed');
      try { sessionStorage.setItem('rc-sent', String(Date.now())); } catch (err) {}
      showDone(data.name.trim().split(' ')[0]);
    } catch (err) {
      status.textContent = "We couldn't send your request. Please try again, or text us at (854) 999-8569.";
    } finally {
      submit.disabled = false;
      submit.classList.remove('is-loading');
      $('.btn__label', submit).textContent = 'Send My Quote Request';
    }
  });

  /* Review marquee: clone each row's group until it covers the viewport, then drift by one group width */
  const fillRows = () => {
    $$('.rv-row').forEach(row => {
      const track = $('.rv-track', row);
      $$('.rv-group[data-clone]', track).forEach(g => g.remove());
      const group = $('.rv-group', track);
      const w = group.getBoundingClientRect().width;
      if (!w) return;
      const copies = Math.ceil(row.clientWidth / w) + 1;
      for (let i = 0; i < copies; i++) {
        const c = group.cloneNode(true);
        c.dataset.clone = '';
        c.setAttribute('aria-hidden', 'true');
        $$('a, button', c).forEach(el => el.setAttribute('tabindex', '-1'));
        track.appendChild(c);
      }
      track.style.setProperty('--rv-shift', w + 'px');
      track.style.setProperty('--rv-dur', (w / 34).toFixed(1) + 's');
    });
  };
  fillRows();
  let rvW = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - rvW) > 40) { rvW = innerWidth; fillRows(); } });

  /* Work rail: endless drift, drag with inertia, arrow nudges */
  const rail = $('.rail');
  const track = $('.rail__track', rail);
  const originals = [...track.children];
  const speed = reduce ? 0 : 38; // px per second
  let setW = 0, x = 0, vel = 0, hover = false, visible = true, drag = null, tween = null, last = performance.now();

  const measure = () => {
    $$('[data-clone]', track).forEach(n => n.remove());
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setW = originals.reduce((w, el) => w + el.getBoundingClientRect().width + gap, 0);
    const copies = Math.max(1, Math.ceil(rail.clientWidth / setW)) + 1;
    for (let i = 0; i < copies; i++) originals.forEach(el => {
      const c = el.cloneNode(true);
      c.dataset.clone = '';
      c.setAttribute('aria-hidden', 'true');
      $$('img', c).forEach(img => { img.alt = ''; });
      track.appendChild(c);
    });
  };
  const wrap = v => setW ? ((v % setW) - setW) % setW : v;
  const paint = () => { track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)'; };

  const tick = now => {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (visible && !drag) {
      if (tween) {
        const t = Math.min((now - tween.t0) / tween.dur, 1);
        x = tween.from + (tween.to - tween.from) * (1 - Math.pow(1 - t, 4));
        if (t === 1) tween = null;
      } else {
        x -= (hover ? 0 : speed) * dt;
        x += vel * dt;
        vel *= Math.pow(.04, dt);
        if (Math.abs(vel) < 2) vel = 0;
      }
      x = wrap(x);
      paint();
    }
    requestAnimationFrame(tick);
  };

  const nudge = dir => {
    const step = originals[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    vel = 0;
    tween = { from: x, to: x - dir * step, t0: performance.now(), dur: reduce ? 1 : 650 };
  };
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(e.key === 'ArrowRight' ? 1 : -1); }
  });

  rail.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  rail.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = false; });
  rail.addEventListener('focusin', () => { hover = true; });
  rail.addEventListener('focusout', () => { hover = false; });

  rail.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { x0: e.clientX, start: x, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false };
    tween = null; vel = 0;
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x0;
    if (Math.abs(dx) > 4 && !drag.moved) { drag.moved = true; rail.classList.add('is-drag'); }
    const dtm = Math.max(now - drag.lastT, 1);
    drag.v = (e.clientX - drag.lastX) / dtm * 1000;
    drag.lastX = e.clientX; drag.lastT = now;
    x = wrap(drag.start + dx);
    paint();
  });
  const endDrag = () => {
    if (!drag) return;
    vel = Math.max(Math.min(drag.v, 2400), -2400);
    drag = null;
    rail.classList.remove('is-drag');
  };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('dragstart', e => e.preventDefault());

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(rail);
  measure();
  new ResizeObserver(() => { measure(); x = wrap(x); paint(); }).observe(rail);
  requestAnimationFrame(tick);
})();
