
'use strict';

/*
 Jordan Academy - Student Authentication
 Uses the Supabase client from app.js
*/

(function () {
  const client = window.supabase?.createClient(
    window.JORDAN_SUPABASE_URL,
    window.JORDAN_SUPABASE_ANON_KEY
  );

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
    input.style.marginBottom = '12px';
    return input;
  }

  function createStudentPanel() {
    if ($student('studentPanel')) return;

    const section = document.createElement('section');
    section.id = 'studentPanel';
    section.className = 'panelBox';
    section.style.maxWidth = '480px';
    section.style.margin = '30px auto';

    const heading = document.createElement('h2');
    heading.textContent = 'حساب الطالب';

    const form = document.createElement('form');
    form.id = 'studentForm';

    const name = makeInput('text', 'الاسم الكامل', 'name');
    name.maxLength = 100;

    const email = makeInput('email', 'البريد الإلكتروني', 'email');
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

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'لدي حساب بالفعل - تسجيل الدخول';
    toggle.style.marginRight = '10px';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = 'تسجيل الخروج';
    logout.hidden = true;

    const status = document.createElement('p');
    status.id = 'studentStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

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

      if (!loginMode && userPassword !== confirm.value) {
        notify('كلمتا المرور غير متطابقتين.');
        return;
      }

      submit.disabled = true;
      notify('يرجى الانتظار...');

      try {
        if (loginMode) {
          const { error } = await client.auth.signInWithPassword({
            email: userEmail,
            password: userPassword
          });

          if (error) throw error;

          notify('تم تسجيل الدخول بنجاح.');
        } else {
          const { data, error } = await client.auth.signUp({
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
            notify('تم إنشاء الحساب وتسجيل الدخول.');
          } else {
            notify(
              'تم إرسال طلب التسجيل. تحقق من بريدك الإلكتروني لتأكيد الحساب. قد يتأخر البريد إذا بلغ Supabase حد الإرسال.'
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
      const { error } = await client.auth.signOut();

      if (error) {
        notify(error.message);
        return;
      }

      notify('تم تسجيل الخروج.');
      await updateSession();
    });

    async function updateSession() {
      const { data, error } = await client.auth.getUser();
      const user = !error ? data.user : null;

      if (user) {
        form.hidden = true;
        toggle.hidden = true;
        logout.hidden = false;

        heading.textContent = 'مرحبًا بك في Jordan Academy';

        notify(
          'تم تسجيل الدخول بالبريد: ' + user.email
        );
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

    document.querySelector('main')?.append(section);

    client.auth.onAuthStateChange(() => {
      setTimeout(updateSession, 0);
    });

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
