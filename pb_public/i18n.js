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
      statusCountdown: 'Opens in {time}',
      dayShort: 'd',
      statusOpen: 'Open now',
      visitWebsite: 'Visit website →',
      countOne: '{n} market to explore',
      countMany: '{n} markets to explore',
      noMatch: 'No markets match. Try another search!',
      loadError: "Couldn't load the markets. Is the server running?",
      authSignIn: '👤 Sign in',
      authSignOut: 'Sign out',
      authTitle: 'Sign in or sign up',
      authIntro: "Enter your email and we'll send you a one-time code. No password needed.",
      authEmail: 'Email',
      authCancel: 'Cancel',
      authSend: 'Send code',
      authCodeTitle: 'Check your inbox',
      authCodeIntro: 'We sent a code to',
      authCode: 'Code',
      authBack: 'Back',
      authVerify: 'Verify',
      authResend: 'Send a new code',
      authBadEmail: 'Please enter a valid email address.',
      authBadCode: "That code didn't work. Check it and try again.",
      authSendFailed: "Couldn't send the code. Please try again.",
      authSending: 'Sending…',
      authVerifying: 'Verifying…',
      authResent: 'New code sent!',
      profileTitle: 'Your profile',
      profileClose: 'Close',
      deleteAccount: 'Delete account',
      deleteTitle: 'Delete your account?',
      deleteWarning: 'This will permanently delete your account and any of your markets that are still pending review. This cannot be undone.',
      deleteTypePrompt: 'Type your email address to confirm',
      deleteConfirm: 'Delete my account',
      deleting: 'Deleting…',
      deleteFailed: "Couldn't delete your account. Please try again.",
      addMarket: '➕ Add market',
      addTitle: 'Add a market',
      addIntro: "Know a Christmas market that's missing? Tell us about it. New entries are reviewed before they appear for everyone.",
      addName: 'Name',
      addAddress: 'Address',
      addOpens: 'Opens',
      addCloses: 'Closes',
      addLat: 'Latitude',
      addLng: 'Longitude',
      addPick: '📍 Pick location on the map',
      addPickHint: 'Tap the map to place the market (Esc to cancel)',
      addHours: 'Opening hours',
      addRegion: 'Canton',
      addRegionNone: 'Select a canton…',
      addWebsite: 'Website',
      addDescription: 'Description',
      addSubmit: 'Submit',
      addSubmitting: 'Submitting…',
      addNameRequired: 'Please enter a name.',
      addLocationRequired: 'Please set a location (pick it on the map).',
      addBadDates: 'The closing date must not be before the opening date.',
      addBadWebsite: 'The website must start with http:// or https://.',
      addFailed: "Couldn't save the market. Please try again.",
      addSessionExpired: 'Your session expired. Please sign in again.',
      pendingReview: '⏳ Pending review',
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
      statusCountdown: 'Öffnet in {time}',
      dayShort: 'T',
      statusOpen: 'Jetzt geöffnet',
      visitWebsite: 'Zur Website →',
      countOne: '{n} Markt zu entdecken',
      countMany: '{n} Märkte zu entdecken',
      noMatch: 'Keine Märkte gefunden. Versuch eine andere Suche!',
      loadError: 'Die Märkte konnten nicht geladen werden. Läuft der Server?',
      authSignIn: '👤 Anmelden',
      authSignOut: 'Abmelden',
      authTitle: 'Anmelden oder registrieren',
      authIntro: 'Gib deine E-Mail ein und wir senden dir einen Einmalcode. Kein Passwort nötig.',
      authEmail: 'E-Mail',
      authCancel: 'Abbrechen',
      authSend: 'Code senden',
      authCodeTitle: 'Schau in dein Postfach',
      authCodeIntro: 'Wir haben einen Code gesendet an',
      authCode: 'Code',
      authBack: 'Zurück',
      authVerify: 'Bestätigen',
      authResend: 'Neuen Code senden',
      authBadEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      authBadCode: 'Dieser Code hat nicht funktioniert. Prüfe ihn und versuche es erneut.',
      authSendFailed: 'Der Code konnte nicht gesendet werden. Bitte versuche es erneut.',
      authSending: 'Wird gesendet…',
      authVerifying: 'Wird geprüft…',
      authResent: 'Neuer Code gesendet!',
      profileTitle: 'Dein Profil',
      profileClose: 'Schliessen',
      deleteAccount: 'Konto löschen',
      deleteTitle: 'Konto löschen?',
      deleteWarning: 'Dein Konto und alle deine Märkte, die noch geprüft werden, werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.',
      deleteTypePrompt: 'Gib zur Bestätigung deine E-Mail-Adresse ein',
      deleteConfirm: 'Mein Konto löschen',
      deleting: 'Wird gelöscht…',
      deleteFailed: 'Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.',
      addMarket: '➕ Markt hinzufügen',
      addTitle: 'Markt hinzufügen',
      addIntro: 'Fehlt ein Weihnachtsmarkt? Erzähl uns davon. Neue Einträge werden geprüft, bevor sie für alle sichtbar sind.',
      addName: 'Name',
      addAddress: 'Adresse',
      addOpens: 'Beginn',
      addCloses: 'Ende',
      addLat: 'Breitengrad',
      addLng: 'Längengrad',
      addPick: '📍 Ort auf der Karte wählen',
      addPickHint: 'Tippe auf die Karte, um den Markt zu platzieren (Esc zum Abbrechen)',
      addHours: 'Öffnungszeiten',
      addRegion: 'Kanton',
      addRegionNone: 'Kanton wählen…',
      addWebsite: 'Website',
      addDescription: 'Beschreibung',
      addSubmit: 'Absenden',
      addSubmitting: 'Wird gesendet…',
      addNameRequired: 'Bitte gib einen Namen ein.',
      addLocationRequired: 'Bitte lege einen Ort fest (auf der Karte wählen).',
      addBadDates: 'Das Enddatum darf nicht vor dem Beginn liegen.',
      addBadWebsite: 'Die Website muss mit http:// oder https:// beginnen.',
      addFailed: 'Der Markt konnte nicht gespeichert werden. Bitte versuche es erneut.',
      addSessionExpired: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
      pendingReview: '⏳ In Prüfung',
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
