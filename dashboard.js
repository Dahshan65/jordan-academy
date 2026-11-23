
'use strict';

/*
 Jordan Academy - Student Dashboard
 Uses the shared Supabase client from app.js
*/

(function () {

  if (typeof db === 'undefined' || !db) {
    console.error('Supabase is not configured');
    return;
  }

  const $d = id => document.getElementById(id);

  function element(tag, text, className = '') {
    const node = document.createElement(tag);

    if (text !== undefined) {
      node.textContent = text;
    }

    if (className) {
      node.className = className;
    }

    return node;
  }

  function createDashboard() {
    if ($d('studentDashboard')) return;

    const main = document.querySelector('main');
    if (!main) return;

    const section = element('section');
    section.id = 'studentDashboard';
    section.className = 'panelBox';
    section.hidden = true;
    section.style.maxWidth = '850px';

    const heading = element(
      'h2',
      'لوحة الطالب'
    );

    const welcome = element('p', '');

    const emailText = element(
      'p',
      '',
      'muted'
    );

    const courseHeading = element(
      'h3',
      'دوراتي'
    );

    const courseList = element('div');

    const status = element(
      'p',
      '',
      'muted'
    );

    status.setAttribute('role', 'status');

    section.append(
      heading,
      welcome,
      emailText,
      courseHeading,
      courseList,
      status
    );

    main.append(section);

    let requestNumber = 0;

    async function loadDashboard() {
      const currentRequest = ++requestNumber;

      const { data: authData, error: authError } =
        await db.auth.getUser();

      if (currentRequest !== requestNumber) return;

      const user = authError ? null : authData.user;

      if (!user) {
        welcome.textContent =
          'يرجى تسجيل الدخول لعرض دوراتك.';

        emailText.textContent = '';
        courseList.replaceChildren();
        status.textContent = '';

        return;
      }

      const fullName =
        user.user_metadata?.full_name ||
        'الطالب';

      welcome.textContent =
        'مرحبًا بك، ' + fullName;

      emailText.textContent =
        'البريد الإلكتروني: ' +
        (user.email || '');

      courseList.replaceChildren();

      status.textContent =
        'جارٍ تحميل دوراتك...';

      const { data, error } = await db
        .from('enrollments')
        .select(
          'id,course_id,status,created_at'
        )
        .eq('student_id', user.id)
        .order('created_at', {
          ascending: false
        });

      if (currentRequest !== requestNumber) return;

      if (error) {
        status.textContent =
          'تعذر تحميل الاشتراكات: ' +
          error.message;
        return;
      }

      const enrollments = data || [];

      if (!enrollments.length) {
        status.textContent =
          'لم تشترك في أي دورة حتى الآن.';
        return;
      }

      const courseIds = [
        ...new Set(
          enrollments.map(e => e.course_id)
        )
      ];

      const result = await db
        .from('courses')
        .select(
          'id,title,description,category'
        )
        .in('id', courseIds);

      if (currentRequest !== requestNumber) return;

      if (result.error) {
        status.textContent =
          'تعذر تحميل معلومات الدورات: ' +
          result.error.message;
        return;
      }

      const courseMap = new Map(
        (result.data || []).map(c => [
          c.id,
          c
        ])
      );

      const statusNames = {
        active: 'اشتراك نشط',
        pending: 'بانتظار الموافقة',
        cancelled: 'اشتراك ملغى'
      };

      for (const enrollment of enrollments) {

        const course =
          courseMap.get(enrollment.course_id);

        const card = element(
          'article',
          '',
          'editorCourse'
        );

        card.style.marginBottom = '15px';

        card.append(
          element(
            'h3',
            course?.title ||
              'دورة غير متاحة'
          )
        );

        if (course?.description) {
          card.append(
            element(
              'p',
              course.description
            )
          );
        }

        const state = element(
          'p',
          'حالة الاشتراك: ' +
          (statusNames[enrollment.status] ||
            enrollment.status)
        );

        card.append(state);

        if (enrollment.status === 'active') {

          card.append(
            element(
              'p',
              'اشتراكك مفعّل. ستظهر دروس الدورة هنا بعد إكمال إعداد الحماية.',
              'muted'
            )
          );

        } else if (
          enrollment.status === 'pending'
        ) {

          card.append(
            element(
              'p',
              'طلب الاشتراك قيد المراجعة.',
              'muted'
            )
          );

        }

        courseList.append(card);
      }

      status.textContent = '';
    }

    function updateVisibility() {
      const hash = window.location.hash;

      section.hidden = hash !== '#dashboard';

      if (!section.hidden) {
        loadDashboard();
      }
    }

    window.addEventListener(
      'hashchange',
      updateVisibility
    );

    db.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (!section.hidden) {
          loadDashboard();
        }
      }, 0);
    });

    updateVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      createDashboard
    );
  } else {
    createDashboard();
  }

})();
