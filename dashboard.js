
'use strict';

/*
 Jordan Academy
 Independent Student Courses Page

 Keeps existing course, lesson, video and
 progress functions in app.js unchanged.
*/

(function () {
  const $ = id => document.getElementById(id);

  function makeElement(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined) {
      element.textContent = text;
    }

    if (className) {
      element.className = className;
    }

    return element;
  }

  function initializeDashboard() {
    const main = document.querySelector('main');
    const studentPanel = $('studentPanel');

    if (!main || !studentPanel) {
      console.error(
        'Student panel or main element was not found.'
      );
      return;
    }

    // Remove any previous duplicate dashboard.
    const oldDashboard = $('studentDashboard');

    if (oldDashboard) {
      oldDashboard.remove();
    }

    // Create the independent courses page.
    const dashboard = makeElement('section');
    dashboard.id = 'studentDashboard';
    dashboard.dir = 'rtl';
    dashboard.hidden = true;

    dashboard.style.cssText = [
      'width:100%',
      'max-width:1100px',
      'margin:0 auto',
      'padding:0 0 35px'
    ].join(';');

    const banner = makeElement('div');

    banner.style.cssText = [
      'background:linear-gradient(135deg,#123456,#087f8c)',
      'color:#fff',
      'padding:28px 25px',
      'border-radius:16px',
      'margin-bottom:22px'
    ].join(';');

    const heading = makeElement(
      'h2',
      'دوراتي التعليمية'
    );

    heading.style.cssText = [
      'color:#fff',
      'margin:0',
      'font-size:28px'
    ].join(';');

    const subtitle = makeElement(
      'p',
      'تابع دروسك وشاهد الفيديوهات وراقب تقدمك.'
    );

    subtitle.style.cssText = [
      'color:#e2f5f7',
      'margin:8px 0 0'
    ].join(';');

    banner.append(heading, subtitle);

    const toolbar = makeElement('div');

    toolbar.style.cssText = [
      'display:flex',
      'flex-wrap:wrap',
      'gap:14px',
      'margin:0 0 20px'
    ].join(';');

    const accountLink = makeElement(
      'a',
      'حساب الطالب',
      'btn'
    );

    accountLink.href = '#students';

    const catalogLink = makeElement(
      'a',
      'استكشف الدورات',
      'btn'
    );

    catalogLink.href = '#courses';

    toolbar.append(accountLink, catalogLink);

    const loginNotice = makeElement(
      'div',
      '',
      'panelBox'
    );

    loginNotice.hidden = true;
    loginNotice.style.cssText = [
      'max-width:100%',
      'margin:20px 0',
      'padding:25px',
      'text-align:center'
    ].join(';');

    const noticeTitle = makeElement(
      'h3',
      'يرجى تسجيل الدخول أولًا'
    );

    const noticeText = makeElement(
      'p',
      'سجّل الدخول إلى حساب الطالب لعرض دوراتك ودروسك.'
    );

    const loginLink = makeElement(
      'a',
      'الانتقال إلى حساب الطالب',
      'btn'
    );

    loginLink.href = '#students';

    loginNotice.append(
      noticeTitle,
      noticeText,
      loginLink
    );

    const lessonsHost = makeElement('div');
    lessonsHost.id = 'studentCoursesHost';

    dashboard.append(
      banner,
      toolbar,
      loginNotice,
      lessonsHost
    );

    // Insert the dashboard as an independent page.
    studentPanel.insertAdjacentElement(
      'afterend',
      dashboard
    );

    /*
      app.js creates enrolledLessonsArea inside
      studentPanel. Move that same element to the
      independent dashboard without rebuilding it.

      This preserves the existing event listeners,
      progress bars, video controls and lesson data.
    */

    function moveLessonsArea() {
      const area = $('enrolledLessonsArea');

      if (area && area.parentElement !== lessonsHost) {
        lessonsHost.appendChild(area);
      }
    }

    const observer = new MutationObserver(() => {
      moveLessonsArea();
    });

    observer.observe(studentPanel, {
      childList: true
    });

    moveLessonsArea();

    /*
      The old student account button scrolls to
      enrolledLessonsArea. Intercept that click
      and open the independent courses page instead.
    */

    studentPanel.addEventListener(
      'click',
      event => {
        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        const clickedButton = target.closest('button');

        if (
          clickedButton &&
          clickedButton.textContent.trim() ===
            'دوراتي التعليمية'
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();

          window.location.hash = '#dashboard';
        }
      },
      true
    );

    let sessionRequest = 0;

    async function updateLoginNotice() {
      const request = ++sessionRequest;

      const client = window.JORDAN_SUPABASE_URL &&
        window.JORDAN_SUPABASE_ANON_KEY &&
        window.supabase
          ? window.supabase.createClient(
              window.JORDAN_SUPABASE_URL,
              window.JORDAN_SUPABASE_ANON_KEY
            )
          : null;

      if (!client) {
        loginNotice.hidden = false;
        return;
      }

      try {
        const { data, error } =
          await client.auth.getUser();

        if (request !== sessionRequest) {
          return;
        }

        loginNotice.hidden = Boolean(
          !error && data?.user
        );
      } catch (_) {
        if (request === sessionRequest) {
          loginNotice.hidden = false;
        }
      }
    }

    /*
      app.js and students.js manage the other
      pages. This handler makes #dashboard
      independent without changing their logic.
    */

    function updateVisibility() {
      const hash = window.location.hash || '#home';

      const onDashboard = hash === '#dashboard';

      dashboard.hidden = !onDashboard;

      if (onDashboard) {
        studentPanel.hidden = true;
        moveLessonsArea();
        updateLoginNotice();
      }
    }

    window.addEventListener(
      'hashchange',
      updateVisibility
    );

    window.addEventListener(
      'student-session-changed',
      () => {
        moveLessonsArea();
        updateLoginNotice();
      }
    );

    updateVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initializeDashboard
    );
  } else {
    initializeDashboard();
  }
})();
