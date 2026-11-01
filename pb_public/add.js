// "Add a market" form for signed-in users.
// POSTs to the markets collection with the user's token. The server rule
// (see migrations/*_markets_user_submissions.go) requires created_by to be the
// caller and forbids setting `verified`, so new entries start as pending review.
(() => {
  const $ = (id) => document.getElementById(id);
  const { t } = window.i18n;
  const URL_ = '/api/collections/markets/records';

  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'markt';

  // slug has a unique index: retry with a random suffix on collision
  const withSuffix = (slug) => `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const toPbDate = (d) => (d ? `${d} 00:00:00.000Z` : '');

  async function createMarket(data) {
    const baseSlug = slugify(data.name);
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.headers() },
        body: JSON.stringify({
          ...data,
          slug: attempt ? withSuffix(baseSlug) : baseSlug,
          created_by: auth.record.id,
        }),
      });
      if (res.ok) return res.json();
      if (res.status === 401 || res.status === 403) {
        const err = new Error('unauthorized');
        err.key = 'addSessionExpired';
        throw err;
      }
      const body = await res.json().catch(() => ({}));
      // only a slug collision is worth retrying
      if (res.status === 400 && body?.data?.slug) continue;
      throw new Error(`create market ${res.status}`);
    }
    throw new Error('create market: slug collision');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = $('add');
    const form = $('add-form');
    const hint = $('pick-hint');
    const errEl = form.querySelector('.auth-error');

    const showError = (key) => {
      errEl.textContent = key ? t(key) : '';
      errEl.hidden = !key;
    };

    function open() {
      showError(null);
      dlg.showModal();
      $('add-name').focus();
    }

    $('add-market').addEventListener('click', open);

    // only signed-in users see the button
    const sync = () => {
      $('add-market').hidden = !auth.token;
      if (!auth.token && dlg.open) dlg.close();
    };
    sync();
    document.addEventListener('authchange', sync);
    dlg.querySelectorAll('[data-close]').forEach((b) =>
      b.addEventListener('click', () => dlg.close()),
    );

    // ---- pick lat/lng by clicking the map
    let picking = false;
    function stopPicking() {
      picking = false;
      document.body.classList.remove('picking');
      hint.hidden = true;
      window.marktMap?.off('click', onPick);
      document.removeEventListener('keydown', onKey);
      if (!dlg.open) dlg.showModal();
    }
    function onPick(e) {
      $('add-lat').value = e.latlng.lat.toFixed(6);
      $('add-lng').value = e.latlng.lng.toFixed(6);
      stopPicking();
    }
    function onKey(e) {
      if (e.key === 'Escape') stopPicking();
    }
    $('add-pick').addEventListener('click', () => {
      if (!window.marktMap || picking) return;
      picking = true;
      dlg.close();
      document.body.classList.add('picking');
      hint.hidden = false;
      window.marktMap.on('click', onPick);
      document.addEventListener('keydown', onKey);
    });

    // ---- submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value.trim();
      const data = {
        name: v('name'),
        address: v('address'),
        description: v('description'),
        hours: v('hours'),
        region: v('region'),
        website: v('website'),
      };
      if (!data.name) return showError('addNameRequired');
      const lat = parseFloat(form.elements.lat.value);
      const lng = parseFloat(form.elements.lng.value);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return showError('addLocationRequired');
      }
      if (data.website && !/^https?:\/\//i.test(data.website)) {
        return showError('addBadWebsite');
      }
      const opens = v('opens');
      const closes = v('closes');
      if (opens && closes && closes < opens) return showError('addBadDates');
      Object.assign(data, { lat, lng, opens: toPbDate(opens), closes: toPbDate(closes) });

      showError(null);
      const btn = form.querySelector('.primary');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = t('addSubmitting');
      try {
        const record = await createMarket(data);
        form.reset();
        dlg.close();
        document.dispatchEvent(new CustomEvent('marketcreated', { detail: record }));
      } catch (err) {
        console.error(err);
        if (err.key) auth.clear();
        showError(err.key || 'addFailed');
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });
})();
