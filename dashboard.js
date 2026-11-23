
'use strict';

/*
 Jordan Academy - Unified Student Dashboard

 The student account is displayed at #students.
 The dashboard link #dashboard redirects to #students.

 Student authentication is managed by students.js.
 Lessons and course progress are managed by app.js.
*/

(function () {
  function normalizeStudentRoute() {
    if (window.location.hash === '#dashboard') {
      window.location.replace(
        window.location.pathname +
        window.location.search +
        '#students'
      );
    }
  }

  function initializeDashboard() {
    normalizeStudentRoute();

    window.addEventListener(
      'hashchange',
      normalizeStudentRoute
    );

    // Remove an old duplicate dashboard, if present.
    const duplicate = document.getElementById(
      'studentDashboard'
    );

    if (duplicate) {
      duplicate.remove();
    }
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
