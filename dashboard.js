
'use strict';

/*
 Jordan Academy
 Student Dashboard + One Lesson at a Time

 - Independent courses page
 - Previous / Next lesson
 - Keeps existing progress and video functions
*/

(function () {
  const $ = id => document.getElementById(id);

  function element(tag, text, className) {
    const node = document.createElement(tag);

    if (text !== undefined) {
      node.textContent = text;
    }

    if (className) {
      node.className = className;
    }

    return node;
  }

  function initializeDashboard() {
    const main = document.querySelector('main');
    const studentPanel = $('studentPanel');

    if (!main || !studentPanel) {
      console.error('Student panel not found');
      return;
    }

    const old = $('studentDashboard');
    if (old) old.remove();

    const dashboard = element('section');
    dashboard.id = 'studentDashboard';
    dashboard.dir = 'rtl';
    dashboard.hidden = true;

    dashboard.style.cssText =
      'width:100%;max-width:1100px;' +
      'margin:0 auto;padding:0 0 35px;';

    const banner = element('div');

    banner.style.cssText =
      'background:linear-gradient(135deg,#123456,#087f8c);' +
      'color:white;padding:28px 25px;' +
      'border-radius:16px;margin-bottom:22px;';

    const heading = element(
      'h2',
      'دوراتي التعليمية'
    );

    heading.style.cssText =
      'color:white;margin:0;font-size:28px;';

    const subtitle = element(
      'p',
      'درس واحد في كل مرة، مع متابعة تقدمك.'
    );

    subtitle.style.cssText =
      'color:#e2f5f7;margin:8px 0 0;';

    banner.append(heading, subtitle);

    const toolbar = element('div');

    toolbar.style.cssText =
      'display:flex;flex-wrap:wrap;' +
      'gap:14px;margin:0 0 20px;';

    const accountLink = element(
      'a',
      'حساب الطالب',
      'btn'
    );
    accountLink.href = '#students';

    const catalogLink = element(
      'a',
      'استكشف الدورات',
      'btn'
    );
    catalogLink.href = '#courses';

    toolbar.append(accountLink, catalogLink);

    const loginNotice = element(
      'div',
      '',
      'panelBox'
    );

    loginNotice.hidden = true;
    loginNotice.style.cssText =
      'max-width:100%;margin:20px 0;' +
      'padding:25px;text-align:center;';

    loginNotice.append(
      element('h3', 'يرجى تسجيل الدخول أولًا'),
      element(
        'p',
        'سجّل الدخول لعرض دوراتك ودروسك.'
      )
    );

    const loginLink = element(
      'a',
      'الانتقال إلى حساب الطالب',
      'btn'
    );
    loginLink.href = '#students';
    loginNotice.append(loginLink);

    const lessonsHost = element('div');
    lessonsHost.id = 'studentCoursesHost';

    dashboard.append(
      banner,
      toolbar,
      loginNotice,
      lessonsHost
    );

    studentPanel.insertAdjacentElement(
      'afterend',
      dashboard
    );

    /*
      Move the original lesson area.
      Do not recreate video players or progress.
    */

    function moveLessonsArea() {
      const area = $('enrolledLessonsArea');

      if (
        area &&
        area.parentElement !== lessonsHost
      ) {
        lessonsHost.appendChild(area);
      }
    }

    const panelObserver = new MutationObserver(
      moveLessonsArea
    );

    panelObserver.observe(studentPanel, {
      childList: true
    });

    moveLessonsArea();

    /*
      Lesson pagination is applied separately
      to every enrolled course.
    */

    const lessonPositions = new Map();

    function setupCourse(group) {
      const lessons = Array.from(
        group.children
      ).filter(node =>
        node.id &&
        node.id.startsWith('academy-lesson-')
      );

      if (!lessons.length) return;

      let navigation = Array.from(
        group.children
      ).find(node =>
        node.classList.contains(
          'academyLessonNavigation'
        )
      );

      if (!navigation) {
        navigation = element(
          'div',
          '',
          'academyLessonNavigation'
        );

        navigation.style.cssText =
          'display:flex;flex-direction:column;' +
          'align-items:center;gap:15px;' +
          'padding:22px 12px;margin-top:18px;' +
          'background:#f1f5f9;' +
          'border-radius:14px;';

        const counter = element(
          'strong',
          '',
          'academyLessonCounter'
        );

        counter.style.cssText =
          'font-size:18px;color:#123456;';

        const controls = element('div');

        controls.style.cssText =
          'display:flex;flex-wrap:wrap;' +
          'justify-content:center;gap:15px;' +
          'width:100%;';

        const previous = element(
          'button',
          'السابق',
          'academyPreviousLesson'
        );

        previous.type = 'button';

        const next = element(
          'button',
          'التالي',
          'academyNextLesson'
        );

        next.type = 'button';

        for (const btn of [previous, next]) {
          btn.style.cssText =
            'flex:1 1 125px;max-width:220px;' +
            'min-height:52px;padding:10px 15px;' +
            'background:#087f8c;color:white;' +
            'border:0;border-radius:12px;' +
            'font:inherit;font-weight:bold;' +
            'cursor:pointer;';
        }

        controls.append(previous, next);
        navigation.append(counter, controls);
        group.append(navigation);

        previous.addEventListener('click', () => {
          changeLesson(group, -1);
        });

        next.addEventListener('click', () => {
          changeLesson(group, 1);
        });
      }

      const key =
        group.querySelector('h4')?.textContent ||
        lessons[0].id;

      const saved = lessonPositions.get(key);

      let index = 0;

      if (saved) {
        const found = lessons.findIndex(
          lesson => lesson.id === saved
        );

        if (found >= 0) {
          index = found;
        }
      }

      showLesson(group, lessons, index);
    }

    function showLesson(group, lessons, index) {
      if (!lessons.length) return;

      index = Math.max(
        0,
        Math.min(index, lessons.length - 1)
      );

      lessons.forEach((lesson, i) => {
        lesson.hidden = i !== index;

        // The original stylesheet may define
        // display rules, so enforce visibility.
        lesson.style.display =
          i === index ? '' : 'none';
      });

      const navigation = group.querySelector(
        '.academyLessonNavigation'
      );

      if (!navigation) return;

      const counter = navigation.querySelector(
        '.academyLessonCounter'
      );

      const previous = navigation.querySelector(
        '.academyPreviousLesson'
      );

      const next = navigation.querySelector(
        '.academyNextLesson'
      );

      counter.textContent =
        'الدرس ' + (index + 1) +
        ' من ' + lessons.length;

      previous.disabled = index === 0;
      next.disabled = index === lessons.length - 1;

      previous.style.opacity =
        previous.disabled ? '0.45' : '1';

      next.style.opacity =
        next.disabled ? '0.45' : '1';

      const key =
        group.querySelector('h4')?.textContent ||
        lessons[0].id;

      lessonPositions.set(key, lessons[index].id);
    }

    function changeLesson(group, direction) {
      const lessons = Array.from(
        group.children
      ).filter(node =>
        node.id &&
        node.id.startsWith('academy-lesson-')
      );

      if (!lessons.length) return;

      const current = lessons.findIndex(
        lesson => !lesson.hidden
      );

      const index = Math.max(
        0,
        Math.min(
          current + direction,
          lessons.length - 1
        )
      );

      if (index === current) return;

      /*
        Pause an HTML5 video when changing lessons.
        YouTube playback is paused when possible.
      */

      const active = lessons[current];

      if (active) {
        active.querySelectorAll('video').forEach(
          video => video.pause()
        );

        active.querySelectorAll(
          '.academyVideoPlayerButton'
        ).forEach(btn => {
          if (btn.textContent.includes('إغلاق')) {
            btn.click();
          }
        });
      }

      showLesson(group, lessons, index);

      /*
        Do not automatically scroll the page.
        The student remains in control.
      */
    }

    function setupAllCourses() {
      moveLessonsArea();

      const area = $('enrolledLessonsArea');
      if (!area) return;

      const groups = Array.from(
        area.children
      ).filter(node =>
        node.classList.contains('editorCourse')
      );

      groups.forEach(setupCourse);
    }

    /*
      app.js loads courses asynchronously.
      Observe completed course rendering.
    */

    let observedArea = null;

    const courseObserver = new MutationObserver(
      () => {
        setupAllCourses();
      }
    );

    function observeLessons() {
      moveLessonsArea();

      const area = $('enrolledLessonsArea');

      if (!area || area === observedArea) return;

      courseObserver.disconnect();

      observedArea = area;

      courseObserver.observe(area, {
        childList: true
      });

      setupAllCourses();
    }

    const hostObserver = new MutationObserver(
      observeLessons
    );

    hostObserver.observe(lessonsHost, {
      childList: true
    });

    observeLessons();

    /*
      Replace old scroll button behavior
      with navigation to the courses page.
    */

    studentPanel.addEventListener(
      'click',
      event => {
        const target = event.target;

        if (!(target instanceof Element)) return;

        const btn = target.closest('button');

        if (
          btn &&
          btn.textContent.trim() ===
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

      if (
        !window.supabase ||
        !window.JORDAN_SUPABASE_URL ||
        !window.JORDAN_SUPABASE_ANON_KEY
      ) {
        loginNotice.hidden = false;
        return;
      }

      try {
        const client = window.supabase.createClient(
          window.JORDAN_SUPABASE_URL,
          window.JORDAN_SUPABASE_ANON_KEY
        );

        const { data, error } =
          await client.auth.getUser();

        if (request !== sessionRequest) return;

        loginNotice.hidden = Boolean(
          !error && data?.user
        );
      } catch (_) {
        if (request === sessionRequest) {
          loginNotice.hidden = false;
        }
      }
    }

    function updateVisibility() {
      const hash =
        window.location.hash || '#home';

      const onDashboard = hash === '#dashboard';

      dashboard.hidden = !onDashboard;

      if (onDashboard) {
        studentPanel.hidden = true;
        observeLessons();
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
        observeLessons();
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
