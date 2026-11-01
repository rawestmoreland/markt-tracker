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

const DAY = 86400000;

function status(m, now = new Date()) {
  const opens = m.opens && new Date(m.opens.replace(' ', 'T'));
  const closes = m.closes && new Date(m.closes.replace(' ', 'T'));
  if (closes && now > new Date(+closes + DAY)) {
    return { key: 'closed', label: t('statusClosed') };
  }
  if (opens && now < opens) {
    const days = Math.ceil((opens - now) / DAY);
    return {
      key: 'soon',
      label: days === 1 ? t('statusTomorrow') : t('statusSoon', { days }),
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
      <div class="row"><span class="badge ${st.key}">${esc(st.label)}</span></div>
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

(async function () {
  const map = initMap();
  startSnow();

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

  const entries = markets.map((m) => {
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
    }
    return { m, st, marker };
  });

  function matches({ m, st }) {
    if (state.region !== 'All' && m.region !== state.region) return false;
    if (state.openOnly && st.key === 'closed') return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.address, field(m, 'description'), m.region]
      .join(' ')
      .toLowerCase()
      .includes(q);
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
            <span class="badge ${st.key}">${esc(st.label)}</span>
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
