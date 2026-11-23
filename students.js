
'use strict';

/*
 Jordan Academy
 Student Registration and Login
 Shared Supabase authentication
*/

(function () {

  // Use the existing Supabase client from app.js.
  if (typeof db === 'undefined' || !db) {
    console.error('Supabase client is unavailable');
    return;
  }

  const $s = id => document.getElementById(id);

  const HOME_URL =
    'https://dahshan65.github.io/jordan-academy/';

  let loginMode = false;
  let busy = false;

  function make(tag, text, className = '') {
    const element = document.createElement(tag);

    if (text !== undefined) {
      element.textContent = text;
    }

    if (className) {
      element.className = className;
    }

    return element;
  }

  function makeInput(type, placeholder, autocomplete) {
    const input = document.createElement('input');

    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.required = true;

    input.style.marginBottom = '12px';

    return input;
  }

  function createStudentPanel() {

    if ($s('studentPanel')) return;

    const main = document.querySelector('main');
    if (!main) return;

    const section = make('section');
    section.id = 'studentPanel';
    section.className = 'panelBox';

    section.style.maxWidth = '500px';
    section.style.margin = '30px auto';

    const heading = make('h2', 'إنشاء حساب طالب');

    const description = make(
      'p',
      'أنشئ حسابك للوصول إلى خدمات Jordan Academy.'
    );

    const form = document.createElement('form');
    form.id = 'studentForm';

    const name = makeInput(
      'text',
      'الاسم الكامل',
      'name'
    );

    name.maxLength = 100;

    const email = makeInput(
      'email',
      'البريد الإلكتروني',
      'email'
    );

    const password = makeInput(
      'password',
      'كلمة المرور (6 أحرف على الأقل)',
      'new-password'
    );

    password.minLength = 6;

    const confirm = makeInput(
      'password',
      'تأكيد كلمة المرور',
      'new-password'
    );

    confirm.minLength = 6;

    const submit = make(
      'button',
      'إنشاء حساب جديد'
    );

    submit.type = 'submit';

    const toggle = make(
      'button',
      'لدي حساب بالفعل - تسجيل الدخول'
    );

    toggle.type = 'button';
    toggle.style.marginRight = '10px';

    const logout = make(
      'button',
      'تسجيل الخروج'
    );

    logout.type = 'button';
    logout.hidden = true;

    const status = make('p', '');
    status.id = 'studentStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    function notify(text) {
      status.textContent = text;
    }

    function setBusy(value) {
      busy = value;
      submit.disabled = value;
      toggle.disabled = value;
      logout.disabled = value;
    }

    function updateMode() {

      heading.textContent = loginMode
        ? 'تسجيل دخول الطالب'
        : 'إنشاء حساب طالب';

      name.hidden = loginMode;
      name.required = !loginMode;

      confirm.hidden = loginMode;
      confirm.required = !loginMode;

      password.autocomplete = loginMode
        ? 'current-password'
        : 'new-password';

      submit.textContent = loginMode
        ? 'تسجيل الدخول'
        : 'إنشاء حساب جديد';

      toggle.textContent = loginMode
        ? 'إنشاء حساب جديد'
        : 'لدي حساب بالفعل - تسجيل الدخول';

      notify('');
    }

    toggle.addEventListener('click', () => {
      if (busy) return;

      loginMode = !loginMode;
      updateMode();
    });

    form.addEventListener('submit', async event => {

      event.preventDefault();

      if (busy) return;

      const userEmail = email.value.trim();
      const userPassword = password.value;

      if (!loginMode) {

        if (!name.value.trim()) {
          notify('يرجى إدخال الاسم الكامل.');
          return;
        }

        if (userPassword !== confirm.value) {
          notify('كلمتا المرور غير متطابقتين.');
          return;
        }

        if (userPassword.length < 6) {
          notify('كلمة المرور قصيرة جدًا.');
          return;
        }
      }

      setBusy(true);
      notify('جارٍ تنفيذ الطلب...');

      try {

        if (loginMode) {

          const { error } =
            await db.auth.signInWithPassword({
              email: userEmail,
              password: userPassword
            });

          if (error) throw error;

          password.value = '';

          notify('تم تسجيل الدخول بنجاح.');

          await updateSession();

        } else {

          // Do not create another account while
          // an existing user is signed in.
          const { data: sessionData } =
            await db.auth.getSession();

          if (sessionData.session) {
            throw new Error(
              'يرجى تسجيل الخروج من الحساب الحالي أولًا.'
            );
          }

          const { data, error } =
            await db.auth.signUp({

              email: userEmail,
              password: userPassword,

              options: {

                data: {
                  full_name: name.value.trim()
                },

                emailRedirectTo: HOME_URL

              }

            });

          if (error) throw error;

          password.value = '';
          confirm.value = '';

          if (data.session) {

            notify(
              'تم إنشاء الحساب وتسجيل الدخول.'
            );

            await updateSession();

          } else {

            notify(
              'تم استلام طلب التسجيل. ' +
              'تحقق من بريدك الإلكتروني ' +
              'لتأكيد الحساب قبل تسجيل الدخول.'
            );

          }

        }

      } catch (error) {

        notify(
          'تعذرت العملية: ' +
          (error.message || 'خطأ غير معروف')
        );

      } finally {

        setBusy(false);

      }

    });

    logout.addEventListener('click', async () => {

      if (busy) return;

      setBusy(true);

      try {

        const { error } = await db.auth.signOut();

        if (error) throw error;

        loginMode = true;

        await updateSession();

        notify('تم تسجيل الخروج بنجاح.');

      } catch (error) {

        notify(
          'تعذر تسجيل الخروج: ' + error.message
        );

      } finally {

        setBusy(false);

      }

    });

    async function updateSession() {

      const { data, error } = await db.auth.getUser();

      const user = !error ? data.user : null;

      if (user) {

        form.hidden = true;
        toggle.hidden = true;
        logout.hidden = false;

        heading.textContent =
          'مرحبًا بك في Jordan Academy';

        description.textContent =
          'أنت مسجل الدخول حاليًا.';

        notify(
          'البريد الإلكتروني: ' +
          (user.email || '')
        );

      } else {

        form.hidden = false;
        toggle.hidden = false;
        logout.hidden = true;

        description.textContent =
          'أنشئ حسابًا جديدًا أو سجل الدخول.';

        updateMode();

      }

    }

    form.append(
      name,
      email,
      password,
      confirm,
      submit
    );

    section.append(
      heading,
      description,
      form,
      toggle,
      logout,
      status
    );

    main.append(section);

    function updateVisibility() {

      section.hidden =
        window.location.hash !== '#students';

    }

    window.addEventListener(
      'hashchange',
      updateVisibility
    );

    db.auth.onAuthStateChange(() => {

      setTimeout(() => {
        updateSession();
      }, 0);

    });

    updateMode();
    updateVisibility();
    updateSession();

  }

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      createStudentPanel
    );

  } else {

    createStudentPanel();

  }

})();
