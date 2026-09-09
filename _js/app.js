setTimeout(function () {
  fadeOutPreloader(document.getElementById('preloader'), 69);
}, 1200);

$(document).ready(function () {
  $(window).on('beforeunload', function () {
    window.scrollTo(0, 0);
  });

  // Initialize Contact Email Copy
  initContactEmailCopy();

  // Initialize Project Filters
  initProjectFilters();
});

/* FUNCTIONS */
/* Preloader */

function fadeOutPreloader(element, duration) {
  var opacity = 1;

  var interval = setInterval(function () {
    if (opacity <= 0) {
      element.style.zIndex = 0;
      element.style.opacity = 0;
      element.style.filter = 'alpha(opacity = 0)';

      // Allow horizontal scroll
      document.documentElement.style.overflowY = 'auto';

      // Remove preloader div
      document.getElementById('preloader').remove();

      clearInterval(interval);
    } else {
      opacity -= 0.1;
      element.style.opacity = opacity;
      element.style.filter = 'alpha(opacity = ' + opacity * 100 + ')';
    }
  }, duration);
}

/* Contact Email Copy Fallback */

function initContactEmailCopy() {
  var btn = document.querySelector('.contact-email-copy');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var email = btn.getAttribute('data-email');
    if (!email) return;

    var copied = function () {
      btn.classList.add('copied');
      setTimeout(function () {
        btn.classList.remove('copied');
      }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(copied);
    } else {
      var textarea = document.createElement('textarea');
      textarea.value = email;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copied();
    }
  });
}

/* Project Filters */

function initProjectFilters() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var projectRows = document.querySelectorAll('.file-row');

  if (!filterBtns.length || !projectRows.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.getAttribute('data-filter');

      projectRows.forEach(function (row) {
        var category = row.getAttribute('data-category');
        row.classList.toggle('hidden', !(filter === 'all' || category === filter));
      });
    });
  });
}
