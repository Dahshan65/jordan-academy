
'use strict';

/*
 Jordan Academy
 Student Authentication & Account Interface
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
    input.style.borderRadius = '9px';
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
    section.dir = 'rtl';
    section.hidden = true;

    section.style.cssText =
      'width:100%;max-width:1100px;' +
      'margin:0 auto;padding:0 0 30px;';

    const banner = document.createElement('div');

    banner.style.cssText =
      'background:linear-gradient(135deg,#123456,#087f8c);' +
      'color:white;padding:28px 25px;' +
      'border-radius:16px;margin-bottom:20px;';

    const heading = document.createElement('h2');
    heading.textContent = 'حساب الطالب';
    heading.style.cssText =
      'color:white;margin:0;font-size:27px;';

    const subtitle = document.createElement('p');
    subtitle.textContent =
      'مساحتك التعليمية لمتابعة الدورات والدروس.';
    subtitle.style.cssText =
      'color:#e2f5f7;margin:7px 0 0;';

    banner.append(heading, subtitle);

    const accountCard = document.createElement('div');
    accountCard.className = 'panelBox';

    accountCard.style.cssText =
      'max-width:100%;margin:0 0 20px;' +
      'padding:25px;border-radius:15px;';

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

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent =
      'لدي حساب بالفعل - تسجيل الدخول';

    toggle.style.cssText =
      'display:block;margin-top:12px;';

    const logout = document.createElement('button');
    logout.id = 'studentLogoutBtn';
    logout.type = 'button';
    logout.textContent = 'تسجيل الخروج';
    logout.className = 'danger';
    logout.style.marginTop = '12px';
    logout.hidden = true;

    const status = document.createElement('p');
    status.id = 'studentStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    status.style.cssText =
      'margin-top:15px;line-height:1.9;' +
      'white-space:pre-line;color:#12385b;';

    const quickLinks = document.createElement('div');
    quickLinks.hidden = true;

    quickLinks.style.cssText =
      'display:flex;flex-wrap:wrap;gap:12px;' +
      'margin-top:15px;';

    const coursesLink = document.createElement('a');
    coursesLink.href = '#courses';
    coursesLink.className = 'btn';
    coursesLink.textContent = 'استكشاف الدورات';

    const myCourses = document.createElement('button');
    myCourses.type = 'button';
    myCourses.textContent = 'دوراتي التعليمية';

    myCourses.addEventListener('click', () => {
      const area = document.getElementById(
        'enrolledLessonsArea'
      );

      if (area) {
        area.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });

    quickLinks.append(myCourses, coursesLink);

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
        quickLinks.hidden = false;

        heading.textContent = 'لوحة الطالب';

        const fullName =
          user.user_metadata?.full_name ||
          user.email;

        notify(
          'مرحبًا بك، ' + fullName +
          '\nالبريد الإلكتروني: ' + user.email
        );

      } else {
        form.hidden = false;
        toggle.hidden = false;
        logout.hidden = true;
        quickLinks.hidden = true;

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

    accountCard.append(
      form,
      toggle,
      logout,
      status,
      quickLinks
    );

    section.append(banner, accountCard);

    // Place the student page before the home page.
    const home = document.getElementById('home');

    if (home && home.parentElement === main) {
      main.insertBefore(section, home);
    } else {
      main.prepend(section);
    }

    client.auth.onAuthStateChange(() => {
      setTimeout(async () => {
        await updateSession();

        window.dispatchEvent(
          new Event('student-session-changed')
        );
      }, 0);
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
