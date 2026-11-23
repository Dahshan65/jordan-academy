
/* ===================================
   PUBLIC COURSE CATALOG
   FIX: KEEP FREE LESSONS VISIBLE
=================================== */

function renderCatalog() {
  const list = $('publishedCatalog');

  if (!list) return;

  /*
    Save which course lists are currently open.
    This prevents them from closing when
    Supabase refreshes the courses.
  */

  const openCourses = new Set();

  list.querySelectorAll(
    'article[data-course-id]'
  ).forEach(card => {
    const details = card.querySelector('details');

    if (details && details.open) {
      openCourses.add(
        card.dataset.courseId
      );
    }
  });

  /*
    Rebuild the public catalog.
  */

  list.replaceChildren();

  const published = courses.filter(
    course => course.is_published
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

  for (const course of published) {

    const courseId = String(course.id);

    const card = el('article');

    card.dataset.courseId = courseId;

    card.append(
      el('b', '', '📘'),

      el(
        'h3',
        '',
        course.title
      ),

      el(
        'p',
        '',
        course.description ||
        course.category ||
        ''
      )
    );

    /*
      Free lessons accordion.
    */

    const details = el('details');

    const summary = el(
      'summary',
      '',
      'عرض الدروس المجانية'
    );

    summary.style.cursor = 'pointer';

    details.append(summary);

    /*
      Restore previous open state.
    */

    if (openCourses.has(courseId)) {
      details.open = true;
    }

    const freeLessons = (
      course.lessons || []
    ).filter(
      lesson => lesson.is_free
    );

    /*
      Show all free lessons.
    */

    for (const lesson of freeLessons) {

      const row = el(
        'div',
        'catalogLesson'
      );

      const lessonTitle = el(
        'strong',
        '',
        lesson.title
      );

      row.append(lessonTitle);

      if (lesson.description) {
        row.append(
          el(
            'p',
            'muted',
            lesson.description
          )
        );
      }

      if (lesson.content_text) {
        row.append(
          el(
            'p',
            '',
            lesson.content_text
          )
        );
      }

      /*
        Keep original video/PDF player.
      */

      if (lesson.content_url) {
        appendLessonMedia(
          row,
          lesson
        );
      }

      details.append(row);
    }

    /*
      Empty free lessons message.
    */

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
