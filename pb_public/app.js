const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

const { t, field } = window.i18n;

const fmtDate = (d) =>
  d
    ? new Date(d.replace(' ', 'T')).toLocaleDateString(i18n.locale(), {
        day: 'numeric',
        month: 'short',
      })
    : '';

// Case/diacritic-insensitive text for search: "Zürich", "Zurich" and
// "Zuerich" all fold to the same string.
const fold = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([aou])e/g, '$1');

const DAY = 86400000;

function countdownLabel(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const p = (n) => String(n).padStart(2, '0');
  const hms = `${p(Math.floor((total % 86400) / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
  return t('statusCountdown', { time: d ? `${d}${t('dayShort')} ${hms}` : hms });
}

// attributes that let the 1s ticker find and update a countdown badge
const badgeAttrs = (st) => (st.opens ? ` data-opens="${st.opens}"` : '');

function status(m, now = new Date()) {
  const opens = m.opens && new Date(m.opens.replace(' ', 'T'));
  const closes = m.closes && new Date(m.closes.replace(' ', 'T'));
  if (closes && now > new Date(+closes + DAY)) {
    return { key: 'closed', label: t('statusClosed') };
  }
  if (opens && now < opens) {
    return {
      key: 'soon',
      opens: +opens,
      label: countdownLabel(+opens - now),
    };
  }
  return { key: 'open', label: t('statusOpen') };
}

async function fetchAllMarkets() {
  const res = await fetch(
    '/api/collections/markets/records?perPage=200&sort=opens',
  );
  if (!res.ok) throw new Error(`Failed to load markets (${res.status})`);
  return (await res.json()).items ?? [];
}

function initMap() {
  const map = L.map('map', { zoomControl: false }).setView(
    [47.376732, 8.541355],
    13,
  );
  L.control.zoom({ position: 'topright' }).addTo(map);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  return map;
}

// anonymous voter id + remembered ratings live in this browser only
const voterId = () => {
  try {
    let v = localStorage.getItem('voter');
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem('voter', v);
    }
    return v;
  } catch {
    return (voterId.mem ??= crypto.randomUUID());
  }
};
const myRatings = () => {
  try {
    return JSON.parse(localStorage.getItem('ratings') || '{}');
  } catch {
    return {};
  }
};

function ratingHtml(m) {
  const mine = myRatings()[m.id] ?? 0;
  const summary = m.rating_count
    ? t('ratingSummary', { avg: m.rating_avg.toFixed(1), n: m.rating_count })
    : t('ratingNone');
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" class="star ${n <= mine ? 'on' : ''}" data-stars="${n}" aria-label="${esc(t('rateStars', { n }))}">★</button>`,
    )
    .join('');
  return `<div class="rating" data-market="${esc(m.id)}">
    <div class="stars" role="group" aria-label="${esc(t('rateThis'))}">${stars}</div>
    <span class="rating-summary">${esc(summary)}</span>
  </div>`;
}

async function rate(m, stars) {
  const res = await fetch(`/api/markets/${encodeURIComponent(m.id)}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stars, voter: voterId() }),
  });
  if (!res.ok) throw new Error(`rate failed (${res.status})`);
  const { rating_avg, rating_count } = await res.json();
  m.rating_avg = rating_avg;
  m.rating_count = rating_count;
  try {
    localStorage.setItem(
      'ratings',
      JSON.stringify({ ...myRatings(), [m.id]: stars }),
    );
  } catch {}
}

function popupHtml(m, st) {
  const dates =
    m.opens || m.closes
      ? `<div class="row">📅 <span>${esc(fmtDate(m.opens))} – ${esc(fmtDate(m.closes))}</span></div>`
      : '';
  const site = /^https?:\/\//.test(m.website ?? '')
    ? `<a class="btn" href="${esc(m.website)}" target="_blank" rel="noopener">${esc(t('visitWebsite'))}</a>`
    : '';
  return `
    <div class="popup-head"><h3>${esc(m.name)}</h3></div>
    <div class="popup-body">
      ${field(m, 'description') ? `<p>${esc(field(m, 'description'))}</p>` : ''}
      ${m.address ? `<div class="row">📍 <span>${esc(m.address)}</span></div>` : ''}
      ${field(m, 'hours') ? `<div class="row">🕒 <span>${esc(field(m, 'hours'))}</span></div>` : ''}
      ${dates}
      ${m.verified === false ? '' : ratingHtml(m)}
      <div class="row"><span class="badge ${st.key}"${badgeAttrs(st)}>${esc(st.label)}</span></div>
      ${site}
    </div>`;
}

function startSnow() {
  const canvas = $('snow');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let w, h, flakes;

  const resize = () => {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    flakes = Array.from({ length: Math.min(110, Math.floor(w / 12)) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2.8,
      s: 0.4 + Math.random() * 1.1,
      p: Math.random() * Math.PI * 2,
    }));
  };
  resize();
  addEventListener('resize', resize);

  (function frame(t = 0) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.shadowColor = 'rgba(80,100,140,.45)';
    ctx.shadowBlur = 3;
    for (const f of flakes) {
      f.y += f.s;
      f.x += Math.sin(t / 1200 + f.p) * 0.4;
      if (f.y > h + 5) {
        f.y = -5;
        f.x = Math.random() * w;
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  })();
}

function startSleigh() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fly = () => {
    if (document.hidden) return schedule();
    const el = document.createElement('div');
    el.className = 'sleigh';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<img src="santa.png" alt="" draggable="false" />';
    const ltr = Math.random() < 0.5;
    el.style.top = `${8 + Math.random() * 45}%`;
    document.body.appendChild(el);
    const w = el.offsetWidth;
    const dir = ltr ? 1 : -1;
    const from = ltr ? -w : innerWidth;
    const to = ltr ? innerWidth : -w;
    // gentle wave: bob up/down with the sleigh pitching along the slope
    const amp = 28 + Math.random() * 20; // px
    const waves = 2 + Math.random() * 1.5;
    const phase = Math.random() * Math.PI * 2;
    const steps = 40;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const p = i / steps;
      const a = phase + p * waves * Math.PI * 2;
      const x = from + (to - from) * p;
      const y = Math.sin(a) * amp;
      const rot = Math.cos(a) * 12 * dir; // degrees, nose follows the slope
      return {
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scaleX(${dir})`,
      };
    });
    const anim = el.animate(frames, {
      duration: 9000 + innerWidth * 4,
      easing: 'linear',
    });
    anim.onfinish = () => {
      el.remove();
      schedule();
    };
  };
  const schedule = () => setTimeout(fly, 45000 + Math.random() * 75000);
  setTimeout(fly, 8000 + Math.random() * 7000); // first pass shortly after load
}

(async function () {
  const map = initMap();
  window.marktMap = map; // used by add.js to pick a location
  startSnow();
  startSleigh();

  const list = $('list');
  const state = { q: '', region: 'All', openOnly: false, activeId: null };

  let markets = [];
  try {
    markets = await fetchAllMarkets();
  } catch (err) {
    console.error(err);
    list.innerHTML = `<li class="empty"><b>🥶</b>${esc(t('loadError'))}</li>`;
    return;
  }

  const makeEntry = (m) => {
    const st = status(m);
    const hasPos = m.lat && m.lng;
    let marker = null;
    if (hasPos) {
      marker = L.marker([m.lat, m.lng], {
        icon: L.divIcon({
          className: `pin ${st.key === 'closed' ? 'closed' : ''}`,
          html: `<div><span>${st.key === 'closed' ? '💤' : '🎄'}</span></div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38],
        }),
        riseOnHover: true,
      }).bindPopup(popupHtml(m, st), { autoPanPadding: [40, 40] });
      marker.on('click', () => select(m.id, false));
      // popup content is re-rendered after each vote, so delegate on the popup
      marker.once('popupopen', (ev) => {
        ev.popup.getElement().addEventListener('click', async (c) => {
          const btn = c.target.closest('.star');
          if (!btn) return;
          try {
            await rate(m, +btn.dataset.stars);
            marker.setPopupContent(popupHtml(m, status(m)));
          } catch (err) {
            console.error(err);
            alert(t('rateFailed'));
          }
        });
      });
    }
    return { m, st, marker };
  };
  const entries = markets.map(makeEntry);

  function matches({ m, st }) {
    if (state.region !== 'All' && m.region !== state.region) return false;
    if (state.openOnly && st.key === 'closed') return false;
    const q = fold(state.q.trim());
    if (!q) return true;
    return fold(
      [m.name, m.address, field(m, 'description'), m.region].join(' '),
    ).includes(q);
  }

  function select(id, fly = true) {
    state.activeId = id;
    const e = entries.find((x) => x.m.id === id);
    document
      .querySelectorAll('.card')
      .forEach((c) => c.classList.toggle('active', c.dataset.id === id));
    entries.forEach((x) =>
      x.marker?.getElement()?.classList.toggle('active', x.m.id === id),
    );
    if (!e?.marker) return;
    if (fly) {
      map.flyTo(e.marker.getLatLng(), Math.max(map.getZoom(), 16), {
        duration: 0.9,
      });
      map.once('moveend', () => e.marker.openPopup());
    }
    document
      .querySelector(`.card[data-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function render({ fit = true } = {}) {
    const shown = entries.filter(matches);
    const bounds = [];

    entries.forEach((e) => {
      if (!e.marker) return;
      if (shown.includes(e)) {
        e.marker.addTo(map);
        bounds.push(e.marker.getLatLng());
      } else {
        e.marker.remove();
      }
    });

    $('count').textContent = t(shown.length === 1 ? 'countOne' : 'countMany', {
      n: shown.length,
    });

    list.innerHTML = shown.length
      ? ''
      : `<li class="empty"><b>🔎</b>${esc(t('noMatch'))}</li>`;

    shown.forEach(({ m, st }, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="card ${m.id === state.activeId ? 'active' : ''}" data-id="${esc(m.id)}" style="animation-delay:${Math.min(i, 12) * 40}ms">
          <h2>${esc(m.name)}</h2>
          <div class="addr">${esc(m.address)}</div>
          <div class="meta">
            <span class="badge ${st.key}"${badgeAttrs(st)}>${esc(st.label)}</span>
            ${m.verified === false ? `<span class="badge">${esc(t('pendingReview'))}</span>` : ''}
            ${m.opens ? `<span class="badge">📅 ${esc(fmtDate(m.opens))} – ${esc(fmtDate(m.closes))}</span>` : ''}
            ${m.region ? `<span class="badge">${esc(m.region)}</span>` : ''}
          </div>
        </button>`;
      li.firstElementChild.addEventListener('click', () => {
        select(m.id);
        if (innerWidth <= 720) $('panel').classList.add('hidden');
      });
      list.append(li);
    });

    if (fit && bounds.length) {
      map.fitBounds(bounds, {
        paddingTopLeft: [innerWidth > 720 ? 430 : 40, 40],
        paddingBottomRight: [40, 40],
        maxZoom: 15,
      });
    }
  }

  // filter chips: "All", each region, and an "open" toggle
  const regions = [...new Set(markets.map((m) => m.region).filter(Boolean))];
  const chipDefs = [
    { label: () => t('all'), test: () => state.region === 'All' && !state.openOnly,
      apply: () => ((state.region = 'All'), (state.openOnly = false)) },
    ...regions.map((r) => ({
      label: () => r,
      test: () => state.region === r,
      apply: () => (state.region = state.region === r ? 'All' : r),
    })),
    { label: () => t('notOver'), test: () => state.openOnly,
      apply: () => (state.openOnly = !state.openOnly) },
  ];
  const chipBox = $('filters');
  function renderChips() {
    chipBox.innerHTML = '';
    chipDefs.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = c.label();
      b.setAttribute('aria-pressed', c.test());
      b.onclick = () => {
        c.apply();
        renderChips();
        render();
      };
      chipBox.append(b);
    });
  }
  renderChips();

  // language toggle: recompute labels, rebuild popups, re-render
  document.querySelectorAll('.lang button').forEach((b) =>
    b.addEventListener('click', () => i18n.setLang(b.dataset.lang)),
  );
  document.addEventListener('langchange', () => {
    const now = new Date();
    entries.forEach((e) => {
      e.st = status(e.m, now);
      e.marker?.setPopupContent(popupHtml(e.m, e.st));
    });
    renderChips();
    render({ fit: false });
  });

  // live countdowns: tick every second; when one hits zero, refresh statuses
  setInterval(() => {
    const now = new Date();
    let expired = false;
    document.querySelectorAll('[data-opens]').forEach((el) => {
      const ms = +el.dataset.opens - now;
      if (ms <= 0) expired = true;
      else el.textContent = countdownLabel(ms);
    });
    if (expired) {
      entries.forEach((e) => {
        e.st = status(e.m, now);
        e.marker?.setPopupContent(popupHtml(e.m, e.st));
      });
      render({ fit: false });
    }
  }, 1000);

  // a market was just submitted: show it right away (pending review)
  document.addEventListener('marketcreated', (ev) => {
    const entry = makeEntry(ev.detail);
    entries.push(entry);
    state.q = '';
    state.region = 'All';
    $('search').value = '';
    renderChips();
    render({ fit: false });
    select(ev.detail.id);
  });

  $('search').addEventListener('input', (e) => {
    state.q = e.target.value;
    render();
  });
  $('toggle').addEventListener('click', () =>
    $('panel').classList.toggle('hidden'),
  );

  // mobile sheet gestures: drag the handle/hero down to dismiss,
  // swipe up on the toggle to bring it back, tap the map to dismiss
  const panel = $('panel');
  const isMobile = () => innerWidth <= 720;
  const drag = (el, { onMove, onEnd }) => {
    let y0 = null;
    el.addEventListener('pointerdown', (e) => {
      if (!isMobile()) return;
      y0 = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (y0 !== null) onMove(e.clientY - y0);
    });
    const end = (e) => {
      if (y0 === null) return;
      const dy = e.clientY - y0;
      y0 = null;
      onEnd(dy);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };
  for (const el of [$('grab'), document.querySelector('.hero')]) {
    drag(el, {
      onMove: (dy) => {
        panel.classList.add('dragging');
        panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
      },
      onEnd: (dy) => {
        panel.classList.remove('dragging');
        panel.style.transform = '';
        if (dy > 60) panel.classList.add('hidden');
      },
    });
  }
  let swiped = false;
  drag($('toggle'), {
    onMove: (dy) => {
      if (dy < -20) swiped = true;
    },
    onEnd: (dy) => {
      if (dy < -30) panel.classList.remove('hidden');
    },
  });
  $('toggle').addEventListener(
    'click',
    (e) => {
      if (swiped) {
        e.stopImmediatePropagation();
        swiped = false;
      }
    },
    true,
  );
  map.on('click', () => {
    if (isMobile()) panel.classList.add('hidden');
  });

  render();
})();
