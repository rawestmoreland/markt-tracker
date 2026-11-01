(() => {
  const STRINGS = {
    en: {
      title: 'Markt Tracker 🎄',
      metaDescription: 'Find every Christmas market around Zürich on one cozy map.',
      tagline:
        'Mulled wine, twinkly lights & wooden chalets — every Christmas market around Zürich, on one map.',
      searchPlaceholder: 'Search markets, streets, treats…',
      mapLabel: 'Map of Christmas markets',
      filtersLabel: 'Filters',
      languageLabel: 'Language',
      toggleList: '🎅 List',
      toggleLabel: 'Show or hide the list',
      all: '✨ All',
      notOver: '🟢 Not over yet',
      statusClosed: 'Season over',
      statusTomorrow: 'Opens tomorrow!',
      statusSoon: 'Opens in {days} days',
      statusOpen: 'Open now',
      visitWebsite: 'Visit website →',
      countOne: '{n} market to explore',
      countMany: '{n} markets to explore',
      noMatch: 'No markets match. Try another search!',
      loadError: "Couldn't load the markets. Is the server running?",
    },
    de: {
      title: 'Markt Tracker 🎄',
      metaDescription:
        'Alle Weihnachtsmärkte rund um Zürich auf einer gemütlichen Karte.',
      tagline:
        'Glühwein, Lichterglanz & Holzchalets — alle Weihnachtsmärkte rund um Zürich auf einer Karte.',
      searchPlaceholder: 'Märkte, Strassen, Leckereien suchen…',
      mapLabel: 'Karte der Weihnachtsmärkte',
      filtersLabel: 'Filter',
      languageLabel: 'Sprache',
      toggleList: '🎅 Liste',
      toggleLabel: 'Liste ein- oder ausblenden',
      all: '✨ Alle',
      notOver: '🟢 Noch nicht vorbei',
      statusClosed: 'Saison vorbei',
      statusTomorrow: 'Öffnet morgen!',
      statusSoon: 'Öffnet in {days} Tagen',
      statusOpen: 'Jetzt geöffnet',
      visitWebsite: 'Zur Website →',
      countOne: '{n} Markt zu entdecken',
      countMany: '{n} Märkte zu entdecken',
      noMatch: 'Keine Märkte gefunden. Versuch eine andere Suche!',
      loadError: 'Die Märkte konnten nicht geladen werden. Läuft der Server?',
    },
  };
  const LOCALES = { en: 'en-GB', de: 'de-CH' };
  const SUPPORTED = Object.keys(STRINGS);

  const detect = () => {
    try {
      const saved = localStorage.getItem('lang');
      if (SUPPORTED.includes(saved)) return saved;
    } catch {}
    const prefs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const l of prefs) {
      const base = String(l).slice(0, 2).toLowerCase();
      if (SUPPORTED.includes(base)) return base;
    }
    return 'en';
  };

  const i18n = {
    lang: detect(),
    locale: () => LOCALES[i18n.lang],
    t(key, params = {}) {
      const s = STRINGS[i18n.lang][key] ?? STRINGS.en[key] ?? key;
      return s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
    },
    // pick a localized field from a record, e.g. field(m, 'description')
    field(m, name) {
      return (i18n.lang !== 'en' && m[`${name}_${i18n.lang}`]) || m[name] || '';
    },
    applyStatic() {
      const { t } = i18n;
      document.documentElement.lang = i18n.lang;
      document.title = t('title');
      document
        .querySelector('meta[name=description]')
        ?.setAttribute('content', t('metaDescription'));
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.dataset.i18n);
      });
      document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
        // format: "attr:key;attr:key"
        el.dataset.i18nAttr.split(';').forEach((pair) => {
          const [attr, key] = pair.split(':');
          el.setAttribute(attr, t(key));
        });
      });
      document.querySelectorAll('.lang button').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.lang === i18n.lang);
      });
    },
    setLang(lang) {
      if (!SUPPORTED.includes(lang) || lang === i18n.lang) return;
      i18n.lang = lang;
      try {
        localStorage.setItem('lang', lang);
      } catch {}
      i18n.applyStatic();
      document.dispatchEvent(new CustomEvent('langchange'));
    },
  };

  window.i18n = i18n;
  document.addEventListener('DOMContentLoaded', i18n.applyStatic);
})();
