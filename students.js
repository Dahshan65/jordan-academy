
'use strict';

/*
 Jordan Academy - Student Authentication
 Registration, Login, Logout
*/

(function () {
  const client =
    window.supabase &&
    window.JORDAN_SUPABASE_URL &&
    window.JORDAN_SUPABASE_ANON_KEY
      ? window.supabase.createClient(
          window.JORDAN_SUPABASE_URL,
          window.JORDAN_SUPABASE_ANON_KEY
        )
      : null;

  if (!client) {
    console.error('Supabase is not configured');
    return;
  }

  const $student = id => document.getElementById(id);

  function notify(text) {
    const status = $student('studentStatus');
    if (status) status.textContent = text;
  }

  function makeInput(type, placeholder, autocomplete) {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.required = true;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.marginBottom = '12px';
    input.style.padding = '12px';
    input.style.border = '1px solid #cbd5e1';
    input.style.borderRadius = '8px';
    return input;
  }

  function createStudentPanel() {
    if ($student('studentPanel')) return;

    const main = document.querySelector('main');

    if (!main) {
      console.error('Main element not found');
      return;
    }

    const section = document.createElement('section');
    section.id = 'studentPanel';
    section.className = 'panelBox';
    section.dir = 'rtl';
    section.style.maxWidth = '520px';
    section.style.margin = '30px auto';
    section.style.padding = '25px';
    section.style.background = '#ffffff';
    section.style.borderRadius = '14px';
    section.style.boxShadow =
      '0 4px 20px rgba(0,0,0,0.08)';

    const heading = document.createElement('h2');
    heading.textContent = 'حساب الطالب';
    heading.style.color = '#12385b';

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

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'إنشاء حساب جديد';
    submit.style.background = '#008c99';
    submit.style.color = '#ffffff';
    submit.style.padding = '12px 20px';
    submit.style.border = 'none';
    submit.style.borderRadius = '8px';
    submit.style.cursor = 'pointer';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent =
      'لدي حساب بالفعل - تسجيل الدخول';
    toggle.style.display = 'block';
    toggle.style.marginTop = '12px';
    toggle.style.background = '#087d8b';
    toggle.style.color = '#ffffff';
    toggle.style.padding = '12px 20px';
    toggle.style.border = 'none';
    toggle.style.borderRadius = '8px';
    toggle.style.cursor = 'pointer';

    // Logout button
    const logout = document.createElement('button');
    logout.id = 'studentLogoutBtn';
    logout.type = 'button';
    logout.textContent = 'تسجيل الخروج';
    logout.style.background = '#dc3545';
    logout.style.color = '#ffffff';
    logout.style.padding = '12px 24px';
    logout.style.border = 'none';
    logout.style.borderRadius = '8px';
    logout.style.cursor = 'pointer';
    logout.style.marginTop = '15px';
    logout.hidden = true;

    const status = document.createElement('p');
    status.id = 'studentStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.marginTop = '18px';
    status.style.lineHeight = '1.9';
    status.style.color = '#12385b';

    let loginMode = false;

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
        ? 'ليس لدي حساب - إنشاء حساب'
        : 'لدي حساب بالفعل - تسجيل الدخول';

      notify('');
    }

    toggle.addEventListener('click', () => {
      loginMode = !loginMode;
      updateMode();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const userEmail = email.value.trim();
      const userPassword = password.value;

      if (
        !loginMode &&
        userPassword !== confirm.value
      ) {
        notify('كلمتا المرور غير متطابقتين.');
        return;
      }

      submit.disabled = true;
      notify('يرجى الانتظار...');

      try {
        if (loginMode) {
          const { error } =
            await client.auth.signInWithPassword({
              email: userEmail,
              password: userPassword
            });

          if (error) throw error;

          notify('تم تسجيل الدخول بنجاح.');
        } else {
          const { data, error } =
            await client.auth.signUp({
              email: userEmail,
              password: userPassword,
              options: {
                data: {
                  full_name: name.value.trim()
                },
                emailRedirectTo:
                  'https://dahshan65.github.io/jordan-academy/'
              }
            });

          if (error) throw error;

          if (data.session) {
            notify(
              'تم إنشاء الحساب وتسجيل الدخول بنجاح.'
            );
          } else {
            notify(
              'تم استلام طلب التسجيل. تحقق من بريدك الإلكتروني لتأكيد الحساب قبل تسجيل الدخول.'
            );
          }
        }

        password.value = '';
        confirm.value = '';

        await updateSession();

      } catch (error) {
        notify('تعذرت العملية: ' + error.message);
      } finally {
        submit.disabled = false;
      }
    });

    logout.addEventListener('click', async () => {
      logout.disabled = true;
      notify('جارٍ تسجيل الخروج...');

      try {
        const { error } = await client.auth.signOut();

        if (error) throw error;

        loginMode = true;

        password.value = '';
        confirm.value = '';

        await updateSession();

        notify('تم تسجيل الخروج بنجاح.');

        window.location.hash = '#students';

        // Notify other site components to refresh.
        window.dispatchEvent(
          new Event('student-session-changed')
        );

      } catch (error) {
        notify(
          'تعذر تسجيل الخروج: ' + error.message
        );
      } finally {
        logout.disabled = false;
      }
    });

    async function updateSession() {
      const { data, error } =
        await client.auth.getUser();

      const user = !error ? data.user : null;

      if (user) {
        form.hidden = true;
        toggle.hidden = true;
        logout.hidden = false;

        heading.textContent = 'لوحة الطالب';

        const fullName =
          user.user_metadata?.full_name ||
          user.email;

        notify(
          'مرحبًا بك، ' + fullName +
          '\nالبريد الإلكتروني: ' + user.email
        );

        status.style.whiteSpace = 'pre-line';
      } else {
        form.hidden = false;
        toggle.hidden = false;
        logout.hidden = true;

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
      form,
      toggle,
      logout,
      status
    );

    main.append(section);

    client.auth.onAuthStateChange(() => {
      setTimeout(updateSession, 0);
    });

    updateSession();

    function updateVisibility() {
      section.hidden =
        window.location.hash !== '#students';
    }

    window.addEventListener(
      'hashchange',
      updateVisibility
    );

    updateVisibility();
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
