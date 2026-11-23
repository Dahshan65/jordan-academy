
'use strict';

/*
 Jordan Academy
 app.js - Complete version
 Courses, lessons, video progress and administration
*/

const $ = id => document.getElementById(id);

const clean = (s, max = 500) =>
  String(s ?? '').trim().slice(0, max);

function validHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

const configured = Boolean(
  window.supabase &&
  window.JORDAN_SUPABASE_URL &&
  window.JORDAN_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')
);

const db = configured
  ? window.supabase.createClient(
      window.JORDAN_SUPABASE_URL,
      window.JORDAN_SUPABASE_ANON_KEY
    )
  : null;

let courses = [];
let isAdmin = false;
let progressUserId = 'guest';

function el(tag, cls = '', content) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (content !== undefined) node.textContent = content;
  return node;
}

function button(label, handler, cls = '') {
  const node = el('button', cls, label);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

function message(text) {
  alert(text);
}

/* VIDEO LINKS */

function videoSource(raw) {
  const url = validHttps(raw);
  if (!url) return null;

  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v') || '';
    } else if (/^\/(embed|shorts|live)\//.test(u.pathname)) {
      id = u.pathname.split('/')[2] || '';
    }
  } else if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] || '';
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return { type: 'youtube', id };
  }

  if (/\.mp4(?:$|\?)/i.test(url)) {
    return { type: 'mp4', url };
  }

  return null;
}

/* LOCAL STUDENT PROGRESS */

function progressKey(lessonId) {
  return `jordan-academy:progress:v1:${progressUserId}:${lessonId}`;
}

function getProgress(lessonId) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(progressKey(lessonId)) || '{}'
    );
    return {
      seconds: Number(saved.seconds) || 0,
      completed: saved.completed === true
    };
  } catch {
    return { seconds: 0, completed: false };
  }
}

function saveProgress(lessonId, changes) {
  try {
    localStorage.setItem(
      progressKey(lessonId),
      JSON.stringify({
        ...getProgress(lessonId),
        ...changes,
        updatedAt: Date.now()
      })
    );
    window.dispatchEvent(
      new CustomEvent('academyProgressChanged', {
        detail: { lessonId }
      })
    );
  } catch (error) {
    console.warn('Progress could not be saved', error);
  }
}

function timeLabel(value) {
  const seconds = Math.floor(Math.max(0, value || 0));
  return (
    Math.floor(seconds / 60) +
    ':' +
    String(seconds % 60).padStart(2, '0')
  );
}

/* YOUTUBE API */

let youtubeApiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      youtubeApiPromise = null;
      reject(new Error('YouTube API unavailable'));
    };
    document.head.append(script);
  });

  return youtubeApiPromise;
}

/* VIDEO PLAYER */

function appendLessonMedia(wrap, lesson) {
  const url = validHttps(lesson.content_url);
  if (!url) return;

  const source = lesson.content_type === 'video'
    ? videoSource(url)
    : null;

  if (!source) {
    const link = el(
      'a',
      '',
      lesson.content_type === 'video'
        ? 'فتح الفيديو'
        : 'فتح ملف الدرس'
    );
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    wrap.append(link);
    return;
  }

  const playerBox = el('div', 'academyVideoPlayer');
  playerBox.hidden = true;
  playerBox.style.cssText =
    'width:100%;max-width:800px;aspect-ratio:16/9;' +
    'background:#091c30;border-radius:12px;' +
    'overflow:hidden;margin-top:12px;';

  const status = el('p', 'muted');
  let video = null;
  let ytPlayer = null;
  let timer = null;
  let generation = 0;

  function refreshStatus() {
    const p = getProgress(lesson.id);
    status.textContent = p.completed
      ? '✓ تم إكمال هذا الدرس'
      : p.seconds >= 5
        ? 'آخر مشاهدة: ' + timeLabel(p.seconds)
        : 'سيتم حفظ موضع المشاهدة تلقائيًا.';
  }

  function closePlayer() {
    generation++;

    if (timer) clearInterval(timer);
    timer = null;

    if (video) {
      if (!video.ended) {
        saveProgress(lesson.id, {
          seconds: video.currentTime || 0
        });
      }
      video.pause();
      video = null;
    }

    if (ytPlayer) {
      try {
        const seconds = ytPlayer.getCurrentTime();
        if (Number.isFinite(seconds) && seconds > 0) {
          saveProgress(lesson.id, { seconds });
        }
        ytPlayer.destroy();
      } catch (_) {}
      ytPlayer = null;
    }

    playerBox.replaceChildren();
    playerBox.hidden = true;
    toggle.textContent = '▶ متابعة مشاهدة الفيديو';
    refreshStatus();
  }

  const toggle = button(
    '▶ مشاهدة الفيديو داخل الأكاديمية',
    async () => {
      if (!playerBox.hidden) {
        closePlayer();
        return;
      }

      playerBox.hidden = false;
      toggle.textContent = 'إغلاق الفيديو';

      const currentGeneration = ++generation;
      const savedSeconds = Math.floor(
        getProgress(lesson.id).seconds
      );

      if (source.type === 'mp4') {
        video = el('video');
        video.src = source.url;
        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;
        video.style.cssText =
          'width:100%;height:100%;display:block;';

        video.addEventListener('loadedmetadata', () => {
          if (
            savedSeconds > 0 &&
            savedSeconds < video.duration - 2
          ) {
            video.currentTime = savedSeconds;
          }
        }, { once: true });

        let lastSavedSecond = -1;

        video.addEventListener('timeupdate', () => {
          const second = Math.floor(video.currentTime);
          if (
            second > 0 &&
            second % 5 === 0 &&
            second !== lastSavedSecond
          ) {
            lastSavedSecond = second;
            saveProgress(lesson.id, {
              seconds: video.currentTime
            });
          }
        });

        video.addEventListener('pause', () => {
          if (!video.ended) {
            saveProgress(lesson.id, {
              seconds: video.currentTime
            });
          }
        });

        video.addEventListener('ended', () => {
          saveProgress(lesson.id, {
            seconds: 0,
            completed: true
          });
          refreshStatus();
        });

        playerBox.append(video);
        return;
      }

      const target = el('div');
      target.style.cssText = 'width:100%;height:100%;';
      playerBox.append(target);

      try {
        const YT = await loadYouTubeApi();

        if (
          currentGeneration !== generation ||
          !target.isConnected
        ) return;

        ytPlayer = new YT.Player(target, {
          videoId: source.id,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            start: savedSeconds,
            playsinline: 1
          },
          events: {
            onReady: () => {
              if (currentGeneration !== generation) return;

              timer = setInterval(() => {
                try {
                  const seconds = ytPlayer.getCurrentTime();
                  if (Number.isFinite(seconds) && seconds > 0) {
                    saveProgress(lesson.id, { seconds });
                  }
                } catch (_) {}
              }, 3000);
            },
            onStateChange: event => {
              if (event.data === YT.PlayerState.ENDED) {
                saveProgress(lesson.id, {
                  seconds: 0,
                  completed: true
                });
                refreshStatus();
              } else if (event.data === YT.PlayerState.PAUSED) {
                try {
                  saveProgress(lesson.id, {
                    seconds: ytPlayer.getCurrentTime()
                  });
                } catch (_) {}
              }
            }
          }
        });
      } catch (_) {
        if (currentGeneration !== generation) return;

        const iframe = el('iframe');
        iframe.src =
          'https://www.youtube-nocookie.com/embed/' +
          encodeURIComponent(source.id) +
          '?rel=0&start=' + savedSeconds;

        iframe.title = lesson.title || 'فيديو الدرس';
        iframe.allow =
          'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.style.cssText =
          'width:100%;height:100%;border:0;';

        playerBox.replaceChildren(iframe);
        status.textContent =
          'تم فتح الفيديو من الموضع المحفوظ. قد لا يعمل الحفظ التلقائي في هذا الوضع.';
      }
    }
  );

  refreshStatus();
  wrap.append(toggle, status, playerBox);
}

/* NAVIGATION */

function show(which) {
  const adminPage = which === 'admin';

  $('home').hidden = adminPage;
  $('panel').hidden = !adminPage;
  $('loginBox').hidden = !adminPage || isAdmin;
  $('adminDashboard').hidden = !adminPage || !isAdmin;
}

function route() {
  const hash = window.location.hash;
  const adminPage = hash === '#admin';
  const studentPage = hash === '#students';

  show(adminPage ? 'admin' : 'home');

  const studentPanel = $('studentPanel');
  if (studentPanel) studentPanel.hidden = !studentPage;

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

/* LOAD COURSES */

async function loadCourses() {
  if (!db) return;

  const { data, error } = await db
    .from('courses')
    .select(
      'id,title,category,description,grade,price,is_published,created_at'
    )
    .order('created_at', { ascending: false });

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
        'تعذر تحميل الدروس: ' + result.error.message;
    } else {
      for (const c of courses) {
        c.lessons = (result.data || [])
          .filter(l => l.course_id === c.id);
      }
    }
  }

  for (const c of courses) c.lessons ??= [];
  render();
}

/* ADMIN COURSE MANAGEMENT */

function render() {
  $('courseCount').textContent = courses.length;
  $('lessonCount').textContent = courses.reduce(
    (total, c) => total + c.lessons.length, 0
  );

  const list = $('courseList');
  list.replaceChildren();

  if (!courses.length) {
    list.append(el('p', 'muted', 'لا توجد دورات بعد.'));
  }

  if (isAdmin) {
    for (const c of courses) {
      const card = el('article', 'editorCourse');
      const head = el('div', 'courseHeading');
      const info = el('div');

      info.append(
        el('h3', '', c.title),
        el('p', 'muted',
          (c.category || 'عام') +
          ' · ' + c.lessons.length + ' درس')
      );
      head.append(info);

      const controls = el('div', 'formrow');

      controls.append(
        button(
          c.is_published ? 'إلغاء النشر' : 'نشر الدورة',
          async () => {
            const { error } = await db
              .from('courses')
              .update({ is_published: !c.is_published })
              .eq('id', c.id);

            if (error) message(error.message);
            await loadCourses();
          }
        ),
        button('حذف الدورة', async () => {
          if (!confirm('حذف الدورة وجميع دروسها نهائيًا؟')) {
            return;
          }

          const { error } = await db
            .from('courses')
            .delete()
            .eq('id', c.id);

          if (error) message(error.message);
          await loadCourses();
        }, 'danger')
      );

      card.append(
        head,
        el('p', 'muted', c.description || 'لا يوجد وصف'),
        controls
      );

      const lessons = el('div', 'lessons');

      for (const l of c.lessons) {
        const row = el('div', 'lessonRow');

        const typeLabel = {
          video: 'فيديو',
          pdf: 'PDF',
          text: 'نص'
        }[l.content_type] || 'نص';

        row.append(
          el('span', '',
            l.title + ' — ' + typeLabel +
            (l.is_free ? ' · مجاني' : ''))
        );

        if (l.content_url) appendLessonMedia(row, l);

        row.append(button('حذف', async () => {
          if (!confirm('هل تريد حذف هذا الدرس؟')) return;

          const { error } = await db
            .from('lessons')
            .delete()
            .eq('id', l.id);

          if (error) message(error.message);
          await loadCourses();
        }, 'danger'));

        lessons.append(row);
      }

      card.append(lessons);

      const form = el('form', 'lessonForm');

      form.innerHTML = `
        <h4>إضافة درس</h4>
        <label>عنوان الدرس
          <input name="title" maxlength="100" required>
        </label>
        <label>نوع الدرس
          <select name="type">
            <option value="video">فيديو</option>
            <option value="pdf">PDF</option>
            <option value="text">نص تعليمي</option>
          </select>
        </label>
        <label>رابط الفيديو أو PDF
          <input name="url" type="url">
        </label>
        <label>شرح أو محتوى نصي
          <textarea name="body" rows="3"
            maxlength="3000"></textarea>
        </label>
        <label>
          <input type="checkbox" name="free">
          درس مجاني متاح للجميع
        </label>
        <button type="submit">+ إضافة الدرس</button>
      `;

      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!isAdmin) return;

        const f = new FormData(form);
        const url = clean(f.get('url'));

        if (url && !validHttps(url)) {
          message('أدخل رابط https صحيحًا');
          return;
        }

        const { error } = await db
          .from('lessons')
          .insert({
            course_id: c.id,
            title: clean(f.get('title'), 100),
            content_type: clean(f.get('type')),
            content_url: validHttps(url) || null,
            content_text: clean(f.get('body'), 3000),
            is_free: f.has('free'),
            lesson_order: c.lessons.length + 1
          });

        if (error) message(error.message);
        else form.reset();

        await loadCourses();
      });

      card.append(form);
      list.append(card);
    }
  }

  renderCatalog();
}

/* PUBLIC CATALOG */

function renderCatalog() {
  const list = $('publishedCatalog');
  list.replaceChildren();

  const published = courses.filter(c => c.is_published);

  if (!published.length) {
    list.append(
      el('p', 'muted', 'لا توجد دورات منشورة حاليًا.')
    );
    return;
  }

  for (const c of published) {
    const card = el('article');

    card.append(
      el('b', '', '📘'),
      el('h3', '', c.title),
      el('p', '', c.description || c.category || '')
    );

    const details = el('details');
    details.append(
      el('summary', '', 'عرض الدروس المجانية')
    );

    const freeLessons = c.lessons.filter(l => l.is_free);

    for (const lesson of freeLessons) {
      const row = el('div', 'catalogLesson');

      row.append(
        el('strong', '', lesson.title),
        el('p', '', lesson.content_text || '')
      );

      if (lesson.content_url) {
        appendLessonMedia(row, lesson);
      }

      details.append(row);
    }

    if (!freeLessons.length) {
      details.append(
        el('p', 'muted',
          'لا توجد دروس مجانية منشورة حاليًا.')
      );
    }

    card.append(details);
    list.append(card);
  }
}

/* ADMIN AUTHENTICATION */

async function checkAdmin() {
  if (!db) return;

  const { data, error } = await db.auth.getUser();
  const user = data?.user;

  progressUserId = user?.id || 'guest';

  if (error || !user) {
    isAdmin = false;
    route();
    return;
  }

  const result = await db.rpc('is_academy_admin');
  isAdmin = !result.error && result.data === true;
  route();
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();

  if (!db) {
    message('ضع المفتاح العام في config.js أولًا');
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email: $('adminEmail').value.trim(),
    password: $('adminPassword').value
  });

  if (error) {
    message('تعذر تسجيل الدخول: ' + error.message);
    return;
  }

  $('adminPassword').value = '';
  await checkAdmin();

  if (!isAdmin) {
    message('هذا الحساب ليس مديرًا معتمدًا');
  }

  await loadCourses();
});

/* LOGOUT */

$('logoutBtn').addEventListener('click', async () => {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    message(error.message);
    return;
  }

  isAdmin = false;
  progressUserId = 'guest';
  route();
  await loadCourses();
});

/* CREATE COURSE */

$('courseForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!isAdmin || !db) return;

  const { error } = await db
    .from('courses')
    .insert({
      title: clean($('courseTitle').value, 90),
      category: clean($('courseCategory').value, 70),
      description: clean($('courseDescription').value),
      is_published: false
    });

  if (error) message(error.message);
  else event.target.reset();

  await loadCourses();
});

/* STUDENT ENROLLED LESSONS */

async function renderStudentLessons() {
  const panel = $('studentPanel');
  if (!panel || !db) return;

  let area = $('enrolledLessonsArea');

  if (!area) {
    area = el('section', 'panelBox');
    area.id = 'enrolledLessonsArea';
    area.style.marginTop = '20px';
    panel.append(area);
  }

  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData?.user) {
    area.replaceChildren();
    area.hidden = true;
    return;
  }

  progressUserId = authData.user.id;
  area.hidden = false;

  area.replaceChildren(
    el('h3', '', 'دروس دوراتي'),
    el('p', 'muted', 'جارٍ تحميل الدروس...')
  );

  const { data: enrollments, error: enrollError } =
    await db
      .from('enrollments')
      .select('course_id,status')
      .eq('student_id', authData.user.id)
      .eq('status', 'active');

  if (enrollError) {
    area.replaceChildren(
      el('h3', '', 'دروس دوراتي'),
      el('p', 'muted',
        'تعذر قراءة الاشتراكات: ' + enrollError.message)
    );
    return;
  }

  const ids = [
    ...new Set(
      (enrollments || []).map(e => e.course_id)
    )
  ];

  if (!ids.length) {
    area.replaceChildren(
      el('h3', '', 'دروس دوراتي'),
      el('p', 'muted', 'ليس لديك اشتراك نشط حاليًا.')
    );
    return;
  }

  const [courseResult, lessonResult] = await Promise.all([
    db.from('courses')
      .select('id,title')
      .in('id', ids),

    db.from('lessons')
      .select(
        'id,course_id,title,description,content_type,content_url,content_text,lesson_order,is_free'
      )
      .in('course_id', ids)
      .order('lesson_order', { ascending: true })
  ]);

  if (courseResult.error || lessonResult.error) {
    area.replaceChildren(
      el('h3', '', 'دروس دوراتي'),
      el('p', 'muted',
        'تعذر تحميل الدروس: ' +
        (courseResult.error?.message ||
         lessonResult.error?.message))
    );
    return;
  }

  area.replaceChildren(
    el('h3', '', 'دروس دوراتي')
  );

  for (const course of courseResult.data || []) {
    const group = el('div', 'editorCourse');
    group.append(el('h4', '', course.title));

    const lessons = (lessonResult.data || [])
      .filter(l => l.course_id === course.id);

    if (!lessons.length) {
      group.append(
        el('p', 'muted',
          'لم تُضف دروس لهذه الدورة بعد.')
      );
    }

    for (const lesson of lessons) {
      const row = el('div', 'catalogLesson');
      row.append(el('strong', '', lesson.title));

      if (lesson.description) {
        row.append(
          el('p', 'muted', lesson.description)
        );
      }

      if (lesson.content_text) {
        row.append(
          el('p', '', lesson.content_text)
        );
      }

      if (lesson.content_url) {
        appendLessonMedia(row, lesson);
      }

      const progressLine = el('div', 'muted');
      progressLine.style.marginTop = '10px';

      const doneButton = button('', () => {
        const completed = !getProgress(lesson.id).completed;
        saveProgress(lesson.id, { completed });
        updateProgress();
      });

      doneButton.style.cssText =
        'margin-top:8px;padding:8px 14px;';

      function updateProgress() {
        const p = getProgress(lesson.id);

        progressLine.textContent = p.completed
          ? '✓ تم إكمال الدرس'
          : p.seconds >= 5
            ? 'موضع المشاهدة المحفوظ: ' +
              timeLabel(p.seconds)
            : 'لم يُكمل الدرس بعد';

        doneButton.textContent = p.completed
          ? '↶ إلغاء علامة الإكمال'
          : '✓ تحديد الدرس مكتملًا';
      }

      const onProgress = event => {
        if (event.detail.lessonId === lesson.id) {
          updateProgress();
        }
      };

      window.addEventListener(
        'academyProgressChanged',
        onProgress
      );

      updateProgress();
      row.append(progressLine, doneButton);
      group.append(row);
    }

    area.append(group);
  }
}

/* STUDENT PANEL REFRESH */

let studentLoadTimer = null;

function scheduleStudentLessons() {
  if (window.location.hash !== '#students') return;

  if (studentLoadTimer) {
    clearTimeout(studentLoadTimer);
  }

  studentLoadTimer = setTimeout(() => {
    if ($('studentPanel')) {
      renderStudentLessons();
    }
  }, 200);
}

window.addEventListener(
  'hashchange',
  scheduleStudentLessons
);

window.addEventListener(
  'DOMContentLoaded',
  scheduleStudentLessons
);

/* INITIALIZATION */

async function init() {
  if (!configured) {
    $('cloudStatus').textContent =
      'لم يتم وضع المفتاح العام بعد';

    $('loginMessage').textContent =
      'أضف مفتاح Supabase العام إلى config.js أولًا.';

    route();
    return;
  }

  $('cloudStatus').textContent = 'متصل بـ Supabase';

  await checkAdmin();
  await loadCourses();
  scheduleStudentLessons();

  db.auth.onAuthStateChange(() => {
    setTimeout(async () => {
      await checkAdmin();
      await loadCourses();
      scheduleStudentLessons();
    }, 0);
  });

  route();
}

init();
