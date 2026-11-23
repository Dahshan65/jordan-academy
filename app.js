
function renderCatalog() {
  const list = $('publishedCatalog');

  if (!list) return;

  // الاحتفاظ بالدورات التي فتح المستخدم دروسها
  const expandedCourseIds = new Set(
    Array.from(
      list.querySelectorAll('article[data-course-id]')
    )
      .filter(card => {
        const details = card.querySelector('details');
        return details && details.open;
      })
      .map(card => card.dataset.courseId)
  );

  // إعادة بناء القائمة مع الاحتفاظ بحالة الفتح
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
    const card = el('article');

    card.dataset.courseId = String(course.id);

    card.append(
      el('b', '', '📘'),
      el('h3', '', course.title),
      el(
        'p',
        '',
        course.description ||
        course.category ||
        ''
      )
    );

    const details = el('details');

    // استعادة حالة عرض الدروس المجانية
    details.open = expandedCourseIds.has(
      String(course.id)
    );

    details.append(
      el(
        'summary',
        '',
        'عرض الدروس المجانية'
      )
    );

    const freeLessons = (
      course.lessons || []
    ).filter(
      lesson => lesson.is_free
    );

    for (const lesson of freeLessons) {
      const row = el(
        'div',
        'catalogLesson'
      );

      row.append(
        el(
          'strong',
          '',
          lesson.title
        ),
        el(
          'p',
          '',
          lesson.content_text || ''
        )
      );

      if (lesson.content_url) {
        appendLessonMedia(
          row,
          lesson
        );
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
