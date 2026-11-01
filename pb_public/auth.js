// Passwordless sign-in / sign-up via PocketBase's OTP flow (users collection).
// 1. ensure the user exists (create with a throwaway password; "already exists" is fine)
// 2. POST request-otp  -> { otpId }   (PocketBase emails the code)
// 3. POST auth-with-otp -> { token, record }
(() => {
  const $ = (id) => document.getElementById(id);
  const { t } = window.i18n;
  const API = '/api/collections/users';
  const KEY = 'auth';

  const auth = {
    token: null,
    record: null,
    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved?.token) Object.assign(auth, saved);
      } catch {}
    },
    save() {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({ token: auth.token, record: auth.record }),
        );
      } catch {}
    },
    set(token, record) {
      auth.token = token;
      auth.record = record;
      auth.save();
      document.dispatchEvent(new CustomEvent('authchange'));
    },
    clear() {
      auth.token = auth.record = null;
      try {
        localStorage.removeItem(KEY);
      } catch {}
      document.dispatchEvent(new CustomEvent('authchange'));
    },
    // Authorization header for API calls made elsewhere in the app
    headers: () => (auth.token ? { Authorization: auth.token } : {}),
  };
  window.auth = auth;

  const post = (path, body) =>
    fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const randomPassword = () => {
    const b = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  };

  async function requestCode(email) {
    // signup: create the account if it's new. Failure (e.g. email already taken)
    // is expected for returning users, so it's ignored.
    const password = randomPassword();
    await post('records', { email, password, passwordConfirm: password }).catch(
      () => {},
    );
    const res = await post('request-otp', { email });
    if (!res.ok) throw new Error(`request-otp ${res.status}`);
    return (await res.json()).otpId;
  }

  async function verifyCode(otpId, code) {
    const res = await post('auth-with-otp', { otpId, password: code });
    if (!res.ok) throw new Error(`auth-with-otp ${res.status}`);
    return res.json();
  }

  async function refresh() {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API}/auth-refresh`, {
        method: 'POST',
        headers: auth.headers(),
      });
      if (res.ok) {
        const { token, record } = await res.json();
        auth.set(token, record);
      } else if (res.status === 401 || res.status === 403) {
        auth.clear();
      }
    } catch {} // offline: keep the stored session
  }

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = $('auth');
    const emailForm = $('auth-email');
    const codeForm = $('auth-code');
    const emailInput = $('auth-email-input');
    const codeInput = $('auth-code-input');
    const account = $('account');
    let otpId = null;
    let email = '';

    const showError = (form, key) => {
      const el = form.querySelector('.auth-error');
      el.textContent = key ? t(key) : '';
      el.hidden = !key;
    };
    const busy = (form, on, key) => {
      const b = form.querySelector('.primary');
      b.disabled = on;
      if (on) {
        b.dataset.label = b.textContent;
        b.textContent = t(key);
      } else if (b.dataset.label) {
        b.textContent = b.dataset.label;
      }
    };
    const step = (which) => {
      emailForm.hidden = which !== 'email';
      codeForm.hidden = which !== 'code';
      (which === 'email' ? emailInput : codeInput).focus();
    };

    function renderAccount() {
      account.textContent = auth.record
        ? `${auth.record.email} · ${t('authSignOut')}`
        : t('authSignIn');
      account.title = auth.record ? auth.record.email : '';
    }
    renderAccount();
    document.addEventListener('authchange', renderAccount);
    document.addEventListener('langchange', renderAccount);

    account.addEventListener('click', () => {
      if (auth.token) return auth.clear();
      showError(emailForm, null);
      showError(codeForm, null);
      step('email');
      dlg.showModal();
    });
    dlg.querySelectorAll('[data-close]').forEach((b) =>
      b.addEventListener('click', () => dlg.close()),
    );
    $('auth-back').addEventListener('click', () => step('email'));

    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      email = emailInput.value.trim();
      if (!emailInput.validity.valid || !email) {
        return showError(emailForm, 'authBadEmail');
      }
      showError(emailForm, null);
      busy(emailForm, true, 'authSending');
      try {
        otpId = await requestCode(email);
        $('auth-sent-to').textContent = email;
        codeInput.value = '';
        showError(codeForm, null);
        step('code');
      } catch (err) {
        console.error(err);
        showError(emailForm, 'authSendFailed');
      } finally {
        busy(emailForm, false);
      }
    });

    codeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = codeInput.value.trim();
      if (!code) return showError(codeForm, 'authBadCode');
      showError(codeForm, null);
      busy(codeForm, true, 'authVerifying');
      try {
        const { token, record } = await verifyCode(otpId, code);
        auth.set(token, record);
        dlg.close();
      } catch (err) {
        console.error(err);
        showError(codeForm, 'authBadCode');
      } finally {
        busy(codeForm, false);
      }
    });

    $('auth-resend').addEventListener('click', async () => {
      showError(codeForm, null);
      try {
        otpId = await requestCode(email);
        codeInput.value = '';
        codeInput.focus();
        const el = codeForm.querySelector('.auth-error');
        el.textContent = t('authResent');
        el.hidden = false;
      } catch (err) {
        console.error(err);
        showError(codeForm, 'authSendFailed');
      }
    });
  });

  auth.load();
  refresh();
})();
