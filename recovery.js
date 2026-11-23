
'use strict';

/*
 Jordan Academy
 Password Recovery
 Requires Supabase client initialized in app.js
*/

(function () {
  let recoveryActive = false;
  let recoveryForm = null;

  function createRecoveryScreen() {
    if (recoveryForm) return;

    const overlay = document.createElement('div');
    overlay.id = 'recoveryOverlay';

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      background: '#f3f7fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      direction: 'rtl',
      fontFamily: '"Noto Naskh Arabic", serif'
    });

    const card = document.createElement('div');

    Object.assign(card.style, {
      width: '100%',
      maxWidth: '430px',
      background: '#ffffff',
      padding: '30px',
      borderRadius: '18px',
      boxShadow: '0 12px 40px rgba(0,0,0,.12)',
      textAlign: 'center'
    });

    const title = document.createElement('h2');
    title.textContent = 'Jordan Academy';
    title.style.color = '#123456';

    const subtitle = document.createElement('h3');
    subtitle.textContent = 'تعيين كلمة مرور جديدة';

    const description = document.createElement('p');
    description.textContent =
      'أدخل كلمة المرور الجديدة لحساب المدير.';

    const form = document.createElement('form');

    const password = document.createElement('input');
    password.type = 'password';
    password.placeholder = 'كلمة المرور الجديدة';
    password.required = true;
    password.minLength = 12;
    password.autocomplete = 'new-password';

    const confirmPassword = document.createElement('input');
    confirmPassword.type = 'password';
    confirmPassword.placeholder = 'تأكيد كلمة المرور';
    confirmPassword.required = true;
    confirmPassword.minLength = 12;
    confirmPassword.autocomplete = 'new-password';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'حفظ كلمة المرور الجديدة';

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    for (const input of [password, confirmPassword]) {
      Object.assign(input.style, {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px',
        marginBottom: '12px',
        border: '1px solid #ccd6e0',
        borderRadius: '9px',
        fontSize: '16px'
      });
    }

    Object.assign(submit.style, {
      width: '100%',
      padding: '13px',
      background: '#0d9488',
      color: 'white',
      border: 'none',
      borderRadius: '9px',
      fontSize: '17px',
      cursor: 'pointer'
    });

    form.append(password, confirmPassword, submit, status);
    card.append(title, subtitle, description, form);
    overlay.append(card);
    document.body.append(overlay);

    recoveryForm = overlay;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (!recoveryActive) {
        status.textContent = 'رابط الاستعادة غير صالح.';
        return;
      }

      if (password.value !== confirmPassword.value) {
        status.textContent = 'كلمتا المرور غير متطابقتين.';
        return;
      }

      if (password.value.length < 12) {
        status.textContent =
          'يجب ألا تقل كلمة المرور عن 12 حرفًا.';
        return;
      }

      submit.disabled = true;
      status.textContent = 'جارٍ تحديث كلمة المرور...';

      try {
        const { error } = await db.auth.updateUser({
          password: password.value
        });

        if (error) throw error;

        status.textContent =
          'تم تغيير كلمة المرور بنجاح.';

        password.value = '';
        confirmPassword.value = '';

        await db.auth.signOut();

        recoveryActive = false;
        overlay.remove();
        recoveryForm = null;

        history.replaceState(
          null,
          '',
          location.pathname + '#admin'
        );

        alert(
          'تم تغيير كلمة المرور. سجل الدخول الآن بكلمة المرور الجديدة.'
        );

        location.reload();

      } catch (error) {
        status.textContent =
          'تعذر تغيير كلمة المرور: ' + error.message;
      } finally {
        submit.disabled = false;
      }
    });
  }

  async function handleRecovery() {
    if (typeof db === 'undefined' || !db) return;

    const hash = new URLSearchParams(
      location.hash.replace(/^#/, '')
    );

    const query = new URLSearchParams(location.search);

    const isRecovery =
      hash.get('type') === 'recovery' ||
      query.get('type') === 'recovery';

    const tokenHash =
      hash.get('token_hash') ||
      query.get('token_hash');

    const code = query.get('code');

    if (isRecovery && tokenHash) {
      const { error } = await db.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });

      if (error) {
        alert('رابط الاستعادة غير صالح أو انتهت صلاحيته.');
        return;
      }

      recoveryActive = true;
      createRecoveryScreen();
      return;
    }

    if (code) {
      const { error } =
        await db.auth.exchangeCodeForSession(code);

      if (!error) {
        const { data } = await db.auth.getSession();

        if (data.session && isRecovery) {
          recoveryActive = true;
          createRecoveryScreen();
        }
      }
    }
  }

  function start() {
    if (typeof db === 'undefined' || !db) {
      console.error('Supabase client is unavailable');
      return;
    }

    db.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryActive = true;
        createRecoveryScreen();
      }
    });

    handleRecovery();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
