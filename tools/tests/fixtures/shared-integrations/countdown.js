
document.addEventListener('DOMContentLoaded', function () {
  // Find all Divi countdown timers on the page
  const timers = document.querySelectorAll('.et_pb_countdown_timer .days .value');

  timers.forEach(function (el) {
    const txt = el.textContent.trim();
    // If it matches exactly 3 digits starting with 0 (e.g. 021, 045)
    const fixed = txt.replace(/^0(\d{2})$/, '$1');
    el.textContent = fixed;
  });
});
