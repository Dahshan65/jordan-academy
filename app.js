
'use strict';

/*
 Jordan Academy
 Main Application
 Courses, Lessons, Admin and Student Navigation
*/

const $ = id => document.getElementById(id);

const clean = (s, max = 500) =>
  String(s ?? '').trim().slice(0, max);

const validHttps = s => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
};

const configured = Boolean(
  window.supabase &&
  window.JORDAN_SUPABASE_URL &&
  window.JORDAN_SUPABASE_ANON_KEY?.startsWith(
    'sb_publishable_'
  )
);

const db = configured
  ? window.supabase.createClient(
      window.JORDAN_SUPABASE_URL,
      window.JORDAN_SUPABASE_ANON_KEY
    )
  : null;

let courses = [];
let isAdmin = false;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);

  if (cls) e.className = cls;

  if (text !== undefined) {
    e.textContent = text;
  }

  return e;
};

const button = (label, fn, cls = '') => {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
};

const message = txt => alert(txt);

/* =========================
   NAVIGATION
========================= */

function show(which) {
  const adminPage = which === 'admin';

  $('home').hidden = adminPage;
  $('panel').hidden = !adminPage;

  $('loginBox').hidden =
    !adminPage || isAdmin;

  $('adminDashboard').hidden =
    !adminPage || !isAdmin;
}

function route() {
  const hash = window.location.hash;
  const adminPage = hash === '#admin';
  const studentPage = hash === '#students';

  show(adminPage ? 'admin' : 'home');

  const studentPanel =
    document.getElementById('studentPanel');

  if (studentPanel) {
    studentPanel.hidden = !studentPage;
  }

  if (studentPage) {
    requestAnimationFrame(() => {
      studentPanel?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  } else {
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', route);

/* =========================
   LOAD COURSES
========================= */

async function loadCourses() {
  if (!db) return;

  const { data, error } = await db
    .from('courses')
    .select(
      'id,title,category,description,grade,price,is_published,created_at'
    )
    .order('created_at', {
      ascending: false
    });

  if (error) {
    $('cloudStatus').textContent =
      'تعذر تحميل الدورات: ' + error.message;
    return;
  }

  courses = data || [];

  const ids = courses.map(c => c.id);

  if (ids.length) {
    const result = await db
      .from('lessons')
      .select(
        'id,course_id,title,description,content_type,content_url,content_text,lesson_order,is_free'
      )
      .in('course_id', ids)
      .order('lesson_order');

    if (result.error) {
      $('cloudStatus').textContent =
        'تعذر تحميل الدروس: ' +
        result.error.message;
    } else {
      for (const c of courses) {
        c.lessons = (result.data || [])
          .filter(l => l.course_id === c.id);
      }
    }
  }

  for (const c of courses) {
    c.lessons ??= [];
  }

  render();
}

/* =========================
   ADMIN COURSE MANAGEMENT
========================= */

function render() {
  $('courseCount').textContent =
    courses.length;

  $('lessonCount').textContent =
    courses.reduce(
      (n, c) => n + c.lessons.length,
      0
    );

  const list = $('courseList');
  list.replaceChildren();

  if (!courses.length) {
    list.append(
      el('p', 'muted', 'لا توجد دورات بعد.')
    );
  }

  if (isAdmin) {
    for (const c of courses) {
      const card = el('article', 'editorCourse');

      const head = el('div', 'courseHeading');
      const info = el('div');

      info.append(
        el('h3', '', c.title),
        el(
          'p',
          'muted',
          (c.category || 'عام') +
          ' · ' +
          c.lessons.length +
          ' درس'
        )
      );

      head.append(info);

      const controls = el('div', 'formrow');

      controls.append(
        button(
          c.is_published
            ? 'إلغاء النشر'
            : 'نشر الدورة',
          async () => {
            const { error } = await db
              .from('courses')
              .update({
                is_published: !c.is_published
              })
              .eq('id', c.id);

            if (error) {
              message(error.message);
            }

            await loadCourses();
          }
        ),

        button(
          'حذف الدورة',
          async () => {
            if (!confirm(
              'حذف الدورة وجميع دروسها نهائيًا؟'
            )) return;

            const { error } = await db
              .from('courses')
              .delete()
              .eq('id', c.id);

            if (error) {
              message(error.message);
            }

            await loadCourses();
          },
          'danger'
        )
      );

      card.append(
        head,
        el(
          'p',
          'muted',
          c.description || 'لا يوجد وصف'
        ),
        controls
      );

      /* LESSONS */

      const lessons = el('div', 'lessons');

      for (const l of c.lessons) {
        const row = el('div', 'lessonRow');

        const typeLabel = {
          video: 'فيديو',
          pdf: 'PDF',
          text: 'نص'
        }[l.content_type] || 'نص';

        row.append(
          el(
            'span',
            '',
            l.title +
            ' — ' +
            typeLabel +
            (l.is_free ? ' · مجاني' : '')
          )
        );

        if (l.content_url) {
          const url = validHttps(l.content_url);

          if (url) {
            const a = el(
              'a',
              '',
              'فتح الرابط'
            );

            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            row.append(a);
          }
        }

        row.append(
          button(
            'حذف',
            async () => {
              if (!confirm(
                'هل تريد حذف هذا الدرس؟'
              )) return;

              const { error } = await db
                .from('lessons')
                .delete()
                .eq('id', l.id);

              if (error) {
                message(error.message);
              }

              await loadCourses();
            },
            'danger'
          )
        );

        lessons.append(row);
      }

      card.append(lessons);

      /* ADD LESSON FORM */

      const form = el('form', 'lessonForm');

      form.innerHTML = `
        <h4>إضافة درس</h4>

        <label>
          عنوان الدرس
          <input
            name="title"
            maxlength="100"
            required>
        </label>

        <label>
          نوع الدرس
          <select name="type">
            <option value="video">فيديو</option>
            <option value="pdf">PDF</option>
            <option value="text">نص تعليمي</option>
          </select>
        </label>

        <label>
          رابط الفيديو أو PDF (https://)
          <input name="url" type="url">
        </label>

        <label>
          شرح أو محتوى نصي
          <textarea
            name="body"
            rows="3"
            maxlength="3000"></textarea>
        </label>

        <label>
          <input type="checkbox" name="free">
          درس مجاني متاح للجميع
        </label>

        <button type="submit">
          + إضافة الدرس
        </button>
      `;

      form.addEventListener(
        'submit',
        async e => {
          e.preventDefault();

          if (!isAdmin) return;

          const f = new FormData(form);
          const url = clean(f.get('url'));

          if (url && !validHttps(url)) {
            return message(
              'أدخل رابط https صحيحًا'
            );
          }

          const { error } = await db
            .from('lessons')
            .insert({
              course_id: c.id,
              title: clean(
                f.get('title'),
                100
              ),
              content_type: clean(
                f.get('type')
              ),
              content_url:
                validHttps(url) || null,
              content_text: clean(
                f.get('body'),
                3000
              ),
              is_free: f.has('free'),
              lesson_order:
                c.lessons.length + 1
            });

          if (error) {
            message(error.message);
          } else {
            form.reset();
          }

          await loadCourses();
        }
      );

      card.append(form);
      list.append(card);
    }
  }

  renderCatalog();
}

/* =========================
   PUBLIC CATALOG
========================= */

function renderCatalog() {
  const list = $('publishedCatalog');

  list.replaceChildren();

  const published = courses.filter(
    c => c.is_published
  );

  if (!published.length) {
    list.append(
      el(
        'p',
        'muted',
        'لا توجد دورات منشورة حاليًا.'
      )
    );
    return;
  }

  for (const c of published) {
    const card = el('article');

    card.append(
      el('b', '', '📘'),
      el('h3', '', c.title),
      el(
        'p',
        '',
        c.description || c.category || ''
      )
    );

    const details = el('details');

    details.append(
      el(
        'summary',
        '',
        'عرض الدروس المجانية'
      )
    );

    const freeLessons = c.lessons.filter(
      l => l.is_free
    );

    for (const l of freeLessons) {
      const row = el(
        'div',
        'catalogLesson'
      );

      row.append(
        el('strong', '', l.title),
        el('p', '', l.content_text || '')
      );

      if (l.content_url) {
        const url = validHttps(l.content_url);

        if (url) {
          const a = el(
            'a',
            '',
            'فتح ' +
            (l.content_type === 'video'
              ? 'الفيديو'
              : 'الملف')
          );

          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';

          row.append(a);
        }
      }

      details.append(row);
    }

    if (!freeLessons.length) {
      details.append(
        el(
          'p',
          'muted',
          'لا توجد دروس مجانية منشورة حاليًا.'
        )
      );
    }

    card.append(details);
    list.append(card);
  }
}

/* =========================
   ADMIN AUTHENTICATION
========================= */

async function checkAdmin() {
  if (!db) return;

  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error || !user) {
    isAdmin = false;
    route();
    return;
  }

  const result = await db.rpc(
    'is_academy_admin'
  );

  isAdmin =
    !result.error &&
    result.data === true;

  route();
}

$('loginForm').addEventListener(
  'submit',
  async e => {
    e.preventDefault();

    if (!db) {
      return message(
        'ضع المفتاح العام في config.js أولًا'
      );
    }

    const { error } =
      await db.auth.signInWithPassword({
        email:
          $('adminEmail').value.trim(),
        password:
          $('adminPassword').value
      });

    if (error) {
      return message(
        'تعذر تسجيل الدخول: ' +
        error.message
      );
    }

    $('adminPassword').value = '';

    await checkAdmin();

    if (!isAdmin) {
      message(
        'هذا الحساب ليس مديرًا معتمدًا'
      );
    }

    await loadCourses();
  }
);

/* =========================
   LOGOUT
========================= */

$('logoutBtn').addEventListener(
  'click',
  async () => {
    if (!db) return;

    const { error } =
      await db.auth.signOut();

    if (error) {
      return message(error.message);
    }

    isAdmin = false;

    route();
    await loadCourses();
  }
);

/* =========================
   CREATE COURSE
========================= */

$('courseForm').addEventListener(
  'submit',
  async e => {
    e.preventDefault();

    if (!isAdmin || !db) return;

    const { error } = await db
      .from('courses')
      .insert({
        title: clean(
          $('courseTitle').value,
          90
        ),
        category: clean(
          $('courseCategory').value,
          70
        ),
        description: clean(
          $('courseDescription').value
        ),
        is_published: false
      });

    if (error) {
      message(error.message);
    } else {
      e.target.reset();
    }

    await loadCourses();
  }
);

/* =========================
   INITIALIZATION
========================= */

async function init() {
  if (!configured) {
    $('cloudStatus').textContent =
      'لم يتم وضع المفتاح العام بعد';

    $('loginMessage').textContent =
      'أضف مفتاح Supabase العام إلى config.js أولًا.';

    route();
    return;
  }

  $('cloudStatus').textContent =
    'متصل بـ Supabase';

  await checkAdmin();
  await loadCourses();

  db.auth.onAuthStateChange(() => {
    setTimeout(async () => {
      await checkAdmin();
      await loadCourses();
    }, 0);
  });

  route();
}

init();
